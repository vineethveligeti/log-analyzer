"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Database,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Download,
  FileText,
  RefreshCw,
  ExternalLink,
  Play,
  Wifi,
  WifiOff,
  Server,
  TestTube,
} from "lucide-react"
import { FlaskServiceSetup } from "./flask-service-setup"

interface AnalysisStatus {
  upload_id: string
  filename: string
  analysis_status: string
  progress: number
  total_blocks: number
  analyzed_blocks: number
  anomalous_blocks: number
  recent_results: Array<{
    block_id: string
    anomaly_score: number
    anomaly_reason: string
    processed_at: string
  }>
  uploaded_at: string
  flask_job_id?: string
}

interface HDFSAnalysisStatusProps {
  uploadId: string
  onAnalysisComplete: () => void
  mockAnalysis?: any
  flaskInstructions?: any
}

export function HDFSAnalysisStatus({
  uploadId,
  onAnalysisComplete,
  mockAnalysis,
  flaskInstructions,
}: HDFSAnalysisStatusProps) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [error, setError] = useState("")
  const [downloadUrl, setDownloadUrl] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [flaskServiceStatus, setFlaskServiceStatus] = useState<"unknown" | "healthy" | "error">("unknown")
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("connected")
  const [retryCount, setRetryCount] = useState(0)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showFlaskSetup, setShowFlaskSetup] = useState(false)
  const [usingMockData, setUsingMockData] = useState(false)

  // Check if we have Flask service issues from upload
  useEffect(() => {
    if (flaskInstructions || mockAnalysis) {
      setShowFlaskSetup(true)
      setUsingMockData(!!mockAnalysis)

      if (mockAnalysis) {
        // If we have mock analysis, mark as complete
        onAnalysisComplete()
        setDownloadUrl(`/api/download-analysis/${uploadId}`)
      }
    }
  }, [flaskInstructions, mockAnalysis, uploadId, onAnalysisComplete])

  const fetchStatus = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setConnectionStatus("connected")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`/api/analysis-status/${uploadId}`, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setError("")
        setRetryCount(0)

        // Check if analysis is complete
        if (data.analysis_status === "completed" || data.analysis_status === "completed_mock") {
          onAnalysisComplete()
          setDownloadUrl(`/api/download-analysis/${uploadId}`)

          if (data.analysis_status === "completed_mock") {
            setUsingMockData(true)
          }
        }

        // Show Flask setup if there are Flask-related issues
        if (
          data.analysis_status === "flask_unavailable" ||
          data.analysis_status === "flask_unreachable" ||
          data.analysis_status === "flask_error"
        ) {
          setShowFlaskSetup(true)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        setError(errorData.error || `Failed to fetch status: ${response.status}`)
        console.error("Status fetch error:", errorData)
      }
    } catch (fetchError) {
      console.error("Network error:", fetchError)

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          setError("Request timeout - connection may be slow")
          setConnectionStatus("reconnecting")
        } else if (fetchError.message.includes("fetch")) {
          setError("Network connection lost")
          setConnectionStatus("disconnected")
        } else {
          setError(`Connection error: ${fetchError.message}`)
          setConnectionStatus("disconnected")
        }
      } else {
        setError("Unknown network error")
        setConnectionStatus("disconnected")
      }

      setRetryCount((prev) => prev + 1)
    } finally {
      setIsRefreshing(false)
    }
  }, [uploadId, onAnalysisComplete])

  const checkFlaskService = useCallback(async () => {
    try {
      console.log("Checking Flask service health...")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5555)

      const response = await fetch("/api/flask-health", {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log("Flask service health:", data)
        setFlaskServiceStatus("healthy")
        setShowFlaskSetup(false) // Hide setup if service is healthy
      } else {
        console.error("Flask service health check failed:", response.status)
        setFlaskServiceStatus("error")
        setShowFlaskSetup(true)
      }
    } catch (error) {
      console.error("Flask service health check error:", error)
      setFlaskServiceStatus("error")
      setShowFlaskSetup(true)
    }
  }, [])

  const handleFlaskServiceReady = () => {
    console.log("Flask service is ready, hiding setup and refreshing status")
    setShowFlaskSetup(false)
    setFlaskServiceStatus("healthy")
    fetchStatus()
  }

  const triggerManualAnalysis = async () => {
    try {
      console.log("Triggering manual analysis...")
      setIsRefreshing(true)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15555)

      const response = await fetch(`/api/trigger-analysis/${uploadId}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const result = await response.json()
        console.log("Manual analysis triggered:", result)
        setError("")
        setShowFlaskSetup(false)
        setTimeout(() => fetchStatus(), 2000)
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        console.error("Manual analysis trigger failed:", errorData)
        setError(`Failed to trigger analysis: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Manual analysis trigger error:", error)
      if (error instanceof Error && error.name === "AbortError") {
        setError("Analysis trigger timeout - please try again")
      } else {
        setError("Failed to trigger manual analysis")
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const startPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    const interval = setInterval(() => {
      if (status?.analysis_status === "processing" || status?.analysis_status === "pending") {
        fetchStatus()
      }
    }, 5555)

    setPollingInterval(interval)
    return interval
  }, [status?.analysis_status, fetchStatus])

  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }, [pollingInterval])

  useEffect(() => {
    // Initial fetch
    fetchStatus()
    checkFlaskService()

    // Start polling
    const interval = startPolling()

    // Cleanup on unmount
    return () => {
      clearInterval(interval)
      stopPolling()
    }
  }, [uploadId])

  // Auto-retry on connection issues
  useEffect(() => {
    if (connectionStatus === "disconnected" && retryCount < 5) {
      const retryTimeout = setTimeout(
        () => {
          console.log(`Auto-retry attempt ${retryCount + 1}`)
          setConnectionStatus("reconnecting")
          fetchStatus()
        },
        Math.min(1000 * Math.pow(2, retryCount), 10000),
      )

      return () => clearTimeout(retryTimeout)
    }
  }, [connectionStatus, retryCount, fetchStatus])

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank")
    }
  }

  const handleManualRefresh = () => {
    setRetryCount(0)
    setConnectionStatus("connected")
    fetchStatus()
    checkFlaskService()
  }

  const getStatusIcon = () => {
    if (usingMockData) {
      return <TestTube className="h-5 w-5 text-purple-600" />
    }

    switch (status?.analysis_status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />
      case "processing":
        return <Activity className="h-5 w-5 animate-spin text-blue-600" />
      case "completed":
      case "completed_mock":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "flask_error":
      case "flask_unreachable":
      case "flask_unavailable":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Database className="h-5 w-5 text-gray-600" />
    }
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-600" />
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-red-600" />
      case "reconnecting":
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
      default:
        return <Wifi className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = () => {
    if (usingMockData) return "secondary"

    switch (status?.analysis_status) {
      case "flask_error":
      case "flask_unreachable":
      case "flask_unavailable":
        return "destructive"
      case "completed":
      case "completed_mock":
        return "default"
      default:
        return "default"
    }
  }

  const getStatusMessage = () => {
    if (usingMockData) {
      return "🧪 Using mock analysis data (Flask service not available)"
    }

    switch (status?.analysis_status) {
      case "pending":
        return "⏳ Waiting for Flask service to start processing"
      case "processing":
        return "🔄 Flask service processing blocks..."
      case "completed":
        return "✅ Flask service analysis completed"
      case "completed_mock":
        return "✅ Mock analysis completed (Flask service unavailable)"
      case "flask_error":
        return "❌ Flask service returned an error"
      case "flask_unreachable":
        return "🔌 Flask service is unreachable"
      case "flask_unavailable":
        return "🔌 Flask service is not running"
      default:
        return "❓ Unknown status"
    }
  }

  // Show Flask setup if needed
  if (showFlaskSetup) {
    return (
      <div className="space-y-4">
        <FlaskServiceSetup onServiceReady={handleFlaskServiceReady} />

        {/* Show mock analysis results if available */}
        {mockAnalysis && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5 text-purple-600" />
                <span>Mock Analysis Results Available</span>
                <Badge variant="secondary">Demo Mode</Badge>
              </CardTitle>
              <CardDescription>
                Since Flask service is not available, we've generated mock analysis results for demonstration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{mockAnalysis.total_blocks}</p>
                  <p className="text-sm text-purple-700">Total Blocks</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{mockAnalysis.analyzed_blocks}</p>
                  <p className="text-sm text-green-700">Analyzed</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {mockAnalysis.results?.filter((r: any) => r.anomaly_score > 50).length || 0}
                  </p>
                  <p className="text-sm text-orange-700">Anomalous</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button onClick={handleDownload} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Mock Analysis Results
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Connection error state
  if (error && connectionStatus === "disconnected") {
    return (
      <Alert variant="destructive">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>Connection Lost:</strong> {error}
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm">
                {retryCount > 0 && `Retry attempt ${retryCount}/5`}
                {connectionStatus === "reconnecting" && " - Reconnecting..."}
              </span>
              <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Reconnect
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Loading state
  if (!status && isRefreshing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading analysis status...</span>
            {connectionStatus === "reconnecting" && <Badge variant="outline">Reconnecting...</Badge>}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (!status) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Failed to load analysis status</span>
            <Button variant="outline" size="sm" onClick={handleManualRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Main status display
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>HDFS Log Analysis Status</span>
            <Badge variant={getStatusColor()}>
              {usingMockData ? "MOCK DATA" : status.analysis_status.toUpperCase()}
            </Badge>
            {getConnectionIcon()}
            <Button variant="ghost" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            {usingMockData ? "Mock analysis for demonstration" : `Real-time analysis progress for ${status.filename}`}
            {status.flask_job_id && (
              <span className="block text-xs text-gray-500 mt-1">Job ID: {status.flask_job_id}</span>
            )}
            {connectionStatus !== "connected" && (
              <span className="block text-xs text-yellow-600 mt-1">
                Connection: {connectionStatus} {retryCount > 0 && `(${retryCount} retries)`}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock Data Notice */}
            {usingMockData && (
              <Alert className="bg-purple-50 border-purple-200">
                <TestTube className="h-4 w-4 text-purple-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-800">
                      Using mock analysis data for demonstration. Set up Flask service for real-time analysis.
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setShowFlaskSetup(true)}>
                      <Server className="h-4 w-4 mr-2" />
                      Setup Flask
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Connection Issues Warning */}
            {connectionStatus !== "connected" && (
              <Alert variant="default">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>
                      {connectionStatus === "reconnecting"
                        ? "Reconnecting to server..."
                        : "Connection issues detected - auto-retrying"}
                    </span>
                    <Button size="sm" variant="outline" onClick={handleManualRefresh}>
                      Force Refresh
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Flask Service Issues */}
            {(status.analysis_status === "flask_error" ||
              status.analysis_status === "flask_unreachable" ||
              status.analysis_status === "flask_unavailable") &&
              !usingMockData && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        <strong>Flask Service Issue:</strong>{" "}
                        {status.analysis_status === "flask_unavailable" ||
                        status.analysis_status === "flask_unreachable"
                          ? "Cannot connect to Flask service. Make sure it's running on port 5555."
                          : "Flask service returned an error during analysis."}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" onClick={() => setShowFlaskSetup(true)}>
                          <Server className="h-4 w-4 mr-2" />
                          Setup Flask Service
                        </Button>
                        <Button size="sm" onClick={triggerManualAnalysis} disabled={isRefreshing}>
                          <Play className="h-4 w-4 mr-2" />
                          {isRefreshing ? "Retrying..." : "Retry Analysis"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open("http://localhost:5555/health", "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Check Flask Service
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analysis Progress</span>
                <span>{status.progress}% Complete</span>
              </div>
              <Progress value={status.progress} className="w-full" />
              <p className="text-sm text-gray-600">
                {status.analyzed_blocks} of {status.total_blocks} blocks analyzed
              </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{status.total_blocks}</p>
                <p className="text-sm text-blue-700">Total Blocks</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{status.analyzed_blocks}</p>
                <p className="text-sm text-green-700">Analyzed</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{status.anomalous_blocks}</p>
                <p className="text-sm text-red-700">Anomalous</p>
              </div>
            </div>

            {/* Upload Info */}
            <div className="text-xs text-gray-500 border-t pt-2">
              <p>Uploaded: {new Date(status.uploaded_at).toLocaleString()}</p>
              <p>Upload ID: {status.upload_id}</p>
              <p>
                Connection: {connectionStatus} {retryCount > 0 && `(${retryCount} retries)`}
              </p>
              {usingMockData && <p>Mode: Mock Analysis (Flask service not available)</p>}
            </div>

            {/* Download Button for Completed Analysis */}
            {(status.analysis_status === "completed" || status.analysis_status === "completed_mock") && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-700">✅ Analysis Complete! {usingMockData && "(Mock Data)"}</p>
                    <p className="text-sm text-gray-600">
                      {usingMockData ? "Mock analysis" : "CSV analysis"} file is ready for download
                    </p>
                  </div>
                  <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download {usingMockData ? "Mock " : ""}Results
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Results */}
      {status.recent_results && status.recent_results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{usingMockData ? "Mock" : "Live"} Analysis Results</span>
              <Badge variant="outline">{status.recent_results.length} results</Badge>
            </CardTitle>
            <CardDescription>
              {usingMockData
                ? "Mock analysis results for demonstration"
                : "Real-time results from Flask service as blocks are processed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.recent_results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Database className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-mono text-sm">{result.block_id}</p>
                      <p className="text-xs text-gray-600">{result.anomaly_reason || "Normal block activity"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        result.anomaly_score > 80 ? "destructive" : result.anomaly_score > 50 ? "default" : "secondary"
                      }
                    >
                      {result.anomaly_score}% Risk
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flask Service Info */}
      <Card
        className={`${
          status.analysis_status === "flask_error" ||
          status.analysis_status === "flask_unreachable" ||
          status.analysis_status === "flask_unavailable" ||
          usingMockData
            ? "bg-red-50 border-red-200"
            : "bg-blue-50 border-blue-200"
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-800">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">{getStatusMessage()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={flaskServiceStatus === "healthy" ? "default" : "destructive"}>
                Flask: {flaskServiceStatus}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => window.open("http://localhost:5555/health", "_blank")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {status.analysis_status === "processing" && !usingMockData && (
            <p className="text-xs text-blue-600 mt-1">Results are being sent in real-time as each block is analyzed</p>
          )}
          {usingMockData && (
            <p className="text-xs text-purple-600 mt-1">
              This is demonstration data. Set up Flask service for real-time analysis.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

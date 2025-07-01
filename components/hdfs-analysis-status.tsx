"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  Server,
  Eye,
  EyeOff,
} from "lucide-react"
import { FlaskServiceSetup } from "./flask-service-setup"

interface UploadHistory {
  id: string
  filename: string
  upload_date: string
  analysis_status: string
  flask_job_id?: string
}

interface AnalysisResult {
  block_id: string
  anomaly_score: number
  reason: string
}

interface HDFSAnalysisStatusProps {
  uploadId: string
  onAnalysisComplete: () => void
  flaskInstructions?: any
  refreshTrigger?: number
}

export function HDFSAnalysisStatus({
  uploadId,
  onAnalysisComplete,
  flaskInstructions,
  refreshTrigger,
}: HDFSAnalysisStatusProps) {
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([])
  const [selectedUpload, setSelectedUpload] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showFlaskSetup, setShowFlaskSetup] = useState(false)
  // Ref for the analysis section
  const analysisSectionRef = useRef<HTMLDivElement>(null)

  // Check if we have Flask service issues from upload
  useEffect(() => {
    if (flaskInstructions) {
      setShowFlaskSetup(true)
    }
  }, [flaskInstructions, uploadId, onAnalysisComplete])

  // Fetch upload history
  const fetchUploadHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/upload-history", {
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUploadHistory(data.uploads || [])
        setError("")
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        setError(errorData.error || `Failed to fetch upload history: ${response.status}`)
      }
    } catch (fetchError) {
      console.error("Error fetching upload history:", fetchError)
      setError("Failed to fetch upload history")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch analysis results for a specific upload
  const fetchAnalysisResults = useCallback(async (uploadId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/analysis-results/${uploadId}`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysisResults(data.results || [])
        setShowAnalysis(true)
        setError("")
        
        // Scroll to analysis section after a short delay to ensure it's rendered
        setTimeout(() => {
          analysisSectionRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          })
        }, 100)
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        setError(errorData.error || `Failed to fetch analysis results: ${response.status}`)
      }
    } catch (fetchError) {
      console.error("Error fetching analysis results:", fetchError)
      setError("Failed to fetch analysis results")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load upload history on component mount
  useEffect(() => {
    fetchUploadHistory()
  }, [fetchUploadHistory])

  // Refresh upload history when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      console.log("HDFSAnalysisStatus: Refreshing upload history due to new upload")
      fetchUploadHistory()
    }
  }, [refreshTrigger, fetchUploadHistory])

  // Auto-refresh upload history every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('HDFSAnalysisStatus: Auto-refreshing upload history')
      fetchUploadHistory()
    }, 5000) // Refresh every 5 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId)
    }
  }, [])

  // Listen for SSE notifications about analysis completion
  useEffect(() => {
    console.log('HDFSAnalysisStatus: Setting up SSE connection')
    const eventSource = new EventSource('/api/analysis-notifications')
    
    eventSource.onopen = () => {
      console.log('HDFSAnalysisStatus: SSE connection opened')
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('HDFSAnalysisStatus: Received SSE notification:', data)
        
        if (data.type === 'analysis_complete') {
          console.log(`HDFSAnalysisStatus: Analysis complete for upload ${data.uploadId}, refreshing history immediately`)
          // Immediate refresh when analysis completes
          fetchUploadHistory()
        }
      } catch (error) {
        console.error('HDFSAnalysisStatus: Error parsing SSE message:', error)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('HDFSAnalysisStatus: SSE connection error:', error)
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        console.log('HDFSAnalysisStatus: Attempting to reconnect SSE...')
        eventSource.close()
      }, 5000)
    }
    
    // Cleanup on unmount
    return () => {
      console.log('HDFSAnalysisStatus: Closing SSE connection')
      eventSource.close()
    }
  }, []) // Remove fetchUploadHistory from dependencies

  const handleAnalysisClick = (uploadId: string) => {
    setSelectedUpload(uploadId)
    fetchAnalysisResults(uploadId)
  }

  const handleFlaskServiceReady = () => {
    console.log("Flask service is ready, hiding setup and refreshing history")
    setShowFlaskSetup(false)
    fetchUploadHistory()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "processing":
        return <Activity className="h-4 w-4 text-blue-600" />
      case "flask_unavailable":
      case "flask_unreachable":
      case "flask_error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "flask_unavailable":
      case "flask_unreachable":
      case "flask_error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed"
      case "processing":
        return "Processing"
      case "flask_unavailable":
        return "Flask Unavailable"
      case "flask_unreachable":
        return "Flask Unreachable"
      case "flask_error":
        return "Flask Error"
      default:
        return "Unknown"
    }
  }

  const isAnalysisClickable = (status: string) => {
    return status === "completed"
  }

  const getAnomalyScoreColor = (score: number) => {
    if (score >= 70) return "bg-red-100 text-red-800 border-red-200"
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  return (
    <div className="space-y-6">
      {/* Flask Service Setup */}
      {showFlaskSetup && (
        <FlaskServiceSetup onServiceReady={handleFlaskServiceReady} />
      )}

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Upload History</span>
            <div className="ml-auto flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Auto-refresh: 5s</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchUploadHistory}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            View all your uploaded HDFS log files and their analysis status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {uploadHistory.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium">{upload.filename}</h4>
                      <p className="text-sm text-gray-600">
                        Uploaded: {new Date(upload.upload_date).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Processing Status */}
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-gray-600">
                        Processing
                      </Badge>
                      {getStatusIcon(upload.analysis_status)}
                    </div>

                    {/* Analysis Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalysisClick(upload.id)}
                      disabled={!isAnalysisClickable(upload.analysis_status)}
                      className={
                        isAnalysisClickable(upload.analysis_status)
                          ? "hover:bg-blue-50"
                          : "opacity-50 cursor-not-allowed"
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Analysis
                    </Button>
                  </div>
                </div>
              ))}

              {uploadHistory.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No uploads found. Upload an HDFS log file to get started.</p>
                </div>
              )}

              {isLoading && (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-gray-500" />
                  <p className="mt-2 text-gray-500">Loading upload history...</p>
                </div>
              )}
            </div>
            
            {/* Gradient fade effect at bottom */}
            {uploadHistory.length > 3 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-lg"></div>
            )}
            
            {/* Scroll indicator overlay */}
            {uploadHistory.length > 3 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border shadow-sm">
                <span className="text-xs text-gray-600">Scroll for more</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {showAnalysis && analysisResults.length > 0 && (
        <Card ref={analysisSectionRef}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Analysis Results</span>
              {selectedUpload && (
                <Badge variant="outline">Upload ID: {selectedUpload}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Block-level anomaly analysis results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block ID</TableHead>
                  <TableHead>Anomaly Score</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisResults.map((result, index) => (
                  <TableRow
                    key={index}
                    className={
                      result.anomaly_score >= 70
                        ? "bg-red-50 border-red-200"
                        : result.anomaly_score >= 50
                        ? "bg-yellow-50 border-yellow-200"
                        : ""
                    }
                  >
                    <TableCell className="font-mono text-sm">
                      {result.block_id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getAnomalyScoreColor(result.anomaly_score)}
                      >
                        {result.anomaly_score}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {result.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No Analysis Results */}
      {showAnalysis && analysisResults.length === 0 && !isLoading && (
        <Card ref={analysisSectionRef}>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No analysis results available for this upload.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

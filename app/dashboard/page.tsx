"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Database, Shield, AlertTriangle, LogOut, Loader2, Wifi, WifiOff, TestTube } from "lucide-react"
import { HDFSFileUpload } from "@/components/hdfs-file-upload"
import { HDFSAnalysisStatus } from "@/components/hdfs-analysis-status"
import { HDFSAnalysisResults } from "@/components/hdfs-analysis-results"

interface UploadResult {
  upload_id: string
  total_entries: number
  unique_blocks: number
  status: string
  analysis_status: string
  mock_analysis?: any
  instructions?: any
  error?: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline">("online")
  const router = useRouter()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log("Dashboard: Connection restored")
      setConnectionStatus("online")
      if (user) {
        checkAuth()
      }
    }

    const handleOffline = () => {
      console.log("Dashboard: Connection lost")
      setConnectionStatus("offline")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setConnectionStatus(navigator.onLine ? "online" : "offline")

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [user])

  useEffect(() => {
    console.log("Dashboard: Starting authentication check...")
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log("Dashboard: Checking authentication...")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch("/api/auth/me", {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      clearTimeout(timeoutId)
      console.log("Dashboard: Auth response status:", response.status)

      if (response.ok) {
        const userData = await response.json()
        console.log("Dashboard: User authenticated:", userData)
        setUser(userData)
        setAuthError("")
        setConnectionStatus("online")
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        console.log("Dashboard: Auth failed:", errorData)
        setAuthError(`Authentication failed: ${errorData.error || "Unknown error"}`)

        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }
    } catch (error) {
      console.error("Dashboard: Auth check error:", error)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setAuthError("Authentication timeout - please check your connection")
        } else if (error.message.includes("fetch")) {
          setAuthError("Network connection error")
          setConnectionStatus("offline")
        } else {
          setAuthError(`Network error: ${error.message}`)
        }
      } else {
        setAuthError("Unknown authentication error")
      }

      if (connectionStatus === "online") {
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log("Dashboard: Logging out...")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      await fetch("/api/auth/logout", {
        method: "POST",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      router.push("/login")
    } catch (error) {
      console.error("Dashboard: Logout failed:", error)
      router.push("/login")
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setError("")
    setAnalysisComplete(false)

    try {
      console.log("Dashboard: Uploading file:", file.name)
      const formData = new FormData()
      formData.append("file", file)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch("/api/upload-hdfs", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      console.log("Dashboard: Upload response status:", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("Dashboard: Upload successful:", result)
        setUploadResult(result)
        setConnectionStatus("online")

        // If we have mock analysis, mark as complete immediately
        if (result.mock_analysis) {
          setAnalysisComplete(true)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        console.error("Dashboard: Upload failed:", errorData)
        setError(errorData.error || "Upload failed")
      }
    } catch (error) {
      console.error("Dashboard: Upload error:", error)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setError("Upload timeout - file may be too large or connection is slow")
        } else if (error.message.includes("fetch")) {
          setError("Network error during upload - please check your connection")
          setConnectionStatus("offline")
        } else {
          setError(`Upload error: ${error.message}`)
        }
      } else {
        setError("Unknown upload error")
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleAnalysisComplete = () => {
    console.log("Dashboard: Analysis completed")
    setAnalysisComplete(true)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="font-medium">Loading Dashboard...</p>
                <p className="text-sm text-gray-600">
                  {connectionStatus === "offline" ? "Waiting for connection..." : "Checking authentication"}
                </p>
              </div>
              {connectionStatus === "offline" && (
                <div className="flex items-center space-x-2 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">No internet connection</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Auth error state
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>{authError}</p>
                  {connectionStatus === "offline" ? (
                    <div className="flex items-center space-x-2">
                      <WifiOff className="h-4 w-4" />
                      <span className="text-sm">Check your internet connection</span>
                    </div>
                  ) : (
                    <p className="text-sm">Redirecting to login...</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center space-y-2">
              <Button onClick={() => router.push("/login")} variant="outline">
                Go to Login
              </Button>
              {connectionStatus === "offline" && (
                <Button onClick={checkAuth} variant="ghost" size="sm">
                  Retry when online
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not authenticated state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 mx-auto text-gray-400" />
              <div>
                <p className="font-medium">Authentication Required</p>
                <p className="text-sm text-gray-600">Please log in to access the dashboard</p>
              </div>
              <Button onClick={() => router.push("/login")}>Go to Login</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">HDFS Log Analyzer</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {connectionStatus === "online" ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/demo")}>
                <Shield className="h-4 w-4 mr-2" />
                View Demo
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status Alert */}
        {connectionStatus === "offline" && (
          <Alert variant="destructive" className="mb-6">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>No internet connection. Some features may not work properly.</span>
                <Button size="sm" variant="outline" onClick={checkAuth}>
                  Retry Connection
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload HDFS Log File</span>
            </CardTitle>
            <CardDescription>
              Upload your HDFS log files for real-time anomaly analysis. The system will process blocks and send results
              to Flask service for AI-powered analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HDFSFileUpload onFileUpload={handleFileUpload} isLoading={isUploading} />
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {uploadResult && (
          <div className="space-y-6">
            {/* Upload Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <span>Upload Summary</span>
                  {uploadResult.mock_analysis && (
                    <Badge variant="secondary" className="ml-2">
                      <TestTube className="h-3 w-3 mr-1" />
                      Mock Data
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{uploadResult.total_entries}</p>
                    <p className="text-sm text-blue-700">Log Entries</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{uploadResult.unique_blocks}</p>
                    <p className="text-sm text-green-700">Unique Blocks</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{uploadResult.analysis_status.toUpperCase()}</p>
                    <p className="text-sm text-purple-700">
                      {uploadResult.mock_analysis ? "Mock Analysis" : "Analysis Status"}
                    </p>
                  </div>
                </div>

                {/* Flask Service Instructions */}
                {uploadResult.instructions && (
                  <Alert className="mt-4 bg-blue-50 border-blue-200">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium text-blue-800">{uploadResult.instructions.message}</p>
                        <ul className="text-sm text-blue-700 space-y-1">
                          {uploadResult.instructions.options.map((option: string, index: number) => (
                            <li key={index}>• {option}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Analysis Tabs */}
            <Tabs defaultValue="status" className="space-y-4">
              <TabsList>
                <TabsTrigger value="status">Analysis Status</TabsTrigger>
                <TabsTrigger value="results" disabled={!analysisComplete}>
                  Results {!analysisComplete && "(Pending)"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="status">
                <HDFSAnalysisStatus
                  uploadId={uploadResult.upload_id}
                  onAnalysisComplete={handleAnalysisComplete}
                  mockAnalysis={uploadResult.mock_analysis}
                  flaskInstructions={uploadResult.instructions}
                />
              </TabsContent>

              <TabsContent value="results">
                {analysisComplete ? (
                  <HDFSAnalysisResults uploadId={uploadResult.upload_id} />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-600">Analysis in Progress</p>
                        <p className="text-sm text-gray-500">Results will appear here once analysis completes</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  )
}

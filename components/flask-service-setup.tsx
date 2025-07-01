"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Terminal, Play, CheckCircle, AlertTriangle, ExternalLink, Copy, Server, Code } from "lucide-react"

interface FlaskServiceSetupProps {
  onServiceReady?: () => void
}

export function FlaskServiceSetup({ onServiceReady }: FlaskServiceSetupProps) {
  const [serviceStatus, setServiceStatus] = useState<"unknown" | "checking" | "running" | "stopped">("unknown")
  const [copied, setCopied] = useState("")

  // Get Flask port from environment variable, default to 5000
  const flaskPort = process.env.NEXT_PUBLIC_FLASK_PORT || "5000"
  const flaskBaseUrl = `http://localhost:${flaskPort}`

  const checkFlaskService = async () => {
    setServiceStatus("checking")
    try {
      const response = await fetch(`${flaskBaseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        setServiceStatus("running")
        onServiceReady?.()
      } else {
        setServiceStatus("stopped")
      }
    } catch {
      setServiceStatus("stopped")
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(""), 2000)
    } catch (copyError) {
      console.error("Failed to copy:", copyError)
    }
  }

  const commands = {
    start: "npm run flask-simulator",
    check: `curl ${flaskBaseUrl}/health`,
    install: "pip3 install flask requests",
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Server className="h-5 w-5 text-blue-600" />
          <span>Flask Service Setup Required</span>
          <Badge variant={serviceStatus === "running" ? "default" : "destructive"}>
            {serviceStatus === "running" ? "Running" : "Not Running"}
          </Badge>
        </CardTitle>
        <CardDescription>
          The HDFS analysis requires a Flask service for real-time processing. Follow the steps below to set it up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quick Status Check */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center space-x-2">
              {serviceStatus === "running" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                Flask Service Status: {serviceStatus === "running" ? "Running ✅" : "Not Running ❌"}
              </span>
            </div>
            <Button size="sm" onClick={checkFlaskService} disabled={serviceStatus === "checking"}>
              {serviceStatus === "checking" ? "Checking..." : "Check Status"}
            </Button>
          </div>

          {/* Setup Instructions */}
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick">Quick Start</TabsTrigger>
              <TabsTrigger value="manual">Manual Setup</TabsTrigger>
              <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-medium">🚀 Quick Start (Recommended)</p>
                    <div className="space-y-2">
                      <p className="text-sm">1. Open a new terminal in your project directory</p>
                      <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded font-mono text-sm">
                        <code>{commands.start}</code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(commands.start, "start")}>
                          {copied === "start" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm">2. Wait for &quot;Flask simulator started&quot; message</p>
                      <p className="text-sm">3. Click &quot;Check Status&quot; above to verify</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="h-12" onClick={() => window.open(`${flaskBaseUrl}/health`, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Flask Health Check
                </Button>
                <Button variant="outline" className="h-12 bg-transparent" onClick={checkFlaskService}>
                  <Play className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">📋 Manual Setup Steps</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">1</span>
                      <div className="flex-1">
                        <p className="font-medium">Install Python dependencies:</p>
                        <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded font-mono mt-1">
                          <code>{commands.install}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(commands.install, "install")}
                          >
                            {copied === "install" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">2</span>
                      <div className="flex-1">
                        <p className="font-medium">Start the Flask simulator:</p>
                        <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded font-mono mt-1">
                          <code>python3 scripts/flask-simulator.py</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard("python3 scripts/flask-simulator.py", "python")}
                          >
                            {copied === "python" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">3</span>
                      <div className="flex-1">
                        <p className="font-medium">Verify the service is running:</p>
                        <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded font-mono mt-1">
                          <code>{commands.check}</code>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(commands.check, "check")}>
                            {copied === "check" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Code className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Expected Output:</p>
                    <code className="text-xs bg-gray-100 p-1 rounded">
                      {`{\"status\": \"healthy\", \"service\": \"HDFS Log Analysis Flask Simulator\"}`}
                    </code>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="troubleshoot" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">🔧 Common Issues & Solutions</h4>

                <div className="space-y-3">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">❌ &quot;Connection refused&quot; or &quot;Failed to fetch&quot;</p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Flask service is not running</li>
                          <li>
                            • Run: <code className="bg-gray-100 px-1 rounded">npm run flask-simulator</code>
                          </li>
                          <li>• Check port 5000 is not in use by another service</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">❌ &quot;Python not found&quot; or &quot;pip not found&quot;</p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>
                            • Install Python 3: <code className="bg-gray-100 px-1 rounded">brew install python3</code>{" "}
                            (macOS)
                          </li>
                          <li>
                            • Or download from:{" "}
                            <a href="https://python.org" className="text-blue-600 underline">
                              python.org
                            </a>
                          </li>
                          <li>
                            • Verify: <code className="bg-gray-100 px-1 rounded">python3 --version</code>
                          </li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">❌ &quot;Port 5000 already in use&quot;</p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>
                            • Kill existing process:{" "}
                            <code className="bg-gray-100 px-1 rounded">lsof -ti:5000 | xargs kill</code>
                          </li>
                          <li>• Or use different port in environment variables</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="pt-4 border-t">
                  <h5 className="font-medium mb-2">🆘 Still having issues?</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(flaskBaseUrl, "_blank")}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Test Flask Direct
                    </Button>
                    <Button variant="outline" size="sm" onClick={checkFlaskService}>
                      <Play className="h-4 w-4 mr-2" />
                      Retry Connection
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>


        </div>
      </CardContent>
    </Card>
  )
}

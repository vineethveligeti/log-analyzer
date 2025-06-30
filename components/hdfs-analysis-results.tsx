"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Database, AlertTriangle, BarChart3, Clock } from "lucide-react"

interface HDFSAnalysisData {
  upload_info: {
    filename: string
    created_at: string
  }
  summary: {
    total_blocks: string | number
    high_risk_blocks: string | number
    medium_risk_blocks: string | number
    low_risk_blocks: string | number
    avg_anomaly_score: string | number
    max_anomaly_score: string | number
  }
  analysis_results: Array<{
    block_id: string
    anomaly_score: number
    anomaly_reason: string
    component: string
    level: string
    content: string
    date: string
    time: string
  }>
  component_breakdown: Array<{
    component: string
    count: string | number
    avg_score: string | number
    anomalous_count: string | number
  }>
}

interface HDFSAnalysisResultsProps {
  uploadId: string
}

// Helper functions to safely convert values to numbers
const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const toInteger = (value: string | number | null | undefined): number => {
  if (typeof value === "number") return Math.floor(value)
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export function HDFSAnalysisResults({ uploadId }: HDFSAnalysisResultsProps) {
  const [data, setData] = useState<HDFSAnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/hdfs-analysis/${uploadId}`)
        if (response.ok) {
          const analysisData = await response.json()
          setData(analysisData)
        } else {
          setError("Failed to fetch analysis results")
        }
      } catch (error) {
        setError("Network error while fetching results")
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [uploadId])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 animate-pulse text-blue-600" />
            <span>Loading HDFS analysis results...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error || "No analysis data available"}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskBadge = (score: number) => {
    if (score > 80) return <Badge variant="destructive">HIGH RISK</Badge>
    if (score > 50) return <Badge variant="default">MEDIUM RISK</Badge>
    return <Badge variant="secondary">LOW RISK</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{toInteger(data.summary.total_blocks)}</p>
                <p className="text-sm text-gray-600">Total Blocks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{toInteger(data.summary.high_risk_blocks)}</p>
                <p className="text-sm text-gray-600">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {toNumber(data.summary.avg_anomaly_score).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">Avg Risk Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {toNumber(data.summary.max_anomaly_score).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-600">Max Risk Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="blocks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="blocks">Block Analysis</TabsTrigger>
          <TabsTrigger value="components">Component Breakdown</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="blocks">
          <Card>
            <CardHeader>
              <CardTitle>Block-Level Analysis Results</CardTitle>
              <CardDescription>Detailed anomaly analysis for each HDFS block from Flask service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Block ID</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Content</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.analysis_results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{result.block_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.component}</Badge>
                        </TableCell>
                        <TableCell className="font-bold">{result.anomaly_score}%</TableCell>
                        <TableCell>{getRiskBadge(result.anomaly_score)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {result.anomaly_reason || "Normal activity"}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-sm">{result.content}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>Component Analysis</CardTitle>
              <CardDescription>Risk analysis grouped by HDFS components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.component_breakdown.map((component, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{component.component}</p>
                        <p className="text-sm text-gray-600">
                          {toInteger(component.count)} blocks, {toInteger(component.anomalous_count)} anomalous
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold">{toNumber(component.avg_score).toFixed(1)}%</span>
                      {getRiskBadge(toNumber(component.avg_score))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
              <CardDescription>Overall HDFS log analysis results for {data.upload_info.filename}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-2xl font-bold text-red-600">{toInteger(data.summary.high_risk_blocks)}</p>
                    <p className="text-sm text-red-700">High Risk Blocks</p>
                    <p className="text-xs text-red-600">Score &gt; 80%</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-2xl font-bold text-yellow-600">{toInteger(data.summary.medium_risk_blocks)}</p>
                    <p className="text-sm text-yellow-700">Medium Risk Blocks</p>
                    <p className="text-xs text-yellow-600">Score 50-80%</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-600">{toInteger(data.summary.low_risk_blocks)}</p>
                    <p className="text-sm text-green-700">Low Risk Blocks</p>
                    <p className="text-xs text-green-600">Score &lt; 50%</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">📊 Analysis Insights</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • <strong>Risk Distribution:</strong>{" "}
                      {(
                        (toInteger(data.summary.high_risk_blocks) / toInteger(data.summary.total_blocks)) *
                        100
                      ).toFixed(1)}
                      % high risk,{" "}
                      {(
                        (toInteger(data.summary.medium_risk_blocks) / toInteger(data.summary.total_blocks)) *
                        100
                      ).toFixed(1)}
                      % medium risk
                    </li>
                    <li>
                      • <strong>Average Risk Score:</strong> {toNumber(data.summary.avg_anomaly_score).toFixed(1)}%
                      across all blocks
                    </li>
                    <li>
                      • <strong>Peak Risk:</strong> Maximum anomaly score of{" "}
                      {toNumber(data.summary.max_anomaly_score).toFixed(0)}%
                    </li>
                    <li>
                      • <strong>Analysis Status:</strong> Real-time processing completed via Flask service integration
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

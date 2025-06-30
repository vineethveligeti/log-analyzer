import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield, TrendingUp } from "lucide-react"

interface LogAnalysisResultsProps {
  analysis: {
    summary: string
    totalEntries: number
    anomalousEntries: number
    topThreats: Array<{
      type: string
      count: number
      severity: "low" | "medium" | "high"
    }>
  }
}

export function LogAnalysisResults({ analysis }: LogAnalysisResultsProps) {
  const riskLevel = analysis.anomalousEntries / analysis.totalEntries
  const getRiskColor = () => {
    if (riskLevel > 0.1) return "text-red-600"
    if (riskLevel > 0.05) return "text-yellow-600"
    return "text-green-600"
  }

  const getRiskLabel = () => {
    if (riskLevel > 0.1) return "HIGH RISK"
    if (riskLevel > 0.05) return "MEDIUM RISK"
    return "LOW RISK"
  }

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>AI Security Analysis</span>
          </CardTitle>
          <CardDescription>Comprehensive analysis of your log data with security insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Risk Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Overall Risk Level</p>
              <p className={`text-2xl font-bold ${getRiskColor()}`}>{getRiskLabel()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Anomaly Rate</p>
              <p className={`text-2xl font-bold ${getRiskColor()}`}>{(riskLevel * 100).toFixed(2)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {(analysis.totalEntries - analysis.anomalousEntries).toLocaleString()}
              </p>
              <p className="text-sm text-green-700">Clean Entries</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{analysis.anomalousEntries.toLocaleString()}</p>
              <p className="text-sm text-red-700">Suspicious Entries</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threat Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Threat Categories</span>
          </CardTitle>
          <CardDescription>Breakdown of detected security threats by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.topThreats.map((threat, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      threat.severity === "high"
                        ? "text-red-500"
                        : threat.severity === "medium"
                          ? "text-yellow-500"
                          : "text-blue-500"
                    }`}
                  />
                  <span className="font-medium">{threat.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{threat.count} instances</span>
                  <Badge
                    variant={
                      threat.severity === "high"
                        ? "destructive"
                        : threat.severity === "medium"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {threat.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

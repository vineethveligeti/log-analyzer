"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, AlertTriangle, TrendingUp, FileText, Users, Zap } from "lucide-react"
import { AnomalyTable } from "./anomaly-table"
import { TimelineChart } from "./timeline-chart"

// Add this import at the top
import { useRouter } from "next/navigation"
import { ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

// Sample analysis results from the comprehensive log
const demoAnalysisResult = {
  analysis: {
    summary: `Critical security analysis reveals multiple coordinated attack patterns across a 13-hour period. Key findings include:

• **High-Risk Brute Force Campaign**: Detected 8 consecutive login attempts from IP 45.33.32.100 targeting company portal, indicating automated credential stuffing attack.

• **Advanced Persistent Threat (APT) Activity**: System admin account showing suspicious behavior with connections to command & control infrastructure (command-control.net) and large data staging operations (20MB+ transfers).

• **SQL Injection Campaign**: Multiple sophisticated database attack attempts from 203.0.113.50 using various payloads including UNION SELECT and DROP TABLE commands.

• **Insider Threat Indicators**: Employee "disgruntled.employee" exhibiting data exfiltration patterns - accessing competitor sites, uploading 50MB+ files to external services, and sending large attachments via personal email.

• **DDoS Attack Pattern**: Coordinated distributed attack from 5 different IP addresses targeting company website with identical bot signatures.

**Immediate Actions Required**: Block identified malicious IPs, investigate system admin account compromise, review data access logs for insider threat, and implement additional monitoring for SQL injection attempts.

**Risk Assessment**: HIGH - Multiple active threats detected with evidence of successful reconnaissance and potential data compromise.`,
    totalEntries: 95,
    anomalousEntries: 47,
    topThreats: [
      {
        type: "Brute Force Attacks",
        count: 8,
        severity: "high" as const,
      },
      {
        type: "SQL Injection Attempts",
        count: 6,
        severity: "high" as const,
      },
      {
        type: "Data Exfiltration",
        count: 5,
        severity: "high" as const,
      },
      {
        type: "Malware Downloads",
        count: 4,
        severity: "medium" as const,
      },
      {
        type: "DDoS Attack",
        count: 5,
        severity: "medium" as const,
      },
      {
        type: "Phishing Attempts",
        count: 3,
        severity: "medium" as const,
      },
      {
        type: "APT Activity",
        count: 3,
        severity: "high" as const,
      },
    ],
    timeline: [
      { hour: "08:00", count: 25, anomalies: 15 },
      { hour: "09:00", count: 8, anomalies: 3 },
      { hour: "10:00", count: 0, anomalies: 0 },
      { hour: "11:00", count: 0, anomalies: 0 },
      { hour: "12:00", count: 0, anomalies: 0 },
      { hour: "13:00", count: 0, anomalies: 0 },
      { hour: "14:00", count: 6, anomalies: 6 },
      { hour: "15:00", count: 0, anomalies: 0 },
      { hour: "16:00", count: 0, anomalies: 0 },
      { hour: "17:00", count: 8, anomalies: 0 },
      { hour: "18:00", count: 3, anomalies: 0 },
      { hour: "19:00", count: 1, anomalies: 0 },
    ],
  },
  anomalies: [
    {
      timestamp: "2024-01-15T08:05:01Z",
      sourceIp: "203.0.113.45",
      destinationIp: "192.168.1.200",
      url: "https://company-portal.com/login",
      action: "ALLOW",
      isAnomaly: true,
      reason: "High-frequency requests from single IP - potential brute force attack (7 requests in 7 seconds)",
      confidenceScore: 0.95,
      threatScore: 0.85,
    },
    {
      timestamp: "2024-01-15T08:05:04Z",
      sourceIp: "203.0.113.45",
      destinationIp: "192.168.1.200",
      url: "https://company-portal.com/admin",
      action: "ALLOW",
      isAnomaly: true,
      reason: "Suspicious admin URL access pattern combined with high-frequency requests",
      confidenceScore: 0.92,
      threatScore: 0.88,
    },
    {
      timestamp: "2024-01-15T08:10:15Z",
      sourceIp: "192.168.1.102",
      destinationIp: "185.220.101.182",
      url: "https://malicious-site.com/download.exe",
      action: "BLOCK",
      isAnomaly: true,
      reason: "Malware download attempt - executable file from known malicious domain",
      confidenceScore: 0.98,
      threatScore: 0.95,
    },
    {
      timestamp: "2024-01-15T08:20:01Z",
      sourceIp: "198.51.100.100",
      destinationIp: "192.168.1.200",
      url: "https://company-app.com/search?q='; DROP TABLE users; --",
      action: "BLOCK",
      isAnomaly: true,
      reason: "SQL injection attack detected - DROP TABLE command in query parameter",
      confidenceScore: 0.99,
      threatScore: 0.92,
    },
    {
      timestamp: "2024-01-15T08:25:30Z",
      sourceIp: "192.168.1.127",
      destinationIp: "203.0.113.250",
      url: "https://botnet-c2.com/checkin",
      action: "BLOCK",
      isAnomaly: true,
      reason: "Botnet command & control communication detected",
      confidenceScore: 0.97,
      threatScore: 0.94,
    },
    {
      timestamp: "2024-01-15T08:35:01Z",
      sourceIp: "45.33.32.100",
      destinationIp: "192.168.1.200",
      url: "https://company-portal.com/login",
      action: "BLOCK",
      isAnomaly: true,
      reason: "Brute force login attack - 8 consecutive failed attempts in 8 seconds",
      confidenceScore: 0.96,
      threatScore: 0.89,
    },
    {
      timestamp: "2024-01-15T08:45:01Z",
      sourceIp: "192.168.1.130",
      destinationIp: "52.94.236.100",
      url: "https://legitimate-update.com/patch.exe",
      action: "ALLOW",
      isAnomaly: true,
      reason: "Large executable download (10MB) followed by suspicious C2 communication - potential APT activity",
      confidenceScore: 0.87,
      threatScore: 0.82,
    },
    {
      timestamp: "2024-01-15T08:46:15Z",
      sourceIp: "192.168.1.130",
      destinationIp: "203.0.113.100",
      url: "https://command-control.net/beacon",
      action: "ALLOW",
      isAnomaly: true,
      reason: "Command & control beacon from compromised system - APT lateral movement detected",
      confidenceScore: 0.94,
      threatScore: 0.91,
    },
    {
      timestamp: "2024-01-15T08:50:01Z",
      sourceIp: "198.51.100.10",
      destinationIp: "192.168.1.200",
      url: "https://company-website.com/",
      action: "BLOCK",
      isAnomaly: true,
      reason: "DDoS attack - coordinated requests from 5 different IPs with identical bot signatures",
      confidenceScore: 0.93,
      threatScore: 0.78,
    },
    {
      timestamp: "2024-01-15T08:56:15Z",
      sourceIp: "192.168.1.140",
      destinationIp: "151.101.193.100",
      url: "https://file-sharing.com/confidential-docs",
      action: "ALLOW",
      isAnomaly: true,
      reason:
        "Insider threat - large file upload (50MB) to external file sharing service by employee with suspicious behavior pattern",
      confidenceScore: 0.89,
      threatScore: 0.86,
    },
    {
      timestamp: "2024-01-15T09:00:01Z",
      sourceIp: "203.0.113.50",
      destinationIp: "192.168.1.200",
      url: "https://company-app.com/admin/../../etc/passwd",
      action: "BLOCK",
      isAnomaly: true,
      reason: "Directory traversal attack attempting to access system files",
      confidenceScore: 0.96,
      threatScore: 0.84,
    },
    {
      timestamp: "2024-01-15T14:00:01Z",
      sourceIp: "45.33.32.150",
      destinationIp: "192.168.1.200",
      url: "https://ransomware-payload.com/encrypt",
      action: "BLOCK",
      isAnomaly: true,
      reason: "Ransomware payload download attempt from known malicious infrastructure",
      confidenceScore: 0.98,
      threatScore: 0.97,
    },
  ],
}

export default function DemoAnalysisResults() {
  // Add this at the beginning of the component function
  const router = useRouter()
  const riskLevel = demoAnalysisResult.analysis.anomalousEntries / demoAnalysisResult.analysis.totalEntries
  const getRiskColor = () => "text-red-600" // High risk
  const getRiskLabel = () => "CRITICAL RISK"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/login")} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Login</span>
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex items-center space-x-2">
            <Home className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 AI Analysis Results - Comprehensive ZScaler Log</h1>
          <p className="text-gray-600">Analysis of 95 log entries spanning 13 hours with 47 anomalies detected</p>
          <Badge variant="destructive" className="mt-2">
            LIVE DEMO - Sample Analysis
          </Badge>
        </div>

        {/* Critical Alert */}
        <Alert variant="destructive" className="border-red-500 bg-red-50">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="text-red-800 font-medium">
            <strong>CRITICAL SECURITY INCIDENT DETECTED:</strong> Multiple active threats including APT activity,
            insider threats, and coordinated attacks. Immediate response required.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">95</p>
                  <p className="text-sm text-gray-600">Total Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">47</p>
                  <p className="text-sm text-gray-600">Anomalies</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">49.5%</p>
                  <p className="text-sm text-gray-600">Threat Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">12</p>
                  <p className="text-sm text-gray-600">Malicious IPs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">7</p>
                  <p className="text-sm text-gray-600">Attack Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">AI Summary</TabsTrigger>
            <TabsTrigger value="anomalies">Critical Anomalies</TabsTrigger>
            <TabsTrigger value="timeline">Attack Timeline</TabsTrigger>
            <TabsTrigger value="threats">Threat Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* AI Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <span>AI Security Analysis</span>
                    <Badge variant="destructive">CRITICAL</Badge>
                  </CardTitle>
                  <CardDescription>
                    Comprehensive AI-powered analysis with threat intelligence and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                      {demoAnalysisResult.analysis.summary}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-red-600" />
                    <span>Risk Assessment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Overall Risk Level</p>
                        <p className={`text-3xl font-bold ${getRiskColor()}`}>{getRiskLabel()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Anomaly Rate</p>
                        <p className={`text-3xl font-bold ${getRiskColor()}`}>49.5%</p>
                      </div>
                    </div>

                    <Progress value={49.5} className="w-full h-3" />

                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-2xl font-bold text-red-600">47</p>
                        <p className="text-sm text-red-700">Threats Detected</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-2xl font-bold text-orange-600">12</p>
                        <p className="text-sm text-orange-700">Blocked IPs</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-2xl font-bold text-green-600">48</p>
                        <p className="text-sm text-green-700">Clean Entries</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="anomalies">
            <AnomalyTable anomalies={demoAnalysisResult.anomalies} />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineChart timeline={demoAnalysisResult.analysis.timeline} />
          </TabsContent>

          <TabsContent value="threats">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Threat Analysis Breakdown</span>
                </CardTitle>
                <CardDescription>Categorized threats detected with severity levels and attack patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoAnalysisResult.analysis.topThreats.map((threat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <AlertTriangle
                          className={`h-5 w-5 ${
                            threat.severity === "high"
                              ? "text-red-500"
                              : threat.severity === "medium"
                                ? "text-yellow-500"
                                : "text-blue-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium">{threat.type}</p>
                          <p className="text-sm text-gray-600">
                            {threat.count} instances detected
                            {threat.type === "Brute Force Attacks" && " - 8 consecutive login attempts"}
                            {threat.type === "SQL Injection Attempts" && " - Multiple database attack vectors"}
                            {threat.type === "Data Exfiltration" && " - Large file transfers to external services"}
                            {threat.type === "APT Activity" && " - Command & control communications detected"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold">{threat.count}</span>
                        <Badge
                          variant={
                            threat.severity === "high"
                              ? "destructive"
                              : threat.severity === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {threat.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Attack Pattern Analysis */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">🧠 AI Pattern Recognition</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • <strong>Coordinated Attack:</strong> Multiple attack vectors from same IP ranges suggest
                      organized threat actor
                    </li>
                    <li>
                      • <strong>Time Correlation:</strong> Peak attack activity during business hours (8-9 AM) indicates
                      targeted reconnaissance
                    </li>
                    <li>
                      • <strong>Escalation Pattern:</strong> Attacks progressed from reconnaissance → exploitation →
                      data exfiltration
                    </li>
                    <li>
                      • <strong>Insider Correlation:</strong> Internal user activity correlates with external data
                      staging operations
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Items */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Immediate Action Items</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-red-800">🚨 Critical (Do Now)</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Block IPs: 203.0.113.45, 45.33.32.100, 198.51.100.100</li>
                  <li>• Investigate system.admin account compromise</li>
                  <li>• Quarantine workstation 192.168.1.130 (APT infected)</li>
                  <li>• Review data access for "disgruntled.employee"</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-orange-800">⚠️ High Priority (Next 24h)</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Implement WAF rules for SQL injection protection</li>
                  <li>• Enable MFA for admin portal access</li>
                  <li>• Audit file sharing permissions and monitoring</li>
                  <li>• Deploy additional endpoint detection on IT systems</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

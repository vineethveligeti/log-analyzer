import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { ParsedLogEntry } from "./log-parser"

export interface AnomalyDetection {
  isAnomaly: boolean
  reason: string
  confidenceScore: number
  threatScore: number
}

export interface LogAnalysis {
  summary: string
  totalEntries: number
  anomalousEntries: number
  topThreats: Array<{
    type: string
    count: number
    severity: "low" | "medium" | "high"
  }>
  timeline: Array<{
    hour: string
    count: number
    anomalies: number
  }>
}

export async function analyzeLogEntries(entries: ParsedLogEntry[]): Promise<{
  analysis: LogAnalysis
  anomalies: Array<ParsedLogEntry & AnomalyDetection>
}> {
  // Basic statistical analysis
  const ipFrequency = new Map<string, number>()
  const urlFrequency = new Map<string, number>()
  const hourlyActivity = new Map<string, number>()

  entries.forEach((entry) => {
    // Count IP frequency
    ipFrequency.set(entry.sourceIp, (ipFrequency.get(entry.sourceIp) || 0) + 1)

    // Count URL frequency
    urlFrequency.set(entry.url, (urlFrequency.get(entry.url) || 0) + 1)

    // Count hourly activity
    const hour = entry.timestamp.getHours().toString().padStart(2, "0")
    hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1)
  })

  // Detect anomalies using AI
  const anomalies: Array<ParsedLogEntry & AnomalyDetection> = []

  for (const entry of entries) {
    const anomalyDetection = await detectAnomaly(entry, ipFrequency, urlFrequency, entries.length)
    if (anomalyDetection.isAnomaly) {
      anomalies.push({ ...entry, ...anomalyDetection })
    }
  }

  // Generate AI-powered analysis summary
  const { text: summary } = await generateText({
    model: openai("gpt-4o"),
    system: "You are a cybersecurity analyst. Analyze the provided log data and provide insights for SOC analysts.",
    prompt: `Analyze these web proxy logs:
    
Total entries: ${entries.length}
Anomalous entries: ${anomalies.length}
Top source IPs: ${Array.from(ipFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => `${ip} (${count} requests)`)
      .join(", ")}
Most accessed URLs: ${Array.from(urlFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([url, count]) => `${url} (${count} times)`)
      .join(", ")}

Provide a concise summary focusing on security implications and recommendations for SOC analysts.`,
  })

  // Create timeline
  const timeline = Array.from(hourlyActivity.entries())
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      count,
      anomalies: anomalies.filter((a) => a.timestamp.getHours().toString().padStart(2, "0") === hour).length,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  // Identify top threats
  const topThreats = [
    {
      type: "High-frequency IPs",
      count: Array.from(ipFrequency.values()).filter((count) => count > 100).length,
      severity: "medium" as const,
    },
    {
      type: "Suspicious URLs",
      count: anomalies.filter((a) => a.reason.includes("suspicious")).length,
      severity: "high" as const,
    },
    {
      type: "Unusual patterns",
      count: anomalies.filter((a) => a.reason.includes("unusual")).length,
      severity: "low" as const,
    },
  ]

  const analysis: LogAnalysis = {
    summary,
    totalEntries: entries.length,
    anomalousEntries: anomalies.length,
    topThreats,
    timeline,
  }

  return { analysis, anomalies }
}

async function detectAnomaly(
  entry: ParsedLogEntry,
  ipFrequency: Map<string, number>,
  urlFrequency: Map<string, number>,
  totalEntries: number,
): Promise<AnomalyDetection> {
  const ipCount = ipFrequency.get(entry.sourceIp) || 0
  const urlCount = urlFrequency.get(entry.url) || 0

  // Rule-based anomaly detection
  let isAnomaly = false
  let reason = ""
  let confidenceScore = 0
  let threatScore = 0

  // High-frequency IP detection
  if (ipCount > totalEntries * 0.1) {
    isAnomaly = true
    reason = `Unusual number of requests from IP ${entry.sourceIp} (${ipCount} requests)`
    confidenceScore = Math.min(0.95, (ipCount / totalEntries) * 10)
    threatScore = 0.7
  }

  // Suspicious URL patterns
  if (entry.url.includes("admin") || entry.url.includes("login") || entry.url.includes("password")) {
    isAnomaly = true
    reason = reason ? `${reason}; Suspicious URL pattern detected` : "Suspicious URL pattern detected"
    confidenceScore = Math.max(confidenceScore, 0.8)
    threatScore = Math.max(threatScore, 0.6)
  }

  // Large data transfer
  if (entry.bytesSent > 1000000 || entry.bytesReceived > 1000000) {
    isAnomaly = true
    reason = reason ? `${reason}; Large data transfer detected` : "Large data transfer detected"
    confidenceScore = Math.max(confidenceScore, 0.75)
    threatScore = Math.max(threatScore, 0.5)
  }

  // Use AI for advanced pattern detection
  if (isAnomaly) {
    try {
      const { text: aiAnalysis } = await generateText({
        model: openai("gpt-4o"),
        system: "You are a cybersecurity expert. Analyze this log entry for potential threats.",
        prompt: `Analyze this log entry for security threats:
        
IP: ${entry.sourceIp}
URL: ${entry.url}
Action: ${entry.action}
Bytes sent: ${entry.bytesSent}
Bytes received: ${entry.bytesReceived}
User Agent: ${entry.userAgent}
Category: ${entry.category}

Current detection reason: ${reason}

Provide a refined threat assessment and confidence score (0-1).`,
      })

      // Extract confidence score from AI response if available
      const confidenceMatch = aiAnalysis.match(/confidence[:\s]+(\d*\.?\d+)/i)
      if (confidenceMatch) {
        confidenceScore = Math.max(confidenceScore, Number.parseFloat(confidenceMatch[1]))
      }
    } catch (error) {
      console.warn("AI analysis failed:", error)
    }
  }

  return {
    isAnomaly,
    reason: reason || "Normal activity",
    confidenceScore: Math.min(1, confidenceScore),
    threatScore: Math.min(1, threatScore),
  }
}

export interface ParsedLogEntry {
  timestamp: Date
  sourceIp: string
  destinationIp: string
  url: string
  action: string
  bytesSent: number
  bytesReceived: number
  userAgent: string
  category: string
}

// ZScaler Web Proxy Log Parser
export function parseZScalerLog(logContent: string): ParsedLogEntry[] {
  const lines = logContent.split("\n").filter((line) => line.trim() && !line.startsWith("#"))
  const entries: ParsedLogEntry[] = []

  for (const line of lines) {
    try {
      // Sample ZScaler format: timestamp|user|department|location|action|url|category|bytes_sent|bytes_received|user_agent|source_ip|destination_ip
      const parts = line.split("|")
      if (parts.length >= 12) {
        const entry: ParsedLogEntry = {
          timestamp: new Date(parts[0]),
          sourceIp: parts[10] || "unknown",
          destinationIp: parts[11] || "unknown",
          url: parts[5] || "",
          action: parts[4] || "unknown",
          bytesSent: Number.parseInt(parts[7]) || 0,
          bytesReceived: Number.parseInt(parts[8]) || 0,
          userAgent: parts[9] || "",
          category: parts[6] || "uncategorized",
        }
        entries.push(entry)
      }
    } catch (error) {
      console.warn("Failed to parse log line:", line, error)
    }
  }

  return entries
}

// Generic log parser for common formats
export function parseGenericLog(logContent: string): ParsedLogEntry[] {
  const lines = logContent.split("\n").filter((line) => line.trim())
  const entries: ParsedLogEntry[] = []

  for (const line of lines) {
    try {
      // Try to extract common patterns
      const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)/)
      const ipMatch = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)
      const urlMatch = line.match(/https?:\/\/[^\s]+/)

      if (timestampMatch) {
        const entry: ParsedLogEntry = {
          timestamp: new Date(timestampMatch[1]),
          sourceIp: ipMatch?.[0] || "unknown",
          destinationIp: ipMatch?.[1] || "unknown",
          url: urlMatch?.[0] || "",
          action: line.includes("GET") ? "GET" : line.includes("POST") ? "POST" : "unknown",
          bytesSent: 0,
          bytesReceived: 0,
          userAgent: "",
          category: "web",
        }
        entries.push(entry)
      }
    } catch (error) {
      console.warn("Failed to parse log line:", line, error)
    }
  }

  return entries
}

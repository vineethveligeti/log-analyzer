export interface HDFSLogEntry {
  lineId: number
  date: string
  time: string
  pid: number
  level: string
  component: string
  content: string
  eventId: string
  eventTemplate: string
  blockId?: string
}

export interface HDFSAnalysisResult {
  blockId: string
  anomalyScore: number
  reason: string
}

export function parseHDFSLog(logContent: string): HDFSLogEntry[] {
  const lines = logContent.split("\n").filter((line) => line.trim() && !line.startsWith("LineId"))
  const entries: HDFSLogEntry[] = []

  for (const line of lines) {
    try {
      // Parse CSV format: LineId,Date,Time,Pid,Level,Component,Content,EventId,EventTemplate
      const parts = line.split(",")
      if (parts.length >= 9) {
        // Extract block ID from content if present
        const blockIdMatch = parts[6].match(/blk_[a-zA-Z0-9_-]+/)

        const entry: HDFSLogEntry = {
          lineId: Number.parseInt(parts[0]) || 0,
          date: parts[1] || "",
          time: parts[2] || "",
          pid: Number.parseInt(parts[3]) || 0,
          level: parts[4] || "",
          component: parts[5] || "",
          content: parts[6] || "",
          eventId: parts[7] || "",
          eventTemplate: parts[8] || "",
          blockId: blockIdMatch ? blockIdMatch[0] : undefined,
        }
        entries.push(entry)
      }
    } catch (error) {
      console.warn("Failed to parse HDFS log line:", line, error)
    }
  }

  return entries
}

export function extractBlockIds(entries: HDFSLogEntry[]): string[] {
  const blockIds = new Set<string>()

  entries.forEach((entry) => {
    if (entry.blockId) {
      blockIds.add(entry.blockId)
    }
  })

  return Array.from(blockIds)
}

export function formatHDFSTimestamp(date: string, time: string): Date {
  // Convert HDFS format (081109, 203518) to proper timestamp
  const year = 2000 + Number.parseInt(date.substring(4, 6)) // 09 -> 2009
  const month = Number.parseInt(date.substring(0, 2)) - 1 // 08 -> 7 (0-indexed)
  const day = Number.parseInt(date.substring(2, 4)) // 11 -> 11

  const hour = Number.parseInt(time.substring(0, 2)) // 20
  const minute = Number.parseInt(time.substring(2, 4)) // 35
  const second = Number.parseInt(time.substring(4, 6)) // 18

  return new Date(year, month, day, hour, minute, second)
}

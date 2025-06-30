import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import { parseZScalerLog, parseGenericLog } from "@/lib/log-parser"
import { analyzeLogEntries } from "@/lib/ai-analyzer"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const userId = session.userId

    // Get uploaded file
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Read file content
    const fileContent = await file.text()

    // Store upload record
    const uploadResult = await sql`
      INSERT INTO log_uploads (user_id, filename, file_size, status)
      VALUES (${userId}, ${file.name}, ${file.size}, 'processing')
      RETURNING id
    `
    const uploadId = uploadResult[0].id

    try {
      // Parse log file
      let parsedEntries
      if (file.name.toLowerCase().includes("zscaler") || fileContent.includes("|")) {
        parsedEntries = parseZScalerLog(fileContent)
      } else {
        parsedEntries = parseGenericLog(fileContent)
      }

      if (parsedEntries.length === 0) {
        await sql`
          UPDATE log_uploads 
          SET status = 'failed', analysis_results = ${{ error: "No valid log entries found" }}
          WHERE id = ${uploadId}
        `
        return NextResponse.json({ error: "No valid log entries found in the file" }, { status: 400 })
      }

      // Analyze with AI
      const { analysis, anomalies } = await analyzeLogEntries(parsedEntries)

      // Store log entries in database
      for (const entry of parsedEntries) {
        const anomaly = anomalies.find(
          (a) => a.timestamp.getTime() === entry.timestamp.getTime() && a.sourceIp === entry.sourceIp,
        )

        await sql`
          INSERT INTO log_entries (
            upload_id, timestamp, source_ip, destination_ip, url, action,
            bytes_sent, bytes_received, user_agent, category,
            threat_score, is_anomaly, anomaly_reason, confidence_score
          ) VALUES (
            ${uploadId}, ${entry.timestamp}, ${entry.sourceIp}, ${entry.destinationIp},
            ${entry.url}, ${entry.action}, ${entry.bytesSent}, ${entry.bytesReceived},
            ${entry.userAgent}, ${entry.category},
            ${anomaly?.threatScore || 0}, ${!!anomaly}, ${anomaly?.reason || null},
            ${anomaly?.confidenceScore || null}
          )
        `
      }

      // Update upload status
      await sql`
        UPDATE log_uploads 
        SET status = 'completed', analysis_results = ${JSON.stringify(analysis)}
        WHERE id = ${uploadId}
      `

      // Format response
      const response = {
        analysis,
        anomalies: anomalies.map((anomaly) => ({
          timestamp: anomaly.timestamp.toISOString(),
          sourceIp: anomaly.sourceIp,
          destinationIp: anomaly.destinationIp,
          url: anomaly.url,
          action: anomaly.action,
          isAnomaly: anomaly.isAnomaly,
          reason: anomaly.reason,
          confidenceScore: anomaly.confidenceScore,
          threatScore: anomaly.threatScore,
        })),
      }

      return NextResponse.json(response, { status: 200 })
    } catch (analysisError) {
      console.error("Analysis error:", analysisError)

      await sql`
        UPDATE log_uploads 
        SET status = 'failed', analysis_results = ${{ error: "Analysis failed" }}
        WHERE id = ${uploadId}
      `

      return NextResponse.json({ error: "Failed to analyze log file" }, { status: 500 })
    }
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

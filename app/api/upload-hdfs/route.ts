import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import { parseHDFSLog, extractBlockIds } from "@/lib/hdfs-parser"

export async function POST(request: NextRequest) {
  try {
    console.log("HDFS Upload: Starting upload process...")

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

    console.log(`HDFS Upload: Processing file ${file.name} (${file.size} bytes)`)

    // Read and parse HDFS log file
    const fileContent = await file.text()
    const hdfsEntries = parseHDFSLog(fileContent)

    console.log(`HDFS Upload: Parsed ${hdfsEntries.length} log entries`)

    if (hdfsEntries.length === 0) {
      return NextResponse.json({ error: "No valid HDFS log entries found" }, { status: 400 })
    }

    // Store upload record - try with analysis_status first, fallback without it
    let uploadResult
    try {
      uploadResult = await sql`
        INSERT INTO log_uploads (user_id, filename, file_size, status, analysis_status)
        VALUES (${userId}, ${file.name}, ${file.size}, 'uploaded', 'pending')
        RETURNING id
      `
    } catch (columnError) {
      console.warn("HDFS Upload: analysis_status column not found, using basic insert:", columnError)
      // Fallback to basic insert without analysis_status
      uploadResult = await sql`
        INSERT INTO log_uploads (user_id, filename, file_size, status)
        VALUES (${userId}, ${file.name}, ${file.size}, 'uploaded')
        RETURNING id
      `
    }

    const uploadId = uploadResult[0].id
    console.log(`HDFS Upload: Created upload record with ID ${uploadId}`)

    // Store HDFS log entries
    console.log("HDFS Upload: Storing log entries in database...")
    for (const entry of hdfsEntries) {
      await sql`
        INSERT INTO hdfs_log_entries (
          upload_id, line_id, date, time, pid, level, component, 
          content, event_id, event_template, block_id
        ) VALUES (
          ${uploadId}, ${entry.lineId}, ${entry.date}, ${entry.time}, 
          ${entry.pid}, ${entry.level}, ${entry.component}, 
          ${entry.content}, ${entry.eventId}, ${entry.eventTemplate}, 
          ${entry.blockId || null}
        )
      `
    }

    // Extract unique block IDs
    const blockIds = extractBlockIds(hdfsEntries)
    console.log(`HDFS Upload: Extracted ${blockIds.length} unique block IDs:`, blockIds.slice(0, 5))

    // Check Flask service configuration
    const flaskPort = process.env.FLASK_PORT || "5000"
    const flaskServiceUrl = process.env.FLASK_SERVICE_URL || `http://localhost:${flaskPort}`
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/analysis-callback`

    console.log(`HDFS Upload: Flask service URL: ${flaskServiceUrl}`)
    console.log(`HDFS Upload: Callback URL: ${callbackUrl}`)

    // First, check if Flask service is available
    let flaskHealthy = false
    try {
      console.log("HDFS Upload: Checking Flask service health...")

      const healthResponse = await fetch(`${flaskServiceUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      })

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        console.log("HDFS Upload: Flask service is healthy:", healthData)
        flaskHealthy = true
      } else {
        console.warn(`HDFS Upload: Flask service health check failed: ${healthResponse.status}`)
      }
    } catch (healthError) {
      console.warn("HDFS Upload: Flask service health check failed:", healthError)
    }

    // If Flask service is not available, provide mock analysis or instructions
    if (!flaskHealthy) {
      console.log("HDFS Upload: Flask service not available, providing mock analysis...")

      // Update status to indicate Flask service issue
      try {
        await sql`
          UPDATE log_uploads 
          SET analysis_status = 'flask_unavailable'
          WHERE id = ${uploadId}
        `
      } catch (updateError) {
        console.warn("HDFS Upload: Could not update status:", updateError)
      }

      // Generate mock analysis results for demonstration
      const mockResults = await generateMockAnalysis(uploadId, blockIds)

      return NextResponse.json({
        upload_id: uploadId,
        total_entries: hdfsEntries.length,
        unique_blocks: blockIds.length,
        status: "uploaded",
        analysis_status: "flask_unavailable",
        flask_service_url: flaskServiceUrl,
        mock_analysis: mockResults,
        instructions: {
          message: "Flask service is not running. You can either:",
          options: [
            "1. Start the Flask service using: npm run flask-simulator",
            "2. View the mock analysis results below",
            "3. Check the Flask service setup instructions in the README",
          ],
          flask_setup: {
            command: "npm run flask-simulator",
            url: `http://localhost:${flaskPort}`,
            health_check: `http://localhost:${flaskPort}/health`,
          },
        },
        error: "Flask service unavailable - using mock analysis",
      })
    }

    // Flask service is available, send analysis request
    try {
      console.log("HDFS Upload: Sending request to Flask service...")

      const flaskPayload = {
        upload_id: uploadId,
        filename: file.name,
        total_entries: hdfsEntries.length,
        block_ids: blockIds,
        callback_url: callbackUrl,
      }

      console.log("HDFS Upload: Flask payload:", JSON.stringify(flaskPayload, null, 2))

      const flaskResponse = await fetch(`${flaskServiceUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flaskPayload),
        signal: AbortSignal.timeout(15000), // 15 second timeout
      })

      console.log(`HDFS Upload: Flask response status: ${flaskResponse.status}`)

      if (flaskResponse.ok) {
        const flaskResult = await flaskResponse.json()
        console.log("HDFS Upload: Flask service response:", flaskResult)

        // Update upload with Flask job ID
        try {
          await sql`
            UPDATE log_uploads 
            SET flask_job_id = ${flaskResult.job_id}, analysis_status = 'processing'
            WHERE id = ${uploadId}
          `
          console.log(`HDFS Upload: Updated upload ${uploadId} with job ID ${flaskResult.job_id}`)
        } catch (updateError) {
          console.warn("HDFS Upload: Could not update analysis_status:", updateError)
        }

        return NextResponse.json({
          upload_id: uploadId,
          total_entries: hdfsEntries.length,
          unique_blocks: blockIds.length,
          status: "uploaded",
          analysis_status: "processing",
          flask_job_id: flaskResult.job_id,
          flask_response: flaskResult,
        })
      } else {
        const errorText = await flaskResponse.text()
        console.error(`HDFS Upload: Flask service error (${flaskResponse.status}):`, errorText)

        // Update status to indicate Flask service failure
        try {
          await sql`
            UPDATE log_uploads 
            SET analysis_status = 'flask_error'
            WHERE id = ${uploadId}
          `
        } catch (updateError) {
          console.warn("HDFS Upload: Could not update error status:", updateError)
        }

        return NextResponse.json({
          upload_id: uploadId,
          total_entries: hdfsEntries.length,
          unique_blocks: blockIds.length,
          status: "uploaded",
          analysis_status: "flask_error",
          error: `Flask service error: ${flaskResponse.status} - ${errorText}`,
        })
      }
    } catch (flaskError) {
      console.error("HDFS Upload: Failed to connect to Flask service:", flaskError)

      // Update status to indicate Flask service is unreachable
      try {
        await sql`
          UPDATE log_uploads 
          SET analysis_status = 'flask_unreachable'
          WHERE id = ${uploadId}
        `
      } catch (updateError) {
        console.warn("HDFS Upload: Could not update unreachable status:", updateError)
      }

      // Generate mock analysis for demonstration
      const mockResults = await generateMockAnalysis(uploadId, blockIds)

      return NextResponse.json({
        upload_id: uploadId,
        total_entries: hdfsEntries.length,
        unique_blocks: blockIds.length,
        status: "uploaded",
        analysis_status: "flask_unreachable",
        mock_analysis: mockResults,
        flask_service_url: flaskServiceUrl,
        instructions: {
          message: "Flask service connection failed. You can either:",
          options: [
            "1. Start the Flask service: npm run flask-simulator",
            `2. Check if Flask is running: curl http://localhost:${flaskPort}/health`,
            "3. View mock analysis results below",
          ],
          flask_setup: {
            command: "npm run flask-simulator",
            url: `http://localhost:${flaskPort}`,
            health_check: `http://localhost:${flaskPort}/health`,
          },
        },
        error: `Flask service unreachable: ${flaskError instanceof Error ? flaskError.message : "Unknown error"}`,
      })
    }
  } catch (error) {
    console.error("HDFS Upload: Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Failed to process HDFS log file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Generate mock analysis results for demonstration when Flask is not available
async function generateMockAnalysis(uploadId: string, blockIds: string[]) {
  console.log(`Generating mock analysis for upload ${uploadId} with ${blockIds.length} blocks`)

  const mockResults = []

  for (const blockId of blockIds.slice(0, 10)) {
    // Limit to first 10 blocks for demo
    // Generate realistic mock scores
    const anomalyScore = Math.random() * 100
    let reason = "Normal block operation"

    if (anomalyScore > 80) {
      reason = "High risk: Unusual block access pattern detected"
    } else if (anomalyScore > 60) {
      reason = "Medium risk: Elevated replication requests"
    } else if (anomalyScore > 40) {
      reason = "Low risk: Minor metadata validation warnings"
    }

    const result = {
      block_id: blockId,
      anomaly_score: Math.round(anomalyScore * 100) / 100,
      reason: reason,
      processed_at: new Date().toISOString(),
    }

    mockResults.push(result)

    // Store mock result in database
    try {
      await sql`
        INSERT INTO analysis_results (upload_id, block_id, anomaly_score, anomaly_reason)
        VALUES (${uploadId}, ${blockId}, ${result.anomaly_score}, ${result.reason})
      `

      // Update HDFS log entry
      await sql`
        UPDATE hdfs_log_entries 
        SET anomaly_score = ${result.anomaly_score}, 
            is_anomalous = ${result.anomaly_score > 50}, 
            anomaly_reason = ${result.reason}
        WHERE upload_id = ${uploadId} AND block_id = ${blockId}
      `
    } catch (dbError) {
      console.warn("Could not store mock result:", dbError)
    }
  }

  // Update upload status to completed for mock analysis
  try {
    await sql`
      UPDATE log_uploads 
      SET analysis_status = 'completed_mock', status = 'completed'
      WHERE id = ${uploadId}
    `
  } catch (updateError) {
    console.warn("Could not update mock completion status:", updateError)
  }

  return {
    total_blocks: blockIds.length,
    analyzed_blocks: mockResults.length,
    results: mockResults,
    note: "This is mock analysis data generated because Flask service is not available",
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import { parseHDFSLog, extractBlockIds } from "@/lib/hdfs-parser"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

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

    // Create temporary directory for uploaded files
    const tempDir = join(process.cwd(), "temp", "uploads")
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    // Save file to temporary directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = join(tempDir, `${timestamp}_${safeFilename}`)
    
    console.log(`HDFS Upload: Saving file to ${filePath}`)
    
    // Convert file to buffer and save
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, fileBuffer)
    
    console.log(`HDFS Upload: File saved successfully to ${filePath}`)

    // Read and parse HDFS log file
    const fileContent = await file.text()
    const hdfsEntries = parseHDFSLog(fileContent)

    console.log(`HDFS Upload: Parsed ${hdfsEntries.length} log entries`)

    if (hdfsEntries.length === 0) {
      return NextResponse.json({ error: "No valid HDFS log entries found" }, { status: 400 })
    }

    // Store upload record with file path
    let uploadResult
    try {
      uploadResult = await sql`
        INSERT INTO log_uploads (user_id, filename, file_size, status, analysis_status, file_path)
        VALUES (${userId}, ${file.name}, ${file.size}, 'uploaded', 'pending', ${filePath})
        RETURNING id
      `
    } catch (columnError) {
      console.warn("HDFS Upload: Some columns not found, using basic insert:", columnError)
      // Fallback to basic insert without optional columns
      uploadResult = await sql`
        INSERT INTO log_uploads (user_id, filename, file_size, status)
        VALUES (${userId}, ${file.name}, ${file.size}, 'uploaded')
        RETURNING id
      `
    }

    const uploadId = uploadResult[0].id
    console.log(`HDFS Upload: Created upload record with ID ${uploadId}`)

    // Store HDFS log entries using bulk insert (batch processing for better performance)
    console.log(`HDFS Upload: Storing ${hdfsEntries.length} log entries in database using bulk insert...`)
    
    if (hdfsEntries.length > 0) {
      // Process in batches to avoid query size limits and improve performance
      const BATCH_SIZE = 500 // Smaller batch size to avoid parameter limits
      const batches = []
      
      for (let i = 0; i < hdfsEntries.length; i += BATCH_SIZE) {
        batches.push(hdfsEntries.slice(i, i + BATCH_SIZE))
      }
      
      console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} entries each...`)
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        
        // Use the sql template literal with array of values
        const insertPromises = batch.map(entry => {
          const truncatedEntry = {
            ...entry,
            date: entry.date?.substring(0, 10) || "",
            time: entry.time?.substring(0, 10) || "",
            level: entry.level?.substring(0, 10) || "",
            eventId: entry.eventId?.substring(0, 10) || ""
          }
          
          return sql`
            INSERT INTO hdfs_log_entries (
              upload_id, line_id, date, time, pid, level, component, 
              content, event_id, event_template, block_id
            ) VALUES (
              ${uploadId}, ${truncatedEntry.lineId}, ${truncatedEntry.date}, ${truncatedEntry.time}, 
              ${truncatedEntry.pid}, ${truncatedEntry.level}, ${truncatedEntry.component}, 
              ${truncatedEntry.content}, ${truncatedEntry.eventId}, ${truncatedEntry.eventTemplate}, 
              ${truncatedEntry.blockId || null}
            )
          `
        })
        
        // Execute all inserts in this batch concurrently
        await Promise.all(insertPromises)
        
        console.log(`✓ Inserted batch ${batchIndex + 1}/${batches.length} (${batch.length} entries)`)
      }
      
      console.log(`✓ Bulk inserted all ${hdfsEntries.length} log entries successfully`)
    }

    // Extract unique block IDs
    const blockIds = extractBlockIds(hdfsEntries)
    console.log(`HDFS Upload: Extracted ${blockIds.length} unique block IDs:`, blockIds.slice(0, 5))

    // Check Flask service configuration
    const flaskPort = process.env.FLASK_PORT || "5555" // Default to 5555 to match Flask simulator
    const flaskServiceUrl = process.env.FLASK_SERVICE_URL || `http://localhost:${flaskPort}`
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/analysis-callback`

    console.log(`HDFS Upload: Environment variables:`)
    console.log(`  - FLASK_PORT: ${process.env.FLASK_PORT}`)
    console.log(`  - FLASK_SERVICE_URL: ${process.env.FLASK_SERVICE_URL}`)
    console.log(`  - NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`)
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

    // If Flask service is not available, return error
    if (!flaskHealthy) {
      console.log("HDFS Upload: Flask service not available")

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

      return NextResponse.json({
        success: false,
        error: "Flask ML service is not available",
        flask_instructions: [
          "1. Start the Flask service using: python scripts/flask-simulator.py",
          "2. Ensure it's running on the correct port (check .env.local)",
          "3. Try uploading again once Flask is running"
        ]
      }, { status: 503 })
    }

    // Flask service is available, send analysis request
    try {
      console.log("HDFS Upload: Sending request to Flask service...")

      const flaskPayload = {
        upload_id: uploadId,
        filename: file.name,
        file_path: filePath, // Path to the saved raw file
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

      return NextResponse.json({
        success: false,
        error: `Flask service unreachable: ${flaskError instanceof Error ? flaskError.message : "Unknown error"}`,
        flask_instructions: [
          "1. Start the Flask service: python scripts/flask-simulator.py",
          `2. Check if Flask is running: curl http://localhost:${flaskPort}/health`,
          "3. Try uploading again once Flask is running"
        ]
      }, { status: 503 })
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



import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { uploadId: string } }) {
  try {
    const uploadId = params.uploadId

    console.log(`Manual Analysis: Triggering analysis for upload ${uploadId}`)

    // Get upload info
    const uploadInfo = await sql`
      SELECT filename, user_id FROM log_uploads WHERE id = ${uploadId}
    `

    if (uploadInfo.length === 0) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    // Get HDFS entries for this upload
    const hdfsEntries = await sql`
      SELECT * FROM hdfs_log_entries WHERE upload_id = ${uploadId}
    `

    if (hdfsEntries.length === 0) {
      return NextResponse.json({ error: "No HDFS entries found for this upload" }, { status: 404 })
    }

    // Extract block IDs
    const blockIds = [...new Set(hdfsEntries.map((entry) => entry.block_id).filter(Boolean))]

    console.log(`Manual Analysis: Found ${blockIds.length} unique blocks`)

    // Send to Flask service
    const flaskPort = process.env.FLASK_PORT || "5000"
    const flaskServiceUrl = process.env.FLASK_SERVICE_URL || `http://localhost:${flaskPort}`
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/analysis-callback`

    const flaskPayload = {
      upload_id: uploadId,
      filename: uploadInfo[0].filename,
      total_entries: hdfsEntries.length,
      block_ids: blockIds,
      callback_url: callbackUrl,
    }

    console.log("Manual Analysis: Sending to Flask service:", flaskPayload)

    const flaskResponse = await fetch(`${flaskServiceUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flaskPayload),
      signal: AbortSignal.timeout(10000),
    })

    if (flaskResponse.ok) {
      const flaskResult = await flaskResponse.json()
      console.log("Manual Analysis: Flask response:", flaskResult)

      // Update upload status
      await sql`
        UPDATE log_uploads 
        SET flask_job_id = ${flaskResult.job_id}, analysis_status = 'processing'
        WHERE id = ${uploadId}
      `

      return NextResponse.json({
        success: true,
        flask_job_id: flaskResult.job_id,
        message: "Analysis triggered successfully",
      })
    } else {
      const errorText = await flaskResponse.text()
      console.error("Manual Analysis: Flask error:", errorText)

      return NextResponse.json(
        {
          error: `Flask service error: ${flaskResponse.status} - ${errorText}`,
        },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error("Manual Analysis: Error:", error)
    return NextResponse.json(
      {
        error: "Failed to trigger analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

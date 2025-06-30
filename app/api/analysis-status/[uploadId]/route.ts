import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { uploadId: string } }) {
  try {
    const uploadId = params.uploadId

    // Add connection resilience headers
    const headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      Connection: "keep-alive",
    }

    // Get upload status with error-resistant query
    let uploadStatus
    try {
      // Try full query first
      uploadStatus = await sql`
        SELECT 
          COALESCE(analysis_status, 'pending') as analysis_status,
          status, 
          filename, 
          COALESCE(created_at, upload_date, CURRENT_TIMESTAMP) as created_at,
          flask_job_id
        FROM log_uploads 
        WHERE id = ${uploadId}
      `
    } catch (fullQueryError) {
      console.warn("Full query failed, trying basic query:", fullQueryError)
      try {
        // Fallback to basic query
        uploadStatus = await sql`
          SELECT 
            status, 
            filename,
            upload_date
          FROM log_uploads 
          WHERE id = ${uploadId}
        `

        // Add default values for missing columns
        if (uploadStatus.length > 0) {
          uploadStatus[0].analysis_status = "pending"
          uploadStatus[0].created_at = uploadStatus[0].upload_date || new Date().toISOString()
          uploadStatus[0].flask_job_id = null
        }
      } catch (basicQueryError) {
        console.error("Even basic query failed:", basicQueryError)
        return NextResponse.json(
          {
            error: "Database connection failed",
            details: basicQueryError instanceof Error ? basicQueryError.message : "Unknown database error",
          },
          { status: 500, headers },
        )
      }
    }

    if (uploadStatus.length === 0) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404, headers })
    }

    // Get analysis progress with error handling and timeouts
    let totalBlocks, analyzedBlocks, anomalousBlocks, recentResults

    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        sql`
          SELECT COUNT(DISTINCT block_id) as count
          FROM hdfs_log_entries 
          WHERE upload_id = ${uploadId} AND block_id IS NOT NULL
        `,
        sql`
          SELECT COUNT(DISTINCT block_id) as count
          FROM analysis_results 
          WHERE upload_id = ${uploadId}
        `,
        sql`
          SELECT COUNT(DISTINCT block_id) as count
          FROM analysis_results 
          WHERE upload_id = ${uploadId} AND anomaly_score > 50
        `,
        sql`
          SELECT block_id, anomaly_score, anomaly_reason, processed_at
          FROM analysis_results 
          WHERE upload_id = ${uploadId}
          ORDER BY processed_at DESC
          LIMIT 10
        `,
      ])

      totalBlocks = results[0].status === "fulfilled" ? results[0].value : [{ count: 0 }]
      analyzedBlocks = results[1].status === "fulfilled" ? results[1].value : [{ count: 0 }]
      anomalousBlocks = results[2].status === "fulfilled" ? results[2].value : [{ count: 0 }]
      recentResults = results[3].status === "fulfilled" ? results[3].value : []

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(`Query ${index} failed:`, result.reason)
        }
      })
    } catch (error) {
      console.warn("All analysis queries failed:", error)
      totalBlocks = [{ count: 0 }]
      analyzedBlocks = [{ count: 0 }]
      anomalousBlocks = [{ count: 0 }]
      recentResults = []
    }

    const totalBlockCount = totalBlocks[0]?.count || 0
    const analyzedBlockCount = analyzedBlocks[0]?.count || 0
    const progress = totalBlockCount > 0 ? (analyzedBlockCount / totalBlockCount) * 100 : 0

    // Determine analysis status
    let analysisStatus = uploadStatus[0].analysis_status || "pending"

    // Auto-detect completion if not explicitly set
    if (analysisStatus === "pending" && analyzedBlockCount === totalBlockCount && totalBlockCount > 0) {
      analysisStatus = "completed"
    } else if (analysisStatus === "pending" && analyzedBlockCount > 0) {
      analysisStatus = "processing"
    }

    const responseData = {
      upload_id: uploadId,
      filename: uploadStatus[0].filename || "unknown.log",
      analysis_status: analysisStatus,
      status: uploadStatus[0].status || "uploaded",
      progress: Math.round(progress),
      total_blocks: totalBlockCount,
      analyzed_blocks: analyzedBlockCount,
      anomalous_blocks: anomalousBlocks[0]?.count || 0,
      recent_results: recentResults || [],
      uploaded_at: uploadStatus[0].created_at || new Date().toISOString(),
      flask_job_id: uploadStatus[0].flask_job_id || null,
      server_time: new Date().toISOString(),
    }

    return NextResponse.json(responseData, { headers })
  } catch (error) {
    console.error("Status check error:", error)

    const errorResponse = {
      error: "Failed to get analysis status",
      details: error instanceof Error ? error.message : "Unknown error",
      upload_id: params.uploadId,
      server_time: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }
}

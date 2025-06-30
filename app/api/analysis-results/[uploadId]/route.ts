import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ uploadId: string }> }) {
  try {
    const { uploadId } = await params

    // Get analysis results for the upload
    const results = await sql`
      SELECT 
        block_id,
        anomaly_score,
        anomaly_reason as reason
      FROM analysis_results 
      WHERE upload_id = ${uploadId}
      ORDER BY anomaly_score DESC, block_id
    `

    return NextResponse.json({
      upload_id: uploadId,
      results: results.map(result => ({
        block_id: result.block_id,
        anomaly_score: result.anomaly_score,
        reason: result.reason || "No reason provided"
      }))
    })

  } catch (error) {
    console.error("Error fetching analysis results:", error)
    return NextResponse.json(
      { error: "Failed to fetch analysis results" },
      { status: 500 }
    )
  }
} 
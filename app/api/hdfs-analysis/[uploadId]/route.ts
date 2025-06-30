import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { uploadId: string } }) {
  try {
    const uploadId = params.uploadId

    // Get upload info
    const uploadInfo = await sql`
      SELECT * FROM log_uploads WHERE id = ${uploadId}
    `

    if (uploadInfo.length === 0) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    // Get all analysis results
    const analysisResults = await sql`
      SELECT 
        ar.block_id,
        ar.anomaly_score,
        ar.anomaly_reason,
        ar.processed_at,
        hle.component,
        hle.level,
        hle.content,
        hle.date,
        hle.time
      FROM analysis_results ar
      JOIN hdfs_log_entries hle ON ar.upload_id = hle.upload_id AND ar.block_id = hle.block_id
      WHERE ar.upload_id = ${uploadId}
      ORDER BY ar.anomaly_score DESC, ar.processed_at DESC
    `

    // Get summary statistics
    const summary = await sql`
      SELECT 
        COUNT(*)::integer as total_blocks,
        COUNT(CASE WHEN anomaly_score > 80 THEN 1 END)::integer as high_risk_blocks,
        COUNT(CASE WHEN anomaly_score > 50 AND anomaly_score <= 80 THEN 1 END)::integer as medium_risk_blocks,
        COUNT(CASE WHEN anomaly_score <= 50 THEN 1 END)::integer as low_risk_blocks,
        COALESCE(AVG(anomaly_score), 0)::numeric(5,2) as avg_anomaly_score,
        COALESCE(MAX(anomaly_score), 0)::numeric(5,2) as max_anomaly_score
      FROM analysis_results
      WHERE upload_id = ${uploadId}
    `

    // Get component breakdown
    const componentBreakdown = await sql`
      SELECT 
        hle.component,
        COUNT(*)::integer as count,
        COALESCE(AVG(ar.anomaly_score), 0)::numeric(5,2) as avg_score,
        COUNT(CASE WHEN ar.anomaly_score > 50 THEN 1 END)::integer as anomalous_count
      FROM analysis_results ar
      JOIN hdfs_log_entries hle ON ar.upload_id = hle.upload_id AND ar.block_id = hle.block_id
      WHERE ar.upload_id = ${uploadId}
      GROUP BY hle.component
      ORDER BY avg_score DESC
    `

    // Get timeline data
    const timeline = await sql`
      SELECT 
        hle.date,
        hle.time,
        COUNT(*) as block_count,
        AVG(ar.anomaly_score) as avg_score,
        COUNT(CASE WHEN ar.anomaly_score > 50 THEN 1 END) as anomalous_count
      FROM analysis_results ar
      JOIN hdfs_log_entries hle ON ar.upload_id = hle.upload_id AND ar.block_id = hle.block_id
      WHERE ar.upload_id = ${uploadId}
      GROUP BY hle.date, hle.time
      ORDER BY hle.date, hle.time
    `

    return NextResponse.json({
      upload_info: uploadInfo[0],
      summary: summary[0],
      analysis_results: analysisResults,
      component_breakdown: componentBreakdown,
      timeline: timeline,
    })
  } catch (error) {
    console.error("HDFS analysis fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch HDFS analysis" }, { status: 500 })
  }
}

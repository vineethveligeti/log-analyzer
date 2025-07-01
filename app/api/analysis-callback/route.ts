import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { notifyAnalysisProgress } from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const { upload_id, block_id, anomaly_score, reason } = await request.json()

    if (!upload_id || !block_id || anomaly_score === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Store analysis result
    await sql`
      INSERT INTO analysis_results (upload_id, block_id, anomaly_score, anomaly_reason)
      VALUES (${upload_id}, ${block_id}, ${anomaly_score}, ${reason || ""})
    `

    // Update HDFS log entry with anomaly information
    await sql`
      UPDATE hdfs_log_entries 
      SET anomaly_score = ${anomaly_score}, 
          is_anomalous = ${anomaly_score > 50}, 
          anomaly_reason = ${reason || ""}
      WHERE upload_id = ${upload_id} AND block_id = ${block_id}
    `

    // Check if all blocks have been analyzed
    const totalBlocks = await sql`
      SELECT COUNT(DISTINCT block_id) as count
      FROM hdfs_log_entries 
      WHERE upload_id = ${upload_id} AND block_id IS NOT NULL
    `

    const analyzedBlocks = await sql`
      SELECT COUNT(DISTINCT block_id) as count
      FROM analysis_results 
      WHERE upload_id = ${upload_id}
    `

    // Notify about progress
    const progress = {
      total_blocks: totalBlocks[0].count,
      analyzed_blocks: analyzedBlocks[0].count,
      current_block: block_id,
      anomaly_score,
      reason
    }
    
    notifyAnalysisProgress(upload_id, progress)

    // If all blocks are analyzed, update upload status
    if (totalBlocks[0].count === analyzedBlocks[0].count) {
      await sql`
        UPDATE log_uploads 
        SET analysis_status = 'completed', status = 'completed'
        WHERE id = ${upload_id}
      `
      
      console.log(`✓ All blocks analyzed for upload ${upload_id}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Analysis callback error:", error)
    return NextResponse.json({ error: "Failed to process analysis result" }, { status: 500 })
  }
}

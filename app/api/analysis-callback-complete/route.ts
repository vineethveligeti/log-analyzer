import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { notifyAnalysisComplete } from "../analysis-notifications/route"

export async function POST(request: NextRequest) {
  try {
    const { 
      upload_id, 
      analysis_complete, 
      analysis_filename, 
      analysis_filepath, 
      total_blocks_processed,
      results 
    } = await request.json()

    if (!upload_id || !analysis_complete) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`Analysis complete for upload ${upload_id}:`)
    console.log(`- Filename: ${analysis_filename}`)
    console.log(`- Filepath: ${analysis_filepath}`)
    console.log(`- Blocks processed: ${total_blocks_processed}`)
    console.log(`- Results count: ${results?.length || 0}`)

    // Update upload status with analysis file information
    await sql`
      UPDATE log_uploads 
      SET 
        analysis_status = 'completed', 
        status = 'completed',
        analysis_results = ${JSON.stringify({
          analysis_filename,
          analysis_filepath,
          total_blocks_processed,
          completed_at: new Date().toISOString(),
        })}
      WHERE id = ${upload_id}
    `

    // Save analysis results to database if provided
    if (results && Array.isArray(results) && results.length > 0) {
      console.log(`Saving ${results.length} analysis results to database...`)
      
      for (const result of results) {
        console.log(`Saving result: ${upload_id} ,${result.block_id}`)
        await sql`
          INSERT INTO analysis_results (upload_id, block_id, anomaly_score, anomaly_reason, processed_at)
          VALUES (
            ${upload_id}, 
            ${result.block_id}, 
            ${result.anomaly_score}, 
            ${result.reason || 'No reason provided'}, 
            ${new Date().toISOString()}
          )
          ON CONFLICT (upload_id, block_id) DO UPDATE SET
            anomaly_score = EXCLUDED.anomaly_score,
            anomaly_reason = EXCLUDED.anomaly_reason,
            processed_at = EXCLUDED.processed_at
        `
      }
      
      console.log(`✓ Saved ${results.length} analysis results to database`)
    }

    // Notify connected clients about analysis completion
    const analysisData = {
      analysis_filename,
      analysis_filepath,
      total_blocks_processed,
      results_count: results?.length || 0,
      completed_at: new Date().toISOString()
    }
    
    notifyAnalysisComplete(upload_id, analysisData)
    console.log(`✓ Notified clients about analysis completion for upload ${upload_id}`)

    return NextResponse.json({ 
      success: true, 
      message: "Analysis completion recorded",
      results_saved: results?.length || 0
    })
  } catch (error) {
    console.error("Analysis completion callback error:", error)
    return NextResponse.json({ error: "Failed to process completion callback" }, { status: 500 })
  }
}

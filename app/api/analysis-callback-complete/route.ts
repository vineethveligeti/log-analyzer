import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { notifyAnalysisComplete } from "@/lib/notifications"
import fs from "fs/promises"

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

    // Get file path for cleanup
    let filePath = null
    try {
      const uploadInfo = await sql`
        SELECT file_path FROM log_uploads WHERE id = ${upload_id}
      `
      if (uploadInfo.length > 0) {
        filePath = uploadInfo[0].file_path
      }
    } catch (error) {
      console.warn(`Analysis Complete: Could not get file path for upload ${upload_id}:`, error)
    }

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

    // Clean up uploaded file after successful analysis
    if (filePath) {
      try {
        await fs.unlink(filePath)
        console.log(`✓ Cleanup: Deleted uploaded file after analysis completion for upload ${upload_id}: ${filePath}`)
      } catch (cleanupError) {
        console.error(`⚠️  Cleanup: Failed to delete file for upload ${upload_id}: ${filePath}`, cleanupError)
      }
    }

    // Save analysis results to database using bulk insert if provided
    if (results && Array.isArray(results) && results.length > 0) {
      console.log(`Saving ${results.length} analysis results to database using bulk insert...`)
      
      // Process in batches for better performance
      const BATCH_SIZE = 500
      const batches = []
      
      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        batches.push(results.slice(i, i + BATCH_SIZE))
      }
      
      console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} results each...`)
      const processedAt = new Date().toISOString()
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        
        // Use concurrent inserts for this batch
        const insertPromises = batch.map(result => {
          return sql`
            INSERT INTO analysis_results (upload_id, block_id, anomaly_score, anomaly_reason, processed_at)
            VALUES (
              ${upload_id}, 
              ${result.block_id}, 
              ${result.anomaly_score}, 
              ${result.reason || 'No reason provided'}, 
              ${processedAt}
            )
            ON CONFLICT (upload_id, block_id) DO UPDATE SET
              anomaly_score = EXCLUDED.anomaly_score,
              anomaly_reason = EXCLUDED.anomaly_reason,
              processed_at = EXCLUDED.processed_at
          `
        })
        
        // Execute all inserts in this batch concurrently
        await Promise.all(insertPromises)
        
        console.log(`✓ Inserted batch ${batchIndex + 1}/${batches.length} (${batch.length} results)`)
      }
      
      console.log(`✓ Bulk saved all ${results.length} analysis results to database`)
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

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { upload_id, analysis_complete, analysis_filename, analysis_filepath, total_blocks_processed } =
      await request.json()

    if (!upload_id || !analysis_complete) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`Analysis complete for upload ${upload_id}:`)
    console.log(`- Filename: ${analysis_filename}`)
    console.log(`- Filepath: ${analysis_filepath}`)
    console.log(`- Blocks processed: ${total_blocks_processed}`)

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

    return NextResponse.json({ success: true, message: "Analysis completion recorded" })
  } catch (error) {
    console.error("Analysis completion callback error:", error)
    return NextResponse.json({ error: "Failed to process completion callback" }, { status: 500 })
  }
}

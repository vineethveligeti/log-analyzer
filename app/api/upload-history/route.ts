import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get all uploads (for now, we'll add user filtering later)
    const uploads = await sql`
      SELECT 
        id,
        filename,
        upload_date,
        analysis_status,
        flask_job_id
      FROM log_uploads 
      ORDER BY upload_date DESC
    `

    return NextResponse.json({
      uploads: uploads.map(upload => ({
        id: upload.id,
        filename: upload.filename,
        upload_date: upload.upload_date,
        analysis_status: upload.analysis_status || 'pending',
        flask_job_id: upload.flask_job_id
      }))
    })

  } catch (error) {
    console.error("Error fetching upload history:", error)
    return NextResponse.json(
      { error: "Failed to fetch upload history" },
      { status: 500 }
    )
  }
} 
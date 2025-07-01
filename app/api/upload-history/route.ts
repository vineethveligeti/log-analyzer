import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const userId = session.userId

    // Get uploads for the authenticated user only
    const uploads = await sql`
      SELECT 
        id,
        filename,
        upload_date,
        analysis_status,
        flask_job_id
      FROM log_uploads 
      WHERE user_id = ${userId}
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
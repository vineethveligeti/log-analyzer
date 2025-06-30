import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ uploadId: string }> }) {
  try {
    const { uploadId } = await params

    // Get upload info with analysis results
    const uploadInfo = await sql`
      SELECT analysis_results, filename
      FROM log_uploads 
      WHERE id = ${uploadId} AND analysis_status = 'completed'
    `

    if (uploadInfo.length === 0) {
      return NextResponse.json({ error: "Analysis not found or not completed" }, { status: 404 })
    }

    const analysisResults = uploadInfo[0].analysis_results
    const originalFilename = uploadInfo[0].filename

    if (!analysisResults?.analysis_filename) {
      return NextResponse.json({ error: "Analysis file not available" }, { status: 404 })
    }

    // Try to fetch the analysis file from Flask service
    try {
      const flaskResponse = await fetch(`${process.env.FLASK_SERVICE_URL}/results/${analysisResults.analysis_filename}`)

      if (flaskResponse.ok) {
        const csvContent = await flaskResponse.text()

        // Return CSV file as download
        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="analysis_${originalFilename}_${analysisResults.analysis_filename}"`,
          },
        })
      } else {
        return NextResponse.json({ error: "Analysis file not available from Flask service" }, { status: 404 })
      }
    } catch (flaskError) {
      console.error("Error fetching from Flask service:", flaskError)
      return NextResponse.json({ error: "Failed to retrieve analysis file" }, { status: 500 })
    }
  } catch (error) {
    console.error("Download analysis error:", error)
    return NextResponse.json({ error: "Failed to download analysis file" }, { status: 500 })
  }
}

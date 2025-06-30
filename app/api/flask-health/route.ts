import { NextResponse } from "next/server"

export async function GET() {
  try {
    const flaskPort = process.env.FLASK_PORT || "5000"
    const flaskServiceUrl = process.env.FLASK_SERVICE_URL || `http://localhost:${flaskPort}`

    console.log(`Flask Health: Checking ${flaskServiceUrl}/health`)

    const response = await fetch(`${flaskServiceUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (response.ok) {
      const data = await response.json()
      console.log("Flask Health: Service is healthy", data)

      return NextResponse.json({
        status: "healthy",
        flask_service_url: flaskServiceUrl,
        flask_response: data,
      })
    } else {
      console.error(`Flask Health: Service returned ${response.status}`)

      return NextResponse.json(
        {
          status: "error",
          flask_service_url: flaskServiceUrl,
          error: `Flask service returned ${response.status}`,
        },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error("Flask Health: Connection failed", error)

    const flaskPort = process.env.FLASK_PORT || "5000"
    const flaskServiceUrl = process.env.FLASK_SERVICE_URL || `http://localhost:${flaskPort}`

    return NextResponse.json(
      {
        status: "unreachable",
        flask_service_url: flaskServiceUrl,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    )
  }
}

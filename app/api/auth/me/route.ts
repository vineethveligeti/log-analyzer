import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    console.log("Auth API: Checking session...")

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    console.log("Auth API: Session cookie exists:", !!sessionCookie)

    if (!sessionCookie) {
      console.log("Auth API: No session cookie found")
      return NextResponse.json({ error: "Not authenticated - no session cookie" }, { status: 401 })
    }

    try {
      const session = JSON.parse(sessionCookie.value)
      console.log("Auth API: Session parsed successfully:", { userId: session.userId, email: session.email })

      if (!session.userId || !session.email) {
        console.log("Auth API: Invalid session data")
        return NextResponse.json({ error: "Invalid session data" }, { status: 401 })
      }

      return NextResponse.json(
        {
          id: session.userId,
          email: session.email,
        },
        { status: 200 },
      )
    } catch (parseError) {
      console.error("Auth API: Session parse error:", parseError)
      return NextResponse.json({ error: "Invalid session format" }, { status: 401 })
    }
  } catch (error) {
    console.error("Auth API: Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

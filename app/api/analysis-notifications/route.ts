import { type NextRequest } from "next/server"
import { addConnection, removeConnection } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  console.log("SSE: New connection request received")
  
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the set
      addConnection(controller)
      
      // Send initial connection message
      const initialMessage = JSON.stringify({ 
        type: 'connected', 
        message: 'Connected to analysis notifications',
        timestamp: new Date().toISOString()
      })
      controller.enqueue(`data: ${initialMessage}\n\n`)
      console.log("SSE: Sent initial connection message")
      
      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        removeConnection(controller)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

 
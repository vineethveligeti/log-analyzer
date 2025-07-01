import { type NextRequest } from "next/server"

// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  console.log("SSE: New connection request received")
  
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the set
      connections.add(controller)
      console.log(`SSE: Connection added. Total connections: ${connections.size}`)
      
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
        connections.delete(controller)
        console.log(`SSE: Connection removed. Total connections: ${connections.size}`)
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

// Function to notify all connected clients about analysis completion
export function notifyAnalysisComplete(uploadId: string, analysisData: any) {
  console.log(`SSE: Notifying ${connections.size} clients about analysis completion for upload ${uploadId}`)
  
  const message = JSON.stringify({
    type: 'analysis_complete',
    uploadId,
    data: analysisData,
    timestamp: new Date().toISOString()
  })

  // Send to all connected clients
  let clientIndex = 0
  connections.forEach((controller) => {
    try {
      controller.enqueue(`data: ${message}\n\n`)
      console.log(`SSE: Sent notification to client ${clientIndex + 1}`)
      clientIndex++
    } catch (error) {
      console.error(`SSE: Error sending to client ${clientIndex + 1}:`, error)
      // Remove disconnected clients
      connections.delete(controller)
    }
  })
  
  console.log(`SSE: Notification sent to ${connections.size} clients`)
}

// Function to notify about analysis progress
export function notifyAnalysisProgress(uploadId: string, progress: any) {
  console.log(`SSE: Notifying ${connections.size} clients about analysis progress for upload ${uploadId}`)
  
  const message = JSON.stringify({
    type: 'analysis_progress',
    uploadId,
    data: progress,
    timestamp: new Date().toISOString()
  })

  let clientIndex = 0
  connections.forEach((controller) => {
    try {
      controller.enqueue(`data: ${message}\n\n`)
      clientIndex++
    } catch (error) {
      console.error(`SSE: Error sending progress to client ${clientIndex + 1}:`, error)
      connections.delete(controller)
    }
  })
} 
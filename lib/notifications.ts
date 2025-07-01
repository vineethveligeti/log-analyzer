// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller)
  console.log(`SSE: Connection added. Total connections: ${connections.size}`)
}

export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller)
  console.log(`SSE: Connection removed. Total connections: ${connections.size}`)
}

// Function to notify all connected clients about analysis completion
export function notifyAnalysisComplete(uploadId: string, analysisData: Record<string, unknown>) {
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
export function notifyAnalysisProgress(uploadId: string, progress: Record<string, unknown>) {
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
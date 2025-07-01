import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

export const sql = neon(process.env.DATABASE_URL)

export interface User {
  id: number
  email: string
  password_hash: string
  created_at: string
}

export interface LogUpload {
  id: number
  user_id: number
  filename: string
  file_size: number
  upload_date: string
  status: string
  analysis_results?: Record<string, unknown>
}

export interface LogEntry {
  id: number
  upload_id: number
  timestamp: string
  source_ip: string
  destination_ip: string
  url: string
  action: string
  bytes_sent: number
  bytes_received: number
  user_agent: string
  category: string
  threat_score: number
  is_anomaly: boolean
  anomaly_reason?: string
  confidence_score?: number
}

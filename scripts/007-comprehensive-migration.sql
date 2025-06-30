-- Comprehensive migration script for Neon PostgreSQL database
-- This script ensures all tables, constraints, and indexes are properly created

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create log_uploads table
CREATE TABLE IF NOT EXISTS log_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  analysis_results JSONB
);

-- 3. Create log_entries table
CREATE TABLE IF NOT EXISTS log_entries (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER REFERENCES log_uploads(id),
  timestamp TIMESTAMP,
  source_ip VARCHAR(45),
  destination_ip VARCHAR(45),
  url VARCHAR(1000),
  action VARCHAR(50),
  bytes_sent INTEGER,
  bytes_received INTEGER,
  user_agent TEXT,
  category VARCHAR(100),
  threat_score DECIMAL(3,2) DEFAULT 0.0,
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_reason TEXT,
  confidence_score DECIMAL(3,2)
);

-- 4. Add HDFS-specific columns to log_uploads
ALTER TABLE log_uploads ADD COLUMN IF NOT EXISTS flask_job_id VARCHAR(255);
ALTER TABLE log_uploads ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(50) DEFAULT 'pending';

-- 5. Create HDFS log entries table with proper column sizes
CREATE TABLE IF NOT EXISTS hdfs_log_entries (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER REFERENCES log_uploads(id),
  line_id INTEGER,
  date VARCHAR(50),
  time VARCHAR(50),
  pid INTEGER,
  level VARCHAR(50),
  component VARCHAR(255),
  content TEXT,
  event_id VARCHAR(50),
  event_template TEXT,
  block_id VARCHAR(255),
  anomaly_score DECIMAL(5,2) DEFAULT 0.0,
  is_anomalous BOOLEAN DEFAULT FALSE,
  anomaly_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER REFERENCES log_uploads(id),
  block_id VARCHAR(255),
  anomaly_score DECIMAL(5,2),
  anomaly_reason TEXT,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Add unique constraint to analysis_results (drop if exists first)
ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS unique_upload_block;
ALTER TABLE analysis_results ADD CONSTRAINT unique_upload_block UNIQUE (upload_id, block_id);

-- 8. Create all necessary indexes
CREATE INDEX IF NOT EXISTS idx_log_entries_upload_id ON log_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_log_entries_source_ip ON log_entries(source_ip);
CREATE INDEX IF NOT EXISTS idx_log_entries_is_anomaly ON log_entries(is_anomaly);

CREATE INDEX IF NOT EXISTS idx_hdfs_log_entries_upload_id ON hdfs_log_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_hdfs_log_entries_block_id ON hdfs_log_entries(block_id);
CREATE INDEX IF NOT EXISTS idx_hdfs_log_entries_anomaly_score ON hdfs_log_entries(anomaly_score);
CREATE INDEX IF NOT EXISTS idx_hdfs_log_entries_is_anomalous ON hdfs_log_entries(is_anomalous);

CREATE INDEX IF NOT EXISTS idx_analysis_results_upload_id ON analysis_results(upload_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_block_id ON analysis_results(block_id);

-- 9. Add comments for documentation
COMMENT ON CONSTRAINT unique_upload_block ON analysis_results IS 'Ensures unique combination of upload_id and block_id for ON CONFLICT support';
COMMENT ON TABLE analysis_results IS 'Stores real-time analysis results from Flask AI service'; 
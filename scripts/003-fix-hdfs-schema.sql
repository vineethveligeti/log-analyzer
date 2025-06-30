-- Fix HDFS log schema - add missing columns to log_uploads table
ALTER TABLE log_uploads ADD COLUMN IF NOT EXISTS flask_job_id VARCHAR(255);
ALTER TABLE log_uploads ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(50) DEFAULT 'pending';

-- Update existing records to have default analysis_status
UPDATE log_uploads SET analysis_status = 'pending' WHERE analysis_status IS NULL;

-- Ensure HDFS log entries table exists with correct structure
CREATE TABLE IF NOT EXISTS hdfs_log_entries (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER REFERENCES log_uploads(id),
  line_id INTEGER,
  date VARCHAR(10),
  time VARCHAR(10),
  pid INTEGER,
  level VARCHAR(10),
  component VARCHAR(255),
  content TEXT,
  event_id VARCHAR(10),
  event_template TEXT,
  block_id VARCHAR(255),
  anomaly_score DECIMAL(5,2) DEFAULT 0.0,
  is_anomalous BOOLEAN DEFAULT FALSE,
  anomaly_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for HDFS logs if they don't exist
CREATE INDEX IF NOT EXISTS idx_hdfs_log_entries_upload_id ON hdfs_log_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_hdfs_log_entries_block_id ON hdfs_log_entries(block_id);
CREATE INDEX IF NOT EXISTS idx_hdfs_log_entries_anomaly_score ON hdfs_log_entries(anomaly_score);
CREATE INDEX IF NOT EXISTS idx_hdfs_log_entries_is_anomalous ON hdfs_log_entries(is_anomalous);

-- Create analysis results table for real-time updates if it doesn't exist
CREATE TABLE IF NOT EXISTS analysis_results (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER REFERENCES log_uploads(id),
  block_id VARCHAR(255),
  anomaly_score DECIMAL(5,2),
  anomaly_reason TEXT,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_upload_id ON analysis_results(upload_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_block_id ON analysis_results(block_id);

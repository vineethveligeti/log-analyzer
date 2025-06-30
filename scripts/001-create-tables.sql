-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create log_uploads table
CREATE TABLE IF NOT EXISTS log_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  analysis_results JSONB
);

-- Create log_entries table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_log_entries_upload_id ON log_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_log_entries_source_ip ON log_entries(source_ip);
CREATE INDEX IF NOT EXISTS idx_log_entries_is_anomaly ON log_entries(is_anomaly);

-- Fix missing created_at column in log_uploads table
ALTER TABLE log_uploads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have a created_at timestamp
UPDATE log_uploads SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- Ensure all required columns exist in log_uploads
ALTER TABLE log_uploads ADD COLUMN IF NOT EXISTS flask_job_id VARCHAR(255);
ALTER TABLE log_uploads ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(50) DEFAULT 'pending';

-- Update existing records
UPDATE log_uploads SET analysis_status = 'pending' WHERE analysis_status IS NULL;

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'log_uploads' 
ORDER BY ordinal_position;

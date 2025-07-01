-- Add file_path column to log_uploads table for storing uploaded file locations
-- This allows the Flask ML model to read the raw uploaded files

ALTER TABLE log_uploads ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Add comment for documentation
COMMENT ON COLUMN log_uploads.file_path IS 'Path to the uploaded file on the server filesystem for ML model access'; 
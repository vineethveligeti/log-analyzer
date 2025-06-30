-- Add unique constraint to analysis_results table for ON CONFLICT support
-- This ensures that each combination of upload_id and block_id is unique

-- Add the unique constraint
ALTER TABLE analysis_results 
ADD CONSTRAINT unique_upload_block UNIQUE (upload_id, block_id);

-- Add a comment to document the constraint
COMMENT ON CONSTRAINT unique_upload_block ON analysis_results IS 'Ensures unique combination of upload_id and block_id for ON CONFLICT support'; 
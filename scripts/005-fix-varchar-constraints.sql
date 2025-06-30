-- Fix VARCHAR constraints that are too restrictive for HDFS log data
-- Update the hdfs_log_entries table to allow longer values

-- Update date field to allow longer date formats
ALTER TABLE hdfs_log_entries ALTER COLUMN date TYPE VARCHAR(20);

-- Update time field to allow longer time formats  
ALTER TABLE hdfs_log_entries ALTER COLUMN time TYPE VARCHAR(20);

-- Update level field to allow longer log levels
ALTER TABLE hdfs_log_entries ALTER COLUMN level TYPE VARCHAR(20);

-- Update event_id field to allow longer event IDs
ALTER TABLE hdfs_log_entries ALTER COLUMN event_id TYPE VARCHAR(50);

-- Add a comment to document the changes
COMMENT ON TABLE hdfs_log_entries IS 'Updated VARCHAR constraints to handle longer HDFS log data values'; 
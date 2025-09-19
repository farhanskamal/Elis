-- Update existing data to use monitor terminology
-- This migration updates all volunteer references to monitor

-- First, update the shift assignments table
UPDATE shift_assignments SET monitor_id = volunteer_id WHERE volunteer_id IS NOT NULL;

-- Update the task assignments table 
UPDATE task_assignments SET monitor_id = volunteer_id WHERE volunteer_id IS NOT NULL;

-- Update the task statuses table
UPDATE task_statuses SET monitor_id = volunteer_id WHERE volunteer_id IS NOT NULL;

-- Update the monitor logs table (rename volunteerLog table)
UPDATE monitor_logs SET monitor_id = volunteer_id WHERE volunteer_id IS NOT NULL;
UPDATE monitor_logs SET monitor_name = volunteer_name WHERE volunteer_name IS NOT NULL;

-- Update the magazine logs table
UPDATE magazine_logs SET checked_by_monitor_id = checked_by_volunteer_id WHERE checked_by_volunteer_id IS NOT NULL;

-- Now drop the old columns (this will be handled by the Prisma schema changes)
-- The old columns will be automatically dropped when we push the new schema

-- Update user roles from VOLUNTEER to MONITOR
UPDATE users SET role = 'MONITOR' WHERE role = 'VOLUNTEER';
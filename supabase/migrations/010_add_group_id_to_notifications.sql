-- Migration to add group_id column to notifications table

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Create an index on group_id for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON notifications(group_id);

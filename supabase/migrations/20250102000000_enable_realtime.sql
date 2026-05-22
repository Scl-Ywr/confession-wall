-- Enable Realtime for all tables used in realtime subscriptions
-- This migration ensures all necessary tables are published for realtime updates

-- Disable realtime for tables (if they were enabled)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS confessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS likes;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS comments;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS chat_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS group_members;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS friend_requests;

-- Enable realtime for all necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;

-- Grant necessary permissions for realtime (if using RLS)
-- Note: Make sure your RLS policies allow users to see the data they should receive via realtime

-- Optional: Create a function to enable realtime for a table
CREATE OR REPLACE FUNCTION enable_table_realtime(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a function to disable realtime for a table
CREATE OR REPLACE FUNCTION disable_table_realtime(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %I', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION enable_table_realtime TO authenticated;
GRANT EXECUTE ON FUNCTION disable_table_realtime TO authenticated;

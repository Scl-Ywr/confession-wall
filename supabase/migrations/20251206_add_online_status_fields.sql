-- Add online_status and last_seen fields to profiles table
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'offline', 'away')),
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the updated_at trigger function to include the new fields
-- This ensures that the updated_at column is updated whenever online_status or last_seen changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is enabled
ALTER TRIGGER update_profiles_updated_at ON profiles ENABLE;

-- Create index for online_status to improve query performance
CREATE INDEX IF NOT EXISTS idx_profiles_online_status ON profiles(online_status);

-- Create index for last_seen to improve query performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
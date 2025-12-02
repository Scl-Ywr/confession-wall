-- Add group-specific profile columns to group_members table
ALTER TABLE IF EXISTS group_members
ADD COLUMN IF NOT EXISTS group_nickname TEXT,
ADD COLUMN IF NOT EXISTS group_avatar_url TEXT;

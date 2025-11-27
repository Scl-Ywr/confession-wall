-- This migration completes the user management system
-- It builds on Supabase Auth's built-in auth.users table

-- Create or update profiles table to store user personal information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
-- Allow public read access to profiles (for viewing user info on confessions/comments)
CREATE POLICY "Allow public read access to profiles" ON profiles
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow users to insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create a function to update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles table to update updated_at column
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract username from email (before @ symbol)
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id, 
    SUBSTRING(NEW.email FROM 1 FOR POSITION('@' IN NEW.email) - 1),
    SUBSTRING(NEW.email FROM 1 FOR POSITION('@' IN NEW.email) - 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
-- Index for username lookup (used for login and profile viewing)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Index for display_name search (used for searching users)
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Index for created_at (used for sorting users by join date)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Create a function to update user password (example implementation)
-- Note: This is just an example, Supabase Auth handles password management
CREATE OR REPLACE FUNCTION update_user_password(new_password TEXT)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  -- This is a placeholder - in practice, use Supabase Auth's API to update passwords
  -- This function demonstrates how you might structure custom password update logic
  RAISE NOTICE 'Password update requested for user: %', current_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get current user profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS profiles AS $$
BEGIN
  RETURN (SELECT * FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- Create a function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
  p_username TEXT,
  p_display_name TEXT,
  p_avatar_url TEXT,
  p_bio TEXT
)
RETURNS profiles AS $$
BEGIN
  UPDATE profiles
  SET 
    username = COALESCE(p_username, username),
    display_name = COALESCE(p_display_name, display_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    bio = COALESCE(p_bio, bio)
  WHERE id = auth.uid();
  
  RETURN (SELECT * FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

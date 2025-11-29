-- Fix RLS policies for profiles table
-- Ensure users can update their own profile
CREATE OR REPLACE POLICY "Allow users to update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure users can insert their own profile
CREATE OR REPLACE POLICY "Allow users to insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure update_likes_count function is properly created
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE confessions
    SET likes_count = likes_count + 1
    WHERE id = NEW.confession_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE confessions
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.confession_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers are properly created
DROP TRIGGER IF EXISTS update_likes_count_after_insert ON likes;
DROP TRIGGER IF EXISTS update_likes_count_after_delete ON likes;

CREATE TRIGGER update_likes_count_after_insert
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();

CREATE TRIGGER update_likes_count_after_delete
AFTER DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();

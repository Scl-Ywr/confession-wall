-- Create confessions table
CREATE TABLE IF NOT EXISTS confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes_count INTEGER DEFAULT 0
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(confession_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for confessions
CREATE POLICY "Allow public read access" ON confessions
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON confessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owner to update" ON confessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete" ON confessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for likes
CREATE POLICY "Allow public read access" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON likes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owner to delete" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Allow public read access" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owner to update" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_confession_id ON likes(confession_id);
CREATE INDEX IF NOT EXISTS idx_comments_confession_id ON comments(confession_id);

-- Enable realtime for confessions table
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

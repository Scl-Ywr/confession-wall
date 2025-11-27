-- Create confession_images table to store multiple images per confession
CREATE TABLE IF NOT EXISTS confession_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE confession_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for confession_images
CREATE POLICY "Allow public read access" ON confession_images
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON confession_images
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owner to delete" ON confession_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM confessions 
      WHERE confessions.id = confession_images.confession_id 
      AND confessions.user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_confession_images_confession_id ON confession_images(confession_id);

-- Enable realtime for confession_images table
ALTER PUBLICATION supabase_realtime ADD TABLE confession_images;

-- Add lock features to confession_images table
ALTER TABLE confession_images
ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN lock_password TEXT,
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN lock_type TEXT DEFAULT 'password'; -- password, public, user

-- Update RLS policy to allow owner to update lock status
CREATE POLICY "Allow owner to update lock status" ON confession_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM confessions 
      WHERE confessions.id = confession_images.confession_id 
      AND confessions.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM confessions 
      WHERE confessions.id = confession_images.confession_id 
      AND confessions.user_id = auth.uid()
    )
  );

-- Create index for locked media
CREATE INDEX IF NOT EXISTS idx_confession_images_locked ON confession_images(is_locked);

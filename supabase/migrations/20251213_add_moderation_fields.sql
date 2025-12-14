-- Add moderation fields to confessions table
ALTER TABLE confessions
ADD COLUMN status VARCHAR(20) DEFAULT 'approved',
ADD COLUMN moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN moderated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT;

-- Create index for moderation status
CREATE INDEX IF NOT EXISTS idx_confessions_status ON confessions(status);

-- Update RLS policies for confessions to include moderation status

-- Allow public read access only to approved confessions
DROP POLICY "Allow public read access" ON confessions;
CREATE POLICY "Allow public read access" ON confessions
  FOR SELECT USING (status = 'approved');

-- Allow authenticated users to insert with pending status
DROP POLICY "Allow authenticated users to insert" ON confessions;
CREATE POLICY "Allow authenticated users to insert" ON confessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow owner to update, but not change moderation status
DROP POLICY "Allow owner to update" ON confessions;
CREATE POLICY "Allow owner to update" ON confessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (status = OLD.status OR status IS NULL));

-- Allow admins to moderate confessions
CREATE POLICY "Allow admins to moderate" ON confessions
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Enable realtime for confessions table with moderation status
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;

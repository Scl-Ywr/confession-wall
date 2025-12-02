-- Create group_message_read_status table
CREATE TABLE IF NOT EXISTS group_message_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id, message_id)
);

-- Enable RLS for group_message_read_status table
ALTER TABLE group_message_read_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for group_message_read_status
CREATE POLICY "Users can view their own group message read status" ON group_message_read_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert group message read status" ON group_message_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own group message read status" ON group_message_read_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group message read status" ON group_message_read_status
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_message_read_status_group ON group_message_read_status(group_id);
CREATE INDEX IF NOT EXISTS idx_group_message_read_status_user ON group_message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_group_message_read_status_message ON group_message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_read_status_is_read ON group_message_read_status(is_read);

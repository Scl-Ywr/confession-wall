-- Add indexes for admin panel queries

-- profiles table indexes for user management
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- confessions table indexes for confession management
CREATE INDEX IF NOT EXISTS idx_confessions_content ON confessions(content);
CREATE INDEX IF NOT EXISTS idx_confessions_status ON confessions(status);
CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);

-- chat_messages table indexes for chat management
CREATE INDEX IF NOT EXISTS idx_chat_messages_content ON chat_messages(content);

-- groups table indexes for group management
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_description ON groups(description);

-- friendships table indexes for friend management
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_updated_at ON friendships(updated_at DESC);

-- logs table indexes for log management
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_resource_type ON logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- confession_images table indexes for media management
CREATE INDEX IF NOT EXISTS idx_confession_images_confession_id ON confession_images(confession_id);
CREATE INDEX IF NOT EXISTS idx_confession_images_created_at ON confession_images(created_at DESC);

-- Add composite indexes to likes table for better query performance
CREATE INDEX IF NOT EXISTS idx_likes_confession_user ON likes(confession_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_confession ON likes(user_id, confession_id);

-- Add index to chat_messages for group messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created_at ON chat_messages(group_id, created_at DESC);

-- Add index to chat_messages for private messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_sender ON chat_messages(receiver_id, sender_id, created_at DESC);
-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'mention', 'follow', 'confession_like', 'comment_reply')),
  content TEXT NOT NULL,
  related_id UUID, -- 相关内容ID（表白ID、评论ID等）
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 创建获取用户通知的函数
CREATE OR REPLACE FUNCTION get_user_notifications(
  user_id_param UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0,
  unread_only BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  id UUID,
  recipient_id UUID,
  sender_id UUID,
  type TEXT,
  content TEXT,
  related_id UUID,
  read_status BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  sender_profile: profiles,
  sender_username TEXT,
  sender_display_name TEXT,
  sender_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.recipient_id,
    n.sender_id,
    n.type,
    n.content,
    n.related_id,
    n.read_status,
    n.created_at,
    n.updated_at,
    p as sender_profile,
    p.username as sender_username,
    p.display_name as sender_display_name,
    p.avatar_url as sender_avatar_url
  FROM notifications n
  LEFT JOIN profiles p ON n.sender_id = p.id
  WHERE n.recipient_id = user_id_param
    AND (CASE WHEN unread_only THEN n.read_status = FALSE ELSE TRUE END)
  ORDER BY n.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- 创建标记通知为已读的函数
CREATE OR REPLACE FUNCTION mark_notification_read(
  notification_id_param UUID,
  user_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET read_status = TRUE, updated_at = CURRENT_TIMESTAMP
  WHERE id = notification_id_param 
    AND recipient_id = user_id_param
    AND read_status = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 创建标记所有通知为已读的函数
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
  user_id_param UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET read_status = TRUE, updated_at = CURRENT_TIMESTAMP
  WHERE recipient_id = user_id_param 
    AND read_status = FALSE;
END;
$$ LANGUAGE plpgsql;

-- 创建获取未读通知数量的函数
CREATE OR REPLACE FUNCTION get_unread_notifications_count(
  user_id_param UUID
) RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE recipient_id = user_id_param 
    AND read_status = FALSE;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 创建点赞通知的函数
CREATE OR REPLACE FUNCTION create_like_notification(
  p_confession_id UUID,
  p_liker_id UUID,
  p_confession_author_id UUID
) RETURNS VOID AS $$
BEGIN
  -- 如果点赞者不是作者，则创建通知
  IF p_liker_id != p_confession_author_id THEN
    INSERT INTO notifications (
      recipient_id, 
      sender_id, 
      type, 
      content, 
      related_id
    )
    VALUES (
      p_confession_author_id, 
      p_liker_id, 
      'confession_like', 
      '有人点赞了你的表白', 
      p_confession_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建评论通知的函数
CREATE OR REPLACE FUNCTION create_comment_notification(
  p_confession_id UUID,
  p_comment_id UUID,
  p_commenter_id UUID,
  p_confession_author_id UUID
) RETURNS VOID AS $$
BEGIN
  -- 如果评论者不是作者，则创建通知
  IF p_commenter_id != p_confession_author_id THEN
    INSERT INTO notifications (
      recipient_id, 
      sender_id, 
      type, 
      content, 
      related_id
    )
    VALUES (
      p_confession_author_id, 
      p_commenter_id, 
      'comment', 
      '有人评论了你的表白', 
      p_confession_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS策略
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的通知
CREATE POLICY "Allow users to read their own notifications" ON notifications FOR SELECT USING (
  auth.uid() = recipient_id
);

-- 允许认证用户创建通知
CREATE POLICY "Allow authenticated users to create notifications" ON notifications FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- 允许用户更新自己的通知状态
CREATE POLICY "Allow users to update their own notifications" ON notifications FOR UPDATE USING (
  auth.uid() = recipient_id
);

-- 允许用户删除自己的通知
CREATE POLICY "Allow users to delete their own notifications" ON notifications FOR DELETE USING (
  auth.uid() = recipient_id
);
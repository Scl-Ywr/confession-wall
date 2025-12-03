-- 修复安全相关问题

-- 1. 重新创建confession_details视图，移除SECURITY DEFINER属性
CREATE OR REPLACE VIEW confession_details AS
SELECT 
  c.id,
  c.content,
  c.is_anonymous,
  c.user_id,
  c.created_at,
  c.likes_count,
  c.comments_count,
  p.username,
  p.display_name,
  p.avatar_url,
  GREATEST(c.created_at, COALESCE((SELECT MAX(created_at) FROM comments WHERE confession_id = c.id), c.created_at)) AS last_activity_at
FROM confessions c
LEFT JOIN profiles p ON c.user_id = p.id
ORDER BY last_activity_at DESC;

-- 2. 重新创建group_unread_counts视图，移除SECURITY DEFINER属性
CREATE OR REPLACE VIEW group_unread_counts AS
SELECT 
  gmc.group_id,
  gmc.user_id,
  COUNT(cm.id) AS unread_count
FROM group_read_counters gmc
JOIN chat_messages cm ON cm.group_id = gmc.group_id
WHERE (gmc.last_read_message_id IS NULL AND cm.created_at > CURRENT_TIMESTAMP - INTERVAL '1 day')
   OR (gmc.last_read_message_id IS NOT NULL AND cm.created_at > (SELECT created_at FROM chat_messages WHERE id = gmc.last_read_message_id))
GROUP BY gmc.group_id, gmc.user_id;

-- 3. 为group_read_counters表启用RLS
ALTER TABLE group_read_counters ENABLE ROW LEVEL SECURITY;

-- 4. 为group_read_counters表设置RLS策略
-- 允许用户只能访问自己的已读状态
CREATE POLICY "Allow users to access their own read counters" ON group_read_counters
  FOR SELECT USING (auth.uid() = user_id);

-- 允许用户只能更新自己的已读状态
CREATE POLICY "Allow users to update their own read counters" ON group_read_counters
  FOR UPDATE USING (auth.uid() = user_id);

-- 允许用户插入自己的已读状态
CREATE POLICY "Allow users to insert their own read counters" ON group_read_counters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 允许用户删除自己的已读状态
CREATE POLICY "Allow users to delete their own read counters" ON group_read_counters
  FOR DELETE USING (auth.uid() = user_id);

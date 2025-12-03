-- 创建群聊已读状态表，使用计数器策略
CREATE TABLE IF NOT EXISTS group_read_counters (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_group_read_counters_group ON group_read_counters(group_id);
CREATE INDEX IF NOT EXISTS idx_group_read_counters_user ON group_read_counters(user_id);

-- 创建视图，用于查询每个群成员的未读消息数量
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
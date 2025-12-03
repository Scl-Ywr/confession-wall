-- 添加评论数字段到confessions表
ALTER TABLE confessions ADD COLUMN comments_count INTEGER DEFAULT 0;

-- 创建函数，在评论被创建或删除时更新评论数
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE confessions
    SET comments_count = comments_count + 1
    WHERE id = NEW.confession_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE confessions
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.confession_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，在评论表发生INSERT或DELETE操作时调用函数
CREATE TRIGGER update_comments_count_after_insert
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();

CREATE TRIGGER update_comments_count_after_delete
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();

-- 更新现有表白的评论数
UPDATE confessions
SET comments_count = (
  SELECT COUNT(*) FROM comments WHERE comments.confession_id = confessions.id
);

-- 创建视图，用于查询表白的详细信息，包括点赞数、评论数和最新活动时间
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

-- 创建索引，优化视图查询
CREATE INDEX IF NOT EXISTS idx_confessions_likes_count ON confessions(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_comments_count ON confessions(comments_count DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
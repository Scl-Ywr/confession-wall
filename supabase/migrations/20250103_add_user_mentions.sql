-- 创建用户提及表
CREATE TABLE IF NOT EXISTS user_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentioned_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(confession_id, mentioned_user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_mentions_confession_id ON user_mentions(confession_id);
CREATE INDEX IF NOT EXISTS idx_user_mentions_mentioned_user_id ON user_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_user_mentions_mentioned_by_user_id ON user_mentions(mentioned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_mentions_created_at ON user_mentions(created_at DESC);

-- 创建解析和处理提及的函数
CREATE OR REPLACE FUNCTION process_mentions(
  p_confession_id UUID,
  p_content TEXT,
  p_author_id UUID
) RETURNS VOID AS $$
DECLARE
  mention_username TEXT;
  mentioned_user_id UUID;
  mention_pattern TEXT;
BEGIN
  -- 使用正则表达式查找@username格式的提及
  FOR mention_username IN 
    SELECT regexp_matches[1] 
    FROM regexp_matches(p_content, '@([a-zA-Z0-9_]+)', 'g') AS regexp_matches
  LOOP
    -- 查找被提及的用户ID
    SELECT id INTO mentioned_user_id
    FROM profiles
    WHERE username = mention_username;
    
    -- 如果找到用户且不是作者自己，则创建提及记录
    IF found AND mentioned_user_id IS NOT NULL AND mentioned_user_id != p_author_id THEN
      INSERT INTO user_mentions (confession_id, mentioned_user_id, mentioned_by_user_id)
      VALUES (p_confession_id, mentioned_user_id, p_author_id)
      ON CONFLICT (confession_id, mentioned_user_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，在表白创建时自动处理提及
CREATE OR REPLACE FUNCTION auto_process_mentions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM process_mentions(NEW.id, NEW.content, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS process_mentions_trigger ON confessions;
CREATE TRIGGER process_mentions_trigger
AFTER INSERT ON confessions
FOR EACH ROW
EXECUTE FUNCTION auto_process_mentions();

-- RLS策略
ALTER TABLE user_mentions ENABLE ROW LEVEL SECURITY;

-- 允许用户查看提及自己的记录
CREATE POLICY "Allow users to read mentions about themselves" ON user_mentions FOR SELECT USING (
  auth.uid() = mentioned_user_id OR auth.uid() = mentioned_by_user_id
);

-- 允许认证用户创建提及记录
CREATE POLICY "Allow authenticated users to create mentions" ON user_mentions FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- 允许表白创建者删除提及记录
CREATE POLICY "Allow confession creators to delete mentions" ON user_mentions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM confessions 
    WHERE confessions.id = user_mentions.confession_id 
    AND confessions.user_id = auth.uid()
  )
);

-- 创建获取用户提及的函数
CREATE OR REPLACE FUNCTION get_user_mentions(
  user_id_param UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  confession_id UUID,
  mentioned_user_id UUID,
  mentioned_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  confession_content TEXT,
  mentioned_by_username TEXT,
  mentioned_by_display_name TEXT,
  mentioned_by_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    um.id,
    um.confession_id,
    um.mentioned_user_id,
    um.mentioned_by_user_id,
    um.created_at,
    c.content as confession_content,
    p.username as mentioned_by_username,
    p.display_name as mentioned_by_display_name,
    p.avatar_url as mentioned_by_avatar_url
  FROM user_mentions um
  JOIN confessions c ON um.confession_id = c.id
  JOIN profiles p ON um.mentioned_by_user_id = p.id
  WHERE um.mentioned_user_id = user_id_param
  ORDER BY um.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
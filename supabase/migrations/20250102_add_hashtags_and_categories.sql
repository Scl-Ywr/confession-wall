-- 创建话题标签表
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建表白与标签关联表
CREATE TABLE IF NOT EXISTS confession_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(confession_id, hashtag_id)
);

-- 创建内容分类表
CREATE TABLE IF NOT EXISTS confession_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- 图标名称或emoji
  color TEXT, -- 分类颜色
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 为表白添加分类字段
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES confession_categories(id);

-- 插入默认分类
INSERT INTO confession_categories (name, description, icon, color) VALUES
('情感', '爱情、友情、亲情等情感相关', '❤️', '#FF6B6B'),
('生活', '日常生活分享', '🌱', '#4ECDC4'),
('校园', '校园生活相关', '🎓', '#45B7D1'),
('感谢', '感谢与致敬', '🙏', '#96CEB4'),
('道歉', '道歉与反思', '💬', '#FFEAA7'),
('祝福', '祝福与祝愿', '🎉', '#DDA0DD')
ON CONFLICT (name) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_usage_count ON hashtags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_confession_hashtags_confession_id ON confession_hashtags(confession_id);
CREATE INDEX IF NOT EXISTS idx_confession_hashtags_hashtag_id ON confession_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_confessions_category_id ON confessions(category_id);

-- 创建更新标签使用次数的函数
CREATE OR REPLACE FUNCTION increment_hashtag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hashtags 
  SET usage_count = usage_count + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.hashtag_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建标签关联触发器
CREATE TRIGGER increment_hashtag_usage_trigger
AFTER INSERT ON confession_hashtags
FOR EACH ROW
EXECUTE FUNCTION increment_hashtag_usage();

-- 创建更新标签使用次数的函数（删除时）
CREATE OR REPLACE FUNCTION decrement_hashtag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hashtags 
  SET usage_count = GREATEST(0, usage_count - 1),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.hashtag_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 创建标签关联删除触发器
CREATE TRIGGER decrement_hashtag_usage_trigger
AFTER DELETE ON confession_hashtags
FOR EACH ROW
EXECUTE FUNCTION decrement_hashtag_usage();

-- 创建获取热门标签的函数
CREATE OR REPLACE FUNCTION get_trending_hashtags(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  tag TEXT,
  usage_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.tag,
    h.usage_count,
    h.created_at
  FROM hashtags h
  WHERE h.usage_count > 0
  ORDER BY h.usage_count DESC, h.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 创建搜索包含特定标签的表白的函数
CREATE OR REPLACE FUNCTION get_confessions_by_hashtag(tag_text TEXT, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  content TEXT,
  is_anonymous BOOLEAN,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  likes_count BIGINT,
  category_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.is_anonymous,
    c.user_id,
    c.created_at,
    c.likes_count,
    c.category_id
  FROM confessions c
  JOIN confession_hashtags ch ON c.id = ch.confession_id
  JOIN hashtags h ON ch.hashtag_id = h.id
  WHERE h.tag = tag_text
  ORDER BY c.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- 创建获取分类下表白的函数
CREATE OR REPLACE FUNCTION get_confessions_by_category(category_id_param UUID, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  content TEXT,
  is_anonymous BOOLEAN,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  likes_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.is_anonymous,
    c.user_id,
    c.created_at,
    c.likes_count
  FROM confessions c
  WHERE c.category_id = category_id_param
  ORDER BY c.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- RLS策略
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_categories ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取标签和分类
CREATE POLICY "Allow all users to read hashtags" ON hashtags FOR SELECT USING (true);
CREATE POLICY "Allow all users to read confession_hashtags" ON confession_hashtags FOR SELECT USING (true);
CREATE POLICY "Allow all users to read confession_categories" ON confession_categories FOR SELECT USING (true);

-- 允许认证用户创建标签关联
CREATE POLICY "Allow authenticated users to create confession_hashtags" ON confession_hashtags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许表白创建者删除标签关联
CREATE POLICY "Allow confession creators to delete confession_hashtags" ON confession_hashtags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM confessions 
    WHERE confessions.id = confession_hashtags.confession_id 
    AND confessions.user_id = auth.uid()
  )
);

-- 允许认证用户创建标签
CREATE POLICY "Allow authenticated users to create hashtags" ON hashtags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许所有用户更新标签（仅使用次数）
CREATE POLICY "Allow all users to update hashtags" ON hashtags FOR UPDATE USING (true) WITH CHECK (true);
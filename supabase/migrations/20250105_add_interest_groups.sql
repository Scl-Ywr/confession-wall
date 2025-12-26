-- 创建兴趣圈子表
CREATE TABLE IF NOT EXISTS interest_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- 图标名称或emoji
  cover_image TEXT, -- 封面图片URL
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户-兴趣圈子关联表
CREATE TABLE IF NOT EXISTS user_interest_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES interest_groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  role TEXT DEFAULT 'member', -- member, admin, owner
  UNIQUE(user_id, group_id)
);

-- 创建兴趣圈子专属表白表
CREATE TABLE IF NOT EXISTS group_confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES interest_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(confession_id, group_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_interest_groups_name ON interest_groups(name);
CREATE INDEX IF NOT EXISTS idx_interest_groups_created_by ON interest_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_user_interest_groups_user_id ON user_interest_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interest_groups_group_id ON user_interest_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_group_confessions_group_id ON group_confessions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_confessions_confession_id ON group_confessions(confession_id);

-- 创建递增成员数的函数
CREATE OR REPLACE FUNCTION increment_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE interest_groups 
  SET member_count = member_count + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建递减成员数的函数
CREATE OR REPLACE FUNCTION decrement_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE interest_groups 
  SET member_count = GREATEST(0, member_count - 1),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.group_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 创建成员加入触发器
CREATE TRIGGER increment_group_member_count_trigger
AFTER INSERT ON user_interest_groups
FOR EACH ROW
EXECUTE FUNCTION increment_group_member_count();

-- 创建成员离开触发器
CREATE TRIGGER decrement_group_member_count_trigger
AFTER DELETE ON user_interest_groups
FOR EACH ROW
EXECUTE FUNCTION decrement_group_member_count();

-- RLS策略
ALTER TABLE interest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_confessions ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取兴趣圈子
CREATE POLICY "Allow all users to read interest_groups" ON interest_groups FOR SELECT USING (true);

-- 允许认证用户创建兴趣圈子
CREATE POLICY "Allow authenticated users to create interest_groups" ON interest_groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许圈子创建者更新圈子信息
CREATE POLICY "Allow group creators to update interest_groups" ON interest_groups FOR UPDATE USING (
  created_by = auth.uid()
);

-- 允许圈子创建者删除圈子
CREATE POLICY "Allow group creators to delete interest_groups" ON interest_groups FOR DELETE USING (
  created_by = auth.uid()
);

-- 允许认证用户加入/退出兴趣圈子
CREATE POLICY "Allow authenticated users to manage group membership" ON user_interest_groups FOR ALL USING (
  auth.role() = 'authenticated'
);

-- 允许认证用户将表白发布到兴趣圈子
CREATE POLICY "Allow authenticated users to post to groups" ON group_confessions FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM user_interest_groups 
    WHERE user_interest_groups.user_id = auth.uid() 
    AND user_interest_groups.group_id = group_confessions.group_id
  )
);

-- 允许表白创建者或圈子管理员删除圈子表白
CREATE POLICY "Allow creators or admins to delete group confessions" ON group_confessions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM confessions 
    WHERE confessions.id = group_confessions.confession_id 
    AND confessions.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM user_interest_groups 
    WHERE user_interest_groups.user_id = auth.uid() 
    AND user_interest_groups.group_id = group_confessions.group_id
    AND user_interest_groups.role IN ('admin', 'owner')
  )
);
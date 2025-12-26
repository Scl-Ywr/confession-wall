-- 创建成就表
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- 图标或徽章URL
  type TEXT NOT NULL, -- 成就类型：post, like, comment, follow, group, etc.
  condition INTEGER NOT NULL, -- 达成条件数量
  reward_points INTEGER DEFAULT 0, -- 奖励积分
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 0, -- 当前进度
  is_unlocked BOOLEAN DEFAULT false,
  UNIQUE(user_id, achievement_id)
);

-- 创建用户等级表
CREATE TABLE IF NOT EXISTS user_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  next_level_points INTEGER DEFAULT 100, -- 升级所需积分
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_is_unlocked ON user_achievements(is_unlocked);

-- 插入默认成就
INSERT INTO achievements (name, description, icon, type, condition, reward_points) VALUES
('第一次表白', '发布你的第一条表白', '📝', 'post', 1, 10),
('表白达人', '发布10条表白', '✍️', 'post', 10, 50),
('表白大师', '发布50条表白', '🏆', 'post', 50, 100),
('点赞新手', '获得10个点赞', '👍', 'like', 10, 20),
('点赞达人', '获得100个点赞', '❤️', 'like', 100, 100),
('社交达人', '加入3个兴趣圈子', '👥', 'group', 3, 30),
('圈子创建者', '创建一个兴趣圈子', '🚀', 'group', 1, 40),
('评论达人', '发表20条评论', '💬', 'comment', 20, 60)
ON CONFLICT (name) DO NOTHING;

-- 创建检查和更新成就的函数
CREATE OR REPLACE FUNCTION check_and_update_achievements()
RETURNS TRIGGER AS $$
DECLARE
  achievement RECORD;
  user_achievement RECORD;
  progress_count INTEGER;
  achievement_type TEXT;
BEGIN
  -- 确定成就类型
  IF TG_TABLE_NAME = 'confessions' THEN
    achievement_type := 'post';
  ELSIF TG_TABLE_NAME = 'confession_likes' THEN
    achievement_type := 'like';
  ELSIF TG_TABLE_NAME = 'confession_comments' THEN
    achievement_type := 'comment';
  ELSIF TG_TABLE_NAME = 'user_interest_groups' THEN
    achievement_type := 'group';
  END IF;
  
  -- 遍历该类型的所有成就
  FOR achievement IN SELECT * FROM achievements WHERE type = achievement_type LOOP
    -- 获取用户当前进度
    IF achievement_type = 'post' THEN
      SELECT COUNT(*) INTO progress_count FROM confessions WHERE user_id = NEW.user_id;
    ELSIF achievement_type = 'like' THEN
      SELECT COUNT(*) INTO progress_count FROM confession_likes WHERE confession_id IN (SELECT id FROM confessions WHERE user_id = NEW.user_id);
    ELSIF achievement_type = 'comment' THEN
      SELECT COUNT(*) INTO progress_count FROM confession_comments WHERE user_id = NEW.user_id;
    ELSIF achievement_type = 'group' THEN
      SELECT COUNT(*) INTO progress_count FROM user_interest_groups WHERE user_id = NEW.user_id;
    END IF;
    
    -- 查找或创建用户成就记录
    SELECT * INTO user_achievement FROM user_achievements 
    WHERE user_id = NEW.user_id AND achievement_id = achievement.id;
    
    IF NOT FOUND THEN
      -- 创建新的用户成就记录
      INSERT INTO user_achievements (user_id, achievement_id, progress, is_unlocked) 
      VALUES (NEW.user_id, achievement.id, progress_count, progress_count >= achievement.condition);
      
      -- 如果解锁了成就，更新用户积分和等级
      IF progress_count >= achievement.condition THEN
        PERFORM update_user_level(NEW.user_id, achievement.reward_points);
      END IF;
    ELSE
      -- 更新现有记录
      UPDATE user_achievements 
      SET progress = progress_count,
          is_unlocked = progress_count >= achievement.condition,
          earned_at = CASE WHEN progress_count >= achievement.condition AND NOT user_achievement.is_unlocked THEN CURRENT_TIMESTAMP ELSE user_achievement.earned_at END
      WHERE user_id = NEW.user_id AND achievement_id = achievement.id;
      
      -- 如果刚解锁成就，更新用户积分和等级
      IF progress_count >= achievement.condition AND NOT user_achievement.is_unlocked THEN
        PERFORM update_user_level(NEW.user_id, achievement.reward_points);
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新用户等级的函数
CREATE OR REPLACE FUNCTION update_user_level(user_id_param UUID, points_added INTEGER)
RETURNS VOID AS $$
DECLARE
  current_points INTEGER;
  current_level INTEGER;
  next_level_cost INTEGER;
BEGIN
  -- 获取当前用户等级信息
  SELECT COALESCE(total_points, 0), COALESCE(current_level, 1), COALESCE(next_level_points, 100)
  INTO current_points, current_level, next_level_cost
  FROM user_levels WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    -- 创建新的用户等级记录
    INSERT INTO user_levels (user_id, total_points, current_level, next_level_points)
    VALUES (user_id_param, points_added, 1, 100);
  ELSE
    -- 更新积分
    current_points := current_points + points_added;
    
    -- 检查是否升级
    WHILE current_points >= next_level_cost LOOP
      current_points := current_points - next_level_cost;
      current_level := current_level + 1;
      next_level_cost := next_level_cost * 1.5; -- 每级所需积分增加50%
    END LOOP;
    
    -- 更新用户等级信息
    UPDATE user_levels 
    SET total_points = current_points,
        current_level = current_level,
        next_level_points = next_level_cost,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = user_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当发布表白时检查成就
CREATE TRIGGER check_post_achievements
AFTER INSERT ON confessions
FOR EACH ROW
EXECUTE FUNCTION check_and_update_achievements();

-- 创建触发器：当获得点赞时检查成就
CREATE TRIGGER check_like_achievements
AFTER INSERT ON confession_likes
FOR EACH ROW
EXECUTE FUNCTION check_and_update_achievements();

-- 创建触发器：当发表评论时检查成就
CREATE TRIGGER check_comment_achievements
AFTER INSERT ON confession_comments
FOR EACH ROW
EXECUTE FUNCTION check_and_update_achievements();

-- 创建触发器：当加入圈子时检查成就
CREATE TRIGGER check_group_achievements
AFTER INSERT ON user_interest_groups
FOR EACH ROW
EXECUTE FUNCTION check_and_update_achievements();

-- RLS策略
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取成就
CREATE POLICY "Allow all users to read achievements" ON achievements FOR SELECT USING (true);

-- 允许用户读取自己的成就
CREATE POLICY "Allow users to read their own achievements" ON user_achievements FOR SELECT USING (
  user_id = auth.uid()
);

-- 允许用户读取自己的等级
CREATE POLICY "Allow users to read their own levels" ON user_levels FOR SELECT USING (
  user_id = auth.uid()
);

-- 允许认证用户创建成就（管理员功能）
CREATE POLICY "Allow authenticated users to create achievements" ON achievements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许认证用户更新成就（管理员功能）
CREATE POLICY "Allow authenticated users to update achievements" ON achievements FOR UPDATE USING (auth.role() = 'authenticated');

-- 允许认证用户删除成就（管理员功能）
CREATE POLICY "Allow authenticated users to delete achievements" ON achievements FOR DELETE USING (auth.role() = 'authenticated');
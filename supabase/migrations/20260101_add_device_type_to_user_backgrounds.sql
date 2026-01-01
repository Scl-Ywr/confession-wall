-- 添加device_type列到user_backgrounds表
ALTER TABLE IF EXISTS user_backgrounds
ADD COLUMN IF NOT EXISTS device_type VARCHAR(20) DEFAULT 'desktop';

-- 创建唯一索引，确保每个用户每种设备只有一个背景设置
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_backgrounds_user_device
ON user_backgrounds(user_id, device_type);

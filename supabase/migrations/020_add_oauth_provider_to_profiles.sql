-- 添加 OAuth 提供商字段到 profiles 表
-- 用于存储用户使用的第三方登录提供商（github, google, apple, facebook 等）

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS oauth_provider TEXT,
ADD COLUMN IF NOT EXISTS oauth_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS oauth_username TEXT;

-- 添加注释说明字段用途
COMMENT ON COLUMN profiles.oauth_provider IS '第三方登录提供商（github, google, apple, facebook）';
COMMENT ON COLUMN profiles.oauth_avatar_url IS '第三方提供商的用户头像URL';
COMMENT ON COLUMN profiles.oauth_username IS '第三方提供商的用户名';

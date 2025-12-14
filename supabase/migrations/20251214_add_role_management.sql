-- 创建角色表
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建权限表
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- 创建用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- 更新profiles表，添加角色相关的字段
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 为roles表创建更新时间触发器
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 启用RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS策略
-- 允许管理员管理角色和权限
CREATE POLICY "Allow admins to manage roles" ON roles
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Allow admins to manage permissions" ON permissions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Allow admins to manage role permissions" ON role_permissions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Allow admins to manage user roles" ON user_roles
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- 插入初始角色
INSERT INTO roles (name, description) VALUES
('super_admin', '超级管理员，拥有所有权限'),
('admin', '管理员，拥有管理权限'),
('moderator', '版主，拥有内容审核权限'),
('user', '普通用户，拥有基础权限')
ON CONFLICT (name) DO NOTHING;

-- 插入初始权限
INSERT INTO permissions (name, description) VALUES
('manage_users', '管理用户'),
('manage_roles', '管理角色'),
('manage_permissions', '管理权限'),
('manage_confessions', '管理表白内容'),
('manage_comments', '管理评论'),
('manage_messages', '管理消息'),
('moderate_content', '审核内容'),
('view_statistics', '查看统计数据')
ON CONFLICT (name) DO NOTHING;

-- 为超级管理员分配所有权限
DO $$
DECLARE
  super_admin_id UUID;
  permission_record RECORD;
BEGIN
  SELECT id INTO super_admin_id FROM roles WHERE name = 'super_admin';
  
  FOR permission_record IN SELECT id FROM permissions LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (super_admin_id, permission_record.id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;

-- 为管理员分配基本管理权限
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM roles WHERE name = 'admin';
  
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT admin_id, id FROM permissions WHERE name IN (
    'manage_users', 'manage_confessions', 'manage_comments', 'manage_messages', 'moderate_content', 'view_statistics'
  ) ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- 为版主分配内容审核权限
DO $$
DECLARE
  moderator_id UUID;
BEGIN
  SELECT id INTO moderator_id FROM roles WHERE name = 'moderator';
  
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT moderator_id, id FROM permissions WHERE name IN (
    'manage_confessions', 'manage_comments', 'moderate_content'
  ) ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- 为普通用户分配基础权限
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM roles WHERE name = 'user';
  
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT user_id, id FROM permissions WHERE name IN (
    'manage_confessions', 'manage_comments'
  ) ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;
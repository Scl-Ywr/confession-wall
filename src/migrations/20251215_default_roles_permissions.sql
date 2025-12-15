-- 创建默认权限
INSERT INTO permissions (id, name, description, created_at) VALUES
-- 用户管理权限
('perm_usr_001', 'view_users', '查看用户列表', NOW()),
('perm_usr_002', 'edit_users', '编辑用户信息', NOW()),
('perm_usr_003', 'delete_users', '删除用户', NOW()),
('perm_usr_004', 'assign_roles', '分配用户角色', NOW()),

-- 角色管理权限
('perm_role_001', 'view_roles', '查看角色列表', NOW()),
('perm_role_002', 'create_roles', '创建角色', NOW()),
('perm_role_003', 'edit_roles', '编辑角色', NOW()),
('perm_role_004', 'delete_roles', '删除角色', NOW()),
('perm_role_005', 'manage_role_permissions', '管理角色权限', NOW()),

-- 表白管理权限
('perm_conf_001', 'view_confessions', '查看表白列表', NOW()),
('perm_conf_002', 'approve_confessions', '审核通过表白', NOW()),
('perm_conf_003', 'reject_confessions', '拒绝表白', NOW()),
('perm_conf_004', 'delete_confessions', '删除表白', NOW()),

-- 评论管理权限
('perm_comm_001', 'view_comments', '查看评论列表', NOW()),
('perm_comm_002', 'approve_comments', '审核通过评论', NOW()),
('perm_comm_003', 'reject_comments', '拒绝评论', NOW()),
('perm_comm_004', 'delete_comments', '删除评论', NOW()),

-- 聊天管理权限
('perm_chat_001', 'view_chat_messages', '查看聊天消息', NOW()),
('perm_chat_002', 'delete_chat_messages', '删除聊天消息', NOW()),
('perm_chat_003', 'manage_groups', '管理群聊', NOW()),

-- 系统管理权限
('perm_sys_001', 'view_system_stats', '查看系统统计', NOW()),
('perm_sys_002', 'manage_system_settings', '管理系统设置', NOW()),
('perm_sys_003', 'view_logs', '查看系统日志', NOW()),
('perm_sys_004', 'manage_media', '管理媒体文件', NOW())
ON CONFLICT (id) DO NOTHING;

-- 创建默认角色
INSERT INTO roles (id, name, description, created_at, updated_at) VALUES
-- 超级管理员：拥有所有权限
('role_super_admin', 'super_admin', '系统超级管理员，拥有所有权限', NOW(), NOW()),
-- 管理员：拥有大部分管理权限
('role_admin', 'admin', '系统管理员，拥有管理权限', NOW(), NOW()),
-- 版主：拥有内容审核权限
('role_moderator', 'moderator', '内容版主，负责审核和管理内容', NOW(), NOW()),
-- 普通用户：拥有基本使用权限
('role_user', 'user', '普通用户，拥有基本使用权限', NOW(), NOW()),
-- 访客：仅能查看内容
('role_guest', 'guest', '访客，仅能查看内容', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 为超级管理员分配所有权限
INSERT INTO role_permissions (role_id, permission_id, created_at) 
SELECT 'role_super_admin', id, NOW() FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为管理员分配大部分权限
INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES
-- 用户管理
('role_admin', 'perm_usr_001', NOW()),
('role_admin', 'perm_usr_002', NOW()),
('role_admin', 'perm_usr_003', NOW()),
('role_admin', 'perm_usr_004', NOW()),
-- 角色管理
('role_admin', 'perm_role_001', NOW()),
('role_admin', 'perm_role_002', NOW()),
('role_admin', 'perm_role_003', NOW()),
('role_admin', 'perm_role_004', NOW()),
('role_admin', 'perm_role_005', NOW()),
-- 表白管理
('role_admin', 'perm_conf_001', NOW()),
('role_admin', 'perm_conf_002', NOW()),
('role_admin', 'perm_conf_003', NOW()),
('role_admin', 'perm_conf_004', NOW()),
-- 评论管理
('role_admin', 'perm_comm_001', NOW()),
('role_admin', 'perm_comm_002', NOW()),
('role_admin', 'perm_comm_003', NOW()),
('role_admin', 'perm_comm_004', NOW()),
-- 聊天管理
('role_admin', 'perm_chat_001', NOW()),
('role_admin', 'perm_chat_002', NOW()),
('role_admin', 'perm_chat_003', NOW()),
-- 系统管理
('role_admin', 'perm_sys_001', NOW()),
('role_admin', 'perm_sys_002', NOW()),
('role_admin', 'perm_sys_003', NOW()),
('role_admin', 'perm_sys_004', NOW())
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为版主分配内容审核权限
INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES
-- 表白管理
('role_moderator', 'perm_conf_001', NOW()),
('role_moderator', 'perm_conf_002', NOW()),
('role_moderator', 'perm_conf_003', NOW()),
('role_moderator', 'perm_conf_004', NOW()),
-- 评论管理
('role_moderator', 'perm_comm_001', NOW()),
('role_moderator', 'perm_comm_002', NOW()),
('role_moderator', 'perm_comm_003', NOW()),
('role_moderator', 'perm_comm_004', NOW()),
-- 聊天管理
('role_moderator', 'perm_chat_001', NOW()),
('role_moderator', 'perm_chat_002', NOW()),
-- 系统管理
('role_moderator', 'perm_sys_001', NOW())
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为普通用户分配基本权限
INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES
-- 表白管理
('role_user', 'perm_conf_001', NOW()),
-- 评论管理
('role_user', 'perm_comm_001', NOW())
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为访客分配查看权限
INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES
-- 表白管理
('role_guest', 'perm_conf_001', NOW()),
-- 评论管理
('role_guest', 'perm_comm_001', NOW())
ON CONFLICT (role_id, permission_id) DO NOTHING;

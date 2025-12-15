-- 创建RPC函数来支持权限检查

-- 1. 获取用户的所有权限
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TABLE (
  id VARCHAR,
  name VARCHAR,
  description VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.id, p.name, p.description, p.created_at
  FROM permissions p
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = user_id;
END;
$$;

-- 2. 获取用户的所有角色
CREATE OR REPLACE FUNCTION get_user_roles(user_id UUID)
RETURNS TABLE (
  id VARCHAR,
  name VARCHAR,
  description VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name, r.description, r.created_at, r.updated_at
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = user_id;
END;
$$;

-- 3. 检查用户是否拥有特定权限
CREATE OR REPLACE FUNCTION check_user_permission(
  user_id UUID,
  permission_name VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = user_id AND p.name = permission_name
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$;

-- 4. 检查用户是否拥有特定角色
CREATE OR REPLACE FUNCTION check_user_role(
  user_id UUID,
  role_name VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_role BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = user_id AND r.name = role_name
  ) INTO has_role;
  
  RETURN has_role;
END;
$$;

-- 5. 检查用户是否拥有任何一个指定角色
CREATE OR REPLACE FUNCTION check_user_any_role(
  user_id UUID,
  role_names TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_role BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = user_id AND r.name = ANY(role_names)
  ) INTO has_role;
  
  RETURN has_role;
END;
$$;

-- 6. 检查用户是否拥有所有指定权限
CREATE OR REPLACE FUNCTION check_user_all_permissions(
  user_id UUID,
  permission_names TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_permissions INTEGER;
  matched_permissions INTEGER;
BEGIN
  -- 获取请求的权限总数
  total_permissions := array_length(permission_names, 1);
  
  -- 如果没有请求权限，返回true
  IF total_permissions IS NULL OR total_permissions = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- 计算用户拥有的请求权限数量
  SELECT COUNT(DISTINCT p.name)
  INTO matched_permissions
  FROM permissions p
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = user_id AND p.name = ANY(permission_names);
  
  -- 如果匹配数量等于请求数量，返回true
  RETURN matched_permissions = total_permissions;
END;
$$;

-- 7. 检查用户是否拥有任何一个指定权限
CREATE OR REPLACE FUNCTION check_user_any_permission(
  user_id UUID,
  permission_names TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  -- 如果没有请求权限，返回true
  IF array_length(permission_names, 1) IS NULL OR array_length(permission_names, 1) = 0 THEN
    RETURN TRUE;
  END IF;
  
  SELECT EXISTS(
    SELECT 1
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = user_id AND p.name = ANY(permission_names)
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$;

-- 设置适当的权限，允许authenticated角色执行这些函数
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_role(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_any_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_all_permissions(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_any_permission(UUID, TEXT[]) TO authenticated;

// 服务器端权限检查工具函数

import { createSupabaseAdminClient } from '@/lib/supabase/server';

// 权限检查结果类型
export interface PermissionCheckResult {
  hasPermission: boolean;
  missingPermissions?: string[];
}

// 权限接口
interface Permission {
  id: string;
  name: string;
  description?: string;
}

// 角色接口
interface Role {
  id: string;
  name: string;
  description?: string;
}

/**
 * 检查用户是否拥有指定权限（服务器端使用）
 * @param userId 用户ID
 * @param permissionNames 权限名称数组
 * @returns 权限检查结果
 */
export async function checkUserPermissionsServer(
  userId: string,
  permissionNames: string[]
): Promise<PermissionCheckResult> {
  try {
    if (!userId || permissionNames.length === 0) {
      return { hasPermission: false };
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // 获取用户的所有权限
    const { data: userPermissions } = await supabaseAdmin
      .rpc('get_user_permissions', { user_id: userId });

    if (!userPermissions || userPermissions.length === 0) {
      return { hasPermission: false };
    }

    // 提取权限名称
    const userPermissionNames = userPermissions.map((p: Permission) => p.name);
    
    // 检查是否拥有所有请求的权限
    const missingPermissions = permissionNames.filter(
      perm => !userPermissionNames.includes(perm)
    );

    return {
      hasPermission: missingPermissions.length === 0,
      missingPermissions: missingPermissions.length > 0 ? missingPermissions : undefined
    };
  } catch (error) {
    console.error('Error checking user permissions (server):', error);
    return { hasPermission: false };
  }
}

/**
 * 检查用户是否拥有指定角色（服务器端使用）
 * @param userId 用户ID
 * @param roleNames 角色名称数组
 * @returns 角色检查结果
 */
export async function checkUserRolesServer(
  userId: string,
  roleNames: string[]
): Promise<boolean> {
  try {
    if (!userId || roleNames.length === 0) {
      return false;
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // 获取用户的所有角色
    const { data: userRoles } = await supabaseAdmin
      .rpc('get_user_roles', { user_id: userId });

    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    // 提取角色名称
    const userRoleNames = userRoles.map((r: Role) => r.name);
    
    // 检查是否拥有任何一个请求的角色
    return roleNames.some(role => userRoleNames.includes(role));
  } catch (error) {
    console.error('Error checking user roles (server):', error);
    return false;
  }
}

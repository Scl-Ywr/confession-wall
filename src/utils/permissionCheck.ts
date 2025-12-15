// 权限检查工具函数（仅客户端使用）

import { supabase } from '@/lib/supabase/client';

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
 * 检查用户是否拥有指定权限（客户端使用）
 * @param userId 用户ID
 * @param permissionNames 权限名称数组
 * @returns 权限检查结果
 */
export async function checkUserPermissionsClient(
  userId: string,
  permissionNames: string[]
): Promise<PermissionCheckResult> {
  try {
    if (!userId || permissionNames.length === 0) {
      return { hasPermission: false };
    }

    // 获取用户的所有权限
    const { data: userPermissions } = await supabase
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
    console.error('Error checking user permissions:', error);
    return { hasPermission: false };
  }
}

/**
 * 检查用户是否拥有指定角色（客户端使用）
 * @param userId 用户ID
 * @param roleNames 角色名称数组
 * @returns 角色检查结果
 */
export async function checkUserRolesClient(
  userId: string,
  roleNames: string[]
): Promise<boolean> {
  try {
    if (!userId || roleNames.length === 0) {
      return false;
    }

    // 获取用户的所有角色
    const { data: userRoles } = await supabase
      .rpc('get_user_roles', { user_id: userId });

    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    // 提取角色名称
    const userRoleNames = userRoles.map((r: Role) => r.name);
    
    // 检查是否拥有任何一个请求的角色
    return roleNames.some(role => userRoleNames.includes(role));
  } catch (error) {
    console.error('Error checking user roles:', error);
    return false;
  }
}

/**
 * 获取用户的所有权限（客户端使用）
 * @param userId 用户ID
 * @returns 用户权限数组
 */
export async function getUserPermissionsClient(userId: string): Promise<string[]> {
  try {
    if (!userId) {
      return [];
    }

    const { data: userPermissions } = await supabase
      .rpc('get_user_permissions', { user_id: userId });

    if (!userPermissions || userPermissions.length === 0) {
      return [];
    }

    return userPermissions.map((p: Permission) => p.name);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * 获取用户的所有角色（客户端使用）
 * @param userId 用户ID
 * @returns 用户角色数组
 */
export async function getUserRolesClient(userId: string): Promise<string[]> {
  try {
    if (!userId) {
      return [];
    }

    const { data: userRoles } = await supabase
      .rpc('get_user_roles', { user_id: userId });

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    return userRoles.map((r: Role) => r.name);
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

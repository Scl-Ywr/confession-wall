// 管理员服务，处理后台管理系统的业务逻辑
import { supabase } from '@/lib/supabase/client';
import { getOrSetCache, deleteCache, deleteCacheByPattern } from '@/lib/redis/cache-manager';
import { CACHE_EXPIRY } from '@/lib/redis/cache.config';
import { generateCacheKey } from '@/lib/redis/cache.config';

// 引入 ConfessionImage 类型
import { ConfessionImage, Profile } from '@/types/confession';

// 告白接口
export interface Confession {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  status: string;
  rejection_reason: string | null;
  moderator_id: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  comments_count?: number;
  images?: ConfessionImage[];
  is_published?: boolean;
}

// 角色接口
export interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// 权限接口
export interface Permission {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

// 角色权限接口
export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

// 用户角色接口
export interface UserRole {
  user_id: string;
  role_id: string;
  created_at: string;
}

// 系统统计数据接口
interface AdminStats {
  totalUsers: number;
  newUsers: number;
  totalConfessions: number;
  newConfessions: number;
  totalComments: number;
  newComments: number;
  totalMessages: number;
  newMessages: number;
}

// 获取系统统计数据
export async function getAdminStats(): Promise<AdminStats> {
  // 生成缓存键
  const cacheKey = generateCacheKey('ADMIN_STATS', {});
  
  // 使用缓存机制获取统计数据
  const stats = await getOrSetCache<AdminStats>(
    cacheKey,
    async () => {
      try {
        // 计算24小时前的时间
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        const formattedDate = twentyFourHoursAgo.toISOString();

        // 使用Promise.all并行获取所有统计数据
        const [
          totalUsersResult,
          newUsersResult,
          totalConfessionsResult,
          newConfessionsResult,
          totalCommentsResult,
          newCommentsResult,
          totalMessagesResult,
          newMessagesResult
        ] = await Promise.all([
          // 总用户数
          supabase.from('profiles').select('id', { count: 'exact' }).throwOnError(),
          // 24小时内新增用户
          supabase.from('profiles').select('id', { count: 'exact' }).gte('created_at', formattedDate).throwOnError(),
          // 总表白数
          supabase.from('confessions').select('id', { count: 'exact' }).throwOnError(),
          // 24小时内新增表白
          supabase.from('confessions').select('id', { count: 'exact' }).gte('created_at', formattedDate).throwOnError(),
          // 总评论数
          supabase.from('comments').select('id', { count: 'exact' }).throwOnError(),
          // 24小时内新增评论
          supabase.from('comments').select('id', { count: 'exact' }).gte('created_at', formattedDate).throwOnError(),
          // 总消息数
          supabase.from('chat_messages').select('id', { count: 'exact' }).throwOnError(),
          // 24小时内新增消息
          supabase.from('chat_messages').select('id', { count: 'exact' }).gte('created_at', formattedDate).throwOnError()
        ]);

        return {
          totalUsers: totalUsersResult.count || 0,
          newUsers: newUsersResult.count || 0,
          totalConfessions: totalConfessionsResult.count || 0,
          newConfessions: newConfessionsResult.count || 0,
          totalComments: totalCommentsResult.count || 0,
          newComments: newCommentsResult.count || 0,
          totalMessages: totalMessagesResult.count || 0,
          newMessages: newMessagesResult.count || 0
        };
      } catch (error) {
        console.error('获取系统统计数据失败:', error);
        // 记录详细错误信息
        if (error instanceof Error) {
          console.error('错误详情:', error.message, error.stack);
        }
        // 返回默认值，确保系统不会崩溃
        return {
          totalUsers: 0,
          newUsers: 0,
          totalConfessions: 0,
          newConfessions: 0,
          totalComments: 0,
          newComments: 0,
          totalMessages: 0,
          newMessages: 0
        };
      }
    },
    CACHE_EXPIRY.SHORT // 设置5分钟过期时间
  );
  
  return stats || {
    totalUsers: 0,
    newUsers: 0,
    totalConfessions: 0,
    newConfessions: 0,
    totalComments: 0,
    newComments: 0,
    totalMessages: 0,
    newMessages: 0
  };
}

// 获取角色列表
export async function getRoles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { page = 1, pageSize = 10, search = '' } = params;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('roles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (search) {
      // 使用正确的Supabase JS v2 or条件语法
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, count } = await query.throwOnError();

    return {
      roles: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取角色列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      roles: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

// 根据ID获取角色
export async function getRoleById(roleId: string) {
  try {
    const { data } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()
      .throwOnError();

    return data || null;
  } catch (error) {
    console.error('获取角色详情失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 创建角色
export async function createRole(roleData: {
  name: string;
  description: string;
}, userId?: string, ipAddress?: string, userAgent?: string) {
  try {
    const { data } = await supabase
      .from('roles')
      .insert([roleData])
      .select('*')
      .single()
      .throwOnError();

    if (data && userId) {
      // 记录创建角色日志
      await logAction(
        userId,
        'create_role',
        'role',
        data.id,
        { newData: data },
        ipAddress,
        userAgent
      );
    }

    return data || null;
  } catch (error) {
    console.error('创建角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 更新角色
export async function updateRole(roleId: string, roleData: {
  name: string;
  description: string;
}, userId?: string, ipAddress?: string, userAgent?: string) {
  try {
    // 先获取角色的旧数据
    const oldData = await getRoleById(roleId);
    
    const { data } = await supabase
      .from('roles')
      .update(roleData)
      .eq('id', roleId)
      .select('*')
      .single()
      .throwOnError();

    if (data && userId && oldData) {
      // 记录更新角色日志
      await logAction(
        userId,
        'update_role',
        'role',
        roleId,
        { oldData, newData: data },
        ipAddress,
        userAgent
      );
    }

    return data || null;
  } catch (error) {
    console.error('更新角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 删除角色
export async function deleteRole(roleId: string, userId?: string, ipAddress?: string, userAgent?: string) {
  try {
    // 先获取角色的旧数据
    const oldData = await getRoleById(roleId);
    
    await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)
      .throwOnError();

    if (userId && oldData) {
      // 记录删除角色日志
      await logAction(
        userId,
        'delete_role',
        'role',
        roleId,
        { oldData },
        ipAddress,
        userAgent
      );
    }

    return { success: true };
  } catch (error) {
    console.error('删除角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 获取权限列表
export async function getPermissions() {
  try {
    const { data } = await supabase
      .from('permissions')
      .select('*')
      .order('name', { ascending: true })
      .throwOnError();

    return data || [];
  } catch (error) {
    console.error('获取权限列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return [];
  }
}

// 获取角色权限
export async function getRolePermissions(roleId: string) {
  try {
    const { data } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId)
      .throwOnError();

    return (data || []).map(item => item.permission_id);
  } catch (error) {
    console.error('获取角色权限失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return [];
  }
}

// 为角色分配权限
export async function assignPermissionsToRole(roleId: string, permissionIds: string[], userId?: string, ipAddress?: string, userAgent?: string) {
  try {
    // 先获取角色的旧权限
    const oldPermissions = await getRolePermissions(roleId);
    
    // 首先删除角色现有的所有权限
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .throwOnError();

    // 然后添加新的权限分配
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permissionId => ({
        role_id: roleId,
        permission_id: permissionId
      }));

      await supabase
        .from('role_permissions')
        .insert(rolePermissions)
        .throwOnError();
    }

    if (userId) {
      // 记录权限分配日志
      await logAction(
        userId,
        'assign_permissions_to_role',
        'role_permission',
        roleId,
        { oldPermissions, newPermissions: permissionIds },
        ipAddress,
        userAgent
      );
    }

    return { success: true };
  } catch (error) {
    console.error('为角色分配权限失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 获取用户角色
export async function getUserRoles(userId: string) {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .throwOnError();

    return (data || []).map(item => item.role_id);
  } catch (error) {
    console.error('获取用户角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return [];
  }
}

// 为用户分配角色
export async function assignRoleToUser(userId: string, roleId: string) {
  try {
    await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId
      })
      .throwOnError();

    return { success: true };
  } catch (error) {
    console.error('为用户分配角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 从用户移除角色
export async function removeRoleFromUser(userId: string, roleId: string) {
  try {
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .throwOnError();

    return { success: true };
  } catch (error) {
    console.error('从用户移除角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 为用户批量分配角色
export async function assignRolesToUser(userId: string, roleIds: string[], operatorId?: string, ipAddress?: string, userAgent?: string) {
  try {
    // 先获取用户的旧角色
    const oldRoles = await getUserRoles(userId);
    
    // 使用事务确保原子性操作
    // 1. 删除用户现有的所有角色
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .throwOnError();

    // 2. 添加新的角色分配
    if (roleIds.length > 0) {
      const userRoles = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId
      }));

      await supabase
        .from('user_roles')
        .insert(userRoles)
        .throwOnError();
    }

    if (operatorId) {
      // 记录用户角色分配日志
      await logAction(
        operatorId,
        'assign_roles_to_user',
        'user_role',
        userId,
        { oldRoles, newRoles: roleIds },
        ipAddress,
        userAgent
      );
    }

    return { success: true };
  } catch (error) {
    console.error('为用户分配角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 获取用户的所有权限（通过角色继承）
export async function getUserPermissions(userId: string) {
  try {
    // 1. 获取用户的所有角色
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId);

    if (userRolesError) {
      throw userRolesError;
    }

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    // 2. 获取这些角色对应的所有权限
    const roleIds = userRoles.map(ur => ur.role_id);
    const { data: rolePermissions, error: rolePermissionsError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds);

    if (rolePermissionsError) {
      throw rolePermissionsError;
    }

    if (!rolePermissions || rolePermissions.length === 0) {
      return [];
    }

    // 3. 去重并获取权限详情
    const permissionIds = [...new Set(rolePermissions.map(rp => rp.permission_id))];
    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('id, name, description')
      .in('id', permissionIds);

    if (permissionsError) {
      throw permissionsError;
    }

    return permissions || [];
  } catch (error) {
    console.error('获取用户权限失败:', error);
    return [];
  }
}

// 检查用户是否有特定权限
export async function checkUserPermission(userId: string, permissionName: string) {
  try {
    // 先获取权限ID
    const { data: permissionData } = await supabase
      .from('permissions')
      .select('id')
      .eq('name', permissionName)
      .single()
      .throwOnError();

    if (!permissionData) {
      return false;
    }

    // 获取拥有该权限的所有角色ID（包括继承权限）
    const rolePermissions = await getRolesWithPermission(permissionData.id);

    if (!rolePermissions || rolePermissions.length === 0) {
      return false;
    }

    // 提取角色ID数组
    const roleIds = rolePermissions.map(item => item.role_id);

    // 检查用户是否拥有这些角色中的任何一个
    const { data: userHasPermission } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .in('role_id', roleIds)
      .single();

    return !!userHasPermission;
  } catch (error) {
    console.error('检查用户权限失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return false;
  }
}

// 获取拥有特定权限的所有角色ID，包括通过继承获得的权限
async function getRolesWithPermission(permissionId: string): Promise<Array<{ role_id: string }>> {
  // 直接拥有该权限的角色
  const { data: directRolePermissions } = await supabase
    .from('role_permissions')
    .select('role_id')
    .eq('permission_id', permissionId)
    .throwOnError();

  // 获取所有继承关系
  const { data: roleInheritances } = await supabase
    .from('role_inheritances')
    .select('child_role_id, parent_role_id')
    .throwOnError();

  if (!roleInheritances || roleInheritances.length === 0) {
    return directRolePermissions || [];
  }

  // 构建继承关系图
  const inheritanceMap = new Map<string, string[]>();
  roleInheritances.forEach(inheritance => {
    if (!inheritanceMap.has(inheritance.parent_role_id)) {
      inheritanceMap.set(inheritance.parent_role_id, []);
    }
    inheritanceMap.get(inheritance.parent_role_id)?.push(inheritance.child_role_id);
  });

  // 获取所有继承了直接拥有权限角色的子角色
  const directRoleIds = new Set((directRolePermissions || []).map(item => item.role_id));
  const inheritedRoleIds = new Set<string>();

  // 递归查找所有继承的角色
  function findInheritedRoles(roleId: string) {
    const children = inheritanceMap.get(roleId);
    if (children) {
      children.forEach(childRoleId => {
        if (!inheritedRoleIds.has(childRoleId)) {
          inheritedRoleIds.add(childRoleId);
          findInheritedRoles(childRoleId);
        }
      });
    }
  }

  // 对每个直接拥有权限的角色，查找其所有继承角色
  directRoleIds.forEach(roleId => {
    findInheritedRoles(roleId);
  });

  // 合并直接角色和继承角色
  const allRoleIds = new Set([...directRoleIds, ...inheritedRoleIds]);
  return Array.from(allRoleIds).map(role_id => ({ role_id }));
}

// 检测权限冲突
export async function detectPermissionConflicts(roleId: string, permissionIds: string[]): Promise<Array<{ permission_id: string; conflict_type: string; message: string }>> {
  const conflicts: Array<{ permission_id: string; conflict_type: string; message: string }> = [];

  try {
    // 获取当前角色的所有继承关系
    const { data: roleInheritances } = await supabase
      .from('role_inheritances')
      .select('parent_role_id')
      .eq('child_role_id', roleId)
      .throwOnError();

    if (roleInheritances && roleInheritances.length > 0) {
      // 获取所有父角色ID
      const parentRoleIds = roleInheritances.map(inheritance => inheritance.parent_role_id);
      
      // 获取所有父角色拥有的权限
      const { data: parentPermissions } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('role_id', parentRoleIds)
        .throwOnError();

      // 检查是否有重复分配的权限（已通过继承获得）
      if (parentPermissions && parentPermissions.length > 0) {
        const parentPermissionIds = new Set(parentPermissions.map(item => item.permission_id));
        permissionIds.forEach(permissionId => {
          if (parentPermissionIds.has(permissionId)) {
            conflicts.push({
              permission_id: permissionId,
              conflict_type: 'duplicate',
              message: '该权限已通过继承获得，无需重复分配'
            });
          }
        });
      }
    }

    return conflicts;
  } catch (error) {
    console.error('检测权限冲突失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return conflicts;
  }
}

// 最近表白接口
interface RecentConfession {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

// 获取最近表白
export async function getRecentConfessions(limit: number = 5): Promise<RecentConfession[]> {
  // 生成缓存键
  const cacheKey = generateCacheKey('RECENT_CONFESSIONS', { limit });
  
  // 使用缓存机制获取最近表白
  const confessions = await getOrSetCache<RecentConfession[]>(
    cacheKey,
    async () => {
      try {
        const { data } = await supabase
          .from('confessions')
          .select('id, user_id, content, is_anonymous, created_at')
          .order('created_at', { ascending: false })
          .limit(limit)
          .throwOnError();

        return data || [];
      } catch (error) {
        console.error('获取最近表白失败:', error);
        if (error instanceof Error) {
          console.error('错误详情:', error.message, error.stack);
        }
        return [];
      }
    },
    CACHE_EXPIRY.SHORT // 设置5分钟过期时间
  );
  
  return confessions || [];
}

// 最近用户接口
interface RecentUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  online_status: string;
}

// 获取最近用户
export async function getRecentUsers(limit: number = 5): Promise<RecentUser[]> {
  // 生成缓存键
  const cacheKey = generateCacheKey('RECENT_USERS', { limit });
  
  // 使用缓存机制获取最近用户
  const users = await getOrSetCache<RecentUser[]>(
    cacheKey,
    async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, created_at, online_status')
          .order('created_at', { ascending: false })
          .limit(limit)
          .throwOnError();

        return data || [];
      } catch (error) {
        console.error('获取最近用户失败:', error);
        if (error instanceof Error) {
          console.error('错误详情:', error.message, error.stack);
        }
        return [];
      }
    },
    CACHE_EXPIRY.SHORT // 设置5分钟过期时间
  );
  
  return users || [];
}

// 趋势数据接口
interface TrendData {
  date: string;
  users: number;
  confessions: number;
  comments: number;
  messages: number;
}

// 获取趋势数据
export async function getTrendData(days: number = 7): Promise<TrendData[]> {
  // 生成缓存键
  const cacheKey = generateCacheKey('TREND_DATA', { days });
  
  // 使用缓存机制获取趋势数据
  const trendData = await getOrSetCache<TrendData[]>(
    cacheKey,
    async () => {
      try {
        // 计算起始日期
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const formattedStartDate = startDate.toISOString();

        // 使用Promise.all并行获取所有趋势数据
        const [usersResult, confessionsResult, commentsResult, messagesResult] = await Promise.all([
          // 获取用户注册数据
          supabase.from('profiles').select('created_at').gte('created_at', formattedStartDate).throwOnError(),
          // 获取表白数据
          supabase.from('confessions').select('created_at').gte('created_at', formattedStartDate).throwOnError(),
          // 获取评论数据
          supabase.from('comments').select('created_at').gte('created_at', formattedStartDate).throwOnError(),
          // 获取消息数据
          supabase.from('chat_messages').select('created_at').gte('created_at', formattedStartDate).throwOnError()
        ]);

        // 按日期分组数据
        const groupByDate = (data: Array<{ created_at: string }>) => {
          return data.reduce((acc, item) => {
            const date = new Date(item.created_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        };

        const usersByDate = groupByDate(usersResult.data || []);
        const confessionsByDate = groupByDate(confessionsResult.data || []);
        const commentsByDate = groupByDate(commentsResult.data || []);
        const messagesByDate = groupByDate(messagesResult.data || []);

        // 生成日期范围
        const dateRange: string[] = [];
        for (let i = 0; i <= days; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          dateRange.push(date.toISOString().split('T')[0]);
        }

        // 构建趋势数据
        const trendData: TrendData[] = dateRange.map(date => ({
          date,
          users: usersByDate[date] || 0,
          confessions: confessionsByDate[date] || 0,
          comments: commentsByDate[date] || 0,
          messages: messagesByDate[date] || 0
        }));

        return trendData;
      } catch (error) {
        console.error('获取趋势数据失败:', error);
        if (error instanceof Error) {
          console.error('错误详情:', error.message, error.stack);
        }
        return [];
      }
    },
    CACHE_EXPIRY.MEDIUM // 设置30分钟过期时间
  );
  
  return trendData || [];
}

// 获取用户列表
  export async function getUsers(params: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }) {
    const { page = 1, pageSize = 10, sortBy = 'created_at', sortOrder = 'desc', search = '' } = params;
    const offset = (page - 1) * pageSize;

    try {
      // 从profiles表获取基本信息，包括email字段
      let query = supabase
        .from('profiles')
        .select('id, username, display_name, email, avatar_url, online_status, created_at', { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + pageSize - 1);

      if (search) {
        // 使用正确的Supabase JS v2 or条件语法
        query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: profiles, count } = await query.throwOnError();

      // 确保返回的数据格式正确
      const users = (profiles || []).map(user => ({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        email: user.email || '未知邮箱',
        online_status: user.online_status,
        created_at: user.created_at
      }));

      return {
        users,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message, error.stack);
      }
      return {
        users: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }

// 获取表白列表
export async function getConfessions(params: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
}) {
  const { page = 1, pageSize = 10, sortBy = 'created_at', sortOrder = 'desc', search = '', status } = params;
  const offset = (page - 1) * pageSize;

  try {
    // 查询基础表白数据
    let query = supabase
      .from('confessions')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1)
      .throwOnError();

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: confessions, count } = await query;

    if (!confessions || confessions.length === 0) {
      return {
        confessions: [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }

    // 优化：获取所有相关点赞和评论，然后在客户端聚合，减少API请求次数
    // 只需要两个API请求：一个获取所有相关点赞，一个获取所有相关评论
    const confessionIds = confessions.map(confession => confession.id);

    // 获取所有相关点赞
    let likesData: Array<{ confession_id: string }> = [];
    try {
      const { data: allLikes } = await supabase
        .from('likes')
        .select('confession_id')
        .in('confession_id', confessionIds)
        .throwOnError();
      likesData = allLikes || [];
    } catch (error) {
      console.error('获取点赞数据失败:', error);
      likesData = [];
    }

    // 获取所有相关评论
    let commentsData: Array<{ confession_id: string }> = [];
    try {
      const { data: allComments } = await supabase
        .from('comments')
        .select('confession_id')
        .in('confession_id', confessionIds)
        .throwOnError();
      commentsData = allComments || [];
    } catch (error) {
      console.error('获取评论数据失败:', error);
      commentsData = [];
    }

    // 在客户端聚合点赞数
    const likesCountMap = new Map<string, number>();
    likesData.forEach(like => {
      const confessionId = like.confession_id;
      likesCountMap.set(confessionId, (likesCountMap.get(confessionId) || 0) + 1);
    });

    // 在客户端聚合评论数
    const commentsCountMap = new Map<string, number>();
    commentsData.forEach(comment => {
      const confessionId = comment.confession_id;
      commentsCountMap.set(confessionId, (commentsCountMap.get(confessionId) || 0) + 1);
    });

    // 将点赞数和评论数与表白数据匹配
    const confessionsWithCounts = confessions.map(confession => ({
      ...confession,
      likes_count: likesCountMap.get(confession.id) || 0,
      comments_count: commentsCountMap.get(confession.id) || 0
    }));

    return {
      confessions: confessionsWithCounts,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取表白列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      confessions: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

// 用户信息接口
interface UserInfo {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  updated_at: string;
  last_seen: string;
  online_status: string;
  is_admin: boolean;
  email: string;
}

// 根据ID获取用户信息
  export async function getUserById(id: string) {
    // 生成缓存键
    const cacheKey = generateCacheKey('USER_BY_ID', { id });
    
    // 使用缓存机制获取用户信息
    const user = await getOrSetCache<UserInfo | null>(
      cacheKey,
      async () => {
        try {
          if (!id) {
            console.error('获取用户失败: ID不能为空');
            return null;
          }
          
          // 从profiles表获取用户信息，包括email字段
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

          // 如果profile存在，直接返回重组后的用户对象
          if (profile) {
            // 确保profile是一个对象类型
            if (typeof profile === 'object' && profile !== null) {
              // 重组数据结构，确保所有字段可用
              return {
                id: profile.id,
                username: profile.username || '',
                display_name: profile.display_name || '',
                avatar_url: profile.avatar_url || '',
                bio: profile.bio || '',
                created_at: profile.created_at || new Date().toISOString(),
                updated_at: profile.updated_at || new Date().toISOString(),
                last_seen: profile.last_seen || new Date().toISOString(),
                online_status: profile.online_status || 'offline',
                is_admin: profile.is_admin || false,
                email: profile.email || '未知邮箱'
              };
            }
          }
          
          return null;
        } catch (error) {
          console.error(`获取用户ID: ${id}失败:`, error);
          if (error instanceof Error) {
            console.error('错误详情:', error.message, error.stack);
          }
          return null;
        }
      },
      CACHE_EXPIRY.MEDIUM // 设置30分钟过期时间
    );
    
    return user;
  }

// 根据ID获取表白信息
export async function getConfessionById(id: string) {
  try {
    if (!id) {
      console.error('获取表白失败: ID不能为空');
      return null;
    }
    
    // 获取表白基本信息
    const { data: confessionData } = await supabase
      .from('confessions')
      .select('*')
      .eq('id', id)
      .single();

    if (confessionData) {
      // 获取表白的图片
      const { data: images } = await supabase
        .from('confession_images')
        .select('id, image_url, file_type, is_locked, lock_type')
        .eq('confession_id', id);
      
      // 获取表白的评论数
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('confession_id', id);
      
      // 获取表白的点赞数
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('confession_id', id);
      
      // 返回包含图片、评论数和点赞数的完整表白对象
      return {
        ...confessionData,
        images: images || [],
        comments_count: commentsCount || 0,
        likes_count: likesCount || 0
      };
    }
    
    return null;
  } catch (error) {
    console.error(`获取表白ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 更新表白
export async function updateConfession(
  id: string, 
  data: Partial<{ 
    content?: string; 
    is_anonymous?: boolean; 
    status?: string; 
    rejection_reason?: string; 
    moderator_id?: string;
    moderated_at?: string;
  }>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    if (!id) {
      console.error('更新表白失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    // 如果是更新审核状态，添加moderated_at字段
    const updateData = { ...data };
    if (data.status) {
      updateData.moderated_at = new Date().toISOString();
    }
    
    await supabase.from('confessions').update(updateData).eq('id', id).throwOnError();
    
    // 清除相关缓存
    const confessionCacheKey = generateCacheKey('CONFESSION_BY_ID', { id });
    await deleteCache(confessionCacheKey);
    await deleteCacheByPattern('ADMIN_STATS*');
    await deleteCacheByPattern('RECENT_CONFESSIONS*');
    await deleteCacheByPattern('TREND_DATA*');
    
    // 记录操作日志
    if (userId) {
      await logAction(
        userId, 
        'update_confession', 
        'confession', 
        id,
        { oldData: await getConfessionById(id), newData: data },
        ipAddress,
        userAgent
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error(`更新表白ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 更新表白审核状态
export async function updateConfessionStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  userId: string,
  rejectionReason?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    if (!id) {
      console.error('更新表白状态失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    const updateData: Partial<{
      status: 'approved' | 'rejected' | 'pending';
      moderator_id: string;
      moderated_at: string;
      rejection_reason: string | null;
    }> = {
      status,
      moderator_id: userId,
      moderated_at: new Date().toISOString()
    };
    
    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    } else {
      updateData.rejection_reason = null;
    }
    
    await supabase.from('confessions').update(updateData).eq('id', id).throwOnError();
    
    // 清除相关缓存
    const confessionCacheKey = generateCacheKey('CONFESSION_BY_ID', { id });
    await deleteCache(confessionCacheKey);
    await deleteCacheByPattern('ADMIN_STATS*');
    await deleteCacheByPattern('RECENT_CONFESSIONS*');
    await deleteCacheByPattern('TREND_DATA*');
    
    // 记录操作日志
    await logAction(
      userId, 
      `moderate_confession_${status}`, 
      'confession', 
      id,
      { status, rejectionReason },
      ipAddress,
      userAgent
    );
    
    return { success: true };
  } catch (error) {
    console.error(`更新表白状态ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 删除表白
export async function deleteConfession(
  id: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    if (!id) {
      console.error('删除表白失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    // 先获取表白信息用于日志记录
    const confession = await getConfessionById(id);
    
    await supabase.from('confessions').delete().eq('id', id).throwOnError();
    
    // 清除相关缓存
    const confessionCacheKey = generateCacheKey('CONFESSION_BY_ID', { id });
    await deleteCache(confessionCacheKey);
    await deleteCacheByPattern('ADMIN_STATS*');
    await deleteCacheByPattern('RECENT_CONFESSIONS*');
    await deleteCacheByPattern('TREND_DATA*');
    
    // 记录操作日志
    if (userId) {
      await logAction(
        userId, 
        'delete_confession', 
        'confession', 
        id,
        { confession },
        ipAddress,
        userAgent
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error(`删除表白ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 更新用户信息
export async function updateUser(
  id: string, 
  data: Partial<{ username?: string; display_name?: string; bio?: string; online_status?: string }>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    if (!id) {
      console.error('更新用户失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    // 先获取用户信息用于日志记录
    const oldUser = await getUserById(id);
    
    await supabase.from('profiles').update(data).eq('id', id).throwOnError();
    
    // 清除相关缓存
    const userCacheKey = generateCacheKey('USER_BY_ID', { id });
    await deleteCache(userCacheKey);
    await deleteCacheByPattern('ADMIN_STATS*');
    await deleteCacheByPattern('RECENT_USERS*');
    
    // 记录操作日志
    if (userId) {
      await logAction(
        userId, 
        'update_user', 
        'user', 
        id,
        { oldData: oldUser, newData: data },
        ipAddress,
        userAgent
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error(`更新用户ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 删除用户
export async function deleteUser(
  id: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    if (!id) {
      console.error('删除用户失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    // 先获取用户信息用于日志记录
    const user = await getUserById(id);
    
    await supabase.from('profiles').delete().eq('id', id).throwOnError();
    
    // 清除相关缓存
    const userCacheKey = generateCacheKey('USER_BY_ID', { id });
    await deleteCache(userCacheKey);
    await deleteCacheByPattern('ADMIN_STATS*');
    await deleteCacheByPattern('RECENT_USERS*');
    
    // 记录操作日志
    if (userId) {
      await logAction(
        userId, 
        'delete_user', 
        'user', 
        id,
        { user },
        ipAddress,
        userAgent
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error(`删除用户ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 获取聊天消息列表
export async function getChatMessages(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  userId?: string;
  groupId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 10, search = '', userId, groupId, startDate, endDate } = params;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('chat_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .throwOnError();

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    if (userId) {
      // 使用正确的Supabase JS v2 or条件语法
      query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    }

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: messagesData, count } = await query;

    if (!messagesData || messagesData.length === 0) {
      return {
        messages: [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }

    // 获取所有相关用户的ID和群聊ID
    const userIds = new Set<string>();
    const groupIds = new Set<string>();
    messagesData.forEach(message => {
      userIds.add(message.sender_id);
      if (message.receiver_id) {
        userIds.add(message.receiver_id);
      }
      if (message.group_id) {
        groupIds.add(message.group_id);
      }
    });

    // 并行获取用户信息和群聊信息
    const [profilesData, groupsData] = await Promise.all([
      // 获取用户信息
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', Array.from(userIds))
        .throwOnError(),
      // 获取群聊信息
      supabase
        .from('groups')
        .select('id, name, description, avatar_url')
        .in('id', Array.from(groupIds))
        .throwOnError()
    ]);

    // 将用户信息转换为Map，方便查询
    const profilesMap = new Map<string, { id: string; username: string; display_name: string | null; avatar_url: string | null }>();
    (profilesData.data || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    // 将群聊信息转换为Map，方便查询
    const groupsMap = new Map<string, { id: string; name: string; description: string | null; avatar_url: string | null }>();
    (groupsData.data || []).forEach(group => {
      groupsMap.set(group.id, group);
    });

    // 合并消息数据、用户信息和群聊信息
    const messagesWithUserInfo = messagesData.map(message => ({
      ...message,
      sender: profilesMap.get(message.sender_id),
      receiver: message.receiver_id ? profilesMap.get(message.receiver_id) : null,
      group: message.group_id ? groupsMap.get(message.group_id) : null
    }));

    return {
      messages: messagesWithUserInfo,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取聊天消息列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      messages: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

// 获取群聊列表
export async function getGroups(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { page = 1, pageSize = 10, search = '' } = params;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('groups')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .throwOnError();

    if (search) {
      // 使用正确的Supabase JS v2 or条件语法
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, count } = await query;

    return {
      groups: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取群聊列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      groups: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

// 删除聊天消息
export async function deleteChatMessage(
  id: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    if (!id) {
      console.error('删除聊天消息失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    // 先获取消息信息用于日志记录
    const { data: message } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', id)
      .single()
      .throwOnError();
    
    await supabase.from('chat_messages').delete().eq('id', id).throwOnError();
    
    // 记录操作日志
    if (userId) {
      await logAction(
        userId, 
        'delete_chat_message', 
        'chat_message', 
        id,
        { message },
        ipAddress,
        userAgent
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error(`删除聊天消息ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 点赞接口
export interface Like {
  id: string;
  confession_id: string;
  user_id: string;
  created_at: string;
}

// 评论管理接口
export interface Comment {
  id: string;
  confession_id: string;
  content: string;
  is_anonymous: boolean;
  user_id: string;
  created_at: string;
  status: string;
  rejection_reason: string | null;
  moderator_id: string | null;
  moderated_at: string | null;
  updated_at: string;
}

// 获取点赞列表
export async function getLikes(params: {
  confessionId: string;
  page?: number;
  pageSize?: number;
}) {
  const { confessionId, page = 1, pageSize = 10 } = params;
  const offset = (page - 1) * pageSize;

  try {
    // 先获取点赞数据
    const { data: likesData, count } = await supabase
      .from('likes')
      .select('*', { count: 'exact' })
      .eq('confession_id', confessionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .throwOnError();

    if (!likesData || likesData.length === 0) {
      return {
        likes: [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }

    // 获取所有点赞用户的ID
    const userIds = likesData.map(like => like.user_id);

    // 获取用户信息
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds)
      .throwOnError();

    // 将用户信息转换为Map，方便查询
    const profilesMap = new Map<string, Profile>();
    (profilesData || []).forEach(profile => {
      profilesMap.set(profile.id, profile as Profile);
    });

    // 合并点赞数据和用户信息
    const likesWithUserInfo = likesData.map(like => ({
      ...like,
      profiles: profilesMap.get(like.user_id)
    }));

    return {
      likes: likesWithUserInfo,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取点赞列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      likes: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

// 获取评论列表
export async function getComments(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  confessionId?: string;
}) {
  const { page = 1, pageSize = 10, search = '', status, confessionId } = params;
  const offset = (page - 1) * pageSize;

  try {
    // 获取评论数据
    let query = supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .throwOnError();

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (confessionId) {
      query = query.eq('confession_id', confessionId);
    }

    const { data: commentsData, count } = await query;

    if (!commentsData || commentsData.length === 0) {
      return {
        comments: [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }

    // 获取所有评论用户的ID
    const userIds = commentsData
      .filter(comment => !comment.is_anonymous)
      .map(comment => comment.user_id);

    // 获取用户信息
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds)
      .throwOnError();

    // 将用户信息转换为Map，方便查询
    const profilesMap = new Map<string, Profile>();
    (profilesData || []).forEach(profile => {
      profilesMap.set(profile.id, profile as Profile);
    });

    // 合并评论数据和用户信息
    const commentsWithUserInfo = commentsData.map(comment => ({
      ...comment,
      profiles: !comment.is_anonymous ? profilesMap.get(comment.user_id) : null
    }));

    return {
      comments: commentsWithUserInfo,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取评论列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      comments: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

// 更新评论状态
export async function updateCommentStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  userId: string,
  rejectionReason?: string
) {
  try {
    if (!id) {
      console.error('更新评论状态失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    const updateData: Partial<{
      status: 'approved' | 'rejected' | 'pending';
      moderator_id: string;
      moderated_at: string;
      rejection_reason: string | null;
    }> = {
      status,
      moderator_id: userId,
      moderated_at: new Date().toISOString()
    };
    
    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    } else {
      updateData.rejection_reason = null;
    }
    
    await supabase.from('comments').update(updateData).eq('id', id).throwOnError();
    
    return { success: true };
  } catch (error) {
    console.error(`更新评论状态ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 删除评论
export async function deleteComment(
  id: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    if (!id) {
      console.error('删除评论失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    // 先获取评论信息用于日志记录
    const { data: comment } = await supabase
      .from('comments')
      .select('*')
      .eq('id', id)
      .single()
      .throwOnError();
    
    await supabase.from('comments').delete().eq('id', id).throwOnError();
    
    // 记录操作日志
    if (userId) {
      await logAction(
        userId, 
        'delete_comment', 
        'comment', 
        id,
        { comment },
        ipAddress,
        userAgent
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error(`删除评论ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 获取好友关系列表
export async function getFriendships(params: {
  page?: number;
  pageSize?: number;
  userId?: string;
}): Promise<{
  friendships: Array<{
    id: string;
    user_id: string;
    friend_id: string;
    created_at: string;
    updated_at: string;
    user: { id: string; username: string; display_name: string | null } | null;
    friend: { id: string; username: string; display_name: string | null } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { page = 1, pageSize = 10, userId } = params;
  const offset = (page - 1) * pageSize;

  try {
    // 步骤1: 获取好友关系列表
    let query = supabase
      .from('friendships')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .throwOnError();

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: friendshipsData, count } = await query;
    
    if (!friendshipsData || friendshipsData.length === 0) {
      return {
        friendships: [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }

    // 步骤2: 收集所有相关的用户ID
    const userIds = new Set<string>();
    friendshipsData.forEach(friendship => {
      userIds.add(friendship.user_id);
      userIds.add(friendship.friend_id);
    });

    // 步骤3: 获取所有相关用户的信息
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', Array.from(userIds))
      .throwOnError();

    // 步骤4: 将用户信息转换为Map，方便查询
    const profilesMap = new Map<string, { id: string; username: string; display_name: string | null }>();
    (profilesData || []).forEach(profile => {
      profilesMap.set(profile.id, {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name
      });
    });

    // 步骤5: 关联用户信息到好友关系
    const friendships = friendshipsData.map(friendship => ({
      id: friendship.id,
      user_id: friendship.user_id,
      friend_id: friendship.friend_id,
      created_at: friendship.created_at,
      updated_at: friendship.updated_at,
      user: profilesMap.get(friendship.user_id) || null,
      friend: profilesMap.get(friendship.friend_id) || null
    }));

    return {
      friendships,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取好友关系列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      friendships: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

// 删除好友关系
export async function deleteFriendship(
  id: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    if (!id) {
      console.error('删除好友关系失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    // 先获取好友关系信息用于日志记录
    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', id)
      .single()
      .throwOnError();
    
    await supabase.from('friendships').delete().eq('id', id).throwOnError();
    
    // 记录操作日志
    if (userId) {
      await logAction(
        userId, 
        'delete_friendship', 
        'friendship', 
        id,
        { friendship },
        ipAddress,
        userAgent
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error(`删除好友关系ID: ${id}失败:`, error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 获取系统设置
export async function getSystemSettings() {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system_settings')
      .single()
      .throwOnError();

    return data.value;
  } catch (error) {
    console.error('获取系统设置失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    // 返回默认设置，确保系统不会崩溃
    return {
      siteTitle: '表白墙',
      siteDescription: '一个匿名表白平台',
      enableAnonymousConfessions: true,
      enableComments: true,
      enableFriendSystem: true,
      enableChatSystem: true,
      maxConfessionLength: 500,
      maxCommentLength: 200,
      defaultPageSize: 10
    };
  }
}

// 从userStatsService导入getUserStats函数
export { getUserStats } from '@/services/userStatsService';

// 系统设置接口
interface SystemSettings {
  siteTitle: string;
  siteDescription: string;
  enableAnonymousConfessions: boolean;
  enableComments: boolean;
  enableFriendSystem: boolean;
  enableChatSystem: boolean;
  maxConfessionLength: number;
  maxCommentLength: number;
  defaultPageSize: number;
}

// 保存系统设置
export async function saveSystemSettings(
  settings: SystemSettings,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // 先获取旧设置用于日志记录
    const oldSettings = await getSystemSettings();
    
    await supabase
      .from('settings')
      .upsert(
        { key: 'system_settings', value: settings, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      .throwOnError();

    // 记录操作日志
    if (userId) {
      await logAction(
        userId, 
        'save_system_settings', 
        'settings', 
        'system_settings',
        { oldSettings, newSettings: settings },
        ipAddress,
        userAgent
      );
    }

    return { success: true };
  } catch (error) {
    console.error('保存系统设置失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}



// 记录操作日志
export async function logAction(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await supabase
      .from('logs')
      .insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        details: details || {},
        ip_address: ipAddress || null,
        user_agent: userAgent || null
      })
      .throwOnError();

    return { success: true };
  } catch (error) {
    console.error('记录日志失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 获取日志列表
export async function getLogs(params: {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  const { page = 1, pageSize = 10, userId, action, resourceType, startDate, endDate, search = '' } = params;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .throwOnError();

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (search) {
      // 使用正确的Supabase JS v2 or条件语法
      query = query.or(`action.ilike.%${search}%,resource_type.ilike.%${search}%`);
    }

    const { data: logsData, count } = await query;

    if (!logsData || logsData.length === 0) {
      return {
        logs: [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }

    // 获取所有相关用户的ID
    const userIds = new Set<string>();
    logsData.forEach(log => {
      if (log.user_id) {
        userIds.add(log.user_id);
      }
    });

    // 获取用户信息
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', Array.from(userIds))
      .throwOnError();

    // 将用户信息转换为Map，方便查询
    const profilesMap = new Map<string, { id: string; username: string; display_name: string | null; avatar_url: string | null }>();
    (profilesData || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    // 合并日志数据和用户信息
    const logsWithUserInfo = logsData.map(log => ({
      ...log,
      user: profilesMap.get(log.user_id)
    }));

    return {
      logs: logsWithUserInfo,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取日志列表失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      logs: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

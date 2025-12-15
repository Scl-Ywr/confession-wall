// 服务器端管理员服务，处理后台管理系统的业务逻辑
import { createSupabaseAdminClient } from '@/lib/supabase/server';

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

// 日志接口
export interface Log {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// 记录操作日志
export async function logAction(
  userId: string | null | undefined,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    
    await supabaseAdmin
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

// 获取角色列表（服务器端专用）
export async function getRoles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { page = 1, pageSize = 10, search = '' } = params;
  const offset = (page - 1) * pageSize;

  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    let query = supabaseAdmin
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

// 根据ID获取角色（服务器端专用）
export async function getRoleById(roleId: string) {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    const { data } = await supabaseAdmin
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

// 创建角色（服务器端专用）
export async function createRole(roleData: {
  name: string;
  description: string;
}, userId?: string | null, ipAddress?: string, userAgent?: string) {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    const { data } = await supabaseAdmin
      .from('roles')
      .insert([roleData])
      .select('*')
      .single()
      .throwOnError();

    if (data) {
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

// 更新角色（服务器端专用）
export async function updateRole(roleId: string, roleData: {
  name: string;
  description: string;
}, userId?: string | null, ipAddress?: string, userAgent?: string) {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 先获取角色的旧数据
    const { data: oldData } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()
      .throwOnError();
    
    const { data } = await supabaseAdmin
      .from('roles')
      .update(roleData)
      .eq('id', roleId)
      .select('*')
      .single()
      .throwOnError();

    if (data) {
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

// 删除角色（服务器端专用）
export async function deleteRole(roleId: string, userId?: string | null, ipAddress?: string, userAgent?: string) {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 先获取角色的旧数据
    const { data: oldData } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()
      .throwOnError();
    
    await supabaseAdmin
      .from('roles')
      .delete()
      .eq('id', roleId)
      .throwOnError();

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

// 获取权限列表（服务器端专用）
export async function getPermissions() {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    const { data } = await supabaseAdmin
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

// 获取角色权限（服务器端专用）
export async function getRolePermissions(roleId: string) {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    const { data } = await supabaseAdmin
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

// 为角色分配权限（服务器端专用）
export async function assignPermissionsToRole(roleId: string, permissionIds: string[], userId?: string | null, ipAddress?: string, userAgent?: string) {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 开始事务
    const { error: txError } = await supabaseAdmin.rpc('begin');
    if (txError) {
      throw txError;
    }
    
    try {
      // 获取角色的旧权限
      const { data: oldPermissionsData } = await supabaseAdmin
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId)
        .throwOnError();
      const oldPermissions = oldPermissionsData?.map(item => item.permission_id) || [];
      
      // 首先删除角色现有的所有权限
      await supabaseAdmin
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
        
        await supabaseAdmin
          .from('role_permissions')
          .insert(rolePermissions)
          .throwOnError();
      }

      // 提交事务
      await supabaseAdmin.rpc('commit');

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

      return { success: true };
    } catch (err) {
      // 回滚事务
      await supabaseAdmin.rpc('rollback');
      throw err;
    }
  } catch (error) {
    console.error('为角色分配权限失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: '未知错误' };
  }
}

// 获取日志列表（服务器端专用）
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
  const { page = 1, pageSize = 10, userId, action, resourceType, startDate, endDate } = params;
  const offset = (page - 1) * pageSize;

  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    let query = supabaseAdmin
      .from('logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

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

    const { data, count } = await query.throwOnError();

    return {
      logs: data || [],
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

// 获取用户列表（服务器端专用）
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
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 从profiles表获取基本信息，包括email字段
    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, email, avatar_url, online_status, created_at, is_admin', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1);

    if (search) {
      // 使用正确的Supabase JS v2 or条件语法
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: profiles, count } = await query.throwOnError();

    // 获取所有用户的角色信息
    const userIds = profiles?.map(profile => profile.id) || [];
    let userRolesMap: Record<string, string[]> = {};
    
    if (userIds.length > 0) {
      const { data: userRoles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role_id')
        .in('user_id', userIds)
        .throwOnError();
      
      // 获取角色名称映射
      const { data: roles } = await supabaseAdmin
        .from('roles')
        .select('id, name')
        .throwOnError();
      
      const rolesMap = roles?.reduce((acc, role) => {
        acc[role.id] = role.name;
        return acc;
      }, {} as Record<string, string>) || {};
      
      // 构建用户角色映射
      userRolesMap = userRoles?.reduce((acc, userRole) => {
        if (!acc[userRole.user_id]) {
          acc[userRole.user_id] = [];
        }
        acc[userRole.user_id].push(rolesMap[userRole.role_id] || userRole.role_id);
        return acc;
      }, {} as Record<string, string[]>) || {};
    }

    // 确保返回的数据格式正确，包含角色信息
    const users = (profiles || []).map(user => ({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      email: user.email || '未知邮箱',
      online_status: user.online_status,
      created_at: user.created_at,
      is_admin: user.is_admin,
      roles: userRolesMap[user.id] || []
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

// 获取用户角色（服务器端专用）
export async function getUserRoles(userId: string) {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 获取用户的角色ID列表
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .throwOnError();
    
    if (!userRoles || userRoles.length === 0) {
      return { roleIds: [] };
    }
    
    // 获取角色ID数组
    const roleIds = userRoles.map(item => item.role_id);
    
    return { roleIds };
  } catch (error) {
    console.error('获取用户角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return { roleIds: [] };
  }
}

// 更新用户角色（服务器端专用）
export async function updateUserRoles(userId: string, roleIds: string[], operatorId?: string | null, ipAddress?: string, userAgent?: string) {
  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 开始事务
    const { error: txError } = await supabaseAdmin.rpc('begin');
    if (txError) {
      throw txError;
    }
    
    try {
      // 获取用户的旧角色
      const { data: oldRolesData } = await supabaseAdmin
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .throwOnError();
      const oldRoles = oldRolesData?.map(item => item.role_id) || [];
      
      // 删除用户现有的所有角色
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .throwOnError();
      
      // 如果有新的角色ID，添加它们
      if (roleIds && roleIds.length > 0) {
        const roleAssignments = roleIds.map(roleId => ({
          user_id: userId,
          role_id: roleId
        }));
        
        await supabaseAdmin
          .from('user_roles')
          .insert(roleAssignments)
          .throwOnError();
      }
      
      // 提交事务
      await supabaseAdmin.rpc('commit');
      
      // 获取角色名称列表
      const { data: roles } = await supabaseAdmin
        .from('roles')
        .select('id, name')
        .in('id', roleIds)
        .throwOnError();
      
      const roleNames = roles?.map(role => role.name) || [];
      
      // 更新is_admin字段（用于向后兼容）
      const isAdmin = roleNames.includes('super_admin') || roleNames.includes('admin');
      await supabaseAdmin
        .from('profiles')
        .update({ is_admin: isAdmin })
        .eq('id', userId)
        .throwOnError();
      
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
      
      return { success: true, roleNames };
    } catch (err) {
      // 回滚事务
      await supabaseAdmin.rpc('rollback');
      throw err;
    }
  } catch (error) {
    console.error('更新用户角色失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
      return { success: false, error: error.message, roleNames: [] };
    }
    return { success: false, error: '未知错误', roleNames: [] };
  }
}

// 获取所有用户角色关系（服务器端专用）
export async function getAllUserRoles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { page = 1, pageSize = 10, search = '' } = params;
  const offset = (page - 1) * pageSize;

  try {
    // 使用管理员客户端
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 构建用户角色关系查询，包括用户信息和角色信息
    let query = supabaseAdmin
      .from('user_roles')
      .select(`
        user_id,
        role_id,
        created_at,
        profiles!inner(id, username, display_name, email, is_admin),
        roles!inner(id, name, description)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (search) {
      // 使用正确的Supabase JS v2 or条件语法，在多个关联表中搜索
      query = query.or(`
        profiles.username.ilike.%${search}%,
        profiles.display_name.ilike.%${search}%,
        profiles.email.ilike.%${search}%,
        roles.name.ilike.%${search}%,
        roles.description.ilike.%${search}%
      `);
    }

    const { data: userRoles, count } = await query.throwOnError();

    // 定义更具体的类型
    interface Profile {
      username: string;
      display_name: string;
      email: string;
      is_admin: boolean;
    }

    interface Role {
      name: string;
      description: string;
    }

    // 格式化返回数据
    const formattedUserRoles = userRoles?.map(ur => {
      // 使用类型断言为具体类型
      const profile = (ur.profiles as unknown as Profile) || {} as Profile;
      const role = (ur.roles as unknown as Role) || {} as Role;
      
      return {
        userId: ur.user_id,
        userName: profile.username || '未知用户',
        userDisplayName: profile.display_name || profile.username || '未知用户',
        userEmail: profile.email || '未知邮箱',
        isAdmin: profile.is_admin || false,
        roleId: ur.role_id,
        roleName: role.name || '未知角色',
        roleDescription: role.description || '无描述',
        assignedAt: ur.created_at || new Date().toISOString()
      };
    }) || [];

    return {
      userRoles: formattedUserRoles,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('获取所有用户角色关系失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return {
      userRoles: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

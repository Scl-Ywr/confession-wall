// 管理员API权限中间件

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkUserPermissionsServer } from '@/utils/permissionCheckServer';

// API路由与所需权限的映射
const API_PERMISSIONS_MAP: Record<string, string[]> = {
  // 用户管理API
  '/api/admin/users': ['view_users'],
  '/api/admin/users/[userId]/edit': ['edit_users'],
  '/api/admin/users/[userId]/delete': ['delete_users'],
  '/api/admin/users/[userId]/roles': ['assign_roles'],
  
  // 角色管理API
  '/api/admin/roles': ['view_roles'],
  '/api/admin/roles/create': ['create_roles'],
  '/api/admin/roles/[id]/edit': ['edit_roles'],
  '/api/admin/roles/[id]/delete': ['delete_roles'],
  '/api/admin/roles/[id]/permissions': ['manage_role_permissions'],
  '/api/admin/permissions': ['view_roles'],
  
  // 内容管理API
  '/api/admin/confessions': ['view_confessions'],
  '/api/admin/confessions/[id]/approve': ['approve_confessions'],
  '/api/admin/confessions/[id]/reject': ['reject_confessions'],
  '/api/admin/confessions/[id]/delete': ['delete_confessions'],
  
  '/api/admin/comments': ['view_comments'],
  '/api/admin/comments/[id]/approve': ['approve_comments'],
  '/api/admin/comments/[id]/reject': ['reject_comments'],
  '/api/admin/comments/[id]/delete': ['delete_comments'],
  
  // 聊天管理API
  '/api/admin/chat/messages': ['view_chat_messages'],
  '/api/admin/chat/messages/[id]/delete': ['delete_chat_messages'],
  '/api/admin/chat/groups': ['manage_groups'],
  
  // 系统管理API
  '/api/admin/stats': ['view_system_stats'],
  '/api/admin/settings': ['manage_system_settings'],
  '/api/admin/logs': ['view_logs'],
  '/api/admin/media': ['manage_media']
};

// 权限检查中间件
export async function middleware(request: Request) {
  // 获取请求路径
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log('权限检查中间件 - 路径:', path);
  
  // 检查是否需要权限验证
  const requiredPermissions = Object.keys(API_PERMISSIONS_MAP).find(
    route => path.startsWith(route) || path === route
  );
  
  if (!requiredPermissions) {
    console.log('无需权限验证的路径:', path);
    return NextResponse.next();
  }
  
  const permissions = API_PERMISSIONS_MAP[requiredPermissions];
  console.log('所需权限:', permissions);
  
  try {
    // 创建Supabase服务器客户端来处理会话
    const supabaseServer = await createSupabaseServerClient(request);
    
    // 从请求中获取用户会话
    const { data: { user }, error: sessionError } = await supabaseServer.auth.getUser();
    
    if (sessionError || !user) {
      return NextResponse.json(
        { message: '认证失败', error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    console.log('用户ID:', userId);
    
    // 检查用户是否拥有所需权限
    const permissionCheck = await checkUserPermissionsServer(userId, permissions);
    
    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        { 
          message: '您没有权限执行此操作', 
          error: 'Forbidden',
          missingPermissions: permissionCheck.missingPermissions
        },
        { status: 403 }
      );
    }
    
    // 权限验证通过，继续请求
    console.log('权限验证通过');
    return NextResponse.next();
    
  } catch (error) {
    console.error('权限中间件错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误', error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 配置中间件应用的路由
export const config = {
  matcher: ['/api/admin/:path*']
};

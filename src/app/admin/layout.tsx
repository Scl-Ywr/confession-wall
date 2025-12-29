// 后台管理系统基础布局
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { AdminClientLayout } from './components/AdminClientLayout';

export const dynamic = 'force-dynamic';

// 服务器端布局组件 - 处理认证和授权
export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    // 1. 创建Supabase服务器客户端用于获取当前用户会话
    const supabaseServer = await createSupabaseServerClient();
    
    // 获取当前用户
    const { data: authData, error: authError } = await supabaseServer.auth.getUser();
    
    // 处理认证错误
    if (authError || !authData?.user) {
      redirect('/auth/admin-login');
    }
    
    // 2. 创建Supabase管理员客户端用于检查管理员权限
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 检查用户是否为管理员（首先检查profiles表中的is_admin字段）
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    // 如果是管理员，直接通过
    if (profile?.is_admin) {
      // 渲染客户端布局组件
      return <AdminClientLayout>{children}</AdminClientLayout>;
    }
    
    // 3. 如果不是直接管理员，检查用户角色
    // 检查用户是否拥有管理员相关角色
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', authData.user.id);
    
    if (!userRoles || userRoles.length === 0) {
      redirect('/auth/admin-login');
    }
    
    // 获取角色名称
    const roleIds = userRoles.map(ur => ur.role_id);
    const { data: roles } = await supabaseAdmin
      .from('roles')
      .select('name')
      .in('id', roleIds);
    
    // 检查是否为管理员相关角色
    const roleNames = roles?.map(r => r.name) || [];
    const isAdminUser = roleNames.includes('super_admin') || 
                       roleNames.includes('admin') || 
                       roleNames.includes('moderator');
    
    if (!isAdminUser) {
      redirect('/auth/admin-login');
    }
    
    // 渲染客户端布局组件
    return <AdminClientLayout>{children}</AdminClientLayout>;
  } catch (error) {
    console.error('Unexpected error in admin layout:', error);
    redirect('/auth/admin-login');
  }
}

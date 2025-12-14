// 后台管理系统基础布局
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminClientLayout } from './components/AdminClientLayout';

// 服务器端布局组件 - 处理认证和授权
export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    // 创建Supabase服务器客户端
    const supabase = await createSupabaseServerClient();
    
    // 获取当前用户
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    // 处理认证错误
    if (authError || !authData?.user) {
      redirect('/auth/admin-login');
    }
    
    // 检查用户是否为管理员
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single();
    
    // 处理profile错误
    if (profileError || !profile || profile.is_admin !== true) {
      redirect('/auth/admin-login');
    }
    
    // 渲染客户端布局组件
    return <AdminClientLayout>{children}</AdminClientLayout>;
  } catch (error) {
    console.error('Unexpected error in admin layout:', error);
    redirect('/auth/admin-login');
  }
}

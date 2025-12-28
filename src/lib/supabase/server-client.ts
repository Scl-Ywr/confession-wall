import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * 创建服务端Supabase客户端，从HTTP-only cookies中读取会话
 * 用于App Router中的服务端组件
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  // 从cookies中提取Supabase tokens
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;
  
  // 创建Supabase客户端
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // 如果有tokens，设置会话
  if (accessToken && refreshToken) {
    try {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      console.error('Error setting Supabase session from cookies:', error);
    }
  }
  
  return supabase;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}
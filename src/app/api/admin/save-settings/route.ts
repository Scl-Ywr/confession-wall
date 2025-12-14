// API route to save system settings with admin logging
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { saveSystemSettings } from '@/services/admin/adminService';

export async function POST(req: NextRequest) {
  try {
    // 解析请求数据
    const settings = await req.json();
    
    // 创建Supabase服务器客户端
    const supabase = await createSupabaseServerClient();
    
    // 获取当前用户
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 检查用户是否为管理员
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // 获取客户端IP地址和用户代理
    const ipAddress = req.headers.get('x-forwarded-for') || null;
    const userAgent = req.headers.get('user-agent') || null;
    
    // 保存系统设置并记录日志
    const result = await saveSystemSettings(
      settings, 
      authData.user.id, 
      ipAddress as string,
      userAgent as string
    );
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving system settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save settings' }, 
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // 验证当前用户是否为管理员
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    // 检查用户是否为管理员
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: '只有管理员可以查看安全码' }, { status: 403 });
    }
    
    // 获取当前安全码
    const { data: setting, error: settingError } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'admin_verification_code')
      .single();
    
    if (settingError || !setting) {
      return NextResponse.json({ error: '系统设置获取失败' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      code: setting.value, 
      updatedAt: setting.updated_at 
    });
  } catch (error) {
    console.error('获取安全码错误:', error);
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}

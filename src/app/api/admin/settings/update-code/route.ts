import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 首先验证当前用户是否为管理员
    const supabaseAuth = await createSupabaseServerClient();
    const { data: authData } = await supabaseAuth.auth.getUser();
    
    if (!authData?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    // 检查用户是否为管理员
    const { data: profile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: '只有管理员可以修改安全码' }, { status: 403 });
    }
    
    // 获取请求数据
    const { oldCode, newCode } = await request.json();
    
    // 验证请求数据
    if (!oldCode || !newCode) {
      return NextResponse.json({ error: '旧安全码和新安全码不能为空' }, { status: 400 });
    }
    
    // 创建管理员客户端用于修改系统设置
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 获取当前安全码进行验证
    const { data: currentSetting, error: settingError } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'admin_verification_code')
      .single();
    
    if (settingError || !currentSetting) {
      return NextResponse.json({ error: '系统设置获取失败' }, { status: 500 });
    }
    
    // 验证旧安全码
    if (oldCode !== currentSetting.value) {
      return NextResponse.json({ error: '旧安全码错误' }, { status: 400 });
    }
    
    // 更新安全码
    const { error: updateError } = await supabaseAdmin
      .from('system_settings')
      .update({
        value: newCode,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'admin_verification_code');
    
    if (updateError) {
      return NextResponse.json({ error: '安全码更新失败' }, { status: 500 });
    }
    
    return NextResponse.json({ message: '安全码更新成功' });
  } catch (error) {
    console.error('修改安全码错误:', error);
    return NextResponse.json({ error: '修改失败，请重试' }, { status: 500 });
  }
}

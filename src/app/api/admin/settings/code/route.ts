import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { handleApiError, createUnauthorizedError, createForbiddenError } from '@/lib/error-handler';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user) {
      throw createUnauthorizedError();
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profile || !profile.is_admin) {
      throw createForbiddenError();
    }
    
    const { data: setting, error: settingError } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'admin_verification_code')
      .single();
    
    if (settingError || !setting) {
      return NextResponse.json({ error: '系统设置获取失败' }, { status: 500 });
    }
    
    const maskedCode = setting.value.length > 4 
      ? setting.value.substring(0, 4) + '****'
      : '****';
    
    return NextResponse.json({ 
      code: maskedCode,
      updatedAt: setting.updated_at 
    });
  } catch (error) {
    return handleApiError(error);
  }
}

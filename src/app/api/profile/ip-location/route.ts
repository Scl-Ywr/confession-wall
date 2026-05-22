import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserProfileCacheKey } from '@/lib/cache/cache';
import { removeCache } from '@/utils/cache';

type IpLocationPayload = {
  user_ip?: string;
  user_city?: string;
  user_province?: string;
  user_country?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ error: '未登录，无法更新 IP 信息' }, { status: 401 });
  }

  let payload: IpLocationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求数据格式错误' }, { status: 400 });
  }

  const userIp = normalizeText(payload.user_ip);
  const userCity = normalizeText(payload.user_city) || '未知城市';
  const userCountry = normalizeText(payload.user_country) || '未知国家';
  const userProvince = normalizeText(payload.user_province);

  if (!userIp || userIp === 'unknown') {
    return NextResponse.json({ error: 'IP 地址无效' }, { status: 400 });
  }

  const updateData: Record<string, string> = {
    user_ip: userIp,
    user_city: userCity,
    user_country: userCountry,
    ip_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (userProvince) {
    updateData.user_province = userProvince;
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', authData.user.id)
    .select('id, user_ip, user_city, user_province, user_country, ip_updated_at')
    .maybeSingle();

  if (updateError) {
    console.error('Failed to update profile IP location:', updateError);
    return NextResponse.json({ error: '更新 IP 信息失败' }, { status: 500 });
  }

  if (!updatedProfile) {
    return NextResponse.json({ error: '未找到用户资料' }, { status: 404 });
  }

  await removeCache(getUserProfileCacheKey(authData.user.id));

  return NextResponse.json({ success: true, profile: updatedProfile });
}

function normalizeText(value?: string) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}

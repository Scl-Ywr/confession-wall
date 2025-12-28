import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logtoUserId, provider, email, displayName, avatarUrl, metadata } = body;

    if (!logtoUserId || !provider) {
      return NextResponse.json(
        { error: '缺少必要参数: logtoUserId 和 provider' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc('find_or_create_user_identity', {
      p_logto_user_id: logtoUserId,
      p_provider: provider,
      p_email: email || null,
      p_display_name: displayName || null,
      p_avatar_url: avatarUrl || null,
      p_metadata: metadata || {}
    });

    if (error) {
      console.error('Error finding or creating user identity:', error);
      return NextResponse.json(
        { error: '用户映射失败' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '无法创建用户映射' },
        { status: 500 }
      );
    }

    const result = data[0];

    return NextResponse.json({
      success: true,
      supabaseUserId: result.supabase_user_id,
      logtoUserId: result.logto_user_id,
      provider: result.provider,
      isNewUser: result.is_new_user
    });
  } catch (error) {
    console.error('Error in user mapping API:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const logtoUserId = searchParams.get('logtoUserId');
    const provider = searchParams.get('provider');

    if (!logtoUserId || !provider) {
      return NextResponse.json(
        { error: '缺少必要参数: logtoUserId 和 provider' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('user_identity_mapping')
      .select('*')
      .eq('logto_user_id', logtoUserId)
      .eq('provider', provider)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user mapping:', error);
      return NextResponse.json(
        { error: '获取用户映射失败' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '用户映射不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      mapping: data
    });
  } catch (error) {
    console.error('Error in user mapping GET API:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

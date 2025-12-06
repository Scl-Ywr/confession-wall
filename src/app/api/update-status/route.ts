import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    let status: 'online' | 'offline' | 'away';

    // 检查请求内容类型，支持JSON和FormData两种格式
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      // 解析JSON格式
      const jsonData = await req.json();
      userId = jsonData.userId;
      status = jsonData.status;
    } else {
      // 解析FormData格式
      const formData = await req.formData();
      userId = formData.get('userId') as string;
      status = formData.get('status') as 'online' | 'offline' | 'away';
    }

    if (!userId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 验证状态值是否有效
    if (!['online', 'offline', 'away'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // 创建Supabase客户端
    const supabase = await createSupabaseServerClient();

    // 尝试获取当前登录用户的信息
    try {
      await supabase.auth.getUser();
    } catch (authError) {
      // 忽略认证错误，继续执行
      console.error('Error getting current user:', authError);
    }

    // 允许通过userId直接更新状态
    // 这是为了支持页面关闭时的状态更新
    // 当用户关闭页面时，浏览器会发送一个sendBeacon请求，此时用户会话可能已经过期

    // 更新用户在线状态
    const { error } = await supabase
      .from('profiles')
      .update({
        online_status: status,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating status:', { userId, status, error });
      return NextResponse.json({ error: 'Failed to update status', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId, status });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

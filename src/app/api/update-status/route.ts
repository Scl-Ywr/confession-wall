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

    // 1. 尝试获取当前登录用户的信息
    let currentUserId: string | null = null;
    let isAuthenticated = false;
    
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        currentUserId = authData.user.id;
        isAuthenticated = true;
      }
    } catch (authError) {
      // 忽略认证错误，继续执行
      console.error('Error getting current user:', authError);
    }

    // 2. 验证请求合法性
    if (isAuthenticated) {
      // 对于已认证用户，确保只能更新自己的状态
      if (currentUserId !== userId) {
        return NextResponse.json({ error: 'Forbidden: You can only update your own status' }, { status: 403 });
      }
    }
    // 对于未认证请求（如sendBeacon），允许更新状态，但只允许设置为offline
    else if (status !== 'offline') {
      return NextResponse.json({ error: 'Unauthorized: Only offline status can be set without authentication' }, { status: 401 });
    }

    // 3. 更新用户在线状态
    const { error } = await supabase
      .from('profiles')
      .update({
        online_status: status,
        last_seen: 'now()' // 使用数据库的当前时间，避免客户端时间问题
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

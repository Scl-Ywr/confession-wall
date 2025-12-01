import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    let status: 'online' | 'offline';

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
      status = formData.get('status') as 'online' | 'offline';
    }

    if (!userId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 创建Supabase客户端
    const supabase = await createSupabaseServerClient();

    // 更新用户在线状态
    const { error } = await supabase
      .from('profiles')
      .update({
        online_status: status,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

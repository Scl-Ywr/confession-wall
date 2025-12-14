// 用户统计数据API路由
import { NextResponse } from 'next/server';
import { getUserStats } from '@/services/userStatsService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取用户统计数据
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 解析params
    const { userId } = await params;
    
    // 创建Supabase客户端
    const supabase = await createSupabaseServerClient();
    
    // 验证用户身份
    const { data: authData } = await supabase.auth.getUser();
    const session = authData.user;
    
    // 只有管理员或用户本人可以访问
    if (!session || (session.id !== userId && !session.email?.endsWith('@admin.com'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取用户统计数据
    const stats = await getUserStats(userId);

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('获取用户统计数据失败:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

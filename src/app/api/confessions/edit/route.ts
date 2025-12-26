import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { id, content } = await request.json();
    
    if (!id || !content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = user.id;
    
    const { data: confession } = await supabase
      .from('confessions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!confession) {
      return NextResponse.json({ error: '表白不存在' }, { status: 404 });
    }

    if (confession.user_id !== userId) {
      return NextResponse.json({ error: '无权修改此表白' }, { status: 403 });
    }

    const { error } = await supabase
      .from('confessions')
      .update({ content })
      .eq('id', id);

    if (error) {
      console.error('Error updating confession:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in edit confession API:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

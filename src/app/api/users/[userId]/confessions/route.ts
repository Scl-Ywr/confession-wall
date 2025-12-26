import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取用户的表白列表
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const { data: confessions, error } = await supabase
      .rpc('get_confessions_by_user', { 
        user_id_param: userId,
        limit_count: limit,
        offset_count: offset
      });
    
    if (error) {
      console.error('Error fetching user confessions:', error);
      return NextResponse.json({ error: 'Failed to fetch confessions' }, { status: 500 });
    }
    
    return NextResponse.json({ confessions });
  } catch (error) {
    console.error('Error in user confessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
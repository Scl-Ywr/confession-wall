import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取用户的提及记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // 获取用户的提及记录
    const { data: mentions, error } = await supabase
      .from('mentions')
      .select(`
        *, 
        confession:confessions(id, content, created_at),
        mentioned_by_user:profiles(id, display_name, username, avatar_url)
      `)
      .eq('mentioned_user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching mentions:', error);
      return NextResponse.json({ error: 'Failed to fetch mentions' }, { status: 500 });
    }
    
    return NextResponse.json({ mentions });
  } catch (error) {
    console.error('Error in mentions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
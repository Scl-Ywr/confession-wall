import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 搜索用户（用于@提及功能）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    
    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // 搜索用户
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${query}%`)
      .or(`display_name.ilike.%${query}%`)
      .limit(10);
    
    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ users: [] });
    }
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in user search API:', error);
    return NextResponse.json({ users: [] });
  }
}
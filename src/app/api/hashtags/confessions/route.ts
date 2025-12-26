import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取特定标签下的表白
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hashtag = searchParams.get('hashtag');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!hashtag) {
      return NextResponse.json({ error: 'Hashtag is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    const { data: confessions, error } = await supabase
      .rpc('get_confessions_by_hashtag', { 
        tag_text: hashtag,
        limit_count: limit,
        offset_count: offset
      });
    
    if (error) {
      console.error('Error fetching confessions by hashtag:', error);
      return NextResponse.json({ error: 'Failed to fetch confessions' }, { status: 500 });
    }
    
    return NextResponse.json({ confessions });
  } catch (error) {
    console.error('Error in hashtags confessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
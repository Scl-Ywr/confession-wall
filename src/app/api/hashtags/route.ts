import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取热门标签
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const supabase = await createSupabaseServerClient();
    
    // 使用RPC函数获取热门标签
    const { data: hashtags, error } = await supabase
      .rpc('get_trending_hashtags', { limit_count: limit });
    
    if (error) {
      console.error('Error fetching trending hashtags:', error);
      // 备选方案：直接查询
      const { data: fallbackHashtags, error: fallbackError } = await supabase
        .from('hashtags')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);
      
      if (fallbackError) {
        // 返回空数组而不是 500 错误，防止前端崩溃
        return NextResponse.json({ hashtags: [] });
      }
      
      return NextResponse.json({ hashtags: fallbackHashtags || [] });
    }
    
    return NextResponse.json({ hashtags: hashtags || [] });
  } catch (error) {
    console.error('Error in hashtags API:', error);
    // 返回空数组而不是 500 错误，防止前端崩溃
    return NextResponse.json({ hashtags: [] });
  }
}

// 创建新标签
export async function POST(request: NextRequest) {
  try {
    const { tag } = await request.json();
    
    if (!tag) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // 检查标签是否已存在
    const { data: existingTag, error: fetchError } = await supabase
      .from('hashtags')
      .select('*')
      .eq('tag', tag)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing tag:', fetchError);
      return NextResponse.json({ error: 'Failed to check existing tag' }, { status: 500 });
    }
    
    // 如果标签已存在，返回现有标签
    if (existingTag) {
      return NextResponse.json({ hashtag: existingTag });
    }
    
    // 创建新标签
    const { data: hashtag, error } = await supabase
      .from('hashtags')
      .insert([{ tag, usage_count: 0 }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating hashtag:', error);
      return NextResponse.json({ error: 'Failed to create hashtag' }, { status: 500 });
    }
    
    return NextResponse.json({ hashtag }, { status: 201 });
  } catch (error) {
    console.error('Error in hashtags API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
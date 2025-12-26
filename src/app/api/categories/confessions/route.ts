import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取特定分类下的表白
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // 使用RPC函数获取分类下的表白
    const { data: confessions, error } = await supabase
      .rpc('get_confessions_by_category', { 
        category_id_param: categoryId, 
        limit_count: limit, 
        offset_count: offset 
      });
    
    if (error) {
      console.error('Error fetching confessions by category:', error);
      // 备选方案：直接查询
      const { data: fallbackConfessions, error: fallbackError } = await supabase
        .from('confessions')
        .select(`
          *,
          profile:profiles(id, display_name, username, avatar_url),
          category:confession_categories(id, name, icon, color),
          hashtags:confession_hashtags(
            id,
            hashtag:hashtags(id, tag)
          )
        `)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to fetch confessions' }, { status: 500 });
      }
      
      return NextResponse.json({ confessions: fallbackConfessions });
    }
    
    // 获取完整的表白信息，包括用户资料、分类和标签
    const confessionIds = confessions.map((c: { id: string }) => c.id);
    const { data: fullConfessions, error: fullError } = await supabase
      .from('confessions')
      .select(`
        *,
        profile:profiles(id, display_name, username, avatar_url),
        category:confession_categories(id, name, icon, color),
        hashtags:confession_hashtags(
          id,
          hashtag:hashtags(id, tag)
        )
      `)
      .in('id', confessionIds)
      .order('created_at', { ascending: false });
    
    if (fullError) {
      console.error('Error fetching full confessions:', fullError);
      return NextResponse.json({ confessions });
    }
    
    return NextResponse.json({ confessions: fullConfessions });
  } catch (error) {
    console.error('Error in category confessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
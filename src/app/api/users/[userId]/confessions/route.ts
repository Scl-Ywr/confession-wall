import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Confession, Profile } from '@/types/confession';

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

    // Calculate if there are more confessions to load
    const hasMore = confessions && confessions.length === limit;

    // 获取用户资料信息
    let profile: Profile | null = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!profileError && profileData) {
        profile = profileData;
      }
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // 为每个表白添加用户资料和图片信息
    const confessionsWithProfileAndImages = await Promise.all(
      (confessions || []).map(async (confession: Confession) => {
        // 获取表白图片
        const { data: images } = await supabase
          .from('confession_images')
          .select('*')
          .eq('confession_id', confession.id)
          .order('created_at', { ascending: true });

        return {
          ...confession,
          profile: profile || null,
          images: images || []
        };
      })
    );

    return NextResponse.json({
      confessions: confessionsWithProfileAndImages,
      hasMore
    });
  } catch (error) {
    console.error('Error in user confessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
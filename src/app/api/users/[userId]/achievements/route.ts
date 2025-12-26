'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取用户的成就
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const unlocked = searchParams.get('unlocked');
    
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('user_achievements')
      .select('*, achievements:achievement_id(*)')
      .eq('user_id', userId);
    
    if (unlocked === 'true') {
      query = query.eq('is_unlocked', true);
    } else if (unlocked === 'false') {
      query = query.eq('is_unlocked', false);
    }
    
    const { data: userAchievements, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(userAchievements);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取用户的等级信息
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    
    const supabase = await createSupabaseServerClient();
    
    const { data: userLevel, error } = await supabase
      .from('user_levels')
      .select('*, levels:level_id(*)')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(userLevel);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
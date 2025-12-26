'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取圈子成员
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await context.params;
    
    const supabase = await createSupabaseServerClient();
    
    const { data: members, error } = await supabase
      .from('group_members')
      .select('*, user:user_id(*)')
      .eq('group_id', groupId);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
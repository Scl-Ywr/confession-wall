'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    const supabase = await createSupabaseServerClient();
    
    let query = supabase
      .from('interest_groups')
      .select('*');
    
    if (userId) {
      query = query.in('id', (await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
      ).data?.map(member => member.group_id) || []);
    }
    
    const { data: groups, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(groups);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
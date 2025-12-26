'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取圈子表白列表
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await context.params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const supabase = await createSupabaseServerClient();
    
    const { data: confessions, error } = await supabase
      .from('confessions')
      .select('*, profile:profiles(*), category:confession_categories(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(confessions);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
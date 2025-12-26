'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await context.params;
    
    const supabase = await createSupabaseServerClient();
    
    const { data: group, error } = await supabase
      .from('interest_groups')
      .select('*')
      .eq('id', groupId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
'use server';

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取所有成就
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: achievements, error } = await supabase
      .from('achievements')
      .select('*')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(achievements);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
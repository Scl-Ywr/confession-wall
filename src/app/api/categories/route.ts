import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取所有分类
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: categories, error } = await supabase
      .from('confession_categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      // 返回空数组而不是 500 错误，防止前端崩溃
      return NextResponse.json({ categories: [] });
    }
    
    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Error in categories API:', error);
    // 返回空数组而不是 500 错误，防止前端崩溃
    return NextResponse.json({ categories: [] });
  }
}

// 创建新分类（仅管理员）
export async function POST(request: NextRequest) {
  try {
    // 验证用户是否为管理员 - 这里简化处理，实际应用中应该使用Supabase Auth来验证
    // 注意：在实际生产环境中，你应该实现更严格的认证机制
    const { name, description, icon, color } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    const { data: category, error } = await supabase
      .from('confession_categories')
      .insert([{ name, description, icon, color }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
    
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error in categories API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// 用户积分API路由
import { NextResponse } from 'next/server';
import {
  getUserPoints,
  updateUserPoints,
  increaseUserPoints,
  decreaseUserPoints
} from '@/services/userStatsService';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 验证模式
const updatePointsSchema = z.object({
  points: z.number().min(0, '积分不能为负数')
});

const adjustPointsSchema = z.object({
  amount: z.number().int().min(1, '调整数量必须为正整数')
});

// 获取用户积分
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 解析params
    const { userId } = await params;
    
    // 创建Supabase客户端
    const supabase = await createSupabaseServerClient();
    
    // 验证用户身份
    const { data: authData } = await supabase.auth.getUser();
    const session = authData.user;
    
    // 只有管理员或用户本人可以访问
    if (!session || (session.id !== userId && !session.email?.endsWith('@admin.com'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取用户积分
    const points = await getUserPoints(userId);

    if (!points) {
      return NextResponse.json({ error: 'User points not found' }, { status: 404 });
    }

    return NextResponse.json(points, { status: 200 });
  } catch (error) {
    console.error('获取用户积分失败:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 更新用户积分
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 解析params
    const { userId } = await params;
    
    // 创建Supabase客户端
    const supabase = await createSupabaseServerClient();
    
    // 验证用户身份
    const { data: authData } = await supabase.auth.getUser();
    const session = authData.user;
    
    // 只有管理员可以更新用户积分
    if (!session || !session.email?.endsWith('@admin.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证请求体
    const body = await request.json();
    const validation = updatePointsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues }, { status: 400 });
    }

    // 更新用户积分
    const points = await updateUserPoints(userId, validation.data);

    if (!points) {
      return NextResponse.json({ error: 'Failed to update user points' }, { status: 500 });
    }

    return NextResponse.json(points, { status: 200 });
  } catch (error) {
    console.error('更新用户积分失败:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 增加用户积分
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 解析params
    const { userId } = await params;
    
    // 创建Supabase客户端
    const supabase = await createSupabaseServerClient();
    
    // 验证用户身份
    const { data: authData } = await supabase.auth.getUser();
    const session = authData.user;
    
    // 只有管理员可以增加用户积分
    if (!session || !session.email?.endsWith('@admin.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证请求体
    const body = await request.json();
    const validation = adjustPointsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues }, { status: 400 });
    }

    // 增加用户积分
    const points = await increaseUserPoints(userId, validation.data.amount);

    if (!points) {
      return NextResponse.json({ error: 'Failed to increase user points' }, { status: 500 });
    }

    return NextResponse.json(points, { status: 200 });
  } catch (error) {
    console.error('增加用户积分失败:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 减少用户积分
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 解析params
    const { userId } = await params;
    
    // 创建Supabase客户端
    const supabase = await createSupabaseServerClient();
    
    // 验证用户身份
    const { data: authData } = await supabase.auth.getUser();
    const session = authData.user;
    
    // 只有管理员可以减少用户积分
    if (!session || !session.email?.endsWith('@admin.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证请求体
    const body = await request.json();
    const validation = adjustPointsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues }, { status: 400 });
    }

    // 减少用户积分
    const points = await decreaseUserPoints(userId, validation.data.amount);

    if (!points) {
      return NextResponse.json({ error: 'Failed to decrease user points' }, { status: 500 });
    }

    return NextResponse.json(points, { status: 200 });
  } catch (error) {
    console.error('减少用户积分失败:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

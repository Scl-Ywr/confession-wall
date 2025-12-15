import { NextResponse, NextRequest } from 'next/server';
import { getUserRoles, updateUserRoles } from '@/services/admin/adminServiceServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const result = await getUserRoles(userId);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('获取用户角色API错误:', error);
    return NextResponse.json(
      { message: '获取用户角色失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient(request);
    
    // 获取当前用户（操作人）
    const { data: { user } } = await supabase.auth.getUser();
    
    // 获取IP地址
    const forwardedFor = request.headers.get('X-Forwarded-For');
    const ipAddress = forwardedFor?.split(',')[0].trim() || undefined;
    
    // 获取用户代理
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { roleIds } = body;
    
    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ message: 'roleIds must be an array' }, { status: 400 });
    }

    const result = await updateUserRoles(
      userId, 
      roleIds,
      user?.id || null,
      ipAddress,
      userAgent
    );

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(
        { message: '更新用户角色失败', error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('更新用户角色API错误:', error);
    return NextResponse.json(
      { message: '更新用户角色失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

import { NextResponse, NextRequest } from 'next/server';
import { getRoleById, updateRole, deleteRole } from '@/services/admin/adminServiceServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: '角色ID不能为空' }, { status: 400 });
    }

    const result = await getRoleById(id);

    if (!result) {
      return NextResponse.json({ message: '角色不存在' }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('获取角色详情API错误:', error);
    return NextResponse.json(
      { message: '获取角色详情失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient(request);
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    // 获取IP地址
    const forwardedFor = request.headers.get('X-Forwarded-For');
    const ipAddress = forwardedFor?.split(',')[0].trim() || undefined;
    
    // 获取用户代理
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: '角色ID不能为空' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json({ message: '角色名称不能为空' }, { status: 400 });
    }

    const result = await updateRole(
      id, 
      {
        name,
        description: description || ''
      },
      user?.id || null,
      ipAddress,
      userAgent
    );

    if (!result) {
      return NextResponse.json({ message: '角色不存在' }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('更新角色API错误:', error);
    return NextResponse.json(
      { message: '更新角色失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient(request);
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    // 获取IP地址
    const forwardedFor = request.headers.get('X-Forwarded-For');
    const ipAddress = forwardedFor?.split(',')[0].trim() || undefined;
    
    // 获取用户代理
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: '角色ID不能为空' }, { status: 400 });
    }

    const result = await deleteRole(
      id,
      user?.id || null,
      ipAddress,
      userAgent
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('删除角色API错误:', error);
    return NextResponse.json(
      { message: '删除角色失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

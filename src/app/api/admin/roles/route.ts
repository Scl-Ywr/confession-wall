import { NextResponse, NextRequest } from 'next/server';
import { 
  getRoles, 
  createRole, 
  assignPermissionsToRole 
} from '@/services/admin/adminServiceServer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    const result = await getRoles({
      page,
      pageSize,
      search
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('角色列表API错误:', error);
    return NextResponse.json(
      { message: '获取角色列表失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(request);
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    // 获取IP地址
    const forwardedFor = request.headers.get('X-Forwarded-For');
    const ipAddress = forwardedFor?.split(',')[0].trim() || undefined;
    
    // 获取用户代理
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const body = await request.json();
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json({ message: '角色名称不能为空' }, { status: 400 });
    }

    const result = await createRole(
      {
        name,
        description: description || ''
      },
      user?.id || null,
      ipAddress,
      userAgent
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('创建角色API错误:', error);
    return NextResponse.json(
      { message: '创建角色失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(request);
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    // 获取IP地址
    const forwardedFor = request.headers.get('X-Forwarded-For');
    const ipAddress = forwardedFor?.split(',')[0].trim() || undefined;
    
    // 获取用户代理
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const body = await request.json();
    const { roleId, permissionIds } = body;
    
    if (!roleId || !Array.isArray(permissionIds)) {
      return NextResponse.json({ message: '角色ID和权限ID列表不能为空' }, { status: 400 });
    }

    const result = await assignPermissionsToRole(
      roleId, 
      permissionIds,
      user?.id || null,
      ipAddress,
      userAgent
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('分配角色权限API错误:', error);
    return NextResponse.json(
      { message: '分配角色权限失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

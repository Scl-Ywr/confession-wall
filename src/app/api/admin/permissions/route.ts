import { NextResponse } from 'next/server';
import { getPermissions, getRolePermissions } from '@/services/admin/adminServiceServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');
    
    // If roleId is provided, get permissions for that role
    if (roleId) {
      const result = await getRolePermissions(roleId);
      return NextResponse.json({ permissionIds: result }, { status: 200 });
    }
    
    // Otherwise, get all permissions
    const result = await getPermissions();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('获取权限列表API错误:', error);
    return NextResponse.json(
      { message: '获取权限列表失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

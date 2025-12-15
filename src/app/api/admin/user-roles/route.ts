import { NextResponse } from 'next/server';
import { getAllUserRoles } from '@/services/admin/adminServiceServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    const result = await getAllUserRoles({
      page,
      pageSize,
      search
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('获取用户角色关系API错误:', error);
    return NextResponse.json(
      { message: '获取用户角色关系失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}
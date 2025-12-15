import { NextResponse } from 'next/server';
import { getUsers } from '@/services/admin/adminServiceServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const search = searchParams.get('search') || '';

    const result = await getUsers({
      page,
      pageSize,
      sortBy,
      sortOrder,
      search
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('获取用户列表API错误:', error);
    return NextResponse.json(
      { message: '获取用户列表失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

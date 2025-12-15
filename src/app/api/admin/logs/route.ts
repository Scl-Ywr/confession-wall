import { NextResponse } from 'next/server';
import { getLogs } from '@/services/admin/adminServiceServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || '';

    const result = await getLogs({
      page,
      pageSize,
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      search
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('日志列表API错误:', error);
    return NextResponse.json(
      { message: '获取日志列表失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

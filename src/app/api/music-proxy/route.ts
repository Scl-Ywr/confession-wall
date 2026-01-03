import { NextRequest, NextResponse } from 'next/server';

/**
 * 音乐API代理接口
 * 用于绕过Cloudflare保护和CORS限制
 */
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;

    // 构建目标API URL
    const API_BASE_URL = 'https://music-api.gdstudio.xyz/api.php';
    const targetUrl = new URL(API_BASE_URL);

    // 复制所有查询参数到目标URL
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    // 向目标API发起请求
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://music-api.gdstudio.xyz/',
      },
      // 添加缓存配置，减少重复请求
      next: { revalidate: 3600 } // 缓存1小时
    });

    // 检查响应状态
    if (!response.ok) {
      console.error(`音乐API返回错误: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: '音乐服务暂时不可用，请稍后重试' },
        { status: response.status }
      );
    }

    // 检查响应类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('音乐API返回非JSON响应:', responseText.substring(0, 200));
      return NextResponse.json(
        { error: '音乐服务返回格式错误' },
        { status: 500 }
      );
    }

    // 解析并返回JSON数据
    const data = await response.json();

    // 返回成功响应，并设置CORS头
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });
  } catch (error) {
    console.error('音乐API代理错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 处理OPTIONS请求（CORS预检）
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

import { NextRequest, NextResponse } from 'next/server';

/**
 * 音乐API代理接口
 * 用于绕过Cloudflare保护和CORS限制
 */

// 备用音乐API列表（按优先级排序）
// 优先从环境变量读取，如果没有则使用默认值
const getMusicAPIUrls = (): string[] => {
  const envUrls = process.env.MUSIC_API_URLS;
  if (envUrls) {
    return envUrls.split(',').map(url => url.trim()).filter(url => url.length > 0);
  }
  // 默认API列表
  return [
    'https://music-api.gdstudio.xyz/api.php',
  ];
};

const MUSIC_API_URLS = getMusicAPIUrls();

/**
 * 尝试从单个API获取数据
 */
async function fetchFromMusicAPI(apiUrl: string, params: URLSearchParams): Promise<Response> {
  const targetUrl = new URL(apiUrl);

  // 复制所有查询参数到目标URL
  params.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  console.log(`[Music Proxy] 尝试请求: ${targetUrl.toString()}`);

  return await fetch(targetUrl.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      // 移除固定Referer，允许浏览器自动设置或使用空Referer
    },
    // 设置超时和缓存
    signal: AbortSignal.timeout(10000), // 10秒超时
    next: { revalidate: 3600 }, // 缓存1小时
    // 添加更多头信息，模拟浏览器请求
    credentials: 'omit',
    cache: 'no-store'
  });
}

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    
    // 添加更多调试信息
    console.log(`[Music Proxy] 收到请求: ${request.url}`);
    console.log(`[Music Proxy] 查询参数: ${searchParams.toString()}`);
    console.log(`[Music Proxy] 请求头:`, {
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
      'user-agent': request.headers.get('user-agent')
    });

    let lastError: Error | null = null;
    let response: Response | null = null;

    // 尝试所有备用API
    for (const apiUrl of MUSIC_API_URLS) {
      try {
        console.log(`[Music Proxy] 尝试连接: ${apiUrl}`);
        response = await fetchFromMusicAPI(apiUrl, searchParams);

        // 检查响应状态
        if (response.ok) {
          console.log(`[Music Proxy] ✓ 成功从 ${apiUrl} 获取数据，状态码: ${response.status}`);
          
          // 记录响应头信息
          const responseContentType = response.headers.get('content-type');
          console.log(`[Music Proxy] 响应类型: ${responseContentType}`);
          
          break; // 成功，跳出循环
        } else {
          const errorText = await response.text();
          console.error(`[Music Proxy] ✗ ${apiUrl} 返回错误: ${response.status} ${response.statusText}`);
          console.error(`[Music Proxy] 错误详情: ${errorText.substring(0, 200)}`);
          lastError = new Error(`API返回 ${response.status}: ${response.statusText}`);
          response = null; // 重置响应，尝试下一个API
        }
      } catch (error) {
        console.error(`[Music Proxy] ✗ ${apiUrl} 请求失败:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        // 继续尝试下一个API
      }
    }

    // 如果所有API都失败
    if (!response || !response.ok) {
      const errorMessage = lastError?.message || '所有音乐API都不可用';
      console.error('[Music Proxy] 所有备用API都失败了');
      console.error('[Music Proxy] 最后一个错误:', lastError);

      return NextResponse.json(
        {
          error: '音乐服务暂时不可用',
          details: errorMessage,
          timestamp: new Date().toISOString(),
          suggestion: '请检查服务器网络连接和防火墙设置',
          debugInfo: {
            requestUrl: request.url,
            searchParams: searchParams.toString(),
            host: request.headers.get('host'),
            usedApis: MUSIC_API_URLS
          }
        },
        { status: 503 }
      );
    }

    // 检查响应类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('[Music Proxy] API返回非JSON响应:', responseText.substring(0, 200));
      return NextResponse.json(
        {
          error: '音乐服务返回格式错误',
          details: `响应类型: ${contentType}`,
          responseSample: responseText.substring(0, 200)
        },
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
    console.error('[Music Proxy] 音乐API代理错误:', error);

    // 详细错误信息
    let errorMessage = '服务器内部错误';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';

      // 检查是否是网络错误
      if (error.message.includes('fetch')) {
        errorMessage = '无法连接到音乐API服务器，可能是网络问题或API服务不可用';
      }
      // 检查是否是DNS解析错误
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorMessage = 'DNS解析失败，无法找到音乐API服务器';
      }
      // 检查是否是超时错误
      if (error.message.includes('timeout')) {
        errorMessage = '请求超时，音乐API服务器可能响应缓慢';
      }
    }

    console.error(`[Music Proxy] 错误详情: ${errorDetails.substring(0, 500)}`);

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails.substring(0, 200),
        timestamp: new Date().toISOString(),
        suggestion: '请检查服务器网络连接、防火墙设置和DNS配置',
        debugInfo: {
          requestUrl: request.url,
          host: request.headers.get('host'),
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        }
      },
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

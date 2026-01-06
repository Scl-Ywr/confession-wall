import { NextRequest, NextResponse } from 'next/server';

/**
 * 音乐API代理接口
 * 支持两种 API 格式：
 * 1. 第三方音乐 API（如 music-api.gdstudio.xyz）
 * 2. 官方 NeteaseCloudMusicApi（自部署）
 *
 * 详见：VERCEL_MUSIC_API_SOLUTION.md
 */

// 使用 Edge Runtime 提高 Vercel 部署性能
export const runtime = 'edge';

// API 格式类型
type APIFormat = 'third-party' | 'official';

// 获取音乐 API URL 列表
const getMusicAPIUrls = (): string[] => {
  const envUrls = process.env.MUSIC_API_URLS;
  if (envUrls) {
    return envUrls.split(',').map(url => url.trim()).filter(url => url.length > 0);
  }
  // 默认第三方 API 列表（在 Vercel 上可能不可用）
  return [
    'https://music-api.gdstudio.xyz/api.php',
    'https://api.music.liuzhijin.cn/api.php',
    'https://api-music.lgdsunday.club/api.php',
    'https://music-api.yujing.fit/api.php',
  ];
};

const MUSIC_API_URLS = getMusicAPIUrls();

/**
 * 检测 API 格式
 */
function detectAPIFormat(url: string): APIFormat {
  // 如果 URL 包含 api.php，则是第三方格式
  if (url.includes('api.php')) {
    return 'third-party';
  }
  // 否则假定是官方 NeteaseCloudMusicApi 格式
  return 'official';
}

/**
 * 转换参数格式以适配官方 API
 */
function convertToOfficialFormat(searchParams: URLSearchParams): { endpoint: string; params: URLSearchParams } {
  const types = searchParams.get('types');
  const newParams = new URLSearchParams();

  switch (types) {
    case 'search':
      const name = searchParams.get('name') || '';
      const count = searchParams.get('count') || '20';
      const page = parseInt(searchParams.get('pages') || '1');
      newParams.set('keywords', name);
      newParams.set('limit', count);
      newParams.set('offset', String((page - 1) * parseInt(count)));
      newParams.set('type', '1');
      return { endpoint: '/cloudsearch', params: newParams };

    case 'url':
      const id = searchParams.get('id') || '';
      const br = parseInt(searchParams.get('br') || '320');
      newParams.set('id', id);
      // 转换音质参数
      if (br >= 320) {
        newParams.set('level', 'exhigh');
      } else if (br >= 192) {
        newParams.set('level', 'higher');
      } else {
        newParams.set('level', 'standard');
      }
      return { endpoint: '/song/url/v1', params: newParams };

    case 'pic':
      const picId = searchParams.get('id') || '';
      newParams.set('ids', picId);
      return { endpoint: '/song/detail', params: newParams };

    case 'lyric':
      const lyricId = searchParams.get('id') || '';
      newParams.set('id', lyricId);
      return { endpoint: '/lyric', params: newParams };

    default:
      return { endpoint: '', params: newParams };
  }
}

/**
 * 转换官方 API 响应为统一格式
 */
function convertOfficialResponse(types: string, data: any): any {
  switch (types) {
    case 'search':
      if (data.result?.songs) {
        return data.result.songs.map((song: any) => ({
          id: String(song.id),
          name: song.name,
          artist: song.ar?.map((a: any) => a.name) || song.artists?.map((a: any) => a.name) || ['未知艺术家'],
          album: song.al?.name || song.album?.name || '',
          pic_id: String(song.id), // 使用歌曲 ID，方便后续获取详情
          pic_url: (song.al?.picUrl || song.album?.picUrl || '').replace('http://', 'https://'), // 转换为 HTTPS
          source: 'netease',
          // 添加可播放性标志（基于 fee 字段判断）
          // fee: 0=免费, 1=VIP, 4=购买专辑, 8=非会员可免费播放低音质
          playable: song.fee === 0 || song.fee === 8,
          vip: song.fee === 1 || song.fee === 4
        }));
      }
      return [];

    case 'url':
      if (data.data?.[0]) {
        const urlData = data.data[0];
        // 检查是否有播放权限
        const hasUrl = !!urlData.url;
        const code = urlData.code || 200;

        return {
          url: urlData.url || '',
          br: urlData.br || 0,
          size: Math.round((urlData.size || 0) / 1024),
          // 添加额外信息帮助前端处理
          code: code,
          message: !hasUrl ? '该歌曲因版权或其他原因暂时无法播放' : undefined
        };
      }
      return {
        url: '',
        br: 0,
        size: 0,
        code: 404,
        message: '未找到歌曲信息'
      };

    case 'pic':
      if (data.songs?.[0]) {
        const picUrl = data.songs[0].al?.picUrl || '';
        return {
          url: picUrl.replace('http://', 'https://') // 转换为 HTTPS
        };
      }
      return { url: '' };

    case 'lyric':
      return {
        lyric: data.lrc?.lyric || '',
        tlyric: data.tlyric?.lyric || ''
      };

    default:
      return data;
  }
}

/**
 * 尝试从单个 API 获取数据
 */
async function fetchFromMusicAPI(apiUrl: string, searchParams: URLSearchParams): Promise<Response> {
  const format = detectAPIFormat(apiUrl);
  let targetUrl: string;

  if (format === 'third-party') {
    // 第三方 API：直接添加参数
    const url = new URL(apiUrl);
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    targetUrl = url.toString();
  } else {
    // 官方 API：需要转换参数格式
    const { endpoint, params } = convertToOfficialFormat(searchParams);
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const url = new URL(baseUrl + endpoint);
    params.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    targetUrl = url.toString();
  }

  console.log(`[Music Proxy] 尝试请求 (${format}): ${targetUrl}`);

  return await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(25000),
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const types = searchParams.get('types');

    console.log(`[Music Proxy] 收到请求: ${request.url}`);
    console.log(`[Music Proxy] 查询参数: ${searchParams.toString()}`);

    let lastError: Error | null = null;
    let response: Response | null = null;
    let usedFormat: APIFormat = 'third-party';

    // 尝试所有备用 API
    for (const apiUrl of MUSIC_API_URLS) {
      try {
        usedFormat = detectAPIFormat(apiUrl);
        console.log(`[Music Proxy] 尝试连接: ${apiUrl} (格式: ${usedFormat})`);

        response = await fetchFromMusicAPI(apiUrl, searchParams);

        if (response.ok) {
          console.log(`[Music Proxy] ✓ 成功从 ${apiUrl} 获取数据，状态码: ${response.status}`);
          break;
        } else {
          const errorText = await response.text();
          console.error(`[Music Proxy] ✗ ${apiUrl} 返回错误: ${response.status}`);
          console.error(`[Music Proxy] 错误详情: ${errorText.substring(0, 200)}`);
          lastError = new Error(`API返回 ${response.status}: ${response.statusText}`);
          response = null;
        }
      } catch (error) {
        console.error(`[Music Proxy] ✗ ${apiUrl} 请求失败:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    // 如果所有 API 都失败
    if (!response || !response.ok) {
      const errorMessage = lastError?.message || '所有音乐API都不可用';
      console.error('[Music Proxy] 所有备用API都失败了');

      return NextResponse.json(
        {
          error: '音乐服务暂时不可用',
          details: errorMessage,
          timestamp: new Date().toISOString(),
          suggestion: '在 Vercel 上部署时，请参考 VERCEL_MUSIC_API_SOLUTION.md 部署独立的音乐 API 服务器',
          debugInfo: {
            requestUrl: request.url,
            searchParams: searchParams.toString(),
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

    // 解析 JSON 数据
    let data = await response.json();

    // 如果是官方 API 格式，需要转换响应
    if (usedFormat === 'official') {
      console.log('[Music Proxy] 转换官方 API 响应格式');
      data = convertOfficialResponse(types || '', data);
    }

    // 返回成功响应
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

    let errorMessage = '服务器内部错误';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';

      if (error.message.includes('fetch')) {
        errorMessage = '无法连接到音乐API服务器';
      }
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorMessage = 'DNS解析失败';
      }
      if (error.message.includes('timeout')) {
        errorMessage = '请求超时';
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails.substring(0, 200),
        timestamp: new Date().toISOString(),
        suggestion: '在 Vercel 上部署时，请参考 VERCEL_MUSIC_API_SOLUTION.md 部署独立的音乐 API 服务器',
        debugInfo: {
          requestUrl: request.url,
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

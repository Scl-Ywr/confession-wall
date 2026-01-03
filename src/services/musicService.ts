// 音乐API服务

// API基础URL - 使用Next.js API代理避免Cloudflare拦截
const API_BASE_URL = '/api/music-proxy';

// 音乐源类型
export type MusicSource = 'netease' | 'kuwo' | 'joox' | 'tencent' | 'tidal' | 'spotify' | 'ytmusic' | 'qobuz' | 'deezer' | 'migu' | 'kugou' | 'ximalaya' | 'apple';

// 稳定音乐源（根据文档推荐）
export const STABLE_MUSIC_SOURCES: MusicSource[] = ['netease', 'kuwo', 'joox'];

// 所有音乐源
export const ALL_MUSIC_SOURCES: MusicSource[] = [
  'netease',
  'kuwo',
  'joox',
  'tencent',
  'migu',
  'kugou',
  'ytmusic',
  'spotify',
  'deezer',
  'tidal',
  'qobuz',
  'ximalaya',
  'apple'
];

// 默认音乐源
export const DEFAULT_MUSIC_SOURCE: MusicSource = 'netease';

// 音乐搜索结果项
export interface MusicSearchItem {
  id: string; // 曲目ID
  name: string; // 歌曲名
  artist: string[]; // 歌手列表
  album: string; // 专辑名
  pic_id: string; // 专辑图ID
  source: MusicSource; // 音乐源
}

// 音乐URL响应
export interface MusicUrlResponse {
  url: string; // 音乐链接
  br: number; // 实际返回音质
  size: number; // 文件大小，单位为KB
}

// 专辑图响应
export interface MusicPicResponse {
  url: string; // 专辑图链接
}

// 歌词响应
export interface MusicLyricResponse {
  lyric: string; // LRC格式的原语种歌词
  tlyric?: string; // LRC格式的中文翻译歌词
}

/**
 * 搜索音乐
 * @param keyword 搜索关键词
 * @param source 音乐源
 * @param count 每页返回数量
 * @param page 页码
 * @returns 搜索结果数组
 */
export const searchMusic = async (
  keyword: string,
  source: MusicSource = DEFAULT_MUSIC_SOURCE,
  count: number = 20,
  page: number = 1
): Promise<MusicSearchItem[]> => {
  try {
    const params = new URLSearchParams({
      types: 'search',
      source: source,
      name: keyword,
      count: count.toString(),
      pages: page.toString()
    });

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);

    // 检查响应是否为JSON格式
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // 如果不是JSON，获取响应文本并记录错误
      const responseText = await response.text();
      console.error('搜索音乐失败，响应不是JSON:', responseText);
      return [];
    }

    const data = await response.json();

    // 检查响应格式并转换为标准格式
    if (Array.isArray(data)) {
      return data.map(item => ({
        id: item.id || '',
        name: item.name || '',
        artist: Array.isArray(item.artist) ? item.artist : [item.artist || '未知艺术家'],
        album: item.album || '',
        pic_id: item.pic_id || '',
        source: (item.source || source) as MusicSource
      }));
    }

    return [];
  } catch (error) {
    console.error('搜索音乐失败:', error);
    // 返回空数组，而不是抛出错误，确保UI能够正常显示
    return [];
  }
};

/**
 * 从多个音乐源同时搜索音乐
 * @param keyword 搜索关键词
 * @param sources 音乐源数组
 * @param count 每个音乐源返回的数量
 * @param page 页码
 * @returns 合并后的搜索结果数组
 */
export const searchMultipleSources = async (
  keyword: string,
  sources: MusicSource[] = STABLE_MUSIC_SOURCES,
  count: number = 20,
  page: number = 1
): Promise<MusicSearchItem[]> => {
  try {
    // 并发搜索所有音乐源
    const searchPromises = sources.map(source =>
      searchMusic(keyword, source, count, page)
        .catch(error => {
          console.error(`从音乐源 ${source} 搜索失败:`, error);
          return []; // 如果某个音乐源失败，返回空数组
        })
    );

    // 等待所有搜索完成
    const results = await Promise.all(searchPromises);

    // 合并所有结果
    const mergedResults = results.flat();

    // 去重（基于 id 和 source 组合）
    const uniqueResults = mergedResults.filter((item, index, self) =>
      index === self.findIndex(t =>
        t.id === item.id && t.source === item.source
      )
    );

    return uniqueResults;
  } catch (error) {
    console.error('多源搜索音乐失败:', error);
    return [];
  }
};

/**
 * 获取音乐URL
 * @param id 曲目ID
 * @param source 音乐源
 * @param br 音质（128/192/320/740/999）
 * @returns 音乐URL信息
 */
export const getMusicUrl = async (
  id: string,
  source: MusicSource = DEFAULT_MUSIC_SOURCE,
  br: number = 320
): Promise<MusicUrlResponse> => {
  try {
    const params = new URLSearchParams({
      types: 'url',
      source: source,
      id: id,
      br: br.toString()
    });

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
    
    // 检查响应是否为JSON格式
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // 如果不是JSON，获取响应文本并记录错误
      const responseText = await response.text();
      console.error('获取音乐URL失败，响应不是JSON:', responseText);
      throw new Error('获取音乐URL失败，请稍后重试');
    }
    
    const data = await response.json();

    if (data.url) {
      return {
        url: data.url,
        br: data.br || br,
        size: data.size || 0
      };
    }

    throw new Error('获取音乐URL失败');
  } catch (error) {
    console.error('获取音乐URL失败:', error);
    throw new Error('获取音乐URL失败，请稍后重试');
  }
};

/**
 * 获取专辑图片
 * @param picId 专辑图ID
 * @param source 音乐源
 * @param size 图片尺寸（300/500）
 * @returns 专辑图URL
 */
export const getAlbumPic = async (
  picId: string,
  source: MusicSource = DEFAULT_MUSIC_SOURCE,
  size: number = 300
): Promise<MusicPicResponse> => {
  try {
    const params = new URLSearchParams({
      types: 'pic',
      source: source,
      id: picId,
      size: size.toString()
    });

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
    
    // 检查响应是否为JSON格式
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // 如果不是JSON，获取响应文本并记录错误
      const responseText = await response.text();
      console.error('获取专辑图片失败，响应不是JSON:', responseText);
      // 返回默认图片URL
      return {
        url: `https://via.placeholder.com/${size}x${size}?text=No+Cover`
      };
    }
    
    const data = await response.json();

    if (data.url) {
      // Strip query parameters that may interfere with Next.js image optimization
      const cleanUrl = data.url.split('?')[0];
      return {
        url: cleanUrl
      };
    }

    // 如果没有返回URL，返回默认图片
    return {
      url: `https://via.placeholder.com/${size}x${size}?text=No+Cover`
    };
  } catch (error) {
    console.error('获取专辑图片失败:', error);
    // 在JSON解析错误或其他错误时，返回默认图片
    return {
      url: `https://via.placeholder.com/${size}x${size}?text=No+Cover`
    };
  }
};

/**
 * 获取歌词
 * @param lyricId 歌词ID（一般与曲目ID相同）
 * @param source 音乐源
 * @returns 歌词信息
 */
export const getMusicLyric = async (
  lyricId: string,
  source: MusicSource = DEFAULT_MUSIC_SOURCE
): Promise<MusicLyricResponse> => {
  try {
    const params = new URLSearchParams({
      types: 'lyric',
      source: source,
      id: lyricId
    });

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
    
    // 检查响应是否为JSON格式
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // 如果不是JSON，获取响应文本并记录错误
      const responseText = await response.text();
      console.error('获取歌词失败，响应不是JSON:', responseText);
      // 返回空歌词对象，而不是抛出错误
      return {
        lyric: '',
        tlyric: undefined
      };
    }
    
    const data = await response.json();

    return {
      lyric: data.lyric || '',
      tlyric: data.tlyric
    };
  } catch (error) {
    console.error('获取歌词失败:', error);
    // 返回空歌词对象，而不是抛出错误
    return {
      lyric: '',
      tlyric: undefined
    };
  }
};

/**
 * 音乐服务类
 */
export class MusicService {
  private source: MusicSource;
  private sources: MusicSource[]; // 多音乐源模式

  constructor(source: MusicSource = DEFAULT_MUSIC_SOURCE) {
    this.source = source;
    this.sources = [source];
  }

  /**
   * 设置音乐源
   */
  setSource(source: MusicSource) {
    this.source = source;
  }

  /**
   * 设置多个音乐源
   */
  setSources(sources: MusicSource[]) {
    this.sources = sources.length > 0 ? sources : [DEFAULT_MUSIC_SOURCE];
  }

  /**
   * 获取当前音乐源
   */
  getSource(): MusicSource {
    return this.source;
  }

  /**
   * 获取当前多音乐源
   */
  getSources(): MusicSource[] {
    return this.sources;
  }

  /**
   * 搜索音乐（单个音乐源）
   */
  async search(keyword: string, count: number = 20, page: number = 1): Promise<MusicSearchItem[]> {
    return searchMusic(keyword, this.source, count, page);
  }

  /**
   * 搜索音乐（多个音乐源）
   */
  async searchMultiple(keyword: string, count: number = 20, page: number = 1): Promise<MusicSearchItem[]> {
    return searchMultipleSources(keyword, this.sources, count, page);
  }

  /**
   * 智能搜索音乐（根据当前设置的音乐源数量自动选择单源或多源搜索）
   */
  async searchSmart(keyword: string, count: number = 20, page: number = 1): Promise<MusicSearchItem[]> {
    if (this.sources.length > 1) {
      return this.searchMultiple(keyword, count, page);
    }
    return this.search(keyword, count, page);
  }

  /**
   * 获取音乐URL（支持指定source）
   */
  async getUrl(id: string, br: number = 320, source?: MusicSource): Promise<MusicUrlResponse> {
    return getMusicUrl(id, source || this.source, br);
  }

  /**
   * 获取专辑图片（支持指定source）
   */
  async getAlbumPic(picId: string, size: number = 300, source?: MusicSource): Promise<MusicPicResponse> {
    return getAlbumPic(picId, source || this.source, size);
  }

  /**
   * 获取歌词（支持指定source）
   */
  async getLyric(lyricId: string, source?: MusicSource): Promise<MusicLyricResponse> {
    return getMusicLyric(lyricId, source || this.source);
  }
}

// 导出默认实例
export const musicService = new MusicService();

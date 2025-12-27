// 视频格式检测和转换工具
export interface VideoFormat {
  extension: string;
  mimeType: string;
  codecs: string;
  quality: 'low' | 'medium' | 'high';
}

export interface BrowserCapabilities {
  canPlayMP4: boolean;
  canPlayWebM: boolean;
  canPlayOgg: boolean;
  supportsH264: boolean;
  supportsVP8: boolean;
  supportsVP9: boolean;
  supportsAV1: boolean;
  supportsHEVC: boolean;
  supportsPictureInPicture: boolean;
  supportsFullscreen: boolean;
  isMobile: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
}

// 检测浏览器能力
export function detectBrowserCapabilities(): BrowserCapabilities {
  // 创建临时视频元素进行检测
  const video = document.createElement('video');
  
  // 检测各种编解码器支持
  const canPlayMP4H264 = video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';
  const canPlayMP4HEVC = video.canPlayType('video/mp4; codecs="hev1"') !== '' || video.canPlayType('video/mp4; codecs="hvc1"') !== '';
  const canPlayWebMVP8 = video.canPlayType('video/webm; codecs="vp8"') !== '';
  const canPlayWebMVP9 = video.canPlayType('video/webm; codecs="vp9"') !== '';
  const canPlayWebMAV1 = video.canPlayType('video/webm; codecs="av01.0.05M.08"') !== '';
  
  // 检测浏览器类型
  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  
  // 检测移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  return {
    canPlayMP4: canPlayMP4H264 || canPlayMP4HEVC,
    canPlayWebM: canPlayWebMVP8 || canPlayWebMVP9 || canPlayWebMAV1,
    canPlayOgg: video.canPlayType('video/ogg; codecs="theora"') !== '',
    supportsH264: canPlayMP4H264,
    supportsVP8: canPlayWebMVP8,
    supportsVP9: canPlayWebMVP9,
    supportsAV1: canPlayWebMAV1,
    supportsHEVC: canPlayMP4HEVC,
    supportsPictureInPicture: 'pictureInPictureEnabled' in document || 'pictureInPictureElement' in document,
    supportsFullscreen: 'fullscreenEnabled' in document || 
                    'webkitFullscreenEnabled' in document || 
                    'mozFullScreenEnabled' in document || 
                    'msFullscreenEnabled' in document,
    isMobile,
    isSafari,
    isChrome,
    isFirefox,
    isEdge
  };
}

// 获取最佳视频格式
export function getOptimalVideoFormat(originalUrl: string, capabilities: BrowserCapabilities): string[] {
  const sources: string[] = [];
  
  // 根据浏览器能力决定格式优先级
  if (capabilities.isSafari) {
    // Safari 优先使用 MP4 (HEVC 如果支持，否则 H264)
    if (capabilities.supportsHEVC) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '.mp4')); // 假设服务器提供 HEVC 编码的 MP4
    }
    if (capabilities.supportsH264) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '_h264.mp4')); // 假设服务器提供 H264 编码的 MP4
    }
  } else if (capabilities.isChrome || capabilities.isEdge) {
    // Chrome 和 Edge 优先使用 WebM (AV1 如果支持，否则 VP9，最后 H264)
    if (capabilities.supportsAV1) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '.webm')); // 假设服务器提供 AV1 编码的 WebM
    }
    if (capabilities.supportsVP9) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '_vp9.webm')); // 假设服务器提供 VP9 编码的 WebM
    }
    if (capabilities.supportsH264) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '.mp4')); // 回退到 MP4
    }
  } else if (capabilities.isFirefox) {
    // Firefox 优先使用 WebM (AV1 如果支持，否则 VP9，最后 H264)
    if (capabilities.supportsAV1) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '.webm')); // 假设服务器提供 AV1 编码的 WebM
    }
    if (capabilities.supportsVP9) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '_vp9.webm')); // 假设服务器提供 VP9 编码的 WebM
    }
    if (capabilities.supportsH264) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '.mp4')); // 回退到 MP4
    }
  } else {
    // 其他浏览器，使用通用策略
    if (capabilities.canPlayWebM) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '.webm'));
    }
    if (capabilities.canPlayMP4) {
      sources.push(originalUrl.replace(/\.(mp4|mov|avi|webm|ogv)$/i, '.mp4'));
    }
  }
  
  // 如果原始URL已经是最佳格式之一，确保它在最前面
  if (sources.length === 0 || !sources.includes(originalUrl)) {
    sources.unshift(originalUrl);
  }
  
  return sources;
}

// 获取视频MIME类型
export function getVideoMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'video/mp4';
}

// 获取视频编解码器
export function getVideoCodecs(format: string, capabilities: BrowserCapabilities): string {
  if (format === 'mp4') {
    if (capabilities.supportsHEVC) {
      return 'hev1';
    }
    return 'avc1.42E01E';
  } else if (format === 'webm') {
    if (capabilities.supportsAV1) {
      return 'av01.0.05M.08';
    } else if (capabilities.supportsVP9) {
      return 'vp9';
    }
    return 'vp8';
  }
  
  return '';
}

// 检测视频质量
export function detectVideoQuality(url: string): 'low' | 'medium' | 'high' {
  const qualityPatterns = {
    'low': [/(360p|480p)/i, /(\\b240|\\b360|\\b480)/i],
    'medium': [/(720p)/i, /(\\b720)/i],
    'high': [/(1080p|2k|4k)/i, /(\\b1080|\\b2160|\\b4320)/i]
  };
  
  for (const [quality, patterns] of Object.entries(qualityPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return quality as 'low' | 'medium' | 'high';
      }
    }
  }
  
  return 'medium'; // 默认中等质量
}

// 获取适合移动设备的视频URL
export function getMobileOptimizedUrl(originalUrl: string, capabilities: BrowserCapabilities): string {
  if (!capabilities.isMobile) {
    return originalUrl;
  }
  
  // 为移动设备添加特定参数
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}mobile_optimized=true`;
}

// 获取适合画中画模式的URL
export function getPiPOptimizedUrl(originalUrl: string): string {
  // 为画中画模式添加特定参数
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}pip=true`;
}
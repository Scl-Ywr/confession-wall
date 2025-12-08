'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { ExpandIcon, ShrinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { BeatLoader } from 'react-spinners';

// 导入自定义样式
import '../styles/videoplayer.css';

interface VideoPlayerProps {
  videoUrl: string;
  className?: string;
  posterUrl?: string;
}

export default function VideoPlayer({ videoUrl, className = '', posterUrl }: VideoPlayerProps) {
  const [fullscreen, setFullscreen] = useState(false); // 控制浏览器全屏状态
  const [videoDimensions] = useState({ width: 0, height: 0 });
  
  // 视频切换过渡状态
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [isSwitching, setIsSwitching] = useState(false);
  
  // 视频缓冲状态
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0); // 缓冲进度百分比
  // 视频播放状态
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [pip, setPip] = useState(false); // 画中画模式
  const [showControls, setShowControls] = useState(true); // 控制组件显示状态
  const [playbackRate, setPlaybackRate] = useState(1); // 播放速度
  const [showPlaybackMenu, setShowPlaybackMenu] = useState(false); // 播放速度菜单显示状态
  const [isAutoBuffering, setIsAutoBuffering] = useState(false); // 是否正在自动缓冲
  const [isCaching, setIsCaching] = useState(false); // 是否正在缓存视频
  const [videoRotation, setVideoRotation] = useState(0); // 视频旋转角度
  // 网络状况
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  // 检测是否为移动设备
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 控制组件隐藏定时器
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 缓冲定时器
  
  const playerRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Cache | null>(null); // 缓存引用

  // 格式化时间函数
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 初始化缓存
  const initCache = async () => {
    // 检查是否为开发环境，Turbopack可能与CacheStorage存在兼容性问题
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if ('caches' in window && !isDevelopment) {
      try {
        // 尝试打开缓存，添加更健壮的错误处理
        cacheRef.current = await caches.open('confession-videos');
      } catch (error) {
        console.error('Failed to open cache:', error);
        // 缓存初始化失败，将cacheRef设置为null以避免后续调用失败
        cacheRef.current = null;
      }
    }
  };

  // 检查视频是否已缓存
  const checkVideoCache = useCallback(async (url: string): Promise<boolean> => {
    if (typeof window === 'undefined' || !('caches' in window) || !cacheRef.current) {
      return false;
    }
    
    try {
      const cachedResponse = await cacheRef.current.match(url);
      return !!cachedResponse;
    } catch (error) {
      console.error('Failed to check cache:', error);
      return false;
    }
  }, []);

  // 将视频缓存到CacheStorage
  const cacheVideo = useCallback(async (url: string) => {
    // 添加更严格的检查，确保caches API可用且缓存已初始化
    if (typeof window === 'undefined' || !('caches' in window) || !cacheRef.current || isCaching) {
      return;
    }
    
    // 仅在良好网络环境下自动缓存
    if (networkQuality === 'poor' || networkQuality === 'fair') {
      return;
    }
    
    setIsCaching(true);
    try {
      // 检查是否已缓存
      const isAlreadyCached = await checkVideoCache(url);
      if (isAlreadyCached) {
        setIsCaching(false);
        return;
      }
      
      // 发起网络请求并缓存响应
      const response = await fetch(url, { 
        headers: { 
          'Cache-Control': 'no-cache',
          'Content-Type': 'video/mp4'
        }
      });
      
      if (response.ok && cacheRef.current) {
        // 克隆响应以同时用于播放和缓存
        const responseToCache = response.clone();
        await cacheRef.current.put(url, responseToCache);
      }
    } catch (error) {
      console.error('Failed to cache video:', error);
    } finally {
      setIsCaching(false);
    }
  }, [isCaching, networkQuality, checkVideoCache]);

  // 定义网络连接API的类型
  interface NetworkConnection {
    effectiveType?: string;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  }
  
  // 扩展Navigator接口
  interface ExtendedNavigator extends Navigator {
    connection?: NetworkConnection;
  }

  // 检测网络质量
  const detectNetworkQuality = useCallback(() => {
    // 安全检测navigator.connection API（实验性API）
    const nav = navigator as ExtendedNavigator;
    if (nav.connection?.effectiveType) {
      // 根据网络类型判断质量
      switch (nav.connection.effectiveType) {
        case '4g':
        case '5g':
          setNetworkQuality('excellent');
          break;
        case '3g':
          setNetworkQuality('good');
          break;
        case '2g':
          setNetworkQuality('fair');
          break;
        default:
          setNetworkQuality('poor');
      }
    }
  }, [setNetworkQuality]);

  // 监听网络变化
  useEffect(() => {
    // 初始检测
    detectNetworkQuality();
    
    // 安全检测navigator.connection API（实验性API）
    const nav = navigator as ExtendedNavigator;
    
    // 保存connection引用，避免在清理函数中出现问题
    const connection = nav.connection;
    if (connection?.addEventListener && connection?.removeEventListener) {
      const handleChange = () => detectNetworkQuality();
      connection.addEventListener('change', handleChange);
      
      return () => {
        if (connection?.removeEventListener) {
          connection.removeEventListener('change', handleChange);
        }
      };
    }
  }, [detectNetworkQuality]);

  // 初始化缓存并检查视频缓存状态
  useEffect(() => {
    // 初始化缓存
    initCache();
  }, []);

  // 处理视频URL变化，实现平滑过渡
  useEffect(() => {
    if (videoUrl !== currentVideoUrl) {
      // 1. 开始切换，显示遮罩（淡出）
      // 使用 requestAnimationFrame 避免在 effect 中同步更新状态导致的警告
      requestAnimationFrame(() => {
        setIsSwitching(true);
        // 在 requestAnimationFrame 中更新状态，避免直接在 effect 中调用 setState
        setDuration(0);
      });
      
      // 2. 延迟更新视频源，等待遮罩完全显示
      const timeoutId = setTimeout(() => {
        setCurrentVideoUrl(videoUrl);
        
        // 3. 视频源更新后，稍微延迟再淡入，确保新视频已准备好加载
        // 注意：实际的加载完成由 onCanPlay 事件处理会更准确，
        // 但为了避免长时间黑屏，这里设置一个最大等待时间
        setTimeout(() => {
          setIsSwitching(false);
        }, 500);
      }, 300); // 与CSS过渡时间匹配
      
      return () => clearTimeout(timeoutId);
    }
  }, [videoUrl, currentVideoUrl]);

  // 视频加载完成后自动缓存
  useEffect(() => {
    const video = playerRef.current;
    if (!video) return;
    
    const handleLoadedData = () => {
      // 视频加载完成后，异步缓存视频
      cacheVideo(currentVideoUrl);
    };
    
    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [currentVideoUrl, cacheVideo]);

  // 视频URL变化后，确保正确获取时长
  useEffect(() => {
    if (currentVideoUrl) {
      const videoElement = playerRef.current;
      if (videoElement) {
        // 尝试直接获取时长，如果不行则等待元数据加载完成
        const checkDuration = () => {
          if (videoElement.duration > 0) {
            setDuration(videoElement.duration);
          } else {
            // 如果时长为0，说明元数据还没加载完成，等待事件触发
            setTimeout(checkDuration, 100);
          }
        };
        
        checkDuration();
      }
    }
  }, [currentVideoUrl]);

  // 处理视口大小变化
  const handleResize = () => {
    // 视口变化时的逻辑（如果需要）
  };

  // 计算缓冲进度
  const calculateBufferProgress = useCallback(() => {
    const video = playerRef.current;
    if (!video || duration <= 0) return;

    const buffered = video.buffered;
    if (buffered.length === 0) {
      setBufferProgress(0);
      return;
    }

    // 找到当前播放时间所在的缓冲区间
    let maxBufferEnd = 0;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
        // 计算当前缓冲区间的结束位置
        maxBufferEnd = buffered.end(i);
        break;
      }
    }

    // 计算缓冲进度百分比
    const bufferPercent = (maxBufferEnd / duration) * 100;
    setBufferProgress(bufferPercent);

    // 根据网络质量调整缓冲阈值
    let minBufferTime = 30; // 缓冲不足时暂停的阈值
    let maxBufferTime = 60; // 缓冲足够时恢复的阈值
    
    switch (networkQuality) {
      case 'excellent':
        minBufferTime = 20; // 网络好，降低暂停阈值
        maxBufferTime = 80; // 网络好，增加缓冲目标
        break;
      case 'good':
        minBufferTime = 25; // 网络良好，中等阈值
        maxBufferTime = 60; // 网络良好，中等目标
        break;
      case 'fair':
        minBufferTime = 35; // 网络一般，提高暂停阈值
        maxBufferTime = 50; // 网络一般，降低缓冲目标
        break;
      case 'poor':
        minBufferTime = 45; // 网络差，更高暂停阈值
        maxBufferTime = 40; // 网络差，更低缓冲目标
        break;
    }

    // 智能缓冲管理：当缓冲不足时，自动暂停进行缓冲
    const bufferTime = maxBufferEnd - currentTime;
    if (bufferTime < minBufferTime && !isPaused && !isAutoBuffering && video.paused === false) {
      setIsAutoBuffering(true);
      video.pause();
      setIsPaused(true);
      
      // 设置缓冲定时器，当缓冲足够时自动恢复播放
      bufferTimeoutRef.current = setTimeout(() => {
        if (video.buffered.length > 0) {
          const newMaxBufferEnd = video.buffered.end(video.buffered.length - 1);
          if (newMaxBufferEnd - video.currentTime >= maxBufferTime) {
            // 当缓冲达到目标时，恢复播放
            try {
              video.play();
              setIsPaused(false);
              setIsAutoBuffering(false);
            } catch {
              // 忽略播放被中断的错误
              setIsPaused(true);
              setIsAutoBuffering(false);
            }
          } else {
            // 否则继续检查
            calculateBufferProgress();
          }
        }
      }, 1000);
    } else if (bufferTime >= maxBufferTime && isAutoBuffering && video.paused === true) {
      // 当缓冲足够时，自动恢复播放
      try {
        video.play();
        setIsPaused(false);
        setIsAutoBuffering(false);
        if (bufferTimeoutRef.current) {
          clearTimeout(bufferTimeoutRef.current);
        }
      } catch {
        // 忽略播放被中断的错误
        setIsPaused(true);
        setIsAutoBuffering(false);
        if (bufferTimeoutRef.current) {
          clearTimeout(bufferTimeoutRef.current);
        }
      }
    }
  }, [currentTime, duration, isPaused, isAutoBuffering, networkQuality, setBufferProgress, setIsAutoBuffering, setIsPaused]);

  // 定期计算缓冲进度
  useEffect(() => {
    const video = playerRef.current;
    if (!video) return;

    const intervalId = setInterval(() => {
      calculateBufferProgress();
    }, 1000);

    // 添加progress事件监听器，实时更新缓冲进度
    const handleProgress = () => {
      calculateBufferProgress();
    };

    video.addEventListener('progress', handleProgress);

    return () => {
      clearInterval(intervalId);
      video.removeEventListener('progress', handleProgress);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, [currentTime, duration, isPaused, isAutoBuffering, calculateBufferProgress, networkQuality]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 计算视频容器的宽高比
  const getAspectRatioStyle = () => {
    if (videoDimensions.width && videoDimensions.height) {
      const aspectRatio = videoDimensions.width / videoDimensions.height;
      return {
        aspectRatio: `${aspectRatio}`,
        width: '100%',
        padding: 0,
        margin: 0
      };
    }
    return {
      aspectRatio: '16/9',
      width: '100%',
      padding: 0,
      margin: 0
    };
  };
  
  // 显示控制组件并设置定时器自动隐藏
  const showControlsWithTimeout = () => {
    // 显示控制组件
    setShowControls(true);
    
    // 清除之前的定时器
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // 设置新的定时器，2秒后隐藏控制组件
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  };

  // 处理放大按钮点击 (影院模式)
  const handleFullscreenToggle = () => {
    const container = containerRef.current;
    const video = playerRef.current;
    if (!container || !video) return;
    
    // 检查当前是否处于全屏状态
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    
    if (!isFullscreen) {
      try {
        // 针对Safari/iOS的特殊处理
        if (typeof video.webkitEnterFullscreen !== 'undefined') {
          // Safari/iOS原生视频全屏
          video.webkitEnterFullscreen();
        } else if (typeof video.webkitRequestFullscreen !== 'undefined') {
          // Safari桌面版全屏
          video.webkitRequestFullscreen();
        } else if (typeof video.requestFullscreen !== 'undefined') {
          // 标准全屏API
          video.requestFullscreen();
        } else if (typeof container.webkitRequestFullscreen !== 'undefined') {
          // Safari容器全屏
          container.webkitRequestFullscreen();
        } else if (typeof container.requestFullscreen !== 'undefined') {
          // 标准容器全屏
          container.requestFullscreen();
        } else {
          console.error('Fullscreen API is not supported in this browser');
        }
      } catch (err) {
        console.error(`Error attempting to enable full-screen mode: ${(err as Error).message}`);
      }
    } else {
      try {
        // 退出全屏模式
        if (typeof document.exitFullscreen !== 'undefined') {
          document.exitFullscreen();
        } else if (typeof document.webkitExitFullscreen !== 'undefined') {
          document.webkitExitFullscreen();
        } else if (typeof document.mozCancelFullScreen !== 'undefined') {
          document.mozCancelFullScreen();
        } else if (typeof document.msExitFullscreen !== 'undefined') {
          document.msExitFullscreen();
        } else {
          console.error('Exit fullscreen API is not supported in this browser');
        }
      } catch (err) {
        console.error(`Error attempting to exit full-screen mode: ${(err as Error).message}`);
      }
    }
  };

  // 处理画中画模式切换
  const togglePIP = async () => {
    if (!document.pictureInPictureElement) {
      // 获取视频元素
      const videoElement = containerRef.current?.querySelector('video');
      if (videoElement) {
        try {
          await videoElement.requestPictureInPicture();
          setPip(true);
        } catch (error) {
          console.error('Error entering picture-in-picture mode:', error);
        }
      }
    } else {
      try {
        await document.exitPictureInPicture();
        setPip(false);
      } catch (error) {
        console.error('Error exiting picture-in-picture mode:', error);
      }
    }
  };

  // 监听画中画模式变化
  useEffect(() => {
    const handlePipChange = () => {
      setPip(!!document.pictureInPictureElement);
    };

    document.addEventListener('enterpictureinpicture', handlePipChange);
    document.addEventListener('leavepictureinpicture', handlePipChange);

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePipChange);
      document.removeEventListener('leavepictureinpicture', handlePipChange);
    };
  }, []);

  // 控制音量
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = volume;
    }
  }, [volume]);

  // 控制播放速度
  const updatePlaybackRate = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // 当playbackRate变化时更新视频播放速度
  useEffect(() => {
    updatePlaybackRate();
  }, [updatePlaybackRate]);

  // 当视频旋转角度变化时，应用旋转效果
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.style.transform = `rotate(${videoRotation}deg)`;
    }
  }, [videoRotation]);

  // 旋转屏幕功能
  const toggleScreenRotation = () => {
    // 每次点击旋转90度
    setVideoRotation(prev => (prev + 90) % 360);
  };

  // 屏幕旋转检测 - 自动切换全屏模式
  useEffect(() => {
    // 检测是否为横屏
    const isLandscape = () => {
      return window.matchMedia('(orientation: landscape)').matches;
    };

    // 处理屏幕方向变化
    const handleOrientationChange = () => {
      // 只在视频播放时才自动切换全屏，避免初始加载时自动全屏
      if (isLandscape() && playerRef.current && !isPaused) {
        // 横屏时自动切换到全屏模式
        const container = containerRef.current;
        const video = playerRef.current;
        if (container && video) {
          // 检查是否已经处于全屏状态
          const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
          
          if (!isFullscreen) {
            try {
              // 针对Safari/iOS的特殊处理
              if (typeof video.webkitEnterFullscreen !== 'undefined') {
                // Safari/iOS原生视频全屏
                video.webkitEnterFullscreen();
              } else if (typeof video.webkitRequestFullscreen !== 'undefined') {
                // Safari桌面版全屏
                video.webkitRequestFullscreen();
              } else if (typeof video.requestFullscreen !== 'undefined') {
                // 标准全屏API
                video.requestFullscreen();
              } else if (typeof container.webkitRequestFullscreen !== 'undefined') {
                // Safari容器全屏
                container.webkitRequestFullscreen();
              } else if (typeof container.requestFullscreen !== 'undefined') {
                // 标准容器全屏
                container.requestFullscreen();
              } else {
                console.error('Fullscreen API is not supported in this browser');
              }
            } catch (err) {
              console.error(`Error attempting to enable full-screen mode: ${(err as Error).message}`);
            }
          }
        }
      }
    };

    // 监听屏幕方向变化
    const orientationMediaQuery = window.matchMedia('(orientation: landscape)');
    orientationMediaQuery.addEventListener('change', handleOrientationChange);

    // 清理事件监听器
    return () => {
      orientationMediaQuery.removeEventListener('change', handleOrientationChange);
    };
  }, [isPaused]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      // 检查当前是否处于全屏状态，兼容不同浏览器
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setFullscreen(isFullscreen);
    };

    // 添加全屏变化事件监听器，兼容不同浏览器
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      // 移除事件监听器
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <>
      {/* 视频容器 */}
      <div 
        ref={containerRef}
        className={`relative overflow-hidden group ${className}`}
        style={{
          ...getAspectRatioStyle(),
          borderRadius: '0.75rem',
          transition: 'transform 0.3s ease',
          backgroundColor: 'black'
        }}
        onClick={(e) => {
          // 如果点击的是控制按钮 ，不处理
          if (e.target instanceof HTMLButtonElement || 
              (e.target instanceof HTMLElement && e.target.closest('button'))) {
            return;
          }
          // 点击屏幕时显示中央播 放按钮和控制组件
          showControlsWithTimeout();
        }}
      >
        {/* 视频切换过渡遮罩 */}
        <motion.div 
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ 
            background: 'linear-gradient(135deg, rgba(253, 186, 116, 0.3), rgba(249, 115, 22, 0.3), rgba(245, 158, 11, 0.3))',
            backdropFilter: 'blur(10px)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isSwitching ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <BeatLoader color="#f97316" size={15} />
        </motion.div>
        
        {/* 缓冲状态指示器 */}
        {(isSwitching || isBuffering) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <BeatLoader color="#f97316" size={15} />
          </div>
        )}

        {/* 视频源 - 禁用浏览器默认控件，使用自定义控制界面 */}
        <video
          ref={playerRef}
          src={currentVideoUrl}
          className="w-full h-full object-cover"
          poster={posterUrl || ''}
          preload="auto"
          autoPlay={false}
          muted={isMuted}
          playsInline
          controlsList="nodownload noremoteplayback"
          onClick={() => {
          // 点击屏幕时立即显示中央播放按钮和控制组件
          showControlsWithTimeout();
          
          if (playerRef.current) {
            if (isPaused) {
              try {
                playerRef.current.play();
              } catch {
                // 忽略播放被中断的错误
              }
            } else {
              playerRef.current.pause();
            }
          }
        }}
          onPlay={() => {
            setIsPaused(false);
            // 播放时获取时长并显示控制组件
            if (playerRef.current) {
              setDuration(playerRef.current.duration || 0);
            }
            showControlsWithTimeout();
          }}
          onPause={() => {
            setIsPaused(true);
            // 暂停时显示控制组件并设置定时器自动隐藏
            showControlsWithTimeout();
          }}
          onTimeUpdate={() => {
            if (playerRef.current) {
              setCurrentTime(playerRef.current.currentTime || 0);
              // 播放过程中也尝试获取时长
              if (duration === 0) {
                setDuration(playerRef.current.duration || 0);
              }
            }
          }}
          onDurationChange={() => {
            if (playerRef.current) {
              setDuration(playerRef.current.duration || 0);
            }
          }}
          onLoadedMetadata={() => {
            // 视频元数据加载完成后，获取视频时长
            if (playerRef.current) {
              setDuration(playerRef.current.duration || 0);
            }
          }}
          onLoadedData={() => {
            // 视频数据加载完成后，获取视频时长
            if (playerRef.current) {
              setDuration(playerRef.current.duration || 0);
            }
          }}
          onCanPlay={() => {
            // 视频可以播放时，获取视频时长
            if (playerRef.current) {
              setDuration(playerRef.current.duration || 0);
            }
          }}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            // 开始播放时，再次尝试获取时长
            if (playerRef.current) {
              setDuration(playerRef.current.duration || 0);
            }
            setIsPaused(false); // 确保播放状态正确
            setIsBuffering(false);
          }}
          onVolumeChange={() => {
            if (playerRef.current) {
              setVolume(playerRef.current.volume);
              setIsMuted(playerRef.current.muted);
            }
          }}
        />
        
        {/* 中央播放/暂停按钮 - 仅在暂停时显示，播放时1秒后消失 */}
        <motion.div 
          className={`absolute inset-0 flex items-center justify-center ${isPaused ? 'pointer-events-auto' : 'pointer-events-none'}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: isPaused ? 1 : 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          <motion.button 
            className="relative w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30"
            onClick={(e) => {
            e.stopPropagation();
            if (playerRef.current) {
              if (isPaused) {
                try {
                  playerRef.current.play();
                  setIsPaused(false); // 立即更新播放状态
                } catch {
                  // 忽略播放被中断的错误
                }
              } else {
                playerRef.current.pause();
                setIsPaused(true); // 立即更新暂停状态
              }
            }
          }}
            whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(249, 115, 22, 0.6)' }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 300, ease: "easeOut" }}
          >
            {/* 装饰性背景 - 默认隐藏，悬停时显示 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 hover:opacity-100 transition-opacity duration-500 animate-pulse pointer-events-none"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/30 to-orange-600/30 animate-spin opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            {/* 播放/暂停图标 - 确保在最上层 */}
            <div className="relative z-10">
              {isPaused ? (
                <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </motion.button>
        </motion.div>

        {/* 自定义控制栏 */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-3 md:p-4 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'} group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-in-out pointer-events-auto`} style={{ boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)' }}>
          {/* 进度条组件 */}
          <div className="relative mb-3 group">
            {/* 进度条背景 */}
          <div className="absolute inset-0 h-2 bg-white/10 rounded-full overflow-hidden">
            {/* 缓冲进度 */}
            <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full transition-all duration-300 ease-out" style={{ width: `${bufferProgress}%` }}></div>
            {/* 播放进度 */}
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${currentTime / (duration || 1) * 100}%` }}></div>
          </div>
            {/* 可交互的滑块 */}
            <input 
              type="range" 
              className="w-full h-8 appearance-none cursor-pointer bg-transparent absolute inset-0 z-10"
              value={currentTime}
              min="0"
              max={duration || 1}
              step="0.01"
              onChange={(e) => {
                const newTime = parseFloat(e.target.value);
                setCurrentTime(newTime);
                if (playerRef.current) {
                  playerRef.current.currentTime = newTime;
                }
                // 重置控制组件隐藏定时器
                showControlsWithTimeout();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                // 重置控制组件隐藏定时器
                showControlsWithTimeout();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                // 重置控制组件隐藏定时器
                showControlsWithTimeout();
              }}
            />
            {/* 滑块指示器 */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200" 
              style={{ left: `${currentTime / (duration || 1) * 100}%`, boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)' }}
            ></div>
          </div>
          
          {/* 控制按钮和时间显示 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* 左侧控制按钮 */}
            <div className="flex items-center space-x-2">
              {/* 快退按钮 */}
              <button 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const newTime = Math.max(0, currentTime - 10);
                  setCurrentTime(newTime);
                  if (playerRef.current) {
                    playerRef.current.currentTime = newTime;
                  }
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                </svg>
              </button>
              
              {/* 播放/暂停按钮 */}
              <button 
                className="relative w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  if (playerRef.current) {
                    if (isPaused) {
                      try {
                        playerRef.current.play();
                      } catch {
                        // 忽略播放被中断的错误
                      }
                    } else {
                      playerRef.current.pause();
                    }
                  }
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                {isPaused ? (
                  <svg className="w-6 h-6 ml-0.5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              {/* 快进按钮 */}
              <button 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const newTime = Math.min(duration || 0, currentTime + 10);
                  setCurrentTime(newTime);
                  if (playerRef.current) {
                    playerRef.current.currentTime = newTime;
                  }
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.555 5.168A1 1 0 0010 6v2.798l-5.445-3.63A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z" />
                </svg>
              </button>
              
              {/* 时间显示 */}
              <div className="text-white text-sm font-medium whitespace-nowrap">
                <span>{formatTime(currentTime)}</span>
                <span className="text-gray-400 mx-2">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* 右侧控制按钮 */}
            <div className="flex items-center space-x-1">
              {/* 音量控制 - 简化为只显示音量按钮 */}
              <button 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
              >
                {isMuted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              {/* 播放速度控制 */}
              <div className="relative z-50">
                <button 
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlaybackMenu(prev => !prev);
                    // 重置控制组件隐藏定时器
                    showControlsWithTimeout();
                  }}
                  title="播放速度"
                >
                  <span className="text-xs font-medium">{playbackRate}x</span>
                </button>
                
                {/* 播放速度菜单 - 最小间距显示 */}
                  {showPlaybackMenu && (
                    <div 
                      className="absolute bottom-full right-0 mb-1.5 bg-black/95 backdrop-blur-lg rounded-md shadow-md border border-white/20 overflow-hidden z-60 min-w-[65px]"
                    >
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                        <button
                          key={rate}
                          className={`px-2 py-0.75 text-left text-xs text-white hover:bg-orange-500/30 transition-colors duration-200 ${playbackRate === rate ? 'bg-orange-500/40 font-medium' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaybackRate(rate);
                            setShowPlaybackMenu(false);
                            // 重置控制组件隐藏定时器
                            showControlsWithTimeout();
                          }}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
              </div>
              
              {/* 画中画按钮 */}
              <button 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePIP();
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
                title={pip ? "退出画中画" : "画中画模式"}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3a1 1 0 011 1v6a1 1 0 11-2 0V4a1 1 0 011-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM16 10a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM10 16a1 1 0 011-1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM6.293 16.293a1 1 0 011.414 0l2-2a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414-1.414zM13.707 3.707a1 1 0 011.414 0l2 2a1 1 0 01-1.414 1.414l-2-2a1 1 0 010-1.414z" />
                </svg>
              </button>
              
              {/* 旋转屏幕按钮 - 仅在移动设备且全屏模式下显示 */}
              {isMobile && fullscreen && (
                <button 
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleScreenRotation();
                    // 重置控制组件隐藏定时器
                    showControlsWithTimeout();
                  }}
                  title="旋转屏幕"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                  </svg>
                </button>
              )}
              
              {/* 全屏按钮 */}
              <button 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const container = containerRef.current;
                  const video = playerRef.current;
                  if (container && video) {
                    // 检查当前是否处于全屏状态
                    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
                    
                    if (!isFullscreen) {
                      try {
                        // 针对Safari/iOS的特殊处理
                        if (typeof video.webkitEnterFullscreen !== 'undefined') {
                          // Safari/iOS原生视频全屏
                          video.webkitEnterFullscreen();
                        } else if (typeof video.webkitRequestFullscreen !== 'undefined') {
                          // Safari桌面版全屏
                          video.webkitRequestFullscreen();
                        } else if (typeof video.requestFullscreen !== 'undefined') {
                          // 标准全屏API
                          video.requestFullscreen();
                        } else if (typeof container.webkitRequestFullscreen !== 'undefined') {
                          // Safari容器全屏
                          container.webkitRequestFullscreen();
                        } else if (typeof container.requestFullscreen !== 'undefined') {
                          // 标准容器全屏
                          container.requestFullscreen();
                        } else {
                          console.error('Fullscreen API is not supported in this browser');
                        }
                      } catch (err) {
                        console.error(`Error attempting to enable full-screen mode: ${(err as Error).message}`);
                      }
                    } else {
                      try {
                        // 退出全屏模式
                        if (typeof document.exitFullscreen !== 'undefined') {
                          document.exitFullscreen();
                        } else if (typeof document.webkitExitFullscreen !== 'undefined') {
                          document.webkitExitFullscreen();
                        } else if (typeof document.mozCancelFullScreen !== 'undefined') {
                          document.mozCancelFullScreen();
                        } else if (typeof document.msExitFullscreen !== 'undefined') {
                          document.msExitFullscreen();
                        } else {
                          console.error('Exit fullscreen API is not supported in this browser');
                        }
                      } catch (err) {
                        console.error(`Error attempting to exit full-screen mode: ${(err as Error).message}`);
                      }
                    }
                  }
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
                title="全屏模式"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.586L13.586 7H10V3.586zM14 8H10V4l4 4zM9.414 13L6 9.414V13H9.414zM4 12h4v4L4 12z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 自定义影院模式按钮 - 悬浮在右上角 */}
        <motion.div 
          className={`absolute top-4 right-4 z-50 ${showControls ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 pointer-events-auto`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: showControls ? 1 : 0, scale: showControls ? 1 : 0.8 }}
          transition={{ duration: 300, ease: "easeOut" }}
        >
           <motion.button 
              type="button"
              className="bg-black/50 hover:bg-orange-500/90 text-white p-2 rounded-full backdrop-blur-md border border-orange-300/30 shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                handleFullscreenToggle();
              }}
              title={fullscreen ? "退出影院模式" : "影院模式"}
              whileHover={{ scale: 1.1, boxShadow: '0 0 15px rgba(249, 115, 22, 0.5)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 300, ease: "easeOut" }}
            >
              {fullscreen ? (
                <ShrinkIcon className="w-4 h-4 text-white" />
              ) : (
                <ExpandIcon className="w-4 h-4 text-white" />
              )}
            </motion.button>
        </motion.div>
      </div>
    </>
  );
}
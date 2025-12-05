'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExpandIcon, ShrinkIcon } from 'lucide-react';

// 导入自定义样式
import '../styles/videoplayer.css';

interface VideoPlayerProps {
  videoUrl: string;
  className?: string;
  posterUrl?: string;
}

// 格式化时间函数
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoPlayer({ videoUrl, className = '', posterUrl }: VideoPlayerProps) {
  const [isEnlarged, setIsEnlarged] = useState(false); // 控制视频在当前区域放大
  const [showOverlay, setShowOverlay] = useState(false); // 控制背景遮罩显示
  const [style, setStyle] = useState<React.CSSProperties>({}); // 动态样式用于动画
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  
  // 视频切换过渡状态
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [isSwitching, setIsSwitching] = useState(false);
  
  // 视频缓冲状态
  const [isBuffering, setIsBuffering] = useState(false);
  
  // 视频播放状态
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  
  const playerRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null); // 占位符引用
  const containerRectRef = useRef<DOMRect | null>(null); // 保存容器原始尺寸和位置
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 处理视频URL变化，实现平滑过渡
  useEffect(() => {
    if (videoUrl !== currentVideoUrl) {
      // 1. 开始切换，显示遮罩（淡出）
      // 使用 requestAnimationFrame 避免在 effect 中同步更新状态导致的警告
      requestAnimationFrame(() => {
        setIsSwitching(true);
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

  // 处理视口大小变化
  const handleResize = () => {
    // 视口变化时的逻辑（如果需要）
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 计算视频容器的宽高比
  const getAspectRatioStyle = () => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024;
    
    if (videoDimensions.width && videoDimensions.height) {
      const aspectRatio = videoDimensions.width / videoDimensions.height;
      return {
        aspectRatio: `${aspectRatio}`,
        maxWidth: isMobile ? '100%' : isTablet ? '90%' : '80%',
        width: '100%',
        padding: 0,
        margin: 0,
        alignSelf: 'center'
      };
    }
    return {
      aspectRatio: '16/9',
      maxWidth: isMobile ? '100%' : isTablet ? '90%' : '80%',
      width: '100%',
      padding: 0,
      margin: 0,
      alignSelf: 'center'
    };
  };
  
  // 处理放大按钮点击 (影院模式)
  const handleFullscreenToggle = () => {
    if (!isEnlarged) {
      // 进入放大模式
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      containerRectRef.current = rect;
      
      // 响应式影院模式尺寸计算
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth < 1024;
      
      // 计算目标尺寸和位置 (移动端：95% 视口，平板：90% 视口，桌面：85% 视口)
      const widthRatio = isMobile ? 0.95 : isTablet ? 0.9 : 0.85;
      const heightRatio = isMobile ? 0.85 : isTablet ? 0.9 : 0.9;
      
      const targetWidth = Math.min(window.innerWidth * widthRatio, 1920);
      const targetHeight = Math.min(window.innerHeight * heightRatio, 1080);
      
      // 保持宽高比
      const videoRatio = (videoDimensions.width / videoDimensions.height) || (16/9);
      const screenRatio = targetWidth / targetHeight;
      
      let finalWidth, finalHeight;
      if (videoRatio > screenRatio) {
        finalWidth = targetWidth;
        finalHeight = targetWidth / videoRatio;
      } else {
        finalHeight = targetHeight;
        finalWidth = targetHeight * videoRatio;
      }
      
      // 计算居中位置，移动端可以更靠近边缘
      const horizontalPadding = isMobile ? 10 : isTablet ? 20 : 40;
      const verticalPadding = isMobile ? 20 : isTablet ? 30 : 50;
      
      const targetTop = Math.max((window.innerHeight - finalHeight) / 2, verticalPadding);
      const targetLeft = Math.max((window.innerWidth - finalWidth) / 2, horizontalPadding);
      
      // 1. 设置初始固定位置（在当前位置）
      setStyle({
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex: 1000,
        transition: 'none',
        borderRadius: '0.75rem',
        backgroundColor: 'rgba(0,0,0,0)'
      });
      
      setIsEnlarged(true);
      setShowOverlay(true);
      
      // 2. 强制重绘后开始动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStyle({
            position: 'fixed',
            top: `${targetTop}px`,
            left: `${targetLeft}px`,
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
            zIndex: 1000,
            transition: 'all 0.4s cubic-bezier(0.2, 0, 0.2, 1)',
            borderRadius: '1rem',
            boxShadow: '0 20px 60px rgba(249, 115, 22, 0.3)',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            backdropFilter: 'blur(20px)'
          });
        });
      });
      
    } else {
      // 退出放大模式
      const placeholder = placeholderRef.current;
      if (placeholder) {
        const rect = placeholder.getBoundingClientRect();
        
        // 1. 动画回到原位
        setStyle({
          position: 'fixed',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          zIndex: 1000,
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '0.75rem',
          boxShadow: 'none',
          backgroundColor: 'rgba(0,0,0,0)',
          border: 'none',
          backdropFilter: 'none'
        });
        
        setShowOverlay(false);
        
        // 2. 动画结束后重置状态
        setTimeout(() => {
          setIsEnlarged(false);
          setStyle({});
        }, 350);
      } else {
        setIsEnlarged(false);
        setShowOverlay(false);
        setStyle({});
      }
    }
  };

  // 监听视频状态变化
  useEffect(() => {
    const video = playerRef.current;
    if (!video) return;

    // 更新视频状态的函数
    const updateVideoState = () => {
      setIsPaused(video.paused);
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      setIsMuted(video.muted);
      setVolume(video.volume);
    };

    // 事件监听器
    const handlePlay = () => {
      setIsPaused(false);
      setIsBuffering(false);
      // 开始定期更新进度
      progressIntervalRef.current = setInterval(() => {
        const v = playerRef.current;
        if (v && !v.paused) {
          setCurrentTime(v.currentTime);
        }
      }, 100);
    };

    const handlePause = () => {
      setIsPaused(true);
      // 停止定期更新进度
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    const handleTimeUpdate = updateVideoState;
    const handleDurationChange = updateVideoState;
    const handleVolumeChange = updateVideoState;
    const handleLoadedMetadata = updateVideoState;

    // 添加事件监听器
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // 初始化状态
    updateVideoState();

    // 清理函数
    return () => {
      // 移除事件监听器
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      
      // 清理定时器
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* 背景遮罩层 */}
      {showOverlay && (
        <div 
          className="fixed inset-0 z-[999] transition-opacity duration-500 ease-out backdrop-blur-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(245, 158, 11, 0.1), rgba(0, 0, 0, 0.9))'
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleFullscreenToggle();
          }}
        />
      )}
      
      {/* 占位符 - 当视频放大时占据原位，防止页面抖动 */}
      {isEnlarged && (
        <div 
          ref={placeholderRef}
          className={`w-full ${className}`}
          style={{
            ...getAspectRatioStyle(),
            visibility: 'hidden'
          }}
        />
      )}
      
      {/* 视频容器 */}
      <div 
        ref={containerRef}
        className={`relative overflow-hidden group ${className}`}
        style={{
          ...getAspectRatioStyle(),
          ...style,
          ...(Object.keys(style).length === 0 ? {
            borderRadius: '0.75rem',
            transition: 'transform 0.3s ease',
            backgroundColor: 'black'
          } : {
            willChange: 'top, left, width, height'
          })
        }}
      >
        {/* 视频切换过渡遮罩 */}
        <div 
          className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-500 ease-in-out pointer-events-none ${isSwitching ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            background: 'linear-gradient(135deg, rgba(253, 186, 116, 0.3), rgba(249, 115, 22, 0.3), rgba(245, 158, 11, 0.3))',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="warm-loading-spinner"></div>
        </div>
        
        {/* 缓冲状态指示器 */}
        {(isSwitching || isBuffering) && (
          <div className="warm-buffer-indicator">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {/* 视频容器 - 使用HTML5 video元素 */}
        <div
          className="relative w-full h-full overflow-hidden group video-player-card"
          style={{
            borderRadius: '0.75rem',
            overflow: 'hidden'
          }}
        >
          {/* 视频源 */}
          <video
            ref={playerRef}
            src={currentVideoUrl}
            poster={posterUrl}
            preload="auto"
            crossOrigin="anonymous"
            autoPlay={false}
            playsInline
            muted={false}
            className="w-full h-full object-contain"
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              setVideoDimensions({ 
                width: video.videoWidth, 
                height: video.videoHeight 
              });
            }}
            onCanPlay={() => {
              if (isSwitching) {
                setIsSwitching(false);
              }
              setIsBuffering(false);
            }}
          />
          
          {/* 播放按钮覆盖层 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
            <button 
              className="w-16 h-16 rounded-full bg-primary-500/90 hover:bg-primary-600/90 text-white shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center"
              onClick={() => {
                const video = playerRef.current;
                if (video) {
                  if (video.paused) {
                    video.play();
                  } else {
                    video.pause();
                  }
                }
              }}
            >
              <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
          </div>
          
          {/* 控制栏 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* 进度条 */}
            <input 
              type="range" 
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-3"
              style={{
                background: `linear-gradient(to right, var(--warm-primary) 0%, var(--warm-primary) ${currentTime / (duration || 1) * 100}%, rgba(255, 255, 255, 0.2) ${currentTime / (duration || 1) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
              }}
              value={currentTime}
              max={duration || 1}
              onChange={(e) => {
                const video = playerRef.current;
                if (video) {
                  const newTime = parseFloat(e.target.value);
                  video.currentTime = newTime;
                  setCurrentTime(newTime);
                }
              }}
            />
            
            {/* 控制按钮和时间显示 */}
            <div className="flex items-center justify-between">
              {/* 左侧控制按钮 */}
              <div className="flex items-center space-x-3">
                {/* 快退按钮 */}
                <button 
                  className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                  onClick={() => {
                    const video = playerRef.current;
                    if (video) {
                      const newTime = Math.max(0, video.currentTime - 10);
                      video.currentTime = newTime;
                      setCurrentTime(newTime);
                    }
                  }}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                  </svg>
                </button>
                
                {/* 播放/暂停按钮 */}
                <button 
                  className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                  onClick={() => {
                    const video = playerRef.current;
                    if (video) {
                      if (video.paused) {
                        video.play();
                      } else {
                        video.pause();
                      }
                    }
                  }}
                >
                  {isPaused ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                {/* 快进按钮 */}
                <button 
                  className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                  onClick={() => {
                    const video = playerRef.current;
                    if (video) {
                      const newTime = Math.min(video.duration || 0, video.currentTime + 10);
                      video.currentTime = newTime;
                      setCurrentTime(newTime);
                    }
                  }}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.555 5.168A1 1 0 0010 6v2.798l-5.445-3.63A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z" />
                  </svg>
                </button>
              </div>
              
              {/* 中间时间显示 */}
              <div className="text-white text-sm font-medium">
                <span>{formatTime(currentTime)}</span>
                <span className="text-gray-400 mx-2">/</span>
                <span>{formatTime(duration)}</span>
              </div>
              
              {/* 右侧控制按钮 */}
              <div className="flex items-center space-x-3">
                {/* 音量控制 */}
                <div className="flex items-center space-x-2">
                  <button 
                    className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                    onClick={() => {
                      const video = playerRef.current;
                      if (video) {
                        video.muted = !video.muted;
                        setIsMuted(video.muted);
                      }
                    }}
                  >
                    {isMuted ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <input 
                    type="range" 
                    className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => {
                      const video = playerRef.current;
                      if (video) {
                        const newVolume = parseFloat(e.target.value);
                        video.volume = newVolume;
                        video.muted = newVolume === 0;
                        setVolume(newVolume);
                        setIsMuted(video.muted);
                      }
                    }}
                  />
                </div>
                
                {/* 全屏按钮 */}
                <button 
                  className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                  onClick={() => {
                    const container = containerRef.current;
                    if (container) {
                      if (!document.fullscreenElement) {
                        container.requestFullscreen().catch(err => {
                          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                        });
                      } else {
                        if (document.exitFullscreen) {
                          document.exitFullscreen();
                        }
                      }
                    }
                  }}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3.586L13.586 7H10V3.586zM14 8H10V4l4 4zM9.414 13L6 9.414V13H9.414zM4 12h4v4L4 12z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* 自定义影院模式按钮 - 悬浮在右上角 */}
          <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
             <button 
                type="button"
                className="bg-black/50 hover:bg-primary-500/90 text-white p-2.5 rounded-full backdrop-blur-md border border-primary-300/30 shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFullscreenToggle();
                }}
                title={isEnlarged ? "退出影院模式" : "影院模式"}
              >
                {isEnlarged ? (
                  <ShrinkIcon className="w-5 h-5 text-primary-100" />
                ) : (
                  <ExpandIcon className="w-5 h-5 text-primary-100" />
                )}
              </button>
          </div>
        </div>
      </div>
    </>
  );
}
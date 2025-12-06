'use client';

import React, { useState, useEffect, useRef } from 'react';

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
  const [videoDimensions] = useState({ width: 0, height: 0 });
  
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
  const [pip, setPip] = useState(false); // 画中画模式
  const [showControls, setShowControls] = useState(true); // 控制组件显示状态
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 控制组件隐藏定时器
  
  const playerRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null); // 占位符引用
  const containerRectRef = useRef<DOMRect | null>(null); // 保存容器原始尺寸和位置

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
    if (!isEnlarged) {
      // 进入放大模式
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      containerRectRef.current = rect;
      
      // 响应式影院模式尺寸计算
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth < 1024;
      
      // 计算目标尺寸和位置
      let targetWidth, targetHeight, targetTop, targetLeft;
      let finalStyle: React.CSSProperties;
      
      if (isMobile) {
        // 移动端：全屏体验，充分利用屏幕空间
        targetWidth = window.innerWidth;
        targetHeight = window.innerHeight;
        targetTop = 0;
        targetLeft = 0;
        
        // 移动端简化样式，更接近全屏体验
        finalStyle = {
          position: 'fixed',
          top: `${targetTop}px`,
          left: `${targetLeft}px`,
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          zIndex: 9999,
          transition: 'all 0.3s ease',
          borderRadius: '0',
          boxShadow: 'none',
          backgroundColor: 'black',
          border: 'none',
          backdropFilter: 'none'
        };
      } else {
        // 平板和桌面端：保持原有影院模式
        // 计算目标尺寸和位置 (平板：90% 视口，桌面：85% 视口)
        const widthRatio = isTablet ? 0.9 : 0.85;
        const heightRatio = isTablet ? 0.9 : 0.9;
        
        targetWidth = Math.min(window.innerWidth * widthRatio, 1920);
        targetHeight = Math.min(window.innerHeight * heightRatio, 1080);
        
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
        
        // 计算居中位置
        const horizontalPadding = isTablet ? 20 : 40;
        const verticalPadding = isTablet ? 30 : 50;
        
        targetTop = Math.max((window.innerHeight - finalHeight) / 2, verticalPadding);
        targetLeft = Math.max((window.innerWidth - finalWidth) / 2, horizontalPadding);
        
        // 桌面端样式
        finalStyle = {
          position: 'fixed',
          top: `${targetTop}px`,
          left: `${targetLeft}px`,
          width: `${finalWidth}px`,
          height: `${finalHeight}px`,
          zIndex: 9999,
          transition: 'all 0.4s cubic-bezier(0.2, 0, 0.2, 1)',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(249, 115, 22, 0.3)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(249, 115, 22, 0.2)',
          backdropFilter: 'blur(20px)'
        };
      }
      
      // 1. 设置初始固定位置（在当前位置）
      setStyle({
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex: 9999,
        transition: 'none',
        borderRadius: isMobile ? '0' : '0.75rem',
        backgroundColor: 'rgba(0,0,0,0)'
      });
      
      setIsEnlarged(true);
      setShowOverlay(true);
      
      // 2. 强制重绘后开始动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStyle(finalStyle);
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
          zIndex: 9999,
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
        if (container && !document.fullscreenElement) {
          container.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          });
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

  // 确保页面加载时不会自动全屏
  useEffect(() => {
    // 检查是否有元素处于全屏状态，如果有则退出
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error(`Error attempting to exit full-screen mode: ${err.message}`);
      });
    }
  }, []);

  return (
    <>
      {/* 背景遮罩层 */}
      {showOverlay && (
        <motion.div 
          className="fixed inset-0 z-[999] backdrop-blur-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(245, 158, 11, 0.1), rgba(0, 0, 0, 0.9))'
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleFullscreenToggle();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
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
          className="w-full h-full object-contain"
          poster={posterUrl || ''}
          preload="metadata"
          autoPlay={false}
          muted={isMuted}
          playsInline
          controlsList="nodownload noremoteplayback"
          onClick={() => {
            if (playerRef.current) {
              if (isPaused) {
                playerRef.current.play();
              } else {
                playerRef.current.pause();
              }
              // 点击视频时显示控制组件并设置定时器自动隐藏
              showControlsWithTimeout();
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
            setIsBuffering(false);
          }}
          onVolumeChange={() => {
            if (playerRef.current) {
              setVolume(playerRef.current.volume);
              setIsMuted(playerRef.current.muted);
            }
          }}
        />
        
        {/* 中央播放/暂停按钮 - 点击视频时显示 */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-auto ${(isPaused || showControls) ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-300`}>
          <button 
            className="w-16 h-16 rounded-full bg-primary-500/90 hover:bg-primary-600/90 text-white shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              if (playerRef.current) {
                if (isPaused) {
                  playerRef.current.play();
                } else {
                  playerRef.current.pause();
                }
              }
            }}
          >
            {isPaused ? (
              <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* 自定义控制栏 */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 ${showControls ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto`}>
          {/* 进度条组件 */}
          <div className="relative mb-3">
            <input 
              type="range" 
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--warm-primary) 0%, var(--warm-primary) ${currentTime / (duration || 1) * 100}%, rgba(255, 255, 255, 0.2) ${currentTime / (duration || 1) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
              }}
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
          </div>
          
          {/* 控制按钮和时间显示 */}
          <div className="flex items-center justify-between">
            {/* 左侧控制按钮 */}
            <div className="flex items-center space-x-3">
              {/* 快退按钮 */}
              <button 
                className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
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
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                </svg>
              </button>
              
              {/* 播放/暂停按钮 */}
              <button 
                className="w-10 h-10 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  if (playerRef.current) {
                    if (isPaused) {
                      playerRef.current.play();
                    } else {
                      playerRef.current.pause();
                    }
                  }
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
              >
                {isPaused ? (
                  <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              {/* 快进按钮 */}
              <button 
                className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
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
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.555 5.168A1 1 0 0010 6v2.798l-5.445-3.63A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z" />
                </svg>
              </button>
            </div>
            
            {/* 时间显示 */}
            <div className="text-white text-sm font-medium">
              <span>{formatTime(currentTime)}</span>
              <span className="text-gray-400 mx-2">/</span>
              <span>{formatTime(duration)}</span>
            </div>
            
            {/* 右侧控制按钮 */}
            <div className="flex items-center space-x-2">
              {/* 音量控制 */}
              <div className="flex items-center space-x-1">
                <button 
                  className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                    // 重置控制组件隐藏定时器
                    showControlsWithTimeout();
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
                  className="w-16 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    setIsMuted(newVolume === 0);
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
              </div>
              
              {/* 画中画按钮 */}
              <button 
                className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePIP();
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
                title={pip ? "退出画中画" : "画中画模式"}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3a1 1 0 011 1v6a1 1 0 11-2 0V4a1 1 0 011-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM16 10a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM10 16a1 1 0 011-1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM6.293 16.293a1 1 0 011.414 0l2-2a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414-1.414zM13.707 3.707a1 1 0 011.414 0l2 2a1 1 0 01-1.414 1.414l-2-2a1 1 0 010-1.414z" />
                </svg>
              </button>
              
              {/* 全屏按钮 */}
              <button 
                className="w-8 h-8 text-white hover:text-primary-400 transition-colors duration-200 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
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
                  // 重置控制组件隐藏定时器
                  showControlsWithTimeout();
                }}
                title="全屏模式"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.586L13.586 7H10V3.586zM14 8H10V4l4 4zM9.414 13L6 9.414V13H9.414zM4 12h4v4L4 12z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 自定义影院模式按钮 - 悬浮在右上角 */}
        <div className={`absolute top-4 right-4 z-50 ${showControls ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto`}>
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
    </>
  );
}
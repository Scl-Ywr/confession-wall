'use client';

import { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { ExpandIcon, ShrinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { BeatLoader } from 'react-spinners';
import { useVideoPlayerContext } from '../context/VideoPlayerContext';

// 导入自定义样式
import '../styles/videoplayer.css';

interface VideoPlayerProps {
  id: string;
  videoUrl: string;
  className?: string;
  posterUrl?: string;
}

export default function VideoPlayer({ id, videoUrl, className = '', posterUrl }: VideoPlayerProps) {
  const { currentlyPlayingId, setCurrentlyPlayingId } = useVideoPlayerContext();
  const [fullscreen, setFullscreen] = useState(false); // 控制浏览器全屏状态
  const [isSwitching, setIsSwitching] = useState(false); // 视频切换过渡状态
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [pip, setPip] = useState(false); // 画中画模式
  const [showControls, setShowControls] = useState(true); // 控制组件显示状态
  const [playbackRate, setPlaybackRate] = useState(1); // 播放速度
  const [showPlaybackMenu, setShowPlaybackMenu] = useState(false); // 播放速度菜单显示状态
  const [bufferProgress, setBufferProgress] = useState(0); // 缓冲进度百分比
  const [aspectRatio, setAspectRatio] = useState<string>('16/9'); // 视频宽高比，默认为16/9
  

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 控制组件隐藏定时器
  
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 格式化时间函数
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理视频URL变化，实现平滑过渡
  useEffect(() => {
    if (videoUrl) {
      // 1. 开始切换，显示遮罩（淡出）
      requestAnimationFrame(() => {
        setIsSwitching(true);
        setDuration(0);
      });
      
      // 2. 延迟淡入，确保新视频已准备好加载
      const timeoutId = setTimeout(() => {
        setIsSwitching(false);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [videoUrl]);

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
    if (!container) return;
    
    // 检查当前是否处于全屏状态
    const isFullscreen = !!document.fullscreenElement;
    
    if (!isFullscreen) {
      try {
        container.requestFullscreen();
      } catch (err) {
        console.error(`Error attempting to enable full-screen mode: ${(err as Error).message}`);
      }
    } else {
      try {
        document.exitFullscreen();
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

  // 定期更新播放时间 - 作为 onProgress 事件的可靠补充
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const updateCurrentTime = () => {
      if (playerRef.current && !isPaused) {
        const currentTime = playerRef.current.currentTime;
        setCurrentTime(currentTime);
      }
    };

    // 当视频正在播放时，每秒更新 10 次播放时间
    if (!isPaused) {
      interval = setInterval(updateCurrentTime, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPaused]);

  // 监听当前播放视频变化 - 实现互斥播放
  useEffect(() => {
    if (currentlyPlayingId !== null && currentlyPlayingId !== id && playerRef.current) {
      // 如果有其他视频在播放，且当前视频不是正在播放的视频，就暂停当前视频
      playerRef.current.pause();
    }
  }, [currentlyPlayingId, id]);

  // 监听播放状态变化 - 更新当前播放视频
  useEffect(() => {
    if (!isPaused) {
      // 如果当前视频开始播放，设置为当前播放视频
      setCurrentlyPlayingId(id);
    } else {
      // 如果当前视频暂停，检查是否是当前播放视频，如果是，清除当前播放视频
      if (currentlyPlayingId === id) {
        setCurrentlyPlayingId(null);
      }
    }
  }, [isPaused, id, currentlyPlayingId, setCurrentlyPlayingId]);

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
          aspectRatio: aspectRatio,
          borderRadius: '0.75rem',
          transition: 'transform 0.3s ease',
          backgroundColor: 'black',
          width: '100%',
          // 只缩小竖屏视频，横屏视频保持100%宽度
          maxWidth: aspectRatio.split('/')[0] < aspectRatio.split('/')[1] ? '80%' : '100%',
          margin: aspectRatio.split('/')[0] < aspectRatio.split('/')[1] ? '0 auto' : '0',
          // 进一步减小竖屏视频的尺寸
          maxHeight: aspectRatio.split('/')[0] < aspectRatio.split('/')[1] ? '150px' : 'none',
          padding: 0
        }}
        onClick={(e) => {
          // 如果点击的是控制按钮 ，不处理
          if (e.target instanceof HTMLButtonElement || 
              (e.target instanceof HTMLElement && e.target.closest('button'))) {
            return;
          }
          // 点击屏幕时切换播放/暂停状态
          if (playerRef.current) {
            if (isPaused) {
              playerRef.current.play();
            } else {
              playerRef.current.pause();
            }
          }
          // 显示控制组件
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

        {/* React Player */}
        <ReactPlayer
          ref={playerRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          width="100%"
          height="100%"
          poster={posterUrl || ''}
          preload="auto"
          autoPlay={false}
          muted={isMuted}
          playsInline
          controls={false} // 使用自定义控制界面
          volume={volume}
          playbackRate={playbackRate}
          onPlay={() => {
            setIsPaused(false);
            showControlsWithTimeout();
          }}
          onPause={() => {
            setIsPaused(true);
            showControlsWithTimeout();
          }}
          onPlaying={() => {
            setIsPaused(false);
            showControlsWithTimeout();
          }}
          onWaiting={() => {
            setIsPaused(true);
            showControlsWithTimeout();
          }}
          onEnded={() => {
            setIsPaused(true);
            showControlsWithTimeout();
          }}
          onProgress={(event: React.SyntheticEvent<HTMLVideoElement>) => {
            const videoElement = event.currentTarget;
            setCurrentTime(videoElement.currentTime);
            // 计算缓冲进度
            const buffered = videoElement.buffered;
            if (buffered.length > 0 && !isNaN(videoElement.duration)) {
              const loaded = buffered.end(buffered.length - 1) / videoElement.duration;
              setBufferProgress(loaded * 100);
            }
          }}
          onReady={() => {
            // ReactPlayer 的 ref 指向内部的 HTMLVideoElement
            if (playerRef.current) {
              setDuration(playerRef.current.duration);
            }
          }}
          onLoadedMetadata={(event: React.SyntheticEvent<HTMLVideoElement>) => {
            // 当视频元数据加载完成时（包括 duration），更新总时长
            const videoElement = event.currentTarget;
            setDuration(videoElement.duration);
            
            // 获取视频实际宽高比
            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;
            if (width && height) {
              setAspectRatio(`${width}/${height}`);
            }
          }}
          onSeeked={(event: React.SyntheticEvent<HTMLVideoElement>) => {
            const videoElement = event.currentTarget;
            setCurrentTime(videoElement.currentTime);
          }}
          onVolumeChange={(event: React.SyntheticEvent<HTMLVideoElement>) => {
            const videoElement = event.currentTarget;
            setVolume(videoElement.volume);
            setIsMuted(videoElement.muted);
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
                playerRef.current?.play();
              } else {
                playerRef.current?.pause();
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
                      playerRef.current?.play();
                    } else {
                      playerRef.current?.pause();
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
                  if (playerRef.current) {
                    playerRef.current.volume = isMuted ? 1 : 0;
                    playerRef.current.muted = !isMuted;
                  }
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
                            if (playerRef.current) {
                              playerRef.current.playbackRate = rate;
                            }
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
              
              {/* 全屏按钮 */}
              <button 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFullscreenToggle();
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
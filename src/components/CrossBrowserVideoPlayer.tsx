'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon, 
  VolumeXIcon, 
  Volume2Icon, 
  Maximize2Icon, 
  Minimize2Icon, 
  SkipBackIcon, 
  SkipForwardIcon, 
  RotateCcwIcon, 
  SettingsIcon,
  PictureInPictureIcon,
  Settings2Icon
} from 'lucide-react';
import { BeatLoader } from 'react-spinners';

interface VideoPlayerProps {
  id: string;
  videoUrl: string;
  className?: string;
  posterUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
  onPlay?: () => void;
  onPause?: () => void;
  onLoadedMetadata?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onSeeked?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onVolumeChange?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onError?: () => void;
}

export default function CrossBrowserVideoPlayer({ 
  videoUrl, 
  className = '', 
  posterUrl,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  width = '100%',
  height = 'auto',
  onPlay,
  onPause,
  onLoadedMetadata,
  onTimeUpdate,
  onSeeked,
  onVolumeChange,
  onError
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPlaybackMenu, setShowPlaybackMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [useNativeControls, setUseNativeControls] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const capabilities = useMemo(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                   (navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.userAgent));
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    return {
      canPlayMP4: (() => {
        const video = document.createElement('video');
        return video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') !== '';
      })(),
      canPlayWebM: (() => {
        const video = document.createElement('video');
        return video.canPlayType('video/webm; codecs="vp8, vorbis"') !== '';
      })(),
      supportsPictureInPicture: !isIOS && ('pictureInPictureEnabled' in document || 'pictureInPictureElement' in document),
      supportsFullscreen: 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isSafari,
      isIOS,
      // iOS对音量控制有限制
      supportsVolumeControl: !isIOS
    };
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const showControlsWithTimeout = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    // 直接检查视频元素的实际播放状态，而不仅仅依赖于组件状态
    const isActuallyPlaying = !videoRef.current.paused;
    
    if (isActuallyPlaying) {
      videoRef.current.pause();
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('播放失败:', error);
          setError('播放失败，请检查浏览器设置或稍后重试');
        });
      }
    }
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.volume = Math.max(0, Math.min(1, newVolume));
    setVolume(videoRef.current.volume);
    setIsMuted(videoRef.current.volume === 0 || videoRef.current.muted);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current || !capabilities.supportsPictureInPicture) return;
    
    try {
      if (isPictureInPicture) {
        await document.exitPictureInPicture();
        setIsPictureInPicture(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPictureInPicture(true);
      }
    } catch (error) {
      console.error('画中画模式切换失败:', error);
    }
  }, [isPictureInPicture, capabilities]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    
    if (!isCurrentlyFullscreen) {
      const element = containerRef.current;
      
      if (!element) return;
      
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ('webkitRequestFullscreen' in element) {
        (element as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      } else if ('mozRequestFullScreen' in element) {
        (element as unknown as { mozRequestFullScreen: () => void }).mozRequestFullScreen();
      } else if ('msRequestFullscreen' in element) {
        (element as unknown as { msRequestFullscreen: () => void }).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ('webkitExitFullscreen' in document) {
        (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      } else if ('mozCancelFullScreen' in document) {
        (document as unknown as { mozCancelFullScreen: () => void }).mozCancelFullScreen();
      } else if ('msExitFullscreen' in document) {
        (document as unknown as { msExitFullscreen: () => void }).msExitFullscreen();
      }
    }
  }, []);

  const handleProgressDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!progressRef.current || !videoRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0]?.clientX || 0 : (e as React.MouseEvent).clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    if (videoRef.current) {
      videoRef.current.currentTime = percentage * videoRef.current.duration;
      setCurrentTime(percentage * videoRef.current.duration);
    }
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowPlaybackMenu(false);
  }, []);

  const handleRewind = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  }, []);

  const handleForward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
  }, [duration]);

  const handleRewind5 = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
  }, []);

  const handleForward5 = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
  }, [duration]);

  const handleRestart = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
  }, []);

  const handleLoadedMetadata = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
    if (onLoadedMetadata) {
      onLoadedMetadata(event);
    }
  }, [onLoadedMetadata]);

  const handleTimeUpdate = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      if (videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBuffered((bufferedEnd / videoRef.current.duration) * 100);
      }
    }
    if (onTimeUpdate) {
      onTimeUpdate(event);
    }
  }, [onTimeUpdate]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    showControlsWithTimeout();
    if (onPlay) {
      onPlay();
    }
  }, [showControlsWithTimeout, onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
    if (onPause) {
      onPause();
    }
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (loop && videoRef.current) {
      videoRef.current.play();
    }
  }, [loop]);

  const handleSeeked = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (onSeeked) {
      onSeeked(event);
    }
  }, [onSeeked]);

  const handleVolumeChange = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (onVolumeChange) {
      onVolumeChange(event);
    }
  }, [onVolumeChange]);

  const handleError = useCallback(() => {
    console.error('视频播放错误');
    setError('视频加载失败，请检查视频格式或网络连接');
    setIsLoading(false);
    if (onError) {
      onError();
    }
  }, [onError]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!videoRef.current) return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handleRewind();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleForward();
        break;
      case 'ArrowUp':
        e.preventDefault();
        updateVolume(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        updateVolume(Math.max(0, volume - 0.1));
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'r':
        e.preventDefault();
        handleRestart();
        break;
      case 'p':
        e.preventDefault();
        togglePictureInPicture();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        e.preventDefault();
        handlePlaybackRateChange(parseInt(e.key));
        break;
      case '<':
        e.preventDefault();
        handleRewind5();
        break;
      case '>':
        e.preventDefault();
        handleForward5();
        break;
    }
  }, [togglePlay, handleRewind, handleForward, updateVolume, toggleMute, toggleFullscreen, handleRestart, volume, handleRewind5, handleForward5, handlePlaybackRateChange, togglePictureInPicture]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced poster generation - works across mobile and desktop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      console.log('[Poster] No video ref');
      return;
    }

    // If posterUrl is provided, use it directly
    if (posterUrl) {
      console.log('[Poster] Using provided posterUrl:', posterUrl);
      video.poster = posterUrl;
      return;
    }

    // If no posterUrl and no videoUrl, nothing to do
    if (!videoUrl) {
      console.log('[Poster] No videoUrl provided');
      return;
    }

    console.log('[Poster] Starting auto-generation from video first frame');

    // Generate poster from video first frame
    // Use multiple event listeners to ensure it works across all browsers/devices
    let posterGenerated = false;

    const generatePoster = (eventName?: string) => {
      if (posterGenerated) {
        console.log(`[Poster] Already generated, skipping (event: ${eventName})`);
        return;
      }

      if (!video) {
        console.log('[Poster] Video ref lost');
        return;
      }

      console.log(`[Poster] Attempting generation (event: ${eventName}, readyState: ${video.readyState}, dimensions: ${video.videoWidth}x${video.videoHeight})`);

      try {
        // Check if video has valid dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.log('[Poster] Video dimensions not ready yet');
          return; // Not ready yet, will try again on next event
        }

        // Seek to a specific time to ensure we have a frame (avoid black frames)
        if (video.currentTime === 0) {
          video.currentTime = 0.1; // Seek to 0.1s to avoid potential black first frame
        }

        // Create canvas and draw first frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to data URL with good quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Update video element's poster attribute
          video.poster = dataUrl;
          posterGenerated = true;

          console.log('✓ [Poster] Successfully generated from video first frame');
          console.log(`[Poster] Size: ${canvas.width}x${canvas.height}, Data URL length: ${dataUrl.length}`);

          // Reset currentTime back to 0
          video.currentTime = 0;
        } else {
          console.error('[Poster] Failed to get canvas 2D context');
        }
      } catch (error) {
        console.error('[Poster] Error generating poster:', error);
      }
    };

    // Try to generate poster on multiple events to maximize compatibility
    // Different browsers/devices may trigger different events at different times
    const events = [
      'loadedmetadata',  // When metadata is loaded (dimensions available)
      'loadeddata',      // When first frame is loaded
      'canplay',         // When enough data is available to play
      'canplaythrough',  // When video can play all the way through
      'seeked'           // After seeking to get a frame
    ];

    const eventHandlers: { [key: string]: () => void } = {};

    events.forEach(event => {
      const handler = () => generatePoster(event);
      eventHandlers[event] = handler;
      video.addEventListener(event, handler);
    });

    // Force load the video to trigger events
    if (video.readyState === 0) {
      console.log('[Poster] Forcing video load()');
      video.load();
    }

    // For mobile devices, especially iOS, also try after delays
    const timeoutId1 = setTimeout(() => {
      if (!posterGenerated) {
        console.log('[Poster] Timeout 1s check');
        if (video.readyState >= 2) {
          generatePoster('timeout-1s');
        } else {
          console.log(`[Poster] Video not ready yet at 1s (readyState: ${video.readyState})`);
        }
      }
    }, 1000);

    const timeoutId2 = setTimeout(() => {
      if (!posterGenerated) {
        console.log('[Poster] Timeout 2s check');
        if (video.readyState >= 1) {
          // Even with just metadata, try to generate
          generatePoster('timeout-2s');
        }
      }
    }, 2000);

    // Clean up
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      events.forEach(event => {
        if (eventHandlers[event]) {
          video.removeEventListener(event, eventHandlers[event]);
        }
      });
      console.log('[Poster] Cleanup');
    };
  }, [videoUrl, posterUrl]);
  
  // Use posterUrl directly, no need for generated poster state
  const finalPosterUrl = posterUrl;
  
  return (
    <div 
      ref={containerRef}
      className={`relative bg-black overflow-hidden shadow-2xl ${className}`}
      style={{ 
        width, 
        height,
        borderRadius: 'inherit', // 继承父组件的圆角设置
        overflow: 'hidden' // 确保内容不会溢出
      }}
      onMouseMove={showControlsWithTimeout}
      onTouchStart={showControlsWithTimeout}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="视频播放器"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/95 via-black/85 to-black/95 z-20 backdrop-blur-md" aria-live="polite">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-orange-400/30 blur-3xl rounded-full animate-pulse" />
              <BeatLoader color="#f97316" size={32} />
            </div>
            <p className="text-white text-base font-medium tracking-wide">加载中...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/95 via-red-800/90 to-red-900/95 z-20 backdrop-blur-xl" role="alert" aria-live="assertive">
          <div className="bg-white/10 backdrop-blur-2xl text-white p-10 rounded-3xl max-w-md text-center shadow-2xl border border-red-500/30">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/40 blur-3xl rounded-full" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
            <p className="font-bold mb-4 text-2xl tracking-wide">播放错误</p>
            <p className="text-base mb-6 text-red-100 leading-relaxed">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="px-10 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 active:scale-95"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 简化的视频显示 - 直接使用视频元素的能力 */}
      <div className="relative w-full h-full overflow-hidden rounded-lg sm:rounded-xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          poster={finalPosterUrl}
          preload={capabilities.isMobile ? "auto" : "metadata"}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          controls={capabilities.isIOS && useNativeControls}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onSeeked={handleSeeked}
          onVolumeChange={handleVolumeChange}
          onError={handleError}
          onClick={!useNativeControls ? togglePlay : undefined}
          aria-label="视频内容"
          style={{
            WebkitTapHighlightColor: 'transparent',
            backgroundColor: 'black',
            // 确保视频填满容器，不出现空白
            objectFit: 'cover',
            // 移除可能影响显示的样式
            background: 'none',
            border: 'none',
            outline: 'none',
            // 确保poster正确显示
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl.replace(/\.(mp4|mov|avi)$/i, '.webm')} type="video/webm" />
          您的浏览器不支持视频播放。
        </video>
        
        {/* 初始加载占位符 - 只在视频未加载时显示 */}
        {isLoading && !finalPosterUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black z-10 flex items-center justify-center rounded-lg sm:rounded-xl">
            <div className="text-white/50 text-4xl">
              🎬
            </div>
          </div>
        )}
      </div>

      {controls && !useNativeControls && (
        <AnimatePresence>
          {showControls && (
            <motion.div
              className={`absolute bottom-0 left-0 right-0 pb-3 pt-8 px-3 sm:pb-4 sm:pt-10 sm:px-4 md:pb-5 md:pt-12 md:px-6 ${capabilities.isIOS ? 'pb-safe' : ''}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              role="toolbar"
              aria-label="视频控制"
              style={{
                paddingBottom: capabilities.isIOS ? 'max(12px, env(safe-area-inset-bottom))' : undefined
              }}
            >
              {/* 渐变背景层 - 更高更柔和 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />

              <div className="relative space-y-3 sm:space-y-4">
                {/* 时间显示 - 独立显示在进度条上方 */}
                <div className="flex justify-center">
                  <div className="flex items-center gap-1 text-white text-xs sm:text-sm font-semibold bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="tabular-nums">{formatTime(currentTime)}</span>
                    <span className="text-white/50">/</span>
                    <span className="text-white/70 tabular-nums">{formatTime(duration || 0)}</span>
                  </div>
                </div>

                {/* 进度条区域 - 优化版 */}
                <div className="px-1">
                  <div className="relative h-1 sm:h-1.5 bg-white/10 rounded-full overflow-visible group cursor-pointer">
                    {/* 缓冲进度 */}
                    <div
                      className="absolute top-0 left-0 h-full bg-white/20 rounded-full transition-all duration-300"
                      style={{ width: `${buffered}%` }}
                    />

                    {/* 播放进度 */}
                    <motion.div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 rounded-full shadow-lg shadow-orange-500/50"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                      initial={false}
                      transition={{ duration: 0.1 }}
                    />

                    {/* 进度条滑块 */}
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-xl ring-2 ring-orange-500 ring-opacity-50 opacity-0 group-hover:opacity-100"
                      style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)` }}
                      animate={{
                        scale: isDragging ? 1.4 : 1,
                        opacity: isDragging ? 1 : undefined
                      }}
                      whileHover={{ scale: 1.3, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />

                    {/* 可交互区域 - 加大点击区域 */}
                    <div
                      ref={progressRef}
                      className="absolute -top-3 -bottom-3 left-0 w-full cursor-pointer"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsDragging(true);
                        handleProgressDrag(e);
                      }}
                      onMouseMove={(e) => {
                        if (isDragging) {
                          handleProgressDrag(e);
                        }
                      }}
                      onMouseUp={() => {
                        setIsDragging(false);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setIsDragging(true);
                        handleProgressDrag(e);
                      }}
                      onTouchMove={(e) => {
                        if (isDragging) {
                          handleProgressDrag(e);
                        }
                      }}
                      onTouchEnd={() => {
                        setIsDragging(false);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        let clientX: number;

                        const isTouchEvent = 'touches' in e;

                        if (isTouchEvent) {
                          const touchEvent = e as unknown as React.TouchEvent;
                          if (touchEvent.touches.length > 0) {
                            clientX = touchEvent.touches[0].clientX;
                          } else {
                            clientX = 0;
                          }
                        } else {
                          const mouseEvent = e as React.MouseEvent;
                          clientX = mouseEvent.clientX;
                        }

                        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

                        if (videoRef.current) {
                          videoRef.current.currentTime = percentage * videoRef.current.duration;
                          setCurrentTime(percentage * videoRef.current.duration);
                        }
                      }}
                      role="slider"
                      aria-label="视频进度"
                      aria-valuemin={0}
                      aria-valuemax={duration}
                      aria-valuenow={currentTime}
                      aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
                    />
                  </div>
                </div>

                {/* 控制按钮区域 - 优化布局 */}
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  {/* 左侧：主要播放控制 */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    {/* 播放/暂停按钮 - 主控制 */}
                    <motion.button
                      ref={playButtonRef}
                      className="flex-shrink-0 relative w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white flex items-center justify-center shadow-2xl shadow-orange-500/40 border-2 border-orange-400/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      aria-label={isPlaying ? '暂停' : '播放'}
                      aria-pressed={isPlaying}
                    >
                      {/* 发光效果 */}
                      <div className="absolute inset-0 rounded-full bg-orange-400 blur-xl opacity-60" />

                      {isPlaying ? (
                        <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 relative z-10" strokeWidth={2.5} />
                      ) : (
                        <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 ml-0.5 relative z-10" strokeWidth={2.5} />
                      )}
                    </motion.button>

                    {/* 后退/前进按钮组 */}
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                      <motion.button
                        className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRewind5();
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        aria-label="后退5秒"
                        title="后退5秒"
                      >
                        <SkipBackIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                      </motion.button>

                      <motion.button
                        className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleForward5();
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        aria-label="前进5秒"
                        title="前进5秒"
                      >
                        <SkipForwardIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                      </motion.button>
                    </div>


                  </div>

                  {/* 右侧：次要控制 - 确保完整显示 */}
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    {/* 播放速度 */}
                    <div className="relative">
                      <motion.button
                        className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 px-1.5 sm:px-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors text-[10px] sm:text-xs lg:text-sm font-bold border border-white/5"
                        onClick={(e) => {
                        e.stopPropagation();
                        setShowPlaybackMenu(prev => !prev);
                        setShowMoreMenu(false);
                      }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        aria-label="播放速度"
                        aria-expanded={showPlaybackMenu}
                        title="播放速度"
                      >
                        {playbackRate}×
                      </motion.button>

                      <AnimatePresence>
                        {showPlaybackMenu && (
                          <motion.div
                            className="absolute bottom-full right-0 mb-3 bg-black/95 backdrop-blur-xl rounded-xl p-0.5 min-w-[75px] shadow-xl border border-white/10 z-50"
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ duration: 0.2 }}
                            role="menu"
                            aria-label="播放速度选项"
                          >
                            <div className="space-y-0">
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                <motion.button
                                  key={rate}
                                  className={`block w-full text-center px-1.5 py-0.75 text-white rounded-md text-[10px] font-medium transition-all ${playbackRate === rate ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'hover:bg-white/10'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaybackRateChange(rate);
                                  }}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  role="menuitem"
                                  aria-label={`${rate}倍速度`}
                                >
                                  {rate}×
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 重新开始 - 桌面端显示 */}
                    <motion.button
                      className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white items-center justify-center transition-colors border border-white/5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestart();
                      }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      aria-label="重新开始"
                      title="重新开始"
                    >
                      <RotateCcwIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                    </motion.button>

                    {/* 画中画 - 桌面端显示 */}
                    {capabilities.supportsPictureInPicture && (
                      <motion.button
                        className={`hidden md:flex w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full backdrop-blur-md text-white items-center justify-center transition-all border ${isPictureInPicture ? 'bg-orange-500 hover:bg-orange-600 border-orange-400' : 'bg-white/10 hover:bg-white/20 border-white/5'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePictureInPicture();
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        aria-label={isPictureInPicture ? '退出画中画' : '画中画模式'}
                        title={isPictureInPicture ? '退出画中画' : '画中画模式'}
                      >
                        <PictureInPictureIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                      </motion.button>
                    )}

                    {/* 全屏 */}
                    <motion.button
                      className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-white/5"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFullscreen();
                      }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      aria-label={isFullscreen ? '退出全屏' : '全屏模式'}
                      title={isFullscreen ? '退出全屏' : '全屏模式'}
                    >
                      {isFullscreen ? (
                        <Minimize2Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                      ) : (
                        <Maximize2Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                      )}
                    </motion.button>

                    {/* 更多选项 */}
                    <div className="relative">
                      <motion.button
                        className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-white/5"
                        onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(prev => !prev);
                        setShowPlaybackMenu(false);
                      }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        aria-label="更多选项"
                        title="更多选项"
                      >
                        <Settings2Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                      </motion.button>

                      <AnimatePresence>
                        {showMoreMenu && (
                          <motion.div
                            className="absolute bottom-full right-0 mb-3 bg-black/95 backdrop-blur-xl rounded-2xl p-3 sm:p-4 w-56 sm:w-64 shadow-2xl border border-white/10 z-50"
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ duration: 0.2 }}
                            role="menu"
                            aria-label="更多选项"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="text-white text-xs sm:text-sm font-bold">快捷键</span>
                                <button
                                  className="text-white/60 hover:text-white text-xs transition-colors px-2 py-0.5 hover:bg-white/10 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMoreMenu(false);
                                  }}
                                  aria-label="关闭菜单"
                                >
                                  关闭
                                </button>
                              </div>

                              <div className="space-y-2 text-[10px] sm:text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/10 rounded text-white/80 font-mono text-[9px] sm:text-[10px]">Space</kbd>
                                    <span className="text-white/70">播放</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/10 rounded text-white/80 font-mono text-[9px] sm:text-[10px]">M</kbd>
                                    <span className="text-white/70">静音</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/10 rounded text-white/80 font-mono text-[9px] sm:text-[10px]">F</kbd>
                                    <span className="text-white/70">全屏</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/10 rounded text-white/80 font-mono text-[9px] sm:text-[10px]">R</kbd>
                                    <span className="text-white/70">重播</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/10 rounded text-white/80 font-mono text-[9px] sm:text-[10px]">←→</kbd>
                                    <span className="text-white/70">5秒</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/10 rounded text-white/80 font-mono text-[9px] sm:text-[10px]">↑↓</kbd>
                                    <span className="text-white/70">音量</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* 左上角控制区域 - 音量控制 */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 flex flex-col gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* 音量控制按钮 */}
            {capabilities.supportsVolumeControl && (
              <motion.button
                className="group relative w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label={isMuted ? '取消静音' : '静音'}
                title={isMuted ? '取消静音' : '静音'}
              >
                <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {isMuted || volume === 0 ? (
                  <VolumeXIcon className="w-5 h-5 relative z-10" strokeWidth={2.5} />
                ) : (
                  <Volume2Icon className="w-5 h-5 relative z-10" strokeWidth={2.5} />
                )}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 右上角控制区域 - iOS优化 */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex flex-col gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {capabilities.isIOS && (
              <motion.button
                className="relative w-auto px-4 py-2 sm:w-11 sm:h-11 sm:px-0 rounded-2xl bg-orange-500/90 hover:bg-orange-600/90 text-white flex items-center justify-center gap-2 transition-all duration-300 backdrop-blur-sm shadow-lg border border-orange-400/30"
                onClick={(e) => {
                  e.stopPropagation();
                  setUseNativeControls(prev => !prev);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={useNativeControls ? '使用自定义控件' : '使用系统播放器'}
                title={useNativeControls ? '切换到自定义控件' : '切换到系统播放器'}
              >
                <div className="absolute inset-0 bg-orange-400/30 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" strokeWidth={2.5} />
                <span className="sm:hidden text-xs font-bold relative z-10">
                  {useNativeControls ? '自定义' : 'iOS播放器'}
                </span>
              </motion.button>
            )}
            <button
              className="group relative w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setUseNativeControls(prev => !prev);
              }}
              aria-label={useNativeControls ? '使用自定义控件' : '使用原生控件'}
              title={useNativeControls ? '切换到自定义控件' : '切换到原生控件'}
            >
              <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <SettingsIcon className="w-5 h-5 relative z-10" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
'use client';

import React, { useRef, useState, useCallback } from 'react';

interface ProfileVideoPlayerProps {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  className?: string;
}

export default function ProfileVideoPlayer({ 
  videoUrl, 
  posterUrl,
  className = '' 
}: ProfileVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleError = useCallback(() => {
    setError('视频加载失败');
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        setError('播放失败');
      });
    }
  }, [isPlaying]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!videoRef.current) return;

    switch (e.key) {
      case ' ': 
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
    }
  }, [togglePlay]);

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      style={{ aspectRatio: '16/9' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 z-10 text-white text-center p-4">
          <div>
            <p className="text-sm font-medium">视频加载失败</p>
            <p className="text-xs mt-1 text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* 视频元素 - 优化iOS兼容性 */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={posterUrl}
        preload="metadata"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        controls
        controlsList="nodownload"
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        aria-label="视频内容"
        crossOrigin="anonymous"
        style={{
          WebkitTapHighlightColor: 'transparent',
          backgroundColor: 'black'
        }}
      >
        {/* 支持多种视频格式，确保浏览器能播放 */}
        {videoUrl && (
          <>
            {/* 直接使用原视频URL，不修改扩展名 */}
            <source src={videoUrl} type="video/mp4" />
            <source src={videoUrl} type="video/quicktime" />
            <source src={videoUrl} type="video/mov" />
          </>
        )}
        您的浏览器不支持视频播放。
      </video>


    </div>
  );
}
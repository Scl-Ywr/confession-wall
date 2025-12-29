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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    setError('视频加载失败');
    setIsLoading(false);
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
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 z-10 text-white text-center p-4">
          <div>
            <p className="text-sm font-medium">视频加载失败</p>
            <p className="text-xs mt-1 text-red-200">{error}</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={posterUrl}
        preload="metadata"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        controls
        onLoadedData={handleLoadedData}
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        aria-label="视频内容"
        style={{
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        <source src={videoUrl.replace(/\.(mp4|mov|avi)$/i, '.webm')} type="video/webm" />
        您的浏览器不支持视频播放。
      </video>

      {/* 移动端点击播放优化 */}
      <div 
        className="absolute inset-0 sm:hidden"
        onClick={togglePlay}
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
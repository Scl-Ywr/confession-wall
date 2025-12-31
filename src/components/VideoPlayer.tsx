'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BeatLoader } from 'react-spinners';
import { useVideoPlayerContext } from '../context/VideoPlayerContext';
import CrossBrowserVideoPlayer from './CrossBrowserVideoPlayer';
import ResponsiveVideoContainer from './ResponsiveVideoContainer';

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
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('16/9'); // 视频宽高比，默认为16/9
  const playerRef = useRef<HTMLVideoElement | null>(null);

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

  return (
    <ResponsiveVideoContainer
        aspectRatio={aspectRatio}
        className={className}
        maxWidth="800px"
      >
      {/* 视频切换过渡遮罩 */}
      <motion.div 
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        style={{ 
          background: 'linear-gradient(135deg, rgba(253, 186, 116, 0.3), rgba(249, 115, 22, 0.3), rgba(245, 158, 11, 0.3))',
          backdropFilter: 'blur(10px)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <BeatLoader color="#f97316" size={15} />
      </motion.div>

      {/* CrossBrowserVideoPlayer */}
      <CrossBrowserVideoPlayer
        id={id}
        videoUrl={videoUrl}
        posterUrl={posterUrl}
        className="w-full h-full"
        muted={isMuted}
        onPlay={() => {
          setIsPaused(false);
        }}
        onPause={() => {
          setIsPaused(true);
        }}
        onLoadedMetadata={(event: React.SyntheticEvent<HTMLVideoElement>) => {
          if (event.target) {
            const videoElement = event.target as HTMLVideoElement;
            // 获取视频实际宽高比
            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;
            if (width && height) {
              setAspectRatio(`${width}/${height}`);
            }
          }
        }}
        onTimeUpdate={() => {
          // CrossBrowserVideoPlayer 处理时间更新
        }}
        onSeeked={() => {
          // CrossBrowserVideoPlayer 处理跳转
        }}
        onVolumeChange={(event: React.SyntheticEvent<HTMLVideoElement>) => {
          if (event.target) {
            const videoElement = event.target as HTMLVideoElement;
            setIsMuted(videoElement.muted);
          }
        }}
      />
    </ResponsiveVideoContainer>
  );
}
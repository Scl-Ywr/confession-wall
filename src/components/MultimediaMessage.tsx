'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, X } from 'lucide-react';
import { ChatMessage } from '@/types/chat';

interface MultimediaMessageProps {
  message: ChatMessage;
}

const MultimediaMessage: React.FC<MultimediaMessageProps> = ({ message }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = React.useRef<HTMLVideoElement>(null);

  const handleVideoPlayPause = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const handleFullscreenVideoEnded = () => {
    if (fullscreenVideoRef.current) {
      fullscreenVideoRef.current.pause();
      fullscreenVideoRef.current.currentTime = 0;
    }
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <>
            {/* 缩略图 */}
            <div 
              className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer transition-all duration-300 hover:shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setIsEnlarged(true);
              }}
            >
              <Image
                src={message.content}
                alt="聊天图片"
                width={600}
                height={400}
                className="max-w-full max-h-80 object-contain transition-transform duration-300 hover:scale-[1.02]"
                priority={false}
              />
            </div>
            
            {/* 放大显示的图片 */}
            {isEnlarged && (
              <div 
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                onClick={() => setIsEnlarged(false)}
              >
                {/* 关闭按钮 */}
                <button
                  className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEnlarged(false);
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
                
                {/* 图片容器 */}
                <div className="relative max-w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                  <Image
                    src={message.content}
                    alt="放大的聊天图片"
                    width={1200}
                    height={800}
                    className="object-contain max-w-full max-h-[90vh]"
                    priority={false}
                  />
                </div>
              </div>
            )}
          </>
        );
      
      case 'video':
        return (
          <>
            {/* 视频缩略图/播放控件 */}
            <div 
              className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group transition-all duration-300 hover:shadow-lg"
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
              onClick={handleVideoPlayPause}
            >
              <video
                ref={videoRef}
                src={message.content}
                className="max-w-full max-h-80 object-contain"
                onEnded={handleVideoEnded}
                onClick={(e) => e.stopPropagation()}
                controls={showControls}
              />
              
              {!isPlaying && !showControls && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity group-hover:opacity-100">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-black ml-1" />
                  </div>
                </div>
              )}
              
              {/* 放大按钮 */}
              <button
                className="absolute bottom-2 right-2 bg-black/50 rounded-full p-2 text-white hover:bg-black/80 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEnlarged(true);
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </button>
            </div>
            
            {/* 放大显示的视频 */}
            {isEnlarged && (
              <div 
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                onClick={() => setIsEnlarged(false)}
              >
                {/* 关闭按钮 */}
                <button
                  className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEnlarged(false);
                    if (fullscreenVideoRef.current) {
                      fullscreenVideoRef.current.pause();
                      fullscreenVideoRef.current.currentTime = 0;
                    }
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
                
                {/* 视频容器 */}
                <div className="relative max-w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                  <video
                    ref={fullscreenVideoRef}
                    src={message.content}
                    className="object-contain max-w-full max-h-[90vh]"
                    controls={true}
                    autoPlay
                    onEnded={handleFullscreenVideoEnded}
                  />
                </div>
              </div>
            )}
          </>
        );
      
      case 'file':
        return (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {message.content.split('/').pop()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(message.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }).replace(/(\d+)年(\d+)月(\d+)日/, '$1年$2月$3日')}
                </p>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return renderMessageContent();
};

export default MultimediaMessage;
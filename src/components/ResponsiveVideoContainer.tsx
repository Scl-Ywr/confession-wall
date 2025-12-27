'use client';

import React, { useState, useEffect, useRef } from 'react';
import { detectBrowserCapabilities } from '@/utils/videoFormatUtils';

interface ResponsiveVideoContainerProps {
  children: React.ReactNode;
  className?: string;
  aspectRatio?: string;
  maxWidth?: string;
  fluid?: boolean;
  breakpoints?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

const ResponsiveVideoContainer = React.forwardRef<HTMLDivElement, Omit<ResponsiveVideoContainerProps, 'ref'>>(({ 
  children, 
  className = '', 
  aspectRatio = '16/9',
  maxWidth = '100%',
  fluid = true,
  breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  }
}, ref) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [capabilities, setCapabilities] = useState(detectBrowserCapabilities());

  // 检测屏幕尺寸和方向
  useEffect(() => {
    const updateSize = () => {
      if (internalRef.current) {
        const { clientWidth, clientHeight } = internalRef.current;
        
        // 只有当尺寸实际变化时才更新状态，避免无限循环
        if (clientWidth !== containerSize.width || clientHeight !== containerSize.height) {
          setContainerSize({ width: clientWidth, height: clientHeight });
          
          // 检测方向
          setOrientation(clientWidth > clientHeight ? 'landscape' : 'portrait');
          
          // 检测设备类型
          if (clientWidth < breakpoints.mobile) {
            setDeviceType('mobile');
          } else if (clientWidth < breakpoints.tablet) {
            setDeviceType('tablet');
          } else {
            setDeviceType('desktop');
          }
        }
      }
    };

    // 使用setTimeout避免在组件挂载时立即触发更新，减少初始渲染时的循环
    const timeoutId = setTimeout(updateSize, 0);
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, [breakpoints, containerSize.width, containerSize.height]);

  // 检测浏览器能力
  useEffect(() => {
    // 使用 setTimeout 避免同步调用 setState
    const timeoutId = setTimeout(() => {
      setCapabilities(detectBrowserCapabilities());
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // 计算容器样式
  const getContainerStyle = () => {
    const [aspectWidth, aspectHeight] = aspectRatio.split('/').map(Number);
    const aspectRatioValue = aspectWidth / aspectHeight;
    
    let width = containerSize.width;
    let height = containerSize.width / aspectRatioValue;
    
    // 如果是竖屏视频且容器是横屏，调整显示但保持完整
    if (aspectRatioValue < 1 && orientation === 'landscape') {
      // 不再限制高度，让视频完整显示
      height = containerSize.width / aspectRatioValue;
      width = height * aspectRatioValue;
    }
    
    // 如果是横屏视频且容器是竖屏，限制宽度
    if (aspectRatioValue >= 1 && orientation === 'portrait') {
      width = Math.min(width, containerSize.width * 0.9); // 限制为容器宽度的90%
      height = width / aspectRatioValue;
    }
    
    // 应用最大宽度限制
    if (maxWidth !== '100%') {
      const maxWidthPixels = parseInt(maxWidth.replace('px', ''));
      if (width > maxWidthPixels) {
        width = maxWidthPixels;
        height = width / aspectRatioValue;
      }
    }
    
    // 移动设备特殊处理
    if (deviceType === 'mobile') {
      // 竖屏视频在移动设备上不再严格限制高度
      if (aspectRatioValue < 1) {
        // 不再限制高度，让视频完整显示
        height = containerSize.width / aspectRatioValue;
        width = height * aspectRatioValue;
      }
    }
    
    return {
      width: fluid ? '100%' : `${width}px`,
      height: fluid ? 'auto' : `${height}px`,
      maxWidth: fluid ? maxWidth : `${width}px`,
      position: 'relative' as const,
      overflow: 'hidden' as const,
      borderRadius: '1.5rem' as const, // 使用与CrossBrowserVideoPlayer一致的圆角
      backgroundColor: '#000' as const,
    };
  };

  // 获取设备特定的类名
  const getDeviceClasses = () => {
    const classes = [];
    
    if (deviceType === 'mobile') {
      classes.push('video-container-mobile');
    } else if (deviceType === 'tablet') {
      classes.push('video-container-tablet');
    } else {
      classes.push('video-container-desktop');
    }
    
    if (orientation === 'portrait') {
      classes.push('video-container-portrait');
    } else {
      classes.push('video-container-landscape');
    }
    
    if (capabilities.isMobile) {
      classes.push('video-container-touch');
    }
    
    return classes.join(' ');
  };

  return (
    <div className={`responsive-video-container ${getDeviceClasses()} ${className}`}>
      <div 
        ref={(el) => {
          // 设置内部ref
          internalRef.current = el;
          // 同时调用外部ref
          if (typeof ref === 'function') {
            ref(el);
          } else if (ref != null) {
            ref.current = el;
          }
        }}
        className="video-wrapper"
        style={getContainerStyle()}
      >
        {children}
        
        {/* 设备特定提示 */}
        {deviceType === 'mobile' && !capabilities.canPlayWebM && (
          <div className="absolute top-4 left-4 bg-yellow-500/80 text-white text-xs px-2 py-1 rounded">
            您的浏览器可能不支持最新视频格式
          </div>
        )}
      </div>
      
      {/* 响应式样式 */}
      <style jsx>{`
        .responsive-video-container {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .video-wrapper {
          position: relative;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }
        
        .video-container-mobile {
          max-width: 100%;
        }
        
        .video-container-mobile .video-wrapper {
          border-radius: 0.5rem;
        }
        
        .video-container-mobile.video-container-portrait .video-wrapper {
          /* 不再限制最大高度，让视频完整显示 */
          margin: 0 auto;
        }
        
        .video-container-tablet .video-wrapper {
          border-radius: 0.75rem;
        }
        
        .video-container-desktop .video-wrapper {
          border-radius: 1rem;
        }
        
        .video-container-touch video {
          cursor: pointer;
        }
        
        /* 横竖屏适配 */
        @media (orientation: landscape) {
          .video-container-portrait .video-wrapper {
            max-width: 80%;
          }
        }
        
        @media (orientation: portrait) {
          .video-container-landscape .video-wrapper {
            /* 不再限制最大高度，让视频完整显示 */
          }
        }
        
        /* 响应式断点 */
        @media (max-width: 768px) {
          .video-container-mobile .video-wrapper {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .video-container-tablet .video-wrapper {
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
          }
        }
        
        @media (min-width: 1025px) {
          .video-container-desktop .video-wrapper {
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          }
        }
      `}</style>
    </div>
  );
});

// 添加displayName
ResponsiveVideoContainer.displayName = 'ResponsiveVideoContainer';

export default ResponsiveVideoContainer;
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIconSolid } from './icons/HeartIconSolid';
import { HeartIconOutline } from './icons/HeartIconOutline';
import { confessionService } from '@/services/confessionService';
import { useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/utils/toast';

// 点赞按钮主题类型
export type LikeButtonTheme = 'default' | 'dark' | 'light' | 'minimal';

// 点赞按钮尺寸类型
export type LikeButtonSize = 'small' | 'medium' | 'large';

interface LikeButtonProps {
  // 表白ID
  confessionId: string;
  // 初始点赞数量
  initialLikesCount: number;
  // 初始点赞状态
  initialLiked: boolean;
  // 主题配置
  theme?: LikeButtonTheme;
  // 尺寸配置
  size?: LikeButtonSize;
  // 是否显示点赞数量
  showCount?: boolean;
  // 点赞成功回调
  onLikeStatusChange?: (liked: boolean, likesCount: number) => void;
  // 点赞开始回调
  onLikeStart?: () => void;
  // 点赞成功回调
  onLikeSuccess?: (liked: boolean, likesCount: number) => void;
  // 点赞失败回调
  onLikeError?: (error: Error) => void;
  // 自定义样式类
  className?: string;
  // 自定义图标大小
  iconSize?: number;
  // 自定义颜色
  color?: string;
}

/**
 * 现代化点赞按钮组件
 * 支持点赞/取消点赞、实时显示点赞数量、点赞状态切换动画效果
 * 实现了本地缓存、微动画反馈、数字变化过渡效果
 */
const LikeButton: React.FC<LikeButtonProps> = ({
  confessionId,
  initialLikesCount,
  initialLiked,
  theme = 'default',
  size = 'medium',
  showCount = true,
  onLikeStatusChange,
  onLikeStart,
  onLikeSuccess,
  onLikeError,
  className = '',
  iconSize = 20,
  color = '#ef4444',
}) => {
  // 本地状态管理
  // 确保liked和likesCount初始状态一致
  // 如果initialLiked为true但initialLikesCount为0，修正为未点赞状态
  const normalizedLiked = initialLiked && initialLikesCount > 0;
  const normalizedLikesCount = Math.max(0, initialLikesCount);

  // 优先使用props传入的值，但确保状态一致
  const [liked, setLiked] = useState<boolean>(normalizedLiked);
  const [likesCount, setLikesCount] = useState<number>(normalizedLikesCount);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const queryClient = useQueryClient();
  
  // 缓存管理：使用localStorage缓存点赞状态，带过期时间
  const CACHE_KEY = `like_status_${confessionId}`;
  const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时过期
  
  // 缓存数据结构：{ liked: boolean, timestamp: number }
  interface LikeCache {
    liked: boolean;
    timestamp: number;
  }
  
  // 从localStorage加载点赞状态 - 仅作为验证，不直接覆盖initialLiked
  useEffect(() => {
    const loadCache = () => {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { liked: cachedLiked, timestamp } = JSON.parse(cachedData) as LikeCache;
          // 检查缓存是否过期
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            // 仅在与initialLiked一致时才使用缓存，否则更新缓存
            if (cachedLiked !== initialLiked) {
              // 缓存与服务器数据不一致，更新缓存
              const cacheData: LikeCache = {
                liked: initialLiked,
                timestamp: Date.now()
              };
              localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            }
          } else {
            // 缓存过期，清除缓存
            localStorage.removeItem(CACHE_KEY);
            // 使用初始值更新缓存
            const cacheData: LikeCache = {
              liked: initialLiked,
              timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          }
        } else {
          // 没有缓存，创建新缓存
          const cacheData: LikeCache = {
            liked: initialLiked,
            timestamp: Date.now()
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        }
      } catch (error) {
        console.error('Failed to load like status from cache:', error);
      }
    };
    
    loadCache();
  }, [CACHE_KEY, CACHE_EXPIRY, initialLiked]);
  
  // 保存点赞状态到localStorage
  useEffect(() => {
    const saveCache = () => {
      try {
        const cacheData: LikeCache = {
          liked,
          timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch (error) {
        console.error('Failed to save like status to cache:', error);
      }
    };
    
    saveCache();
  }, [liked, CACHE_KEY]);
  
  // 处理点赞/取消点赞
  const handleLike = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setIsAnimating(true);
    setError(null); // 清除之前的错误
    
    const prevLiked = liked;
    const prevLikesCount = likesCount;
    const newLiked = !prevLiked;
    // 确保newLikesCount永远不小于0
    const newLikesCount = Math.max(0, prevLikesCount + (prevLiked ? -1 : 1));
    
    // 调用点赞开始回调
    onLikeStart?.();
    
    try {
      // 乐观更新UI
      setLiked(newLiked);
      setLikesCount(newLikesCount);
      
      // 调用API
      const result = await confessionService.toggleLike(confessionId);
      
      if (result.success) {
        // 使用invalidateQueries让React Query自动重新获取最新数据，确保数据一致性
        await queryClient.invalidateQueries({ queryKey: ['confessions'] });
        await queryClient.invalidateQueries({ queryKey: ['search'] });
        
        // 回调通知父组件
        onLikeStatusChange?.(newLiked, newLikesCount);
        
        // 调用点赞成功回调
        onLikeSuccess?.(newLiked, newLikesCount);
      } else {
        // 发生错误时回滚UI状态
        setLiked(prevLiked);
        setLikesCount(prevLikesCount);
        
        // 显示友好的错误消息
        if (result.error?.includes('not authenticated')) {
          showToast.warning('请先登录后再进行点赞操作');
        } else {
          showToast.error(result.error || '点赞操作失败，请稍后重试');
        }
        
        // 设置错误状态
        const likeError = new Error(result.error || 'Failed to toggle like');
        console.error('Failed to toggle like:', result.error);
        
        // 回调通知父组件
        onLikeStatusChange?.(prevLiked, prevLikesCount);
        
        // 调用点赞失败回调
        onLikeError?.(likeError);
        
        return; // 终止后续执行
      }
    } catch (error) {
      // 处理意外的错误情况
      setLiked(prevLiked);
      setLikesCount(prevLikesCount);
      
      // 设置错误状态
      const likeError = error instanceof Error ? error : new Error('Failed to toggle like');
      console.error('Failed to toggle like:', error);
      
      // 显示友好的错误消息
      showToast.error('点赞操作失败，请稍后重试');
      
      // 回调通知父组件
      onLikeStatusChange?.(prevLiked, prevLikesCount);
      
      // 调用点赞失败回调
      onLikeError?.(likeError);
    } finally {
      setIsLoading(false);
      // 动画结束后重置动画状态
      setTimeout(() => setIsAnimating(false), 500);
    }
  }, [liked, likesCount, confessionId, isLoading, onLikeStatusChange, onLikeStart, onLikeSuccess, onLikeError, queryClient]);
  
  // 根据尺寸计算样式
  const sizeStyles = {
    small: { padding: '0.25rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' },
    medium: { padding: '0.5rem 1rem', fontSize: '0.875rem', gap: '0.5rem' },
    large: { padding: '0.75rem 1.5rem', fontSize: '1rem', gap: '0.75rem' }
  };
  
  // 图标大小计算
  const computedIconSize = { width: iconSize, height: iconSize };
  
  // 主题颜色映射
  const getThemeColors = () => {
    switch (theme) {
      case 'dark':
        return {
          likeBg: liked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.2)',
          likeBorder: liked ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(156, 163, 175, 0.4)',
          likeColor: liked ? color : '#9ca3af',
          countColor: liked ? color : '#9ca3af',
          backgroundColor: '#1f2937'
        };
      case 'light':
        return {
          likeBg: liked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)',
          likeBorder: liked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)',
          likeColor: liked ? color : '#9ca3af',
          countColor: liked ? color : '#9ca3af',
          backgroundColor: '#ffffff'
        };
      case 'minimal':
        return {
          likeBg: 'transparent',
          likeBorder: 'none',
          likeColor: liked ? color : '#9ca3af',
          countColor: liked ? color : '#6b7280',
          backgroundColor: 'transparent'
        };
      default:
        return {
          likeBg: liked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)',
          likeBorder: liked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)',
          likeColor: liked ? color : '#9ca3af',
          countColor: liked ? color : '#6b7280',
          backgroundColor: 'transparent'
        };
    }
  };
  
  const themeColors = getThemeColors();
  
  return (
    <div className="flex flex-col items-center">
      {/* 点赞按钮 */}
      <button
        onClick={handleLike}
        disabled={isLoading}
        className={`relative flex items-center transition-all duration-300 group rounded-full ${className}`}
        aria-label={liked ? '取消点赞' : '点赞'}
        title={liked ? '取消点赞' : '点赞'}
        style={{
          ...sizeStyles[size],
          backgroundColor: themeColors.likeBg,
          border: themeColors.likeBorder,
          opacity: isLoading ? 0.7 : 1,
          cursor: isLoading ? 'wait' : 'pointer',
          boxShadow: error ? `0 0 0 1px ${color}40` : 'none',
        }}
      >
        {/* 点赞状态切换动画 */}
        <div className="relative">
          {/* 心形图标 */}
          <motion.div
            animate={
              isAnimating
                ? {
                    scale: [1, 1.3, 0.9, 1.2, 1],
                    rotate: [0, -5, 5, -5, 0],
                    transition: {
                      duration: 0.6,
                      ease: "easeInOut"
                    }
                  }
                : { scale: 1, rotate: 0 }
            }
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative"
          >
            {liked ? (
              <HeartIconSolid style={{ ...computedIconSize, color }} />
            ) : (
              <HeartIconOutline style={{ ...computedIconSize, color: '#9ca3af' }} />
            )}
          </motion.div>
          
          {/* 点赞动画效果 */}
          <AnimatePresence>
            {isAnimating && liked && (
              <motion.div
                className="absolute inset-0 z-10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1], 
                  opacity: [0, 1, 0],
                  transition: { duration: 0.6 }
                }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <HeartIconSolid style={{ ...computedIconSize, color }} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 加载状态指示器 */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-${iconSize/5} h-${iconSize/5} border-2 border-t-transparent rounded-full animate-spin`} style={{ borderColor: color }}></div>
            </div>
          )}
          
          {/* 错误状态指示器 */}
          {error && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full animate-shake">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              操作失败，请稍后重试
            </div>
          )}
        </div>
        
        {/* 点赞数量动画 */}
        {showCount && (
          <motion.span
            className="font-semibold"
            style={{
              fontSize: size === 'small' ? '0.75rem' : size === 'medium' ? '0.875rem' : '1rem',
              color: liked ? color : '#6b7280',
              fontWeight: liked ? 600 : 500
            }}
            animate={
              isAnimating
                ? {
                    scale: [1, 1.3, 1],
                    opacity: [1, 1.5, 1],
                    transition: { duration: 0.4 }
                  }
                : { scale: 1, opacity: 1 }
            }
            key={likesCount}
          >
            {likesCount.toLocaleString()}
          </motion.span>
        )}
      </button>
      
      {/* 全局错误提示 */}
      {error && (
        <motion.div
          className="mt-1 text-xs text-red-500"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
        >
          点赞操作失败，请稍后重试
        </motion.div>
      )}
    </div>
  );
};

export default LikeButton;

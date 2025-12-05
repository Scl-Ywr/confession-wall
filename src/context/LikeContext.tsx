'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { confessionService } from '@/services/confessionService';

interface LikeContextType {
  likeLoading: Record<string, boolean>;
  toggleLike: (confessionId: string) => Promise<void>;
  showLoginPrompt: boolean;
  setShowLoginPrompt: React.Dispatch<React.SetStateAction<boolean>>;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

interface LikeProviderProps {
  children: ReactNode;
}

export const LikeProvider: React.FC<LikeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // 当用户登录状态变化时，重置登录提示状态
  useEffect(() => {
    if (user) {
      // 用户已登录，隐藏登录提示
      setShowLoginPrompt(false);
    }
  }, [user]);

  // 切换点赞状态
  const toggleLike = useCallback(async (confessionId: string) => {
    if (!user) {
      // 用户未登录，显示登录提示
      setShowLoginPrompt(true);
      return;
    }

    // 使用函数式更新来检查和设置loading状态，避免闭包问题
    let isAlreadyLoading = false;
    setLikeLoading(prev => {
      if (prev[confessionId]) {
        isAlreadyLoading = true;
        return prev;
      }
      return { ...prev, [confessionId]: true };
    });

    if (isAlreadyLoading) return;

    try {
      // 直接执行点赞/取消点赞操作，不依赖本地likedConfessions状态
      await confessionService.toggleLike(confessionId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      throw error;
    } finally {
      // 确保在操作完成后清除loading状态
      setLikeLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[confessionId];
        return newLoading;
      });
    }
  }, [user]);

  const value: LikeContextType = {
    likeLoading,
    toggleLike,
    showLoginPrompt,
    setShowLoginPrompt
  };

  return <LikeContext.Provider value={value}>{children}</LikeContext.Provider>;
};

// 自定义Hook，方便组件使用LikeContext
export const useLike = (): LikeContextType => {
  const context = useContext(LikeContext);
  if (context === undefined) {
    throw new Error('useLike must be used within a LikeProvider');
  }
  return context;
};

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { confessionService } from '@/services/confessionService';
import { supabase } from '@/lib/supabase/client';

interface LikeContextType {
  likeLoading: Record<string, boolean>;
  toggleLike: (confessionId: string) => Promise<void>;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

interface LikeProviderProps {
  children: ReactNode;
}

export const LikeProvider: React.FC<LikeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});

  // 切换点赞状态
  const toggleLike = useCallback(async (confessionId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
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
    toggleLike
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

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { confessionService } from '@/services/confessionService';
import { supabase } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // 当用户登录状态变化时，重置登录提示状态
  useEffect(() => {
    if (user) {
      // 用户已登录，隐藏登录提示
      setShowLoginPrompt(false);
    }
  }, [user]);

  // 实时监听点赞变化 - 只用于更新搜索结果，不更新confessions缓存
  // 这样可以避免与invalidateQueries冲突
  useEffect(() => {
    // 只有在用户登录后才开始监听
    if (!user) return;

    // 创建Realtime通道
    const channel = supabase.channel('likes-changes');

    // 监听likes表的INSERT和DELETE事件
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
      // 只更新搜索结果缓存，不直接更新confessions缓存
      // 这样可以避免与invalidateQueries冲突
      queryClient.invalidateQueries({ queryKey: ['search'] });
    });

    // 订阅通道
    channel.subscribe();

    // 组件卸载时取消订阅
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // 切换点赞状态
  const toggleLike = useCallback(async (confessionId: string) => {
    if (!user) {
      // 用户未登录，显示登录提示
      setShowLoginPrompt(true);
      return;
    }

    // 立即设置loading状态，防止重复点击
    setLikeLoading(prev => ({ ...prev, [confessionId]: true }));

    try {
      // 直接执行点赞/取消点赞操作，不依赖本地likedConfessions状态
      await confessionService.toggleLike(confessionId);
      
      // 使用refetchQueries确保数据一致性，等待重新获取完成
      // 这样可以确保UI更新时使用的是最新数据
      await queryClient.refetchQueries({ queryKey: ['confessions'] });
      
      // 同时更新search缓存
      await queryClient.refetchQueries({ queryKey: ['search'] });
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
  }, [user, queryClient]);

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

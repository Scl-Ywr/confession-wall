'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

type ChatContextType = {
  totalUnreadCount: number;
  refreshUnreadCounts: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // 计算总未读消息数量
  const calculateTotalUnreadCount = useCallback(async () => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    try {
      // 1. 计算私聊未读消息数量
      const { count: privateUnreadCount, error: privateError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (privateError) {
        console.error('Error fetching private unread count:', privateError);
        return;
      }

      // 2. 计算群聊未读消息数量
      const { count: groupUnreadCount, error: groupError } = await supabase
        .from('group_message_read_status')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (groupError) {
        console.error('Error fetching group unread count:', groupError);
        return;
      }

      // 计算总未读消息数量
      const total = (privateUnreadCount || 0) + (groupUnreadCount || 0);
      setTotalUnreadCount(total);
    } catch (error) {
      console.error('Error calculating total unread count:', error);
    }
  }, [user]);

  // 监听未读消息变化
  useEffect(() => {
    if (!user) return;

    console.log(`[ChatContext] Setting up real-time channels for user ${user.id}`);

    // 监听私聊消息变化 - 只监听INSERT和UPDATE事件，因为只有这两个事件会影响未读计数
    const privateMessagesChannel = supabase
      .channel(`private-messages-total-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id.eq.${user.id}`
        },
        (payload) => {
          console.log(`[ChatContext] Private message change detected for user ${user.id}`, payload.new);
          calculateTotalUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log(`[ChatContext] Private messages channel status: ${status}`);
      });

    // 监听群聊消息状态变化
    const groupMessagesChannel = supabase
      .channel(`group-messages-total-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_message_read_status',
          filter: `user_id.eq.${user.id}`
        },
        (payload) => {
          console.log(`[ChatContext] Group message read status change detected`, payload.new);
          calculateTotalUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log(`[ChatContext] Group messages channel status: ${status}`);
      });

    // 优化：合并群聊消息创建监听，使用更精确的过滤条件
    const groupMessageCreateChannel = supabase
      .channel(`group-message-create-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=not.is.null`
        },
        async (payload) => {
          console.log(`[ChatContext] New group message detected: ${payload.new.group_id}`, payload.new);
          
          try {
            // 检查用户是否是该群成员
            const { data: isMember, error: memberError } = await supabase
              .from('group_members')
              .select('id')
              .eq('group_id', payload.new.group_id)
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (memberError) {
              console.error(`[ChatContext] Error checking group membership: ${memberError.message}`);
              return;
            }

            if (isMember) {
              console.log(`[ChatContext] User ${user.id} is member of group ${payload.new.group_id}, updating unread count`);
              calculateTotalUnreadCount();
            } else {
              console.log(`[ChatContext] User ${user.id} is not member of group ${payload.new.group_id}, skipping`);
            }
          } catch (error) {
            console.error(`[ChatContext] Error processing group message: ${(error as Error).message}`);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[ChatContext] Group message create channel status: ${status}`);
      });

    return () => {
      console.log(`[ChatContext] Removing real-time channels for user ${user.id}`);
      // 使用removeChannel方法安全移除通道
      supabase.removeChannel(privateMessagesChannel);
      supabase.removeChannel(groupMessagesChannel);
      supabase.removeChannel(groupMessageCreateChannel);
    };
  }, [user, calculateTotalUnreadCount]);

  // 初始计算未读消息数量
  useEffect(() => {
    // 使用setTimeout避免直接在effect中调用setState
    const timer = setTimeout(() => {
      calculateTotalUnreadCount();
    }, 0);
    
    return () => clearTimeout(timer);
  }, [calculateTotalUnreadCount]);

  // 暴露给外部的刷新方法
  const refreshUnreadCounts = useCallback(async () => {
    await calculateTotalUnreadCount();
  }, [calculateTotalUnreadCount]);

  return (
    <ChatContext.Provider value={{ totalUnreadCount, refreshUnreadCounts }}>
      {children}
    </ChatContext.Provider>
  );
};

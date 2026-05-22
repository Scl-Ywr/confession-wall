'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { realtimeManager } from '@/lib/realtime/realtime-manager';
import { useNotificationsRealtime, useFriendRequestsRealtime } from '@/hooks/useNotificationsRealtime';
import { useConfessionRealtime } from '@/hooks/useConfessionRealtime';
import toast from 'react-hot-toast';
import { Notification } from '@/types/chat';

export interface RealtimeProviderState {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  connectedChannels: number;
  totalChannels: number;
}

export interface RealtimeContextValue extends RealtimeProviderState {
  reconnect: () => void;
  disconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [connectedChannels, setConnectedChannels] = useState(0);
  const [totalChannels, setTotalChannels] = useState(0);

  const handleNewNotification = useCallback((notification: Notification) => {
    console.log('[RealtimeProvider] New notification:', notification);
    
    const notificationTypeMessages: Record<string, string> = {
      friend_request: '收到新的好友请求',
      friend_accepted: '好友申请已通过',
      friend_rejected: '好友申请被拒绝',
      group_invite: '收到群聊邀请',
      comment: '有人评论了你的表白',
      like: '有人点赞了你的表白',
      mention: '有人在评论中提到了你',
    };

    const message = notificationTypeMessages[notification.type] || '收到新通知';
    
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('realtime:notification', {
        detail: notification
      }));
    }
  }, []);

  const handleNewConfession = useCallback((confession: Record<string, unknown>) => {
    console.log('[RealtimeProvider] New confession:', confession);
    
    toast.success('发现新的表白内容', {
      duration: 3000,
      position: 'top-right',
    });
  }, []);

  const handleNewFriendRequest = useCallback((request: Record<string, unknown>) => {
    console.log('[RealtimeProvider] New friend request:', request);
    
    toast.success('收到新的好友请求', {
      duration: 4000,
      position: 'top-right',
      icon: '👋',
    });
  }, []);

  const { 
    isConnected: notificationsConnected, 
    connectionStatus: notificationsStatus 
  } = useNotificationsRealtime({
    userId: user?.id,
    onNewNotification: handleNewNotification,
    enabled: !!user,
  });

  const { 
    isConnected: confessionsConnected,
    connectionStatus: confessionsStatus
  } = useConfessionRealtime({
    onNewConfession: handleNewConfession,
    enabled: true,
  });

  const {
    isConnected: friendRequestsConnected,
    connectionStatus: friendRequestsStatus
  } = useFriendRequestsRealtime({
    userId: user?.id,
    onNewRequest: handleNewFriendRequest,
    enabled: !!user,
  });

  useEffect(() => {
    const updateConnectionStatus = () => {
      const connected = notificationsConnected && confessionsConnected && friendRequestsConnected;
      setConnectionStatus(connected ? 'connected' : 'connecting');
      setConnectedChannels(realtimeManager.getConnectedChannelsCount());
      setTotalChannels(realtimeManager.getTotalChannelsCount());
    };

    updateConnectionStatus();

    const interval = setInterval(updateConnectionStatus, 5000);

    return () => clearInterval(interval);
  }, [notificationsConnected, confessionsConnected, friendRequestsConnected]);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('[RealtimeProvider] All realtime connections established');
    } else if (connectionStatus === 'error') {
      console.error('[RealtimeProvider] Realtime connection error');
      toast.error('实时连接出错，部分功能可能无法正常使用', {
        duration: 5000,
        position: 'top-right',
      });
    }
  }, [connectionStatus]);

  const reconnect = useCallback(() => {
    console.log('[RealtimeProvider] Manual reconnect triggered');
    toast.success('正在重新连接...', {
      duration: 2000,
      position: 'top-right',
    });
    realtimeManager.reconnectAllChannels();
  }, []);

  const disconnect = useCallback(() => {
    console.log('[RealtimeProvider] Manual disconnect triggered');
    realtimeManager.unsubscribeAll();
  }, []);

  const value: RealtimeContextValue = {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    connectedChannels,
    totalChannels,
    reconnect,
    disconnect,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  
  return context;
}

export function useRealtimeConnection() {
  const { isConnected, connectionStatus, connectedChannels, totalChannels } = useRealtime();
  
  return {
    isConnected,
    connectionStatus,
    connectedChannels,
    totalChannels,
    connectionPercentage: totalChannels > 0 ? Math.round((connectedChannels / totalChannels) * 100) : 0,
  };
}

export function useRealtimeActions() {
  const { reconnect, disconnect } = useRealtime();
  
  return {
    reconnect,
    disconnect,
  };
}

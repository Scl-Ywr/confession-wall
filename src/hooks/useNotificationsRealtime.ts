import { useEffect, useState, useCallback, useRef } from 'react';
import { realtimeManager } from '@/lib/realtime/realtime-manager';
import { Notification } from '@/types/chat';

export interface UseNotificationsRealtimeOptions {
  userId?: string;
  onNewNotification?: (notification: Notification) => void;
  enabled?: boolean;
}

export interface NotificationPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Notification;
  old: Record<string, unknown>;
}

export function useNotificationsRealtime(options: UseNotificationsRealtimeOptions = {}) {
  const {
    userId,
    onNewNotification,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [unreadCount, setUnreadCount] = useState(0);
  const onNewNotificationRef = useRef(onNewNotification);

  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  const handleNotificationInsert = useCallback((payload: NotificationPayload) => {
    console.log('[useNotificationsRealtime] New notification received:', payload.new);
    
    if (payload.new.recipient_id !== userId) {
      console.log('[useNotificationsRealtime] Notification not for current user, ignoring');
      return;
    }

    setUnreadCount(prev => prev + 1);

    if (onNewNotificationRef.current) {
      onNewNotificationRef.current(payload.new);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notification:new', { 
        detail: payload.new 
      }));
    }
  }, [userId]);

  const handleNotificationUpdate = useCallback((payload: NotificationPayload) => {
    console.log('[useNotificationsRealtime] Notification updated:', payload.new);
    
    if (payload.new.recipient_id !== userId) {
      console.log('[useNotificationsRealtime] Notification not for current user, ignoring');
      return;
    }

    if (payload.new.read_status === true) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notification:update', { 
        detail: payload.new 
      }));
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      console.log('[useNotificationsRealtime] Realtime disabled or no userId, skipping subscription');
      return;
    }

    console.log('[useNotificationsRealtime] Setting up notifications realtime subscription for user:', userId);

    const filter = `recipient_id.eq.${userId}`;

    const insertChannel = realtimeManager.subscribe({
      channelName: `notifications-${userId}`,
      table: 'notifications',
      event: 'INSERT',
      filter,
      callback: handleNotificationInsert,
    });

    const updateChannel = realtimeManager.subscribe({
      channelName: `notifications-update-${userId}`,
      table: 'notifications',
      event: 'UPDATE',
      filter,
      callback: handleNotificationUpdate,
    });

    const unsubscribe = realtimeManager.addConnectionListener(`notifications-${userId}`, (state) => {
      console.log('[useNotificationsRealtime] Connection state changed:', state.status);
      setConnectionStatus(state.status);
    });

    return () => {
      console.log('[useNotificationsRealtime] Cleaning up notifications realtime subscription');
      realtimeManager.unsubscribe(`notifications-${userId}`);
      realtimeManager.unsubscribe(`notifications-update-${userId}`);
      unsubscribe();
    };
  }, [enabled, userId, handleNotificationInsert, handleNotificationUpdate]);

  const markAsRead = useCallback(async (notificationId: string) => {
    console.log('[useNotificationsRealtime] Marking notification as read:', notificationId);
    
    try {
      const { error } = await import('@/lib/supabase/client').then(m => m.supabase)
        .then(supabase => supabase
          .from('notifications')
          .update({ read_status: true })
          .eq('id', notificationId)
        );

      if (error) {
        console.error('[useNotificationsRealtime] Error marking notification as read:', error);
      } else {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[useNotificationsRealtime] Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    console.log('[useNotificationsRealtime] Marking all notifications as read');
    
    try {
      const { error } = await import('@/lib/supabase/client').then(m => m.supabase)
        .then(supabase => supabase
          .from('notifications')
          .update({ read_status: true })
          .eq('recipient_id', userId)
          .eq('read_status', false)
        );

      if (error) {
        console.error('[useNotificationsRealtime] Error marking all notifications as read:', error);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[useNotificationsRealtime] Error marking all notifications as read:', error);
    }
  }, [userId]);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    unreadCount,
    setUnreadCount,
    markAsRead,
    markAllAsRead,
    resetUnreadCount,
    decrementUnreadCount,
  };
}

export interface UseFriendRequestsRealtimeOptions {
  userId?: string;
  onNewRequest?: (request: Record<string, unknown>) => void;
  onRequestAccepted?: (request: Record<string, unknown>) => void;
  onRequestRejected?: (request: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useFriendRequestsRealtime(options: UseFriendRequestsRealtimeOptions = {}) {
  const {
    userId,
    onNewRequest,
    onRequestAccepted,
    onRequestRejected,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');

  const handleRequestInsert = useCallback((payload: Record<string, unknown>) => {
    console.log('[useFriendRequestsRealtime] New friend request:', payload);
    
    if (payload.receiver_id !== userId) {
      console.log('[useFriendRequestsRealtime] Friend request not for current user, ignoring');
      return;
    }

    if (onNewRequest) {
      onNewRequest(payload);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('friend-request:new', { 
        detail: payload 
      }));
    }
  }, [userId, onNewRequest]);

  const handleRequestUpdate = useCallback((payload: Record<string, unknown>) => {
    console.log('[useFriendRequestsRealtime] Friend request updated:', payload);
    
    const status = payload.status as string;
    
    if (status === 'accepted' && onRequestAccepted) {
      onRequestAccepted(payload);
      window.dispatchEvent(new CustomEvent('friend-request:accepted', { 
        detail: payload 
      }));
    } else if (status === 'rejected' && onRequestRejected) {
      onRequestRejected(payload);
      window.dispatchEvent(new CustomEvent('friend-request:rejected', { 
        detail: payload 
      }));
    }
  }, [onRequestAccepted, onRequestRejected]);

  useEffect(() => {
    if (!enabled || !userId) {
      console.log('[useFriendRequestsRealtime] Realtime disabled or no userId, skipping subscription');
      return;
    }

    console.log('[useFriendRequestsRealtime] Setting up friend requests realtime subscription for user:', userId);

    const filter = `receiver_id.eq.${userId}`;

    const insertChannel = realtimeManager.subscribe({
      channelName: `friend-requests-${userId}`,
      table: 'friend_requests',
      event: 'INSERT',
      filter,
      callback: handleRequestInsert,
    });

    const updateChannel = realtimeManager.subscribe({
      channelName: `friend-requests-update-${userId}`,
      table: 'friend_requests',
      event: 'UPDATE',
      filter,
      callback: handleRequestUpdate,
    });

    const unsubscribe = realtimeManager.addConnectionListener(`friend-requests-${userId}`, (state) => {
      console.log('[useFriendRequestsRealtime] Connection state changed:', state.status);
      setConnectionStatus(state.status);
    });

    return () => {
      console.log('[useFriendRequestsRealtime] Cleaning up friend requests realtime subscription');
      realtimeManager.unsubscribe(`friend-requests-${userId}`);
      realtimeManager.unsubscribe(`friend-requests-update-${userId}`);
      unsubscribe();
    };
  }, [enabled, userId, handleRequestInsert, handleRequestUpdate]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}

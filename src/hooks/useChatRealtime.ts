import { useEffect, useState, useCallback, useRef } from 'react';
import { realtimeManager } from '@/lib/realtime/realtime-manager';
import { ChatMessage } from '@/types/chat';

export interface UsePrivateChatRealtimeOptions {
  currentUserId?: string;
  otherUserId?: string;
  onNewMessage?: (message: ChatMessage) => void;
  onMessageDeleted?: (messageId: string) => void;
  enabled?: boolean;
}

export interface PrivateChatPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ChatMessage;
  old: Record<string, unknown>;
}

export function usePrivateChatRealtime(options: UsePrivateChatRealtimeOptions = {}) {
  const {
    currentUserId,
    otherUserId,
    onNewMessage,
    onMessageDeleted,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const handleMessageInsert = useCallback((payload: PrivateChatPayload) => {
    console.log('[usePrivateChatRealtime] New message received:', payload.new);
    
    if (payload.new.sender_id !== currentUserId && payload.new.sender_id !== otherUserId) {
      console.log('[usePrivateChatRealtime] Message not from conversation participants, ignoring');
      return;
    }

    if (payload.new.sender_id !== currentUserId) {
      if (onNewMessageRef.current) {
        onNewMessageRef.current(payload.new);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chat:message', { 
          detail: { 
            type: 'private',
            message: payload.new,
            senderId: payload.new.sender_id,
            receiverId: payload.new.receiver_id
          } 
        }));
      }
    }
  }, [currentUserId, otherUserId]);

  const handleMessageUpdate = useCallback((payload: PrivateChatPayload) => {
    console.log('[usePrivateChatRealtime] Message updated:', payload.new);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chat:message-update', { 
        detail: { 
          type: 'private',
          message: payload.new
        } 
      }));
    }
  }, []);

  const handleMessageDelete = useCallback((payload: Record<string, unknown>) => {
    console.log('[usePrivateChatRealtime] Message deleted:', payload);
    
    if (onMessageDeleted) {
      const messageId = payload.id as string;
      onMessageDeleted(messageId);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chat:message-delete', { 
        detail: { 
          type: 'private',
          messageId: payload.id
        } 
      }));
    }
  }, [onMessageDeleted]);

  useEffect(() => {
    if (!enabled || !currentUserId || !otherUserId) {
      console.log('[usePrivateChatRealtime] Realtime disabled or missing userIds, skipping subscription');
      return;
    }

    console.log('[usePrivateChatRealtime] Setting up private chat realtime subscription');

    const channelName = `private-chat-${currentUserId}-${otherUserId}`;
    const filter = `(sender_id.eq.${currentUserId}.and.receiver_id.eq.${otherUserId}).or(sender_id.eq.${otherUserId}.and.receiver_id.eq.${currentUserId})`;

    const insertChannel = realtimeManager.subscribe({
      channelName,
      table: 'chat_messages',
      event: 'INSERT',
      filter,
      callback: handleMessageInsert,
    });

    const updateChannel = realtimeManager.subscribe({
      channelName: `${channelName}-update`,
      table: 'chat_messages',
      event: 'UPDATE',
      filter,
      callback: handleMessageUpdate,
    });

    const deleteChannel = realtimeManager.subscribe({
      channelName: `${channelName}-delete`,
      table: 'chat_messages',
      event: 'DELETE',
      filter,
      callback: handleMessageDelete,
    });

    const unsubscribe = realtimeManager.addConnectionListener(channelName, (state) => {
      console.log('[usePrivateChatRealtime] Connection state changed:', state.status);
      setConnectionStatus(state.status);
    });

    return () => {
      console.log('[usePrivateChatRealtime] Cleaning up private chat realtime subscription');
      realtimeManager.unsubscribe(channelName);
      realtimeManager.unsubscribe(`${channelName}-update`);
      realtimeManager.unsubscribe(`${channelName}-delete`);
      unsubscribe();
    };
  }, [enabled, currentUserId, otherUserId, handleMessageInsert, handleMessageUpdate, handleMessageDelete]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}

export interface UseGroupChatRealtimeOptions {
  currentUserId?: string;
  groupId?: string;
  onNewMessage?: (message: ChatMessage) => void;
  onMemberJoined?: (member: Record<string, unknown>) => void;
  onMemberLeft?: (memberId: string) => void;
  enabled?: boolean;
}

export function useGroupChatRealtime(options: UseGroupChatRealtimeOptions = {}) {
  const {
    currentUserId,
    groupId,
    onNewMessage,
    onMemberJoined,
    onMemberLeft,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const handleMessageInsert = useCallback((payload: PrivateChatPayload) => {
    console.log('[useGroupChatRealtime] New group message received:', payload.new);
    
    if (payload.new.group_id !== groupId) {
      console.log('[useGroupChatRealtime] Message not for this group, ignoring');
      return;
    }

    if (payload.new.sender_id !== currentUserId) {
      if (onNewMessageRef.current) {
        onNewMessageRef.current(payload.new);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chat:message', { 
          detail: { 
            type: 'group',
            groupId,
            message: payload.new,
            senderId: payload.new.sender_id
          } 
        }));
      }
    }
  }, [currentUserId, groupId, onNewMessage]);

  const handleMemberJoined = useCallback((payload: Record<string, unknown>) => {
    console.log('[useGroupChatRealtime] Member joined:', payload);
    
    if (onMemberJoined) {
      onMemberJoined(payload);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('group:member-joined', { 
        detail: { 
          groupId,
          member: payload
        } 
      }));
    }
  }, [groupId, onMemberJoined]);

  const handleMemberLeft = useCallback((payload: Record<string, unknown>) => {
    console.log('[useGroupChatRealtime] Member left:', payload);
    
    if (onMemberLeft) {
      const memberId = payload.user_id as string;
      onMemberLeft(memberId);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('group:member-left', { 
        detail: { 
          groupId,
          memberId: payload.user_id
        } 
      }));
    }
  }, [groupId, onMemberLeft]);

  useEffect(() => {
    if (!enabled || !currentUserId || !groupId) {
      console.log('[useGroupChatRealtime] Realtime disabled or missing params, skipping subscription');
      return;
    }

    console.log('[useGroupChatRealtime] Setting up group chat realtime subscription');

    const channelName = `group-chat-${groupId}`;
    const messageFilter = `group_id.eq.${groupId}`;
    const memberFilter = `group_id.eq.${groupId}`;

    const insertChannel = realtimeManager.subscribe({
      channelName,
      table: 'chat_messages',
      event: 'INSERT',
      filter: messageFilter,
      callback: handleMessageInsert,
    });

    const memberJoinChannel = realtimeManager.subscribe({
      channelName: `${channelName}-members`,
      table: 'group_members',
      event: 'INSERT',
      filter: memberFilter,
      callback: handleMemberJoined,
    });

    const memberLeaveChannel = realtimeManager.subscribe({
      channelName: `${channelName}-members-leave`,
      table: 'group_members',
      event: 'DELETE',
      filter: memberFilter,
      callback: handleMemberLeft,
    });

    const unsubscribe = realtimeManager.addConnectionListener(channelName, (state) => {
      console.log('[useGroupChatRealtime] Connection state changed:', state.status);
      setConnectionStatus(state.status);
    });

    return () => {
      console.log('[useGroupChatRealtime] Cleaning up group chat realtime subscription');
      realtimeManager.unsubscribe(channelName);
      realtimeManager.unsubscribe(`${channelName}-members`);
      realtimeManager.unsubscribe(`${channelName}-members-leave`);
      unsubscribe();
    };
  }, [enabled, currentUserId, groupId, handleMessageInsert, handleMemberJoined, handleMemberLeft]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}

export interface UseOnlineStatusRealtimeOptions {
  userIds: string[];
  onStatusChange?: (userId: string, status: string, lastSeen?: string) => void;
  enabled?: boolean;
}

export function useOnlineStatusRealtime(options: UseOnlineStatusRealtimeOptions = {}) {
  const {
    userIds,
    onStatusChange,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const handleStatusUpdate = useCallback((payload: Record<string, unknown>) => {
    const updatedUserId = payload.id as string;
    
    if (!userIds.includes(updatedUserId)) {
      console.log('[useOnlineStatusRealtime] Status update for non-subscribed user, ignoring');
      return;
    }

    console.log('[useOnlineStatusRealtime] User status changed:', {
      userId: updatedUserId,
      online_status: payload.online_status,
      last_seen: payload.last_seen
    });

    if (onStatusChangeRef.current) {
      onStatusChangeRef.current(
        updatedUserId,
        payload.online_status as string,
        payload.last_seen as string
      );
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user:status-change', { 
        detail: { 
          userId: updatedUserId,
          status: payload.online_status,
          lastSeen: payload.last_seen
        } 
      }));
    }
  }, [userIds]);

  useEffect(() => {
    if (!enabled || userIds.length === 0) {
      console.log('[useOnlineStatusRealtime] Realtime disabled or no userIds, skipping subscription');
      return;
    }

    console.log('[useOnlineStatusRealtime] Setting up online status realtime subscription for users:', userIds);

    const userIdsFilter = userIds.map(id => `id.eq.${id}`).join(',');
    const filter = `id.in.(${userIdsFilter})`;

    const channel = realtimeManager.subscribe({
      channelName: 'online-status',
      table: 'profiles',
      event: 'UPDATE',
      filter,
      callback: handleStatusUpdate,
    });

    const unsubscribe = realtimeManager.addConnectionListener('online-status', (state) => {
      console.log('[useOnlineStatusRealtime] Connection state changed:', state.status);
      setConnectionStatus(state.status);
    });

    return () => {
      console.log('[useOnlineStatusRealtime] Cleaning up online status realtime subscription');
      realtimeManager.unsubscribe('online-status');
      unsubscribe();
    };
  }, [enabled, userIds, handleStatusUpdate]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}

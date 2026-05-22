import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { realtimeManager } from '@/lib/realtime/realtime-manager';
import { useQueryClient } from '@tanstack/react-query';

export interface ConfessionRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export interface UseConfessionRealtimeOptions {
  onNewConfession?: (confession: Record<string, unknown>) => void;
  onUpdateConfession?: (confession: Record<string, unknown>) => void;
  onDeleteConfession?: (confessionId: string) => void;
  enabled?: boolean;
}

export function useConfessionRealtime(options: UseConfessionRealtimeOptions = {}) {
  const {
    onNewConfession,
    onUpdateConfession,
    onDeleteConfession,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const queryClient = useQueryClient();

  const handleNewConfession = useCallback((payload: ConfessionRealtimePayload) => {
    console.log('[useConfessionRealtime] New confession received:', payload.new);
    
    if (onNewConfession) {
      onNewConfession(payload.new);
    }

    queryClient.invalidateQueries({ queryKey: ['confessions'] });
    queryClient.invalidateQueries({ queryKey: ['confession-list'] });
  }, [onNewConfession, queryClient]);

  const handleUpdateConfession = useCallback((payload: ConfessionRealtimePayload) => {
    console.log('[useConfessionRealtime] Confession updated:', payload.new);
    
    if (onUpdateConfession) {
      onUpdateConfession(payload.new);
    }

    queryClient.invalidateQueries({ queryKey: ['confessions'] });
    queryClient.invalidateQueries({ queryKey: ['confession-detail'] });
    queryClient.invalidateQueries({ queryKey: ['confession-list'] });
  }, [onUpdateConfession, queryClient]);

  const handleDeleteConfession = useCallback((payload: ConfessionRealtimePayload) => {
    console.log('[useConfessionRealtime] Confession deleted:', payload.old);
    
    if (onDeleteConfession) {
      const confessionId = payload.old.id as string;
      onDeleteConfession(confessionId);
    }

    queryClient.invalidateQueries({ queryKey: ['confessions'] });
    queryClient.invalidateQueries({ queryKey: ['confession-detail'] });
    queryClient.invalidateQueries({ queryKey: ['confession-list'] });
  }, [onDeleteConfession, queryClient]);

  useEffect(() => {
    if (!enabled) {
      console.log('[useConfessionRealtime] Realtime disabled, skipping subscription');
      return;
    }

    console.log('[useConfessionRealtime] Setting up confession realtime subscription');

    const channel = realtimeManager.subscribe({
      channelName: 'confessions',
      table: 'confessions',
      event: 'INSERT',
      callback: handleNewConfession,
    });

    const updateChannel = realtimeManager.subscribe({
      channelName: 'confessions-update',
      table: 'confessions',
      event: 'UPDATE',
      callback: handleUpdateConfession,
    });

    const deleteChannel = realtimeManager.subscribe({
      channelName: 'confessions-delete',
      table: 'confessions',
      event: 'DELETE',
      callback: handleDeleteConfession,
    });

    const unsubscribe = realtimeManager.addConnectionListener('confessions', (state) => {
      console.log('[useConfessionRealtime] Connection state changed:', state.status);
      setConnectionStatus(state.status);
    });

    return () => {
      console.log('[useConfessionRealtime] Cleaning up confession realtime subscription');
      realtimeManager.unsubscribe('confessions');
      realtimeManager.unsubscribe('confessions-update');
      realtimeManager.unsubscribe('confessions-delete');
      unsubscribe();
    };
  }, [enabled, handleNewConfession, handleUpdateConfession, handleDeleteConfession]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}

export interface UseLikesRealtimeOptions {
  confessionId?: string;
  onLikeAdded?: (like: Record<string, unknown>) => void;
  onLikeRemoved?: (likeId: string) => void;
  enabled?: boolean;
}

export function useLikesRealtime(options: UseLikesRealtimeOptions = {}) {
  const {
    confessionId,
    onLikeAdded,
    onLikeRemoved,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const queryClient = useQueryClient();

  const handleLikeInsert = useCallback((payload: Record<string, unknown>) => {
    console.log('[useLikesRealtime] Like added:', payload);
    
    if (onLikeAdded) {
      onLikeAdded(payload);
    }

    queryClient.invalidateQueries({ queryKey: ['confessions'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  }, [onLikeAdded, queryClient]);

  const handleLikeDelete = useCallback((payload: Record<string, unknown>) => {
    console.log('[useLikesRealtime] Like removed:', payload);
    
    if (onLikeRemoved) {
      const likeId = payload.id as string;
      onLikeRemoved(likeId);
    }

    queryClient.invalidateQueries({ queryKey: ['confessions'] });
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  }, [onLikeRemoved, queryClient]);

  useEffect(() => {
    if (!enabled) {
      console.log('[useLikesRealtime] Realtime disabled, skipping subscription');
      return;
    }

    console.log('[useLikesRealtime] Setting up likes realtime subscription');

    const filter = confessionId ? `confession_id.eq.${confessionId}` : undefined;

    const insertChannel = realtimeManager.subscribe({
      channelName: 'likes-insert',
      table: 'likes',
      event: 'INSERT',
      filter,
      callback: handleLikeInsert,
    });

    const deleteChannel = realtimeManager.subscribe({
      channelName: 'likes-delete',
      table: 'likes',
      event: 'DELETE',
      filter,
      callback: handleLikeDelete,
    });

    const unsubscribe = realtimeManager.addConnectionListener('likes-insert', (state) => {
      console.log('[useLikesRealtime] Connection state changed:', state.status);
      setConnectionStatus(state.status);
    });

    return () => {
      console.log('[useLikesRealtime] Cleaning up likes realtime subscription');
      realtimeManager.unsubscribe('likes-insert');
      realtimeManager.unsubscribe('likes-delete');
      unsubscribe();
    };
  }, [enabled, confessionId, handleLikeInsert, handleLikeDelete]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}

export interface UseCommentsRealtimeOptions {
  confessionId?: string;
  onCommentAdded?: (comment: Record<string, unknown>) => void;
  onCommentUpdated?: (comment: Record<string, unknown>) => void;
  onCommentDeleted?: (commentId: string) => void;
  enabled?: boolean;
}

export function useCommentsRealtime(options: UseCommentsRealtimeOptions = {}) {
  const {
    confessionId,
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const queryClient = useQueryClient();

  const handleCommentInsert = useCallback((payload: Record<string, unknown>) => {
    console.log('[useCommentsRealtime] Comment added:', payload);
    
    if (onCommentAdded) {
      onCommentAdded(payload);
    }

    queryClient.invalidateQueries({ queryKey: ['comments'] });
    queryClient.invalidateQueries({ queryKey: ['confessions'] });
  }, [onCommentAdded, queryClient]);

  const handleCommentUpdate = useCallback((payload: Record<string, unknown>) => {
    console.log('[useCommentsRealtime] Comment updated:', payload);
    
    if (onCommentUpdated) {
      onCommentUpdated(payload);
    }

    queryClient.invalidateQueries({ queryKey: ['comments'] });
    queryClient.invalidateQueries({ queryKey: ['confessions'] });
  }, [onCommentUpdated, queryClient]);

  const handleCommentDelete = useCallback((payload: Record<string, unknown>) => {
    console.log('[useCommentsRealtime] Comment deleted:', payload);
    
    if (onCommentDeleted) {
      const commentId = payload.id as string;
      onCommentDeleted(commentId);
    }

    queryClient.invalidateQueries({ queryKey: ['comments'] });
    queryClient.invalidateQueries({ queryKey: ['confessions'] });
  }, [onCommentDeleted, queryClient]);

  useEffect(() => {
    if (!enabled) {
      console.log('[useCommentsRealtime] Realtime disabled, skipping subscription');
      return;
    }

    console.log('[useCommentsRealtime] Setting up comments realtime subscription');

    const filter = confessionId ? `confession_id.eq.${confessionId}` : undefined;

    const insertChannel = realtimeManager.subscribe({
      channelName: 'comments-insert',
      table: 'comments',
      event: 'INSERT',
      filter,
      callback: handleCommentInsert,
    });

    const updateChannel = realtimeManager.subscribe({
      channelName: 'comments-update',
      table: 'comments',
      event: 'UPDATE',
      filter,
      callback: handleCommentUpdate,
    });

    const deleteChannel = realtimeManager.subscribe({
      channelName: 'comments-delete',
      table: 'comments',
      event: 'DELETE',
      filter,
      callback: handleCommentDelete,
    });

    const unsubscribe = realtimeManager.addConnectionListener('comments-insert', (state) => {
      console.log('[useCommentsRealtime] Connection state changed:', state.status);
      setConnectionStatus(state.status);
    });

    return () => {
      console.log('[useCommentsRealtime] Cleaning up comments realtime subscription');
      realtimeManager.unsubscribe('comments-insert');
      realtimeManager.unsubscribe('comments-update');
      realtimeManager.unsubscribe('comments-delete');
      unsubscribe();
    };
  }, [enabled, confessionId, handleCommentInsert, handleCommentUpdate, handleCommentDelete]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}

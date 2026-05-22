import { supabase } from '@/lib/supabase/client';

export type RealtimeChannel = ReturnType<typeof supabase.channel>;
export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface RealtimeChannelConfig {
  channelName: string;
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: unknown) => void;
}

export interface RealtimeConnectionState {
  status: RealtimeStatus;
  lastConnected?: Date;
  errorCount: number;
  retryCount: number;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private connectionStates: Map<string, RealtimeConnectionState> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxRetries = 5;
  private baseRetryDelay = 1000;
  private listeners: Map<string, Set<(state: RealtimeConnectionState) => void>> = new Map();

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[RealtimeManager] Network online, attempting to reconnect all channels');
        this.reconnectAllChannels();
      });

      window.addEventListener('offline', () => {
        console.log('[RealtimeManager] Network offline, marking all channels as disconnected');
        this.markAllChannelsAsDisconnected();
      });
    }
  }

  public subscribe(config: RealtimeChannelConfig): RealtimeChannel {
    const { channelName, table, event = '*', filter, callback } = config;
    const fullChannelName = `global_${channelName}`;

    if (this.channels.has(fullChannelName)) {
      console.log(`[RealtimeManager] Channel ${fullChannelName} already exists, reusing`);
      return this.channels.get(fullChannelName)!;
    }

    console.log(`[RealtimeManager] Creating new channel: ${fullChannelName}`);
    this.updateConnectionState(fullChannelName, { status: 'connecting', errorCount: 0, retryCount: 0 });

    const channel = supabase.channel(fullChannelName);

    const postgresConfig: Record<string, unknown> = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      postgresConfig.filter = filter;
    }

    channel.on(
      'postgres_changes',
      postgresConfig,
      (payload) => {
        console.log(`[RealtimeManager] Received ${event} on ${table}:`, payload);
        try {
          callback(payload);
        } catch (error) {
          console.error(`[RealtimeManager] Error in callback for ${table}:`, error);
        }
      }
    );

    channel.subscribe((status: string) => {
      console.log(`[RealtimeManager] Channel ${fullChannelName} status: ${status}`);
      
      switch (status) {
        case 'SUBSCRIBED':
          this.updateConnectionState(fullChannelName, { 
            status: 'connected', 
            lastConnected: new Date(),
            errorCount: 0,
            retryCount: 0 
          });
          break;
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
          this.handleConnectionError(fullChannelName);
          break;
        case 'CLOSED':
          this.updateConnectionState(fullChannelName, { status: 'disconnected' });
          break;
        default:
          this.updateConnectionState(fullChannelName, { status: 'connecting' });
      }
    });

    this.channels.set(fullChannelName, channel);
    return channel;
  }

  public unsubscribe(channelName: string): void {
    const fullChannelName = `global_${channelName}`;
    const channel = this.channels.get(fullChannelName);
    
    if (channel) {
      console.log(`[RealtimeManager] Unsubscribing from channel: ${fullChannelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(fullChannelName);
      
      const timeout = this.retryTimeouts.get(fullChannelName);
      if (timeout) {
        clearTimeout(timeout);
        this.retryTimeouts.delete(fullChannelName);
      }
      
      this.connectionStates.delete(fullChannelName);
    }
  }

  public unsubscribeAll(): void {
    console.log('[RealtimeManager] Unsubscribing from all channels');
    
    for (const [channelName, channel] of this.channels.entries()) {
      supabase.removeChannel(channel);
      
      const timeout = this.retryTimeouts.get(channelName);
      if (timeout) {
        clearTimeout(timeout);
      }
    }
    
    this.channels.clear();
    this.connectionStates.clear();
    this.retryTimeouts.clear();
  }

  public getConnectionState(channelName: string): RealtimeConnectionState {
    const fullChannelName = `global_${channelName}`;
    return this.connectionStates.get(fullChannelName) || { 
      status: 'disconnected', 
      errorCount: 0, 
      retryCount: 0 
    };
  }

  public getAllConnectionStates(): Map<string, RealtimeConnectionState> {
    return new Map(this.connectionStates);
  }

  private updateConnectionState(channelName: string, updates: Partial<RealtimeConnectionState>): void {
    const currentState = this.getConnectionState(channelName);
    const newState = { ...currentState, ...updates };
    this.connectionStates.set(channelName, newState);
    this.notifyListeners(channelName, newState);
  }

  private handleConnectionError(channelName: string): void {
    const state = this.getConnectionState(channelName);
    const newErrorCount = state.errorCount + 1;
    const newRetryCount = state.retryCount + 1;

    console.log(`[RealtimeManager] Connection error for ${channelName}, retry ${newRetryCount}/${this.maxRetries}`);

    if (newRetryCount >= this.maxRetries) {
      console.error(`[RealtimeManager] Max retries reached for ${channelName}, giving up`);
      this.updateConnectionState(channelName, { 
        status: 'error', 
        errorCount: newErrorCount,
        retryCount: newRetryCount
      });
      return;
    }

    this.updateConnectionState(channelName, { 
      status: 'connecting', 
      errorCount: newErrorCount,
      retryCount: newRetryCount
    });

    const delay = this.baseRetryDelay * Math.pow(2, newRetryCount - 1);
    console.log(`[RealtimeManager] Scheduling retry for ${channelName} in ${delay}ms`);

    const timeout = setTimeout(() => {
      this.retryChannel(channelName);
    }, delay);

    this.retryTimeouts.set(channelName, timeout);
  }

  private retryChannel(channelName: string): void {
    const channel = this.channels.get(channelName);
    
    if (channel) {
      console.log(`[RealtimeManager] Retrying channel: ${channelName}`);
      channel.subscribe();
    } else {
      console.warn(`[RealtimeManager] Channel ${channelName} not found for retry`);
    }
  }

  private reconnectAllChannels(): void {
    console.log('[RealtimeManager] Reconnecting all channels');
    
    for (const [channelName, state] of this.connectionStates.entries()) {
      if (state.status === 'disconnected' || state.status === 'error') {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.updateConnectionState(channelName, { 
            status: 'connecting',
            retryCount: 0,
            errorCount: 0
          });
          channel.subscribe();
        }
      }
    }
  }

  private markAllChannelsAsDisconnected(): void {
    for (const [channelName] of this.connectionStates.entries()) {
      this.updateConnectionState(channelName, { status: 'disconnected' });
    }
  }

  public addConnectionListener(channelName: string, listener: (state: RealtimeConnectionState) => void): () => void {
    const fullChannelName = `global_${channelName}`;
    
    if (!this.listeners.has(fullChannelName)) {
      this.listeners.set(fullChannelName, new Set());
    }
    
    this.listeners.get(fullChannelName)!.add(listener);
    
    return () => {
      const channelListeners = this.listeners.get(fullChannelName);
      if (channelListeners) {
        channelListeners.delete(listener);
      }
    };
  }

  private notifyListeners(channelName: string, state: RealtimeConnectionState): void {
    const channelListeners = this.listeners.get(channelName);
    if (channelListeners) {
      channelListeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          console.error(`[RealtimeManager] Error in connection listener:`, error);
        }
      });
    }
  }

  public isConnected(channelName: string): boolean {
    return this.getConnectionState(channelName).status === 'connected';
  }

  public isAnyChannelConnected(): boolean {
    for (const state of this.connectionStates.values()) {
      if (state.status === 'connected') {
        return true;
      }
    }
    return false;
  }

  public getConnectedChannelsCount(): number {
    let count = 0;
    for (const state of this.connectionStates.values()) {
      if (state.status === 'connected') {
        count++;
      }
    }
    return count;
  }

  public getTotalChannelsCount(): number {
    return this.channels.size;
  }
}

export const realtimeManager = RealtimeManager.getInstance();
export default realtimeManager;

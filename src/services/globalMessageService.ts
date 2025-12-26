'use client';

import { supabase } from '@/lib/supabase/client';
import { ChatMessage } from '@/types/chat';
import { removeCache } from '@/utils/cache';

// 全局消息监听器回调类型
type MessageListener = (message: ChatMessage) => void;
// 未读计数更新回调类型
type UnreadCountUpdateListener = (type: 'private' | 'group', id: string, count: number) => void;

class GlobalMessageService {
  private static instance: GlobalMessageService;
  private messageListeners: MessageListener[] = [];
  private unreadCountListeners: UnreadCountUpdateListener[] = [];
  private channels: ReturnType<typeof supabase.channel>[] = [];
  private isSubscribed: boolean = false;
  private userId: string | null = null;

  private constructor() {
    // 私有构造函数，实现单例模式
  }

  // 获取单例实例
  public static getInstance(): GlobalMessageService {
    if (!GlobalMessageService.instance) {
      GlobalMessageService.instance = new GlobalMessageService();
    }
    return GlobalMessageService.instance;
  }

  // 初始化服务
  public init(userId: string): void {
    if (this.isSubscribed && this.userId === userId) {
      // 已经订阅过，不需要重复订阅
      return;
    }

    // 取消之前的订阅
    this.unsubscribe();
    
    this.userId = userId;
    this.subscribe();
  }

  // 订阅消息
  private subscribe(): void {
    if (!this.userId || this.isSubscribed) {
      return;
    }

    try {
      // 订阅私聊消息
      const privateChannel = supabase
        .channel(`private-messages-${this.userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `receiver_id.eq.${this.userId}`,
          },
          async (payload) => {
            const message = payload.new as ChatMessage;
            await this.handleNewMessage(message, 'private');
          }
        )
        .subscribe();

      this.channels.push(privateChannel);

      // 订阅群聊消息
      const groupChannel = supabase
        .channel(`group-messages-${this.userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `group_id.neq.null`,
          },
          async (payload) => {
            const message = payload.new as ChatMessage;
            // 检查当前用户是否是群成员
            const isMember = await this.checkUserInGroup(message.group_id as string, this.userId!);
            if (isMember) {
              await this.handleNewMessage(message, 'group');
            }
          }
        )
        .subscribe();

      this.channels.push(groupChannel);

      // 订阅群消息已读状态变化
      const groupReadStatusChannel = supabase
        .channel(`group-read-status-${this.userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'group_message_read_status',
            filter: `user_id.eq.${this.userId}`,
          },
          async (payload) => {
            const { group_id } = payload.new;
            await this.updateGroupUnreadCount(group_id as string);
          }
        )
        .subscribe();

      this.channels.push(groupReadStatusChannel);

      this.isSubscribed = true;
      console.log('Global message subscription initialized');
    } catch (error) {
      console.error('Error initializing global message subscription:', error);
    }
  }

  // 取消订阅
  public unsubscribe(): void {
    if (!this.isSubscribed) {
      return;
    }

    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });

    this.channels = [];
    this.isSubscribed = false;
    this.userId = null;
    console.log('Global message subscription cancelled');
  }

  // 处理新消息
  private async handleNewMessage(message: ChatMessage, type: 'private' | 'group'): Promise<void> {
    // 获取消息发送者的资料
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', message.sender_id)
      .single();

    const completeMessage = {
      ...message,
      sender_profile: senderProfile || null
    } as ChatMessage;

    // 通知所有消息监听器
    this.messageListeners.forEach(listener => {
      listener(completeMessage);
    });

    // 更新未读计数
    if (type === 'private') {
      await this.updatePrivateUnreadCount(message.sender_id);
    } else if (type === 'group' && message.group_id) {
      await this.updateGroupUnreadCount(message.group_id);
    }

    // 显示浏览器通知
    this.showBrowserNotification(completeMessage);
  }

  // 更新私聊未读计数
  private async updatePrivateUnreadCount(senderId: string): Promise<void> {
    if (!this.userId) return;

    try {
      // 1. 更新friendships表中的unread_count
      const { data: friendship, error } = await supabase
        .from('friendships')
        .select('unread_count')
        .eq('user_id', this.userId)
        .eq('friend_id', senderId)
        .single();

      if (!error && friendship) {
        // 增加未读计数
        const newUnreadCount = (friendship.unread_count || 0) + 1;
        
        await supabase
          .from('friendships')
          .update({ unread_count: newUnreadCount })
          .eq('user_id', this.userId)
          .eq('friend_id', senderId);

        // 通知未读计数更新
        this.unreadCountListeners.forEach(listener => {
          listener('private', senderId, newUnreadCount);
        });
      }

      // 2. 清除好友列表缓存，确保下次加载时获取最新数据
      const cacheKey = `chat:friends:${this.userId}`;
      await removeCache(cacheKey);
    } catch (error) {
      console.error('Error updating private unread count:', error);
    }
  }

  // 更新群聊未读计数
  private async updateGroupUnreadCount(groupId: string): Promise<void> {
    if (!this.userId) return;

    try {
      // 1. 查询当前用户在该群的未读消息数量
      const { count } = await supabase
        .from('group_message_read_status')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('user_id', this.userId)
        .eq('is_read', false);

      const unreadCount = count || 0;

      // 通知未读计数更新
      this.unreadCountListeners.forEach(listener => {
        listener('group', groupId, unreadCount);
      });

      // 2. 清除群列表缓存，确保下次加载时获取最新数据
      const cacheKey = `chat:groups:${this.userId}`;
      await removeCache(cacheKey);
    } catch (error) {
      console.error('Error updating group unread count:', error);
    }
  }

  // 检查用户是否在群聊中
  private async checkUserInGroup(groupId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      return !error && data !== null;
    } catch (error) {
      console.error('Error checking user in group:', error);
      return false;
    }
  }

  // 显示浏览器通知
  private showBrowserNotification(message: ChatMessage): void {
    // 检查浏览器是否支持通知
    if (!('Notification' in window)) {
      return;
    }

    // 检查是否已经授权
    if (Notification.permission === 'granted') {
      this.createNotification(message);
    } else if (Notification.permission !== 'denied') {
      // 请求授权
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.createNotification(message);
        }
      });
    }
  }

  // 创建浏览器通知
  private createNotification(message: ChatMessage): void {
    try {
      const senderName = message.sender_profile?.display_name || message.sender_profile?.username || '未知用户';
      const messageContent = message.type === 'text' 
        ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content)
        : `[${message.type}]`;

      const notification = new Notification(`${senderName} 发送了新消息`, {
        body: messageContent,
        icon: message.sender_profile?.avatar_url || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'new-message',
        requireInteraction: false
      });

      // 点击通知跳转到聊天页面
      notification.onclick = () => {
        window.focus();
        if (message.group_id) {
          window.location.href = `/chat/group/${message.group_id}`;
        } else {
          window.location.href = `/chat/${message.sender_id}`;
        }
        notification.close();
      };

      // 3秒后自动关闭通知
      setTimeout(() => {
        notification.close();
      }, 3000);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // 添加消息监听器
  public addMessageListener(listener: MessageListener): void {
    if (!this.messageListeners.includes(listener)) {
      this.messageListeners.push(listener);
    }
  }

  // 移除消息监听器
  public removeMessageListener(listener: MessageListener): void {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  // 添加未读计数更新监听器
  public addUnreadCountUpdateListener(listener: UnreadCountUpdateListener): void {
    if (!this.unreadCountListeners.includes(listener)) {
      this.unreadCountListeners.push(listener);
    }
  }

  // 移除未读计数更新监听器
  public removeUnreadCountUpdateListener(listener: UnreadCountUpdateListener): void {
    this.unreadCountListeners = this.unreadCountListeners.filter(l => l !== listener);
  }

  // 标记消息为已读
  public async markAsRead(messageIds: string[], type: 'private' | 'group', otherId: string): Promise<void> {
    if (!this.userId) return;

    try {
      if (type === 'private') {
        // 1. 标记私聊消息为已读
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .in('id', messageIds);

        // 2. 重置私聊未读计数
        await supabase
          .from('friendships')
          .update({ unread_count: 0 })
          .eq('user_id', this.userId)
          .eq('friend_id', otherId);

        // 3. 清除相关缓存
        const cacheKey = `chat:friends:${this.userId}`;
        await removeCache(cacheKey);

        // 4. 通知未读计数更新
        this.unreadCountListeners.forEach(listener => {
          listener('private', otherId, 0);
        });
      } else if (type === 'group') {
        // 1. 标记群消息为已读
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .in('id', messageIds);

        // 2. 更新群消息已读状态表
        await supabase
          .from('group_message_read_status')
          .update({ is_read: true })
          .in('message_id', messageIds)
          .eq('user_id', this.userId);

        // 3. 清除相关缓存
        const cacheKey = `chat:groups:${this.userId}`;
        await removeCache(cacheKey);

        // 4. 通知未读计数更新
        this.unreadCountListeners.forEach(listener => {
          listener('group', otherId, 0);
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }
}

export const globalMessageService = GlobalMessageService.getInstance();

import { Redis } from 'ioredis';

// 消息类型枚举
export enum MessageType {
  NOTIFICATION = 'notification',
  CHAT_MESSAGE = 'chat_message',
  FRIEND_REQUEST = 'friend_request',
  SYSTEM_EVENT = 'system_event'
}

// 消息优先级枚举
export enum MessagePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4
}

// 消息接口
export interface QueueMessage<T = unknown> {
  id: string;
  type: MessageType;
  priority: MessagePriority;
  payload: T;
  timestamp: number;
  correlationId?: string;
}

// 频道命名规范
export const getNotificationChannel = (userId: string): string => {
  return `notification:user:${userId}`;
};

export const getGlobalNotificationChannel = (): string => {
  return 'notification:global';
};

export const getChatChannel = (conversationId: string): string => {
  return `chat:${conversationId}`;
};

// Redis消息队列服务类
class RedisQueueService {
  private redis: Redis | undefined;
  private isInitialized: boolean = false;
  private subscribers: Map<string, Array<(message: QueueMessage) => void>> = new Map();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized || typeof window !== 'undefined') {
      return;
    }

    try {
      const RedisModule = await import('ioredis');
      const Redis = RedisModule.default;

      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD || '',
        db: 0,
        retryStrategy(times: number) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // 监听连接事件
      this.redis.on('connect', () => {
        console.log('Redis Queue Service connected');
      });

      this.redis.on('error', (err: Error) => {
        console.error('Redis Queue Service error:', err);
      });

      // 订阅所有相关频道的处理逻辑
      this.redis.on('message', (channel: string, message: string) => {
        try {
          const parsedMessage: QueueMessage = JSON.parse(message);
          const channelSubscribers = this.subscribers.get(channel) || [];
          channelSubscribers.forEach(callback => callback(parsedMessage));
        } catch (error) {
          console.error('Failed to parse Redis message:', error);
        }
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Redis Queue Service:', error);
    }
  }

  /**
   * 发布消息到指定频道
   * @param channel 频道名称
   * @param message 消息内容
   */
  async publish(channel: string, message: QueueMessage): Promise<boolean> {
    if (!this.isInitialized || !this.redis) {
      await this.initialize();
    }

    if (!this.redis) {
      return false;
    }

    try {
      await this.redis.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to publish message:', error);
      return false;
    }
  }

  /**
   * 订阅指定频道
   * @param channel 频道名称
   * @param callback 消息处理回调
   */
  async subscribe(channel: string, callback: (message: QueueMessage) => void): Promise<boolean> {
    if (!this.isInitialized || !this.redis) {
      await this.initialize();
    }

    if (!this.redis) {
      return false;
    }

    try {
      // 如果是新频道，添加到订阅列表
      if (!this.subscribers.has(channel)) {
        await this.redis.subscribe(channel);
        this.subscribers.set(channel, []);
      }

      // 添加回调
      const channelSubscribers = this.subscribers.get(channel) || [];
      channelSubscribers.push(callback);
      this.subscribers.set(channel, channelSubscribers);

      return true;
    } catch (error) {
      console.error('Failed to subscribe to channel:', error);
      return false;
    }
  }

  /**
   * 取消订阅指定频道
   * @param channel 频道名称
   * @param callback 要移除的回调（可选，如果不提供则移除所有回调）
   */
  async unsubscribe(channel: string, callback?: (message: QueueMessage) => void): Promise<boolean> {
    if (!this.isInitialized || !this.redis) {
      return false;
    }

    try {
      const channelSubscribers = this.subscribers.get(channel);
      if (!channelSubscribers) {
        return false;
      }

      if (callback) {
        // 移除特定回调
        const updatedSubscribers = channelSubscribers.filter(cb => cb !== callback);
        this.subscribers.set(channel, updatedSubscribers);

        // 如果没有更多订阅者，取消频道订阅
        if (updatedSubscribers.length === 0) {
          await this.redis.unsubscribe(channel);
          this.subscribers.delete(channel);
        }
      } else {
        // 移除所有回调
        await this.redis.unsubscribe(channel);
        this.subscribers.delete(channel);
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from channel:', error);
      return false;
    }
  }

  /**
   * 发布通知消息
   * @param userId 接收者用户ID
   * @param message 通知消息内容
   * @param priority 消息优先级
   */
  async publishNotification<T = unknown>(
    userId: string,
    payload: T,
    priority: MessagePriority = MessagePriority.MEDIUM
  ): Promise<boolean> {
    const message: QueueMessage<T> = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: MessageType.NOTIFICATION,
      priority,
      payload,
      timestamp: Date.now()
    };

    return this.publish(getNotificationChannel(userId), message);
  }

  /**
   * 关闭Redis连接
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isInitialized = false;
    }
  }
}

// 导出单例实例
export const queueService = new RedisQueueService();

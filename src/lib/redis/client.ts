// Redis客户端实例
// 注意：此模块只在服务器端使用
import type { Redis } from 'ioredis';

// 定义Redis类型
let redis: Redis | undefined;

// 只在服务器端初始化Redis客户端
if (typeof window === 'undefined') {
  (async () => {
    try {
      // 动态导入ioredis，避免ESLint错误
      const RedisModule = await import('ioredis');
      const Redis = RedisModule.default || RedisModule;
      
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD || '',
        db: 0,
        // 连接选项
        connectTimeout: 10000, // 连接超时时间（毫秒）
        keepAlive: 300, // 保持连接的时间（秒）
        retryStrategy(times: number) {
          // 优化重连策略，避免频繁重连
          const delay = Math.min(times * 100, 5000); // 延迟时间：100ms, 200ms, 300ms, ..., 5000ms
          return delay;
        },
        reconnectOnError(err: Error) {
          // 处理更多类型的错误，包括ECONNRESET
          const errorMessages = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'];
          if (errorMessages.some(msg => err.message.includes(msg))) {
            // 重新连接
            return true;
          }
          return false;
        },
        // 连接池配置
        maxRetriesPerRequest: 3, // 每个请求的最大重试次数
        enableReadyCheck: true, // 启用就绪检查
        maxLoadingRetryTime: 10000, // 加载时的最大重试时间
      });

      // 监听连接事件 - 只在开发环境输出
      if (process.env.NODE_ENV === 'development') {
        redis.on('connect', () => {
          console.log('Redis connected');
        });

        redis.on('error', (err: Error) => {
          console.error('Redis connection error:', err);
        });

        redis.on('close', () => {
          console.log('Redis connection closed');
        });

        redis.on('reconnecting', (info: { attempt: number; delay: number }) => {
          console.log(`Redis reconnecting: attempt ${info.attempt}, delay ${info.delay}ms`);
        });
      }
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      redis = undefined;
    }
  })();
}

export { redis };

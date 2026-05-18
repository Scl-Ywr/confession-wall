// Redis客户端实例
// 注意：此模块只在服务器端使用
import type { Redis, RedisOptions } from 'ioredis';

// 定义Redis类型
let redis: Redis | undefined;
let redisInitPromise: Promise<Redis | undefined> | null = null;

export async function getRedis(): Promise<Redis | undefined> {
  if (typeof window !== 'undefined') {
    return undefined;
  }

  if (redis) {
    return redis;
  }

  if (redisInitPromise) {
    return redisInitPromise;
  }

  redisInitPromise = (async () => {
    try {
      const RedisModule = await import('ioredis');
      const Redis = RedisModule.default || RedisModule;

      const redisOptions: RedisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: 0,
        connectTimeout: 10000,
        keepAlive: 300,
        retryStrategy(times: number) {
          return Math.min(times * 100, 5000);
        },
        reconnectOnError(err: Error) {
          const errorMessages = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'];
          return errorMessages.some(msg => err.message.includes(msg));
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        maxLoadingRetryTime: 10000,
      };

      if (process.env.REDIS_USERNAME?.trim()) {
        redisOptions.username = process.env.REDIS_USERNAME.trim();
      }

      if (process.env.REDIS_PASSWORD?.trim()) {
        redisOptions.password = process.env.REDIS_PASSWORD.trim();
      }

      redis = new Redis(redisOptions);

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

    return redis;
  })();

  return redisInitPromise;
}

export { redis };

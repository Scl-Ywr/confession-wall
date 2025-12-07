// Redis客户端实例
// 注意：此模块只在服务器端使用
// 使用动态导入避免在客户端或构建过程中加载ioredis
import Redis from 'ioredis';

let redis: Redis | undefined;

// 只在服务器端初始化Redis客户端
if (typeof window === 'undefined') {
  try {
    // 动态导入ioredis，只在服务器端执行
    
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD || '',
      db: 0,
      // 连接选项
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err: Error) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // 重新连接
          return true;
        }
        return false;
      },
    });

    // 监听连接事件
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
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redis = undefined;
  }
}

export default redis;

// Redis缓存工具
// 安全包装器，仅在服务器端使用Redis功能

/**
 * 检查是否在服务器端
 */
const isServer = typeof window === 'undefined';

/**
 * 生成缓存键（保持向后兼容）
 * @param key 原始键
 * @returns 带前缀的完整缓存键
 */
export const generateCacheKey = (key: string): string => {
  return key;
};

/**
 * 获取聊天消息缓存键
 * @param userId 当前用户ID
 * @param otherId 对方用户ID或群ID
 * @param isGroup 是否是群聊
 * @returns 缓存键
 */
export const getChatCacheKey = (userId: string, otherId: string, isGroup: boolean = false): string => {
  if (isGroup) {
    return `chat:group:${otherId}:${userId}`;
  }
  // 确保私聊缓存键的唯一性，不受用户ID顺序影响
  const sortedIds = [userId, otherId].sort();
  return `chat:private:${sortedIds[0]}:${sortedIds[1]}`;
};

/**
 * 获取用户资料缓存键
 * @param userId 用户ID
 * @returns 缓存键
 */
export const getUserProfileCacheKey = (userId: string): string => {
  return `user:profile:${userId}`;
};

/**
 * 获取动态状态缓存键
 * @param userId 用户ID
 * @returns 缓存键
 */
export const getUserStatusCacheKey = (userId: string): string => {
  return `user:status:${userId}`;
};

/**
 * 获取告白墙内容缓存键
 * @param confessionId 告白ID
 * @returns 缓存键
 */
export const getConfessionCacheKey = (confessionId: string): string => {
  return `confession:detail:${confessionId}`;
};

/**
 * 获取告白墙列表缓存键
 * @param page 页码
 * @param limit 每页数量
 * @returns 缓存键
 */
export const getConfessionListCacheKey = (page: number = 1, limit: number = 20): string => {
  return `confession:list:${page}:${limit}`;
};

// 过期时间常量
export const EXPIRY = {
  SHORT: 5 * 60 * 1000, // 5分钟
  MEDIUM: 1 * 60 * 60 * 1000, // 1小时
  DEFAULT: 7 * 24 * 60 * 60 * 1000, // 7天
  LONG: 30 * 24 * 60 * 60 * 1000, // 30天
  NULL_VALUE: 5 * 60 * 1000, // 5分钟
  LOCK: 10 * 1000, // 10秒
  INSTANT: 60 * 1000, // 1分钟
  FOREVER: 0 // 永不过期
};

/**
 * 获取缓存（安全包装器）
 * @param key 缓存键
 * @returns 缓存数据，如果过期、不存在或在客户端则返回null
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!isServer) {
    return null;
  }
  
  try {
    const { getCache: serverGetCache } = await import('./cache-manager');
    return serverGetCache<T>(key);
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

/**
 * 设置缓存（安全包装器）
 * @param key 缓存键
 * @param data 缓存数据
 * @param expiry 过期时间（毫秒）
 * @returns 是否设置成功
 */
export const setCache = async <T>(
  key: string,
  data: T,
  expiry?: number
): Promise<boolean> => {
  if (!isServer) {
    return false;
  }
  
  try {
    const { setCache: serverSetCache } = await import('./cache-manager');
    return serverSetCache(key, data, expiry);
  } catch (error) {
    console.error('Error setting cache:', error);
    return false;
  }
};

/**
 * 删除缓存（安全包装器）
 * @param key 缓存键
 * @returns 是否删除成功
 */
export const deleteCache = async (key: string): Promise<boolean> => {
  if (!isServer) {
    return false;
  }
  
  try {
    const { deleteCache: serverDeleteCache } = await import('./cache-manager');
    return serverDeleteCache(key);
  } catch (error) {
    console.error('Error deleting cache:', error);
    return false;
  }
};

/**
 * 设置空值缓存（安全包装器）
 * @param key 缓存键
 * @returns 是否设置成功
 */
export const setNullCache = async (key: string): Promise<boolean> => {
  if (!isServer) {
    return false;
  }
  
  try {
    const { setCache: serverSetCache } = await import('./cache-manager');
    return serverSetCache(`${key}:null`, true, EXPIRY.NULL_VALUE);
  } catch (error) {
    console.error('Error setting null cache:', error);
    return false;
  }
};

/**
 * 缓存击穿防护：获取互斥锁（安全包装器）
 * @param key 缓存键
 * @returns 是否获取到锁
 */
export const acquireLock = async (key: string): Promise<boolean> => {
  if (!isServer) {
    return true; // 客户端直接返回成功，不使用锁
  }
  
  try {
    const fullLockKey = `lock:${key}`;
    
    // 实现简单的Redis锁机制
    const redisModule = await import('./client');
    const redisClient = redisModule.default;
    
    if (redisClient && typeof window === 'undefined') {
      const result = await redisClient.set(`confession_wall:${fullLockKey}`, '1', 'PX', EXPIRY.LOCK, 'NX');
      return result === 'OK';
    }
    return false;
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return true; // 出错时允许执行
  }
};

/**
 * 缓存击穿防护：释放互斥锁（安全包装器）
 * @param key 缓存键
 * @returns 是否释放成功
 */
export const releaseLock = async (key: string): Promise<boolean> => {
  if (!isServer) {
    return true; // 客户端直接返回成功
  }
  
  try {
    const fullLockKey = `lock:${key}`;
    
    // 实现简单的Redis锁释放
    const redisModule = await import('./client');
    const redisClient = redisModule.default;
    
    if (redisClient && typeof window === 'undefined') {
      await redisClient.del(`confession_wall:${fullLockKey}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error releasing lock:', error);
    return true;
  }
};

// 仅导出安全的缓存函数，不直接导出任何Redis实例或管理器
// 其他高级功能仅在服务器端通过动态导入使用

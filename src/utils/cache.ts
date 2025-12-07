// 统一缓存工具函数，支持Redis和localStorage双缓存机制

import { 
  setCache as setRedisCache, 
  getCache as getRedisCache, 
  deleteCache as deleteRedisCache,
  EXPIRY
} from '../lib/redis/cache';

/**
 * 获取聊天消息缓存键
 * @param userId 当前用户ID
 * @param otherId 对方用户ID或群ID
 * @param isGroup 是否是群聊
 * @returns 缓存键
 */
const getRedisChatCacheKey = (userId: string, otherId: string, isGroup: boolean = false): string => {
  if (isGroup) {
    return `chat:group:${otherId}:${userId}`;
  }
  // 确保私聊缓存键的唯一性，不受用户ID顺序影响
  const sortedIds = [userId, otherId].sort();
  return `chat:private:${sortedIds[0]}:${sortedIds[1]}`;
};

/**
 * 清除所有Redis缓存
 */
const clearRedisCache = async (): Promise<boolean> => {
  // 由于我们在cache.ts中没有导出clearCache，我们可以动态导入cache-manager来实现
  if (typeof window === 'undefined') {
    try {
      const { clearCache } = await import('../lib/redis/cache-manager');
      return clearCache();
    } catch (error) {
      console.error('Error clearing Redis cache:', error);
      return false;
    }
  }
  return true;
};

/**
 * 更新Redis缓存
 */
const updateRedisCache = async <T>(key: string, updater: (data: T) => T): Promise<T | null> => {
  // 实现更新逻辑：先获取，再更新，再设置
  const currentData = await getRedisCache<T>(key);
  if (currentData === null) {
    return null;
  }
  const updatedData = updater(currentData);
  const success = await setRedisCache(key, updatedData);
  return success ? updatedData : null;
};

// 本地缓存前缀
const LOCAL_CACHE_PREFIX = 'confession_wall_';

// 本地缓存过期时间（毫秒）
const LOCAL_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

// 缓存数据结构
interface LocalCacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * 检查是否在服务器端（Next.js App Router）
 */
const isServer = typeof window === 'undefined';

/**
 * 设置缓存
 * @param key 缓存键
 * @param data 缓存数据
 * @param expiry 过期时间（毫秒），默认为7天
 */
export const setCache = async <T>(key: string, data: T, expiry: number = LOCAL_CACHE_EXPIRY): Promise<void> => {
  try {
    if (isServer) {
      // 服务器端使用Redis
      await setRedisCache(key, data, expiry);
    } else {
      // 客户端使用localStorage
      const cacheItem: LocalCacheItem<T> = {
        data,
        timestamp: Date.now() + expiry
      };
      localStorage.setItem(`${LOCAL_CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
    }
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * 获取缓存
 * @param key 缓存键
 * @returns 缓存数据，如果过期或不存在则返回null
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    if (isServer) {
      // 服务器端使用Redis
      return await getRedisCache<T>(key);
    } else {
      // 客户端使用localStorage
      const cacheItemStr = localStorage.getItem(`${LOCAL_CACHE_PREFIX}${key}`);
      if (!cacheItemStr) {
        return null;
      }

      const cacheItem: LocalCacheItem<T> = JSON.parse(cacheItemStr);
      
      // 检查缓存是否过期
      if (Date.now() > cacheItem.timestamp) {
        // 缓存过期，删除缓存
        localStorage.removeItem(`${LOCAL_CACHE_PREFIX}${key}`);
        return null;
      }

      return cacheItem.data;
    }
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

/**
 * 删除缓存
 * @param key 缓存键
 */
export const removeCache = async (key: string): Promise<void> => {
  try {
    if (isServer) {
      // 服务器端使用Redis
      await deleteRedisCache(key);
    } else {
      // 客户端使用localStorage
      localStorage.removeItem(`${LOCAL_CACHE_PREFIX}${key}`);
    }
  } catch (error) {
    console.error('Error removing cache:', error);
  }
};

/**
 * 清空所有缓存
 */
export const clearCache = async (): Promise<void> => {
  try {
    if (isServer) {
      // 服务器端使用Redis
      await clearRedisCache();
    } else {
      // 客户端使用localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * 更新缓存
 * @param key 缓存键
 * @param updater 更新函数
 * @returns 更新后的数据，如果缓存不存在则返回null
 */
export const updateCache = async <T>(key: string, updater: (data: T) => T): Promise<T | null> => {
  try {
    if (isServer) {
      // 服务器端使用Redis
      return await updateRedisCache<T>(key, updater);
    } else {
      // 客户端使用localStorage
      const currentData = await getCache<T>(key);
      if (currentData === null) {
        return null;
      }

      const updatedData = updater(currentData);
      await setCache(key, updatedData);
      return updatedData;
    }
  } catch (error) {
    console.error('Error updating cache:', error);
    return null;
  }
};

/**
 * 获取聊天消息缓存键
 * @param userId 当前用户ID
 * @param otherId 对方用户ID或群ID
 * @param isGroup 是否是群聊
 * @returns 缓存键
 */
export const getChatCacheKey = (userId: string, otherId: string, isGroup: boolean = false): string => {
  // 使用Redis的缓存键生成逻辑，保持一致性
  return getRedisChatCacheKey(userId, otherId, isGroup);
};

// 导出过期时间常量
export { EXPIRY };


// 本地缓存工具函数

// 缓存键前缀
const CACHE_PREFIX = 'confession_wall_';

// 缓存过期时间（毫秒）
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

// 缓存数据结构
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * 设置缓存
 * @param key 缓存键
 * @param data 缓存数据
 * @param expiry 过期时间（毫秒），默认为7天
 */
export const setCache = <T>(key: string, data: T, expiry: number = CACHE_EXPIRY): void => {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now() + expiry
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * 获取缓存
 * @param key 缓存键
 * @returns 缓存数据，如果过期或不存在则返回null
 */
export const getCache = <T>(key: string): T | null => {
  try {
    const cacheItemStr = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cacheItemStr) {
      return null;
    }

    const cacheItem: CacheItem<T> = JSON.parse(cacheItemStr);
    
    // 检查缓存是否过期
    if (Date.now() > cacheItem.timestamp) {
      // 缓存过期，删除缓存
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

/**
 * 删除缓存
 * @param key 缓存键
 */
export const removeCache = (key: string): void => {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.error('Error removing cache:', error);
  }
};

/**
 * 清空所有缓存
 */
export const clearCache = (): void => {
  try {
    // 只删除带有前缀的缓存
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
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
export const updateCache = <T>(key: string, updater: (data: T) => T): T | null => {
  try {
    const currentData = getCache<T>(key);
    if (currentData === null) {
      return null;
    }

    const updatedData = updater(currentData);
    setCache(key, updatedData);
    return updatedData;
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
  if (isGroup) {
    return `group_chat_${userId}_${otherId}`;
  }
  // 确保私聊缓存键的唯一性，不受用户ID顺序影响
  const sortedIds = [userId, otherId].sort();
  return `private_chat_${sortedIds.join('_')}`;
};

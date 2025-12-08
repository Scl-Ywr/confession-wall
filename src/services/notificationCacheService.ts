import { getCache, setCache, removeCache } from '@/utils/cache';
import { CacheModule, CacheResource, generateCacheKey } from '@/lib/redis/cache-key-naming';

// 缓存过期时间（秒）
const UNREAD_COUNT_CACHE_EXPIRY = 60 * 5; // 5分钟
const NOTIFICATION_LIST_CACHE_EXPIRY = 60 * 2; // 2分钟

/**
 * 生成未读通知计数缓存键
 * @param userId 用户ID
 * @returns 缓存键
 */
export const getUnreadNotificationsCountCacheKey = (userId: string): string => {
  return generateCacheKey(
    CacheModule.NOTIFICATION,
    CacheResource.STATUS,
    `unread_count:${userId}`
  );
};

/**
 * 生成通知列表缓存键
 * @param userId 用户ID
 * @returns 缓存键
 */
export const getNotificationsListCacheKey = (userId: string): string => {
  return generateCacheKey(
    CacheModule.NOTIFICATION,
    CacheResource.LIST,
    userId
  );
};

/**
 * 获取缓存的未读通知计数
 * @param userId 用户ID
 * @returns 缓存的未读计数，如果缓存不存在则返回null
 */
export const getCachedUnreadNotificationsCount = async (userId: string): Promise<number | null> => {
  const cacheKey = getUnreadNotificationsCountCacheKey(userId);
  const cachedCount = await getCache<number>(cacheKey);
  return cachedCount;
};

/**
 * 设置未读通知计数缓存
 * @param userId 用户ID
 * @param count 未读计数
 */
export const setCachedUnreadNotificationsCount = async (userId: string, count: number): Promise<void> => {
  const cacheKey = getUnreadNotificationsCountCacheKey(userId);
  await setCache(cacheKey, count, UNREAD_COUNT_CACHE_EXPIRY);
};

/**
 * 清除未读通知计数缓存
 * @param userId 用户ID
 */
export const clearUnreadNotificationsCountCache = async (userId: string): Promise<void> => {
  const cacheKey = getUnreadNotificationsCountCacheKey(userId);
  await removeCache(cacheKey);
};

/**
 * 获取缓存的通知列表
 * @param userId 用户ID
 * @returns 缓存的通知列表，如果缓存不存在则返回null
 */
export const getCachedNotificationsList = async <T>(userId: string): Promise<T[] | null> => {
  const cacheKey = getNotificationsListCacheKey(userId);
  const cachedNotifications = await getCache<T[]>(cacheKey);
  return cachedNotifications;
};

/**
 * 设置通知列表缓存
 * @param userId 用户ID
 * @param notifications 通知列表
 */
export const setCachedNotificationsList = async <T>(userId: string, notifications: T[]): Promise<void> => {
  const cacheKey = getNotificationsListCacheKey(userId);
  await setCache(cacheKey, notifications, NOTIFICATION_LIST_CACHE_EXPIRY);
};

/**
 * 清除通知列表缓存
 * @param userId 用户ID
 */
export const clearNotificationsListCache = async (userId: string): Promise<void> => {
  const cacheKey = getNotificationsListCacheKey(userId);
  await removeCache(cacheKey);
};

/**
 * 清除用户所有通知相关缓存
 * @param userId 用户ID
 */
export const clearAllNotificationCache = async (userId: string): Promise<void> => {
  await Promise.all([
    clearUnreadNotificationsCountCache(userId),
    clearNotificationsListCache(userId)
  ]);
};

export const EXPIRY = {
  SHORT: 5 * 60 * 1000,
  MEDIUM: 30 * 60 * 1000,
  LONG: 2 * 60 * 60 * 1000,
  DEFAULT: 60 * 60 * 1000,
  NULL_VALUE: 5 * 60 * 1000,
  LOCK: 10 * 1000,
};

export const generateCacheKey = (key: string): string => {
  return `confession_wall:${key}`;
};

export const getUserProfileCacheKey = (userId: string): string => {
  return generateCacheKey(`user:profile:${userId}`);
};

export {
  getCache,
  setCache,
  deleteCache,
  clearCache,
  updateCache,
} from './cache-manager';

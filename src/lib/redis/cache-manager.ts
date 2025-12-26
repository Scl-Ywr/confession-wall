// Redis缓存管理器
// 提供完整的缓存CRUD操作、动态数据获取机制和缓存统计功能


import { 
  CACHE_EXPIRY, 
  MODULE_EXPIRY, 
  generateCacheKey, 
  getModuleExpiry, 
  CACHE_STATISTICS,
  CACHE_PENETRATION_PROTECTION,
  CACHE_BREAKDOWN_PROTECTION,
  CACHE_AVALANCHE_PROTECTION
} from './cache.config';

// 导入Redis客户端
import { redis } from './client';

// 缓存键前缀
const CACHE_PREFIX = 'confession_wall:';

// 受保护的系统键列表，这些键不会被意外清除
const PROTECTED_KEYS = ['system:cache_version'];

// 缓存数据结构
interface CacheItem<T> {
  data: T;
  timestamp: number;
  version: number;
  hits: number;
}

// 缓存统计数据结构
interface CacheStatistics {
  hits: number;
  misses: number;
  requests: number;
  hitRate: number;
  lastUpdated: number;
  totalKeys: number;
  cacheSize: number;
  averageHitTime: number;
  averageMissTime: number;
 热点键: string[];
  moduleStats: Record<string, { hits: number; misses: number; hitRate: number }>;
  errorCount: number;
  cacheOperations: {
    get: number;
    set: number;
    delete: number;
    clear: number;
  };
}

/**
 * Redis缓存管理器类
 */
export class RedisCacheManager {
  private static instance: RedisCacheManager;
  private isInitialized: boolean = false;
  
  // 增强的统计属性
  private stats: CacheStatistics = {
    hits: 0,
    misses: 0,
    requests: 0,
    hitRate: 0,
    lastUpdated: Date.now(),
    totalKeys: 0,
    cacheSize: 0,
    averageHitTime: 0,
    averageMissTime: 0,
    热点键: [],
    moduleStats: {},
    errorCount: 0,
    cacheOperations: {
      get: 0,
      set: 0,
      delete: 0,
      clear: 0
    }
  };
  
  // 性能监控
  private hitTimes: number[] = [];
  private missTimes: number[] = [];
  
  // 操作计数
  private operations = {
    get: 0,
    set: 0,
    delete: 0,
    clear: 0
  };

  private constructor() {
    this.initialize();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): RedisCacheManager {
    if (!RedisCacheManager.instance) {
      RedisCacheManager.instance = new RedisCacheManager();
    }
    return RedisCacheManager.instance;
  }

  /**
   * 初始化缓存管理器
   */
  private async initialize(): Promise<void> {
    try {
      if (redis) {
        // 检查Redis连接
        await redis.ping();
        this.isInitialized = true;
        if (process.env.NODE_ENV === 'development') {
          console.log('RedisCacheManager initialized successfully');
        }
        
        // 初始化缓存版本
        await this.setCache(
          generateCacheKey('CACHE_VERSION', {}),
          { version: 1, lastUpdated: Date.now() },
          CACHE_EXPIRY.FOREVER
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to initialize RedisCacheManager:', error);
      }
      this.isInitialized = false;
    }
  }

  /**
   * 确保缓存管理器已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * 生成带前缀的完整缓存键
   */
  private getFullCacheKey(key: string): string {
    return `${CACHE_PREFIX}${key}`;
  }

  /**
   * 应用缓存雪崩防护，添加随机过期时间
   */
  private applyAvalancheProtection(expiry: number): number {
    if (!CACHE_AVALANCHE_PROTECTION.ENABLED || expiry <= 0) {
      return expiry;
    }
    
    // 开发和测试环境：使用固定过期时间，便于测试
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      return expiry;
    }
    
    // 生产环境：根据过期时间的10%计算随机偏移范围
    const relativeOffset = Math.floor(expiry * CACHE_AVALANCHE_PROTECTION.RANDOM_EXPIRY_RATIO);
    
    // 确保随机偏移不会超过最大范围
    const maxOffset = Math.min(relativeOffset, CACHE_AVALANCHE_PROTECTION.RANDOM_EXPIRY_RANGE);
    
    // 生成随机偏移（±maxOffset范围内）
    const randomOffset = Math.floor(Math.random() * (2 * maxOffset + 1)) - maxOffset;
    
    // 确保最终过期时间大于0
    return Math.max(1, expiry + randomOffset);
  }

  /**
   * 更新缓存统计
   */
  private async updateStatistics(isHit: boolean, startTime: number = Date.now(), key: string = ''): Promise<void> {
    // 在浏览器环境中，直接返回，不更新统计
    if (typeof window !== 'undefined') return;
    
    if (!CACHE_STATISTICS.ENABLED || !redis || !this.isInitialized) return;

    // 采样率控制
    if (Math.random() > CACHE_STATISTICS.SAMPLE_RATE) return;

    const endTime = Date.now();
    const duration = endTime - startTime;
    const statsKey = this.getFullCacheKey('statistics:cache:main');
    
    try {
      // 获取当前统计数据
      const statsStr = await redis.get(statsKey);
      
      if (statsStr) {
        this.stats = JSON.parse(statsStr);
      }

      // 更新统计数据
      this.stats.requests++;
      this.operations.get++;
      
      if (isHit) {
        this.stats.hits++;
        this.hitTimes.push(duration);
        // 只保留最近100个记录
        if (this.hitTimes.length > 100) {
          this.hitTimes.shift();
        }
      } else {
        this.stats.misses++;
        this.missTimes.push(duration);
        // 只保留最近100个记录
        if (this.missTimes.length > 100) {
          this.missTimes.shift();
        }
      }
      
      // 更新平均响应时间
      this.stats.averageHitTime = this.hitTimes.length > 0 
        ? this.hitTimes.reduce((sum, time) => sum + time, 0) / this.hitTimes.length 
        : 0;
      this.stats.averageMissTime = this.missTimes.length > 0 
        ? this.missTimes.reduce((sum, time) => sum + time, 0) / this.missTimes.length 
        : 0;
      
      // 更新命中率
      this.stats.hitRate = this.stats.requests > 0 ? this.stats.hits / this.stats.requests : 0;
      
      // 更新模块统计
      const keyParts = key.split(':');
      if (keyParts.length > 1) {
        const moduleName = keyParts[0];
        if (!this.stats.moduleStats[moduleName]) {
          this.stats.moduleStats[moduleName] = { hits: 0, misses: 0, hitRate: 0 };
        }
        
        const moduleStats = this.stats.moduleStats[moduleName];
        if (isHit) {
          moduleStats.hits++;
        } else {
          moduleStats.misses++;
        }
        moduleStats.hitRate = (moduleStats.hits + moduleStats.misses) > 0 
          ? moduleStats.hits / (moduleStats.hits + moduleStats.misses) 
          : 0;
      }
      
      // 更新操作计数
      this.stats.cacheOperations = this.operations;
      
      // 更新缓存键总数和大小
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      this.stats.totalKeys = keys.length;
      
      // 计算热点键
      const hotKeys = await this.getHotKeys(5);
      this.stats.热点键 = hotKeys;
      
      // 更新最后更新时间
      this.stats.lastUpdated = Date.now();

      // 保存统计数据
      await redis.set(statsKey, JSON.stringify(this.stats), 'PX', CACHE_EXPIRY.MEDIUM);
    } catch (error) {
      console.error('Failed to update cache statistics:', error);
      this.stats.errorCount++;
    }
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param expiry 过期时间（毫秒）
   */
  public async setCache<T>(
    key: string,
    data: T,
    expiry: number = CACHE_EXPIRY.DEFAULT
  ): Promise<boolean> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        // 记录缓存设置操作，只在开发环境输出
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Setting cache for key: ${key} with expiry: ${expiry}ms at ${new Date().toISOString()}`);
        }
        
        const cacheKey = this.getFullCacheKey(key);
        const adjustedExpiry = this.applyAvalancheProtection(expiry);
        
        const cacheItem: CacheItem<T> = {
          data,
          timestamp: Date.now(),
          version: 1,
          hits: 0
        };

        if (adjustedExpiry > 0) {
          await redis.set(cacheKey, JSON.stringify(cacheItem), 'PX', adjustedExpiry);
        } else {
          await redis.set(cacheKey, JSON.stringify(cacheItem));
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Cache set successfully for key: ${key} at ${new Date().toISOString()}`);
        }
        return true;
      }
      return false;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[RedisCache] Error setting cache for key: ${key}`, error);
      }
      return false;
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果过期或不存在则返回null
   */
  public async getCache<T>(key: string): Promise<T | null> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        const cacheKey = this.getFullCacheKey(key);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Getting cache for key: ${key} at ${new Date().toISOString()}`);
        }
        
        const cacheItemStr = await redis.get(cacheKey);
        
        if (!cacheItemStr) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[RedisCache] Cache miss for key: ${key} at ${new Date().toISOString()}`);
          }
          await this.updateStatistics(false);
          return null;
        }

        try {
          const cacheItem: CacheItem<T> = JSON.parse(cacheItemStr);
          
          // 更新命中次数
          cacheItem.hits++;
          await redis.set(cacheKey, JSON.stringify(cacheItem), 'PX', await redis.pttl(cacheKey));
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[RedisCache] Cache hit for key: ${key}, hits: ${cacheItem.hits} at ${new Date().toISOString()}`);
          }
          await this.updateStatistics(true);
          return cacheItem.data;
        } catch (parseError) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`[RedisCache] Error parsing cache item for key: ${key}`, parseError);
          }
          await this.updateStatistics(false);
          return null;
        }
      }
      await this.updateStatistics(false);
      return null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[RedisCache] Error getting cache for key: ${key}`, error);
      }
      await this.updateStatistics(false);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  public async deleteCache(key: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        const cacheKey = this.getFullCacheKey(key);
        await redis.del(cacheKey);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting cache:', error);
      return false;
    }
  }

  /**
   * 更新缓存
   * @param key 缓存键
   * @param updater 更新函数
   * @returns 更新后的数据，如果缓存不存在则返回null
   */
  public async updateCache<T>(
    key: string,
    updater: (data: T) => T
  ): Promise<T | null> {
    try {
      await this.ensureInitialized();
      const currentData = await this.getCache<T>(key);
      if (currentData === null) {
        return null;
      }
      
      const updatedData = updater(currentData);
      // 保持原有的过期时间
      const ttl = await this.getCacheTTL(key);
      await this.setCache(key, updatedData, ttl > 0 ? ttl : CACHE_EXPIRY.DEFAULT);
      
      return updatedData;
    } catch (error) {
      console.error('Error updating cache:', error);
      return null;
    }
  }

  /**
   * 获取缓存剩余过期时间
   * @param key 缓存键
   * @returns 剩余过期时间（毫秒），-1表示永不过期，-2表示不存在
   */
  public async getCacheTTL(key: string): Promise<number> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        const cacheKey = this.getFullCacheKey(key);
        return await redis.pttl(cacheKey);
      }
      return -2;
    } catch (error) {
      console.error('Error getting cache TTL:', error);
      return -2;
    }
  }

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param expiry 过期时间（毫秒）
   */
  public async setCacheExpiry(key: string, expiry: number): Promise<boolean> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        const cacheKey = this.getFullCacheKey(key);
        const adjustedExpiry = this.applyAvalancheProtection(expiry);
        
        if (adjustedExpiry > 0) {
          await redis.pexpire(cacheKey, adjustedExpiry);
        } else {
          await redis.persist(cacheKey);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting cache expiry:', error);
      return false;
    }
  }

  /**
   * 动态数据获取：先从缓存获取，缓存不存在则从数据源获取并更新缓存
   * @param key 缓存键
   * @param dataSource 数据源函数
   * @param expiry 过期时间（毫秒）
   * @param module 模块名称（用于自动获取过期时间）
   */
  public async getOrSetCache<T>(
    key: string,
    dataSource: () => Promise<T>,
    expiry?: number,
    module?: keyof typeof MODULE_EXPIRY
  ): Promise<T | null> {
    try {
      // 检查是否在浏览器环境中
      if (typeof window !== 'undefined') {
        // 在浏览器环境中，直接从数据源获取数据，不使用Redis缓存
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Browser environment detected, fetching directly from data source for key: ${key}`);
        }
        return await dataSource();
      }
      
      // 确保在服务器端环境中
      await this.ensureInitialized();
      
      // 检查Redis客户端是否可用
      if (!redis || !this.isInitialized) {
        // Redis不可用，直接从数据源获取数据
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Redis not available, fetching directly from data source for key: ${key}`);
        }
        return await dataSource();
      }
      
      // 1. 尝试从缓存获取
      const cachedData = await this.getCache<T>(key);
      if (cachedData !== null) {
        // 添加调试日志
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Cache hit for key: ${key}`);
        }
        return cachedData;
      }

      // 2. 缓存穿透防护：检查空值缓存
      const nullCacheKey = `${key}:null`;
      if (CACHE_PENETRATION_PROTECTION.ENABLED) {
        const hasNullCache = await this.getCache<boolean>(nullCacheKey);
        if (hasNullCache) {
          return null;
        }
      }

      // 3. 缓存击穿防护：获取互斥锁
      let lockAcquired = true;
      const lockKey = generateCacheKey('LOCK', { key });
      
      if (CACHE_BREAKDOWN_PROTECTION.ENABLED) {
        lockAcquired = await this.acquireLock(lockKey);
        if (!lockAcquired) {
          // 锁被占用，等待后重试
          await new Promise(resolve => setTimeout(resolve, 100));
          return this.getOrSetCache(key, dataSource, expiry, module);
        }
      }

      try {
        // 4. 双重检查缓存
        const doubleCheckData = await this.getCache<T>(key);
        if (doubleCheckData !== null) {
          return doubleCheckData;
        }

        // 5. 从数据源获取数据
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Cache miss for key: ${key}, fetching from data source`);
        }
        const data = await dataSource();
        
        if (data === null || data === undefined) {
          // 6. 缓存穿透防护：设置空值缓存
          if (CACHE_PENETRATION_PROTECTION.ENABLED) {
            await this.setCache(nullCacheKey, true, CACHE_EXPIRY.NULL_VALUE);
          }
          return null;
        }

        // 7. 设置缓存
        const finalExpiry = expiry || (module ? getModuleExpiry(module) : CACHE_EXPIRY.DEFAULT);
        
        // 添加调试日志
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Setting cache for key: ${key}, expiry: ${finalExpiry}ms`);
        }
        
        await this.setCache(key, data, finalExpiry);
        
        return data;
      } finally {
        // 8. 释放锁
        if (CACHE_BREAKDOWN_PROTECTION.ENABLED && lockAcquired) {
          await this.releaseLock(lockKey);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[RedisCache] Error in getOrSetCache for key ${key}:`, error);
      }
      // 发生错误时，直接从数据源获取数据，确保系统可用性
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Falling back to data source for key: ${key}`);
        }
        return await dataSource();
      } catch (fallbackError) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[RedisCache] Failed to fetch from data source for key ${key}:`, fallbackError);
        }
        return null;
      }
    }
  }

  /**
   * 获取互斥锁
   * @param key 锁键
   * @returns 是否获取到锁
   */
  private async acquireLock(key: string): Promise<boolean> {
    if (typeof window === 'undefined' && redis && this.isInitialized) {
      const lockKey = this.getFullCacheKey(key);
      try {
        const result = await redis.set(lockKey, '1', 'PX', CACHE_EXPIRY.LOCK, 'NX');
        return result === 'OK';
      } catch (error) {
        console.error('Error acquiring lock:', error);
        return false;
      }
    }
    return true;
  }

  /**
   * 释放互斥锁
   * @param key 锁键
   */
  private async releaseLock(key: string): Promise<boolean> {
    if (typeof window === 'undefined' && redis && this.isInitialized) {
      const lockKey = this.getFullCacheKey(key);
      try {
        await redis.del(lockKey);
        return true;
      } catch (error) {
        console.error('Error releasing lock:', error);
        return false;
      }
    }
    return true;
  }

  /**
   * 清空所有缓存
   * 注意：受保护的系统键不会被清除
   */
  public async clearCache(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        const keys = await redis.keys(`${CACHE_PREFIX}*`);
        
        // 过滤掉受保护的键       
        const keysToDelete = keys.filter((key: string) => {
          const keyWithoutPrefix = key.replace(CACHE_PREFIX, '');
          return !PROTECTED_KEYS.includes(keyWithoutPrefix);
        });
        
        // 记录要删除的键数量和受保护的键数量
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Clearing cache: ${keysToDelete.length} keys to delete, ${keys.length - keysToDelete.length} keys protected`);
        }
        
        if (keysToDelete.length > 0) {
        // ioredis的del方法不支持直接传递数组，需要使用展开运算符
        await redis.del(...keysToDelete);
      }
        
        return true;
      }
      return false;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error clearing cache:', error);
      }
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  public async getCacheStatistics(): Promise<CacheStatistics | null> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        const statsKey = this.getFullCacheKey('statistics:cache:main');
        const statsStr = await redis.get(statsKey);
        
        if (statsStr) {
          return JSON.parse(statsStr);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cache statistics:', error);
      return null;
    }
  }

  /**
   * 获取所有缓存键
   * @param pattern 键模式
   */
  public async getCacheKeys(pattern: string = '*'): Promise<string[]> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {   
        const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
        return keys.map((key: string) => key.replace(CACHE_PREFIX, ''));
      }
      return [];
    } catch (error) {
      console.error('Error getting cache keys:', error);
      return [];
    }
  }

  /**
   * 根据键列表清除缓存
   * @param keys 缓存键列表
   */
  public async deleteCacheKeys(keys: string[]): Promise<number> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        let deletedCount = 0;
        
        for (const key of keys) {
          // 检查是否为受保护的键
          if (PROTECTED_KEYS.includes(key)) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[RedisCache] Skipping deletion of protected key: ${key}`);
            }
            continue;
          }
          
          const cacheKey = this.getFullCacheKey(key);
          await redis.del(cacheKey);
          deletedCount++;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Deleted ${deletedCount} out of ${keys.length} requested keys`);
        }
        return deletedCount;
      }
      return 0;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting cache keys:', error);
      }
      return 0;
    }
  }

  /**
   * 根据模式清除缓存
   * @param pattern 键模式
   */
  public async deleteCacheByPattern(pattern: string): Promise<number> {
    try {
      await this.ensureInitialized();
      if (typeof window === 'undefined' && redis && this.isInitialized) {
        const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
        
        // 过滤掉受保护的键       
        const keysToDelete = keys.filter((key: string) => {
          const keyWithoutPrefix = key.replace(CACHE_PREFIX, '');
          return !PROTECTED_KEYS.includes(keyWithoutPrefix);
        });
        
        if (keysToDelete.length > 0) {
          // ioredis的del方法不支持直接传递数组，需要使用展开运算符
          await redis.del(...keysToDelete);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RedisCache] Deleted ${keysToDelete.length} keys matching pattern: ${pattern}`);
        }
        return keysToDelete.length;
      }
      return 0;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting cache by pattern:', error);
      }
      return 0;
    }
  }

  /**
   * 根据模块清除缓存
   * @param module 模块名称
   */
  public async deleteCacheByModule(module: string): Promise<number> {
    try {
      await this.ensureInitialized();
      const pattern = `${module}:*`;
      return await this.deleteCacheByPattern(pattern);
    } catch (error) {
      console.error('Error deleting cache by module:', error);
      return 0;
    }
  }

  /**
   * 获取热点键
   * @param limit 返回的热点键数量
   */
  private async getHotKeys(limit: number = 5): Promise<string[]> {
    if (!redis) return [];
    
    try {
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      
      // 过滤掉系统键和统计键     
      const cacheKeys = keys.filter((key: string) => {
        const keyWithoutPrefix = key.replace(CACHE_PREFIX, '');
        return !keyWithoutPrefix.startsWith('system:') && !keyWithoutPrefix.startsWith('statistics:');
      });
      
      // 获取每个键的命中次数
      const keyHits = await Promise.all(
        cacheKeys.map(async (key: string) => {
          try {
            if (redis) {
              const cacheItemStr = await redis.get(key);
              if (cacheItemStr) {
                const cacheItem = JSON.parse(cacheItemStr);
                return { key: key.replace(CACHE_PREFIX, ''), hits: cacheItem.hits || 0 };
              }
            }
            return { key: key.replace(CACHE_PREFIX, ''), hits: 0 };
          } catch (error) {
            console.error(`Error getting hits for key ${key}:`, error);
            return { key: key.replace(CACHE_PREFIX, ''), hits: 0 };
          }
        })
      );
      
      // 按命中次数排序，返回前N个
      return keyHits
        .sort((a, b) => b.hits - a.hits)
        .slice(0, limit)
        .map(item => item.key);
    } catch (error) {
      console.error('Error getting hot keys:', error);
      return [];
    }
  }
  
  /**
   * 更新操作计数
   */
  private updateOperationCount(type: keyof typeof this.operations): void {
    this.operations[type]++;
  }
  
  /**
   * 检查缓存管理器是否初始化成功
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// 导出单例实例
export const cacheManager = RedisCacheManager.getInstance();

// 导出常用函数
export const getCache = cacheManager.getCache.bind(cacheManager);
export const setCache = cacheManager.setCache.bind(cacheManager);
export const deleteCache = cacheManager.deleteCache.bind(cacheManager);
export const deleteCacheKeys = cacheManager.deleteCacheKeys.bind(cacheManager);
export const deleteCacheByPattern = cacheManager.deleteCacheByPattern.bind(cacheManager);
export const deleteCacheByModule = cacheManager.deleteCacheByModule.bind(cacheManager);
export const updateCache = cacheManager.updateCache.bind(cacheManager);
export const getOrSetCache = cacheManager.getOrSetCache.bind(cacheManager);
export const getCacheStatistics = cacheManager.getCacheStatistics.bind(cacheManager);
export const getCacheKeys = cacheManager.getCacheKeys.bind(cacheManager);
export const clearCache = cacheManager.clearCache.bind(cacheManager);

/**
 * 缓存刷新管理器
 * 实现自动缓存刷新机制，定期后台刷新过期缓存
 * 支持基于访问频率的智能刷新和预加载机制
 */

import { redis } from './client';
import { cacheManager } from './cache-manager';
import { cacheKeyManager } from './cache-key-manager';
import { CacheModule, CacheResource } from './cache-key-naming';

// 刷新策略配置
interface RefreshStrategy {
  // 定期刷新间隔（毫秒）
  interval: number;
  // 预加载阈值（百分比）
  preloadThreshold: number;
  // 最大并行刷新数量
  maxParallelRefreshes: number;
  // 基于访问频率的刷新阈值（命中次数）
  frequencyThreshold: number;
}

// 默认刷新策略配置
const DEFAULT_STRATEGY: RefreshStrategy = {
  interval: 5 * 60 * 1000, // 5分钟
  preloadThreshold: 0.8, // 过期时间剩余20%时开始预加载
  maxParallelRefreshes: 5,
  frequencyThreshold: 10 // 命中次数超过10次的键才会被自动刷新
};

/**
 * 缓存刷新管理器类
 */
export class CacheRefreshManager {
  private static instance: CacheRefreshManager;
  private isRunning: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private strategy: RefreshStrategy;
  // private refreshQueue: string[] = []; // 备用，当前未使用
  private isRefreshing: boolean = false;

  private constructor(strategy: RefreshStrategy = DEFAULT_STRATEGY) {
    this.strategy = strategy;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(strategy?: RefreshStrategy): CacheRefreshManager {
    if (!CacheRefreshManager.instance) {
      CacheRefreshManager.instance = new CacheRefreshManager(strategy);
    }
    return CacheRefreshManager.instance;
  }

  /**
   * 启动缓存刷新任务
   */
  public start(): void {
    if (this.isRunning) {
      console.log('[Cache Refresh] Refresh task is already running');
      return;
    }

    this.isRunning = true;
    console.log('[Cache Refresh] Starting cache refresh task');

    // 立即执行一次刷新
    this.refreshExpiringCaches();

    // 设置定期刷新
    this.refreshInterval = setInterval(() => {
      this.refreshExpiringCaches();
    }, this.strategy.interval);

    console.log(`[Cache Refresh] Refresh task started with interval ${this.strategy.interval}ms`);
  }

  /**
   * 停止缓存刷新任务
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('[Cache Refresh] Refresh task is not running');
      return;
    }

    this.isRunning = false;
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    console.log('[Cache Refresh] Refresh task stopped');
  }

  /**
   * 刷新即将过期的缓存
   */
  private async refreshExpiringCaches(): Promise<void> {
    if (this.isRefreshing || !redis) {
      return;
    }

    this.isRefreshing = true;
    console.log('[Cache Refresh] Starting cache refresh process');

    try {
      // 获取所有缓存键
      const keys = await redis.keys(`${cacheKeyManager.generateCacheKey(CacheModule.SYSTEM, CacheResource.MAIN)}:*`);
      
      // 过滤掉系统键和统计键
      const cacheKeys = keys.filter((key: string) => {
        const keyWithoutPrefix = key.replace(`${cacheKeyManager.generateCacheKey(CacheModule.SYSTEM, CacheResource.MAIN)}:`, '');
        return !keyWithoutPrefix.startsWith('system:') && !keyWithoutPrefix.startsWith('statistics:');
      });

      // 获取每个键的TTL和命中次数
      const cacheItems = await Promise.all(
        cacheKeys.map(async (key: string) => {
          try {
            const ttl = redis ? await redis.pttl(key) : -1;
            const cacheItemStr = redis ? await redis.get(key) : null;
            let hits = 0;
            let expiry = 0;
            
            if (cacheItemStr) {
              const cacheItem = JSON.parse(cacheItemStr);
              hits = cacheItem.hits || 0;
              
              // 计算原始过期时间
              expiry = ttl + Date.now() - cacheItem.timestamp;
            }
            
            return {
              key,
              ttl,
              hits,
              expiry
            };
          } catch (error) {
            console.error(`[Cache Refresh] Error processing key ${key}:`, error);
            return null;
          }
        })
      );

      // 过滤掉无效项和不需要刷新的项
      const itemsToRefresh = cacheItems
        .filter((item) => item !== null && item.ttl > 0 && item.hits >= this.strategy.frequencyThreshold) as Array<{
          key: string;
          ttl: number;
          hits: number;
          expiry: number;
        }>;

      // 计算预加载阈值
      const preloadItems = itemsToRefresh.filter(item => {
        // 计算剩余有效期百分比
        const remainingPercentage = item.ttl / item.expiry;
        return remainingPercentage <= this.strategy.preloadThreshold;
      });

      console.log(`[Cache Refresh] Found ${preloadItems.length} items to refresh out of ${cacheItems.length} cache items`);

      // 限制并行刷新数量
      const itemsToProcess = preloadItems.slice(0, this.strategy.maxParallelRefreshes);

      // 并行刷新缓存
      await Promise.all(
        itemsToProcess.map(async (item) => {
          try {
            console.log(`[Cache Refresh] Refreshing cache key: ${item.key}`);
            
            // 调用缓存管理器的刷新方法
            // 这里我们无法直接调用getOrSetCache，因为我们没有数据源函数
            // 所以我们只是检查缓存是否存在，如果存在就重新设置（保持原有的TTL）
            const cacheItemStr = redis ? await redis.get(item.key) : null;
            if (cacheItemStr) {
              const cacheItem = JSON.parse(cacheItemStr);
              
              // 重新设置缓存，保持原有的TTL
              await cacheManager.setCache(
                item.key.replace(`${cacheKeyManager.generateCacheKey(CacheModule.SYSTEM, CacheResource.MAIN)}:`, ''),
                cacheItem.data,
                item.ttl
              );
              
              console.log(`[Cache Refresh] Successfully refreshed cache key: ${item.key}`);
            }
          } catch (error) {
            console.error(`[Cache Refresh] Error refreshing cache key ${item.key}:`, error);
          }
        })
      );

      console.log(`[Cache Refresh] Completed refreshing ${itemsToProcess.length} cache items`);
    } catch (error) {
      console.error('[Cache Refresh] Error in cache refresh process:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 手动触发缓存刷新
   * @param pattern 缓存键模式，默认为所有缓存键
   */
  public async manualRefresh(pattern: string = '*'): Promise<void> {
    if (this.isRefreshing || !redis) {
      return;
    }

    this.isRefreshing = true;
    console.log(`[Cache Refresh] Starting manual cache refresh for pattern: ${pattern}`);

    try {
      // 获取匹配模式的缓存键
      const keys = redis ? await redis.keys(`${cacheKeyManager.generateCacheKey(CacheModule.SYSTEM, CacheResource.MAIN)}:${pattern}`) : [];
      
      console.log(`[Cache Refresh] Found ${keys.length} keys matching pattern: ${pattern}`);

      // 刷新匹配的缓存键
      await Promise.all(
        keys.map(async (key: string) => {
          try {
            console.log(`[Cache Refresh] Manually refreshing cache key: ${key}`);
            
            // 获取缓存项
            const cacheItemStr = redis ? await redis.get(key) : null;
            if (cacheItemStr) {
              const cacheItem = JSON.parse(cacheItemStr);
              const ttl = redis ? await redis.pttl(key) : -1;
              
              await cacheManager.setCache(
                key.replace(`${cacheKeyManager.generateCacheKey(CacheModule.SYSTEM, CacheResource.MAIN)}:`, ''),
                cacheItem.data,
                ttl
              );
              
              console.log(`[Cache Refresh] Successfully manually refreshed cache key: ${key}`);
            }
          } catch (error) {
            console.error(`[Cache Refresh] Error manually refreshing cache key ${key}:`, error);
          }
        })
      );

      console.log(`[Cache Refresh] Completed manual refresh for ${keys.length} cache items`);
    } catch (error) {
      console.error('[Cache Refresh] Error in manual refresh process:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 获取当前刷新策略
   */
  public getStrategy(): RefreshStrategy {
    return { ...this.strategy };
  }

  /**
   * 更新刷新策略
   */
  public updateStrategy(strategy: Partial<RefreshStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
    console.log('[Cache Refresh] Updated refresh strategy:', this.strategy);
  }

  /**
   * 检查刷新任务是否正在运行
   */
  public isRefreshRunning(): boolean {
    return this.isRunning;
  }
}

// 导出单例实例
export const cacheRefreshManager = CacheRefreshManager.getInstance();

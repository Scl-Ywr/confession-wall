/**
 * 缓存失效机制
 * 实现多种缓存失效策略：时间过期、事件驱动、版本控制、依赖关系
 */

import { supabaseRedisCache } from './supabase-redis-cache';
import { CacheModule, CacheResource, generateCacheKey } from './cache-key-naming';
import { CacheConfig } from './supabase-redis-cache';

// 缓存依赖关系映射表
type CacheDependencyMap = Map<string, Set<string>>;

/**
 * 缓存失效管理器
 */
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  private dependencyMap: CacheDependencyMap = new Map();
  private versionMap: Map<string, number> = new Map();

  private constructor() {
    this.initialize();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  /**
   * 初始化缓存失效管理器
   */
  private initialize(): void {
    // 注册Supabase实时监听，用于事件驱动的缓存失效
    this.registerSupabaseRealtimeListeners();
    // 初始化版本映射
    this.initializeVersionMap();
  }

  /**
   * 注册Supabase实时监听
   * 当数据发生变化时，自动失效相关缓存
   */
  private registerSupabaseRealtimeListeners(): void {
    // 这里可以添加Supabase实时监听逻辑
    // 例如：监听用户资料变化，失效用户相关缓存
    // 由于这是前端环境，实际的实时监听可能需要在组件中实现
    // 这里只提供框架
    console.log('[CacheInvalidation] Initialized Supabase realtime listeners');
  }

  /**
   * 初始化版本映射
   */
  private initializeVersionMap(): void {
    // 为每个模块初始化版本号
    Object.values(CacheModule).forEach(module => {
      this.versionMap.set(module, 1);
    });
  }

  /**
   * 注册缓存依赖关系
   * @param cacheKey 缓存键
   * @param dependencies 依赖的其他缓存键
   */
  public registerDependency(cacheKey: string, dependencies: string[]): void {
    for (const depKey of dependencies) {
      if (!this.dependencyMap.has(depKey)) {
        this.dependencyMap.set(depKey, new Set());
      }
      this.dependencyMap.get(depKey)?.add(cacheKey);
    }
  }

  /**
   * 移除缓存依赖关系
   * @param cacheKey 缓存键
   */
  public removeDependency(cacheKey: string): void {
    this.dependencyMap.forEach((dependents, depKey) => {
      if (dependents.has(cacheKey)) {
        dependents.delete(cacheKey);
        if (dependents.size === 0) {
          this.dependencyMap.delete(depKey);
        }
      }
    });
  }

  /**
   * 失效指定缓存
   * @param cacheKey 缓存键
   */
  public async invalidateCache(cacheKey: string): Promise<number> {
    // 1. 失效当前缓存
    await supabaseRedisCache.deleteCache(cacheKey);
    
    // 2. 失效所有依赖于当前缓存的缓存
    const dependents = this.dependencyMap.get(cacheKey);
    let dependentCount = 0;
    if (dependents) {
      dependentCount = dependents.size;
      dependents.forEach(async (dependentKey) => {
        await supabaseRedisCache.deleteCache(dependentKey);
      });
    }
    
    return 1 + dependentCount;
  }

  /**
   * 失效指定模式的缓存
   * @param pattern 缓存键模式
   */
  public async invalidateCacheByPattern(pattern: string): Promise<number> {
    return await supabaseRedisCache.deleteCacheByPattern(pattern);
  }

  /**
   * 失效指定模块的所有缓存
   * @param module 模块名称
   */
  public async invalidateCacheByModule(module: CacheModule): Promise<number> {
    // 1. 失效模块下的所有缓存
    const count = await supabaseRedisCache.deleteCacheByModule(module);
    
    // 2. 更新模块版本号
    this.incrementModuleVersion(module);
    
    return count;
  }

  /**
   * 批量失效缓存
   * @param cacheKeys 缓存键列表
   */
  public async invalidateCacheKeys(cacheKeys: string[]): Promise<number> {
    return await supabaseRedisCache.deleteCacheKeys(cacheKeys);
  }

  /**
   * 失效用户相关缓存
   * @param userId 用户ID
   */
  public async invalidateUserCache(userId: string): Promise<void> {
    await supabaseRedisCache.deleteCache(generateCacheKey(CacheModule.USER, CacheResource.PROFILE, userId));
    await supabaseRedisCache.deleteCache(generateCacheKey(CacheModule.USER, CacheResource.STATUS, userId));
    // 失效用户相关的其他缓存
    await this.invalidateCacheByPattern(`*:user:${userId}:*`);
  }

  /**
   * 失效告白相关缓存
   * @param confessionId 告白ID
   */
  public async invalidateConfessionCache(confessionId: string): Promise<void> {
    // 失效告白详情缓存
    await supabaseRedisCache.deleteCache(generateCacheKey(CacheModule.CONFESSION, CacheResource.DETAIL, confessionId));
    // 失效所有告白列表缓存（因为列表可能包含该告白）
    await this.invalidateCacheByPattern(`${CacheModule.CONFESSION}:${CacheResource.LIST}:*`);
  }

  /**
   * 失效聊天相关缓存
   * @param userId1 用户ID1
   * @param userId2 用户ID2
   * @param isGroup 是否是群聊
   */
  public async invalidateChatCache(userId1: string, userId2: string, isGroup: boolean = false): Promise<void> {
    if (isGroup) {
      // 失效群聊缓存
      await supabaseRedisCache.deleteCache(generateCacheKey(CacheModule.CHAT, CacheResource.GROUP, userId1));
      // 失效群成员列表缓存
      await supabaseRedisCache.deleteCache(generateCacheKey(CacheModule.CHAT, CacheResource.MEMBER, userId1));
    } else {
      // 失效私聊缓存
      const sortedIds = [userId1, userId2].sort();
      await supabaseRedisCache.deleteCache(generateCacheKey(CacheModule.CHAT, CacheResource.PRIVATE, `${sortedIds[0]}:${sortedIds[1]}`));
    }
  }

  /**
   * 递增模块版本号
   * @param module 模块名称
   */
  public incrementModuleVersion(module: CacheModule): void {
    const currentVersion = this.versionMap.get(module) || 0;
    this.versionMap.set(module, currentVersion + 1);
  }

  /**
   * 获取模块当前版本号
   * @param module 模块名称
   */
  public getModuleVersion(module: CacheModule): number {
    return this.versionMap.get(module) || 1;
  }

  /**
   * 检查缓存版本是否有效
   * @param module 模块名称
   * @param version 缓存版本
   */
  public isVersionValid(module: CacheModule, version: number): boolean {
    return version === this.getModuleVersion(module);
  }

  /**
   * 获取带版本号的缓存键
   * @param cacheKey 原始缓存键
   * @param module 模块名称
   */
  public getVersionedCacheKey(cacheKey: string, module: CacheModule): string {
    const version = this.getModuleVersion(module);
    return `${cacheKey}:v${version}`;
  }

  /**
   * 清除所有缓存
   */
  public async clearAllCache(): Promise<boolean> {
    // 1. 清除所有缓存
    const result = await supabaseRedisCache.clearAllCache();
    
    // 2. 重置版本映射
    this.resetVersionMap();
    
    return result;
  }

  /**
   * 重置版本映射
   */
  private resetVersionMap(): void {
    this.versionMap.clear();
    this.initializeVersionMap();
  }



  /**
   * 获取缓存依赖关系
   */
  public getDependencyMap(): CacheDependencyMap {
    return new Map(this.dependencyMap);
  }

  /**
   * 获取版本映射
   */
  public getVersionMap(): Map<string, number> {
    return new Map(this.versionMap);
  }
}

// 导出单例实例
export const cacheInvalidationManager = CacheInvalidationManager.getInstance();

// 导出常用函数
export const {
  invalidateCache,
  invalidateCacheByPattern,
  invalidateCacheByModule,
  invalidateCacheKeys,
  invalidateUserCache,
  invalidateConfessionCache,
  invalidateChatCache,
  incrementModuleVersion,
  getModuleVersion,
  isVersionValid,
  getVersionedCacheKey,
  clearAllCache,
  getDependencyMap,
  getVersionMap
} = cacheInvalidationManager;

/**
 * 缓存失效装饰器
 * 用于标记函数，当函数执行时自动失效相关缓存
 * @param cacheKeys 要失效的缓存键或模式
 */
export function invalidateOnCall(...cacheKeys: string[]) {
  return function (_target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
    
    descriptor.value = async function (...args: unknown[]) {
      try {
        // 1. 执行原始方法
        const result = await originalMethod.apply(this, args);
        
        // 2. 失效指定的缓存
        for (const cacheKey of cacheKeys) {
          if (cacheKey.includes('*')) {
            // 如果是模式，使用模式失效
            await cacheInvalidationManager.invalidateCacheByPattern(cacheKey);
          } else {
            // 否则使用精确匹配失效
            await cacheInvalidationManager.invalidateCache(cacheKey);
          }
        }
        
        return result;
      } catch (error) {
        console.error(`Error in invalidateOnCall decorator for ${propertyKey}:`, error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * 版本化缓存装饰器
 * 用于标记函数，自动使用版本化缓存键
 * @param module 模块名称
 * @param cacheConfig 缓存配置
 */
export function versionedCache(module: CacheModule, cacheConfig?: CacheConfig) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
    
    descriptor.value = async function (...args: unknown[]) {
      try {
        // 1. 生成缓存键
        const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
        const versionedKey = cacheInvalidationManager.getVersionedCacheKey(cacheKey, module);
        
        // 2. 尝试从缓存获取
        const cachedResult = await supabaseRedisCache.getCache(versionedKey);
        if (cachedResult !== null) {
          return cachedResult;
        }
        
        // 3. 执行原始方法
        const result = await originalMethod.apply(this, args);
        
        // 4. 缓存结果
        if (result !== null && result !== undefined) {
          await supabaseRedisCache.setCache(versionedKey, result, cacheConfig?.expiry);
        }
        
        return result;
      } catch (error) {
        console.error(`Error in versionedCache decorator for ${propertyKey}:`, error);
        // 出错时返回原始方法的结果
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

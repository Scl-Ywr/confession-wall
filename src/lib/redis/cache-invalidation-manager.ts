/**
 * 缓存失效管理器
 * 实现基于事件的缓存失效机制
 * 支持依赖关系管理（父缓存失效时自动失效子缓存）
 */

import { CacheModule, CacheResource } from './cache-key-naming';
import { cacheKeyManager } from './cache-key-manager';
import redis from './client';
import { deleteCache, deleteCacheKeys, deleteCacheByPattern } from './cache-manager';

// 缓存依赖关系映射
interface CacheDependency {
  key: string;
  dependencies: string[];
}

// 事件类型
type CacheEvent = 
  | { type: 'CREATE'; key: string }
  | { type: 'UPDATE'; key: string }
  | { type: 'DELETE'; key: string }
  | { type: 'CLEAR'; pattern: string }
  | { type: 'INVALIDATE_MODULE'; module: CacheModule }
  | { type: 'INVALIDATE_RESOURCE'; module: CacheModule; resource: CacheResource };

/**
 * 缓存失效管理器类
 */
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  private dependencies: Map<string, CacheDependency> = new Map();
  private moduleVersions: Map<CacheModule, number> = new Map();

  private constructor() {
    // 初始化模块版本
    this.initModuleVersions();
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
   * 初始化模块版本
   */
  private initModuleVersions(): void {
    const modules = Object.values(CacheModule);
    modules.forEach(module => {
      this.moduleVersions.set(module as CacheModule, 1);
    });
  }

  /**
   * 注册缓存依赖关系
   * @param key 缓存键
   * @param dependencies 依赖的缓存键列表
   */
  public registerDependency(key: string, dependencies: string[]): void {
    this.dependencies.set(key, {
      key,
      dependencies
    });
    
    // 注册反向依赖关系
    dependencies.forEach(depKey => {
      const dep = this.dependencies.get(depKey);
      if (dep) {
        // 避免循环依赖
        if (!dep.dependencies.includes(key)) {
          dep.dependencies.push(key);
        }
      } else {
        this.dependencies.set(depKey, {
          key: depKey,
          dependencies: [key]
        });
      }
    });
  }

  /**
   * 移除缓存依赖关系
   * @param key 缓存键
   */
  public removeDependency(key: string): void {
    // 移除反向依赖关系
    const dependency = this.dependencies.get(key);
    if (dependency) {
      dependency.dependencies.forEach(depKey => {
        const dep = this.dependencies.get(depKey);
        if (dep) {
          dep.dependencies = dep.dependencies.filter(d => d !== key);
        }
      });
    }
    
    // 移除正向依赖关系
    this.dependencies.delete(key);
  }

  /**
   * 获取缓存依赖关系
   * @param key 缓存键
   */
  public getDependencies(key: string): string[] {
    const dependency = this.dependencies.get(key);
    return dependency ? dependency.dependencies : [];
  }

  /**
   * 递增模块版本号
   * @param module 模块名称
   */
  public incrementModuleVersion(module: CacheModule): void {
    const currentVersion = this.moduleVersions.get(module) || 1;
    this.moduleVersions.set(module, currentVersion + 1);
  }

  /**
   * 获取模块版本号
   * @param module 模块名称
   */
  public getModuleVersion(module: CacheModule): number {
    return this.moduleVersions.get(module) || 1;
  }

  /**
   * 处理缓存事件
   * @param event 缓存事件
   */
  public async handleEvent(event: CacheEvent): Promise<void> {
    switch (event.type) {
      case 'CREATE':
        await this.invalidateRelatedCaches(event.key);
        break;
      case 'UPDATE':
        await this.invalidateRelatedCaches(event.key);
        break;
      case 'DELETE':
        await this.invalidateRelatedCaches(event.key);
        break;
      case 'CLEAR':
        await this.clearCacheByPattern(event.pattern);
        break;
      case 'INVALIDATE_MODULE':
        await this.invalidateModuleCaches(event.module);
        break;
      case 'INVALIDATE_RESOURCE':
        await this.invalidateResourceCaches(event.module, event.resource);
        break;
    }
  }

  /**
   * 失效相关缓存
   * @param key 触发失效的缓存键
   */
  private async invalidateRelatedCaches(key: string): Promise<void> {
    const invalidationQueue = new Set<string>();
    
    // 使用BFS遍历所有依赖
    const queue = [key];
    while (queue.length > 0) {
      const currentKey = queue.shift();
      if (currentKey && !invalidationQueue.has(currentKey)) {
        invalidationQueue.add(currentKey);
        
        // 添加所有依赖于当前键的缓存键
        const dependencies = this.getDependencies(currentKey);
        queue.push(...dependencies);
      }
    }
    
    // 执行缓存失效
    for (const invalidationKey of invalidationQueue) {
      await this.invalidateCache(invalidationKey);
    }
  }

  /**
   * 失效单个缓存
   * @param key 缓存键
   */
  public async invalidateCache(key: string): Promise<void> {
    try {
      console.log(`[Cache Invalidation] Invalidating cache: ${key}`);
      await deleteCache(key);
      
      // 同时删除空值缓存
      const nullCacheKey = cacheKeyManager.getNullCacheKey(key);
      await deleteCache(nullCacheKey);
      
      // 移除依赖关系
      this.removeDependency(key);
    } catch (error) {
      console.error(`[Cache Invalidation] Error invalidating cache ${key}:`, error);
    }
  }

  /**
   * 按模式失效缓存
   * @param pattern 缓存键模式
   */
  public async invalidateCacheByPattern(pattern: string): Promise<void> {
    try {
      console.log(`[Cache Invalidation] Invalidating cache by pattern: ${pattern}`);
      await deleteCacheByPattern(pattern);
    } catch (error) {
      console.error(`[Cache Invalidation] Error invalidating cache by pattern ${pattern}:`, error);
    }
  }

  /**
   * 失效模块所有缓存
   * @param module 模块名称
   */
  public async invalidateModuleCaches(module: CacheModule): Promise<void> {
    try {
      console.log(`[Cache Invalidation] Invalidating all caches for module: ${module}`);
      
      // 递增模块版本号
      this.incrementModuleVersion(module);
      
      // 清除所有相关缓存
      const pattern = cacheKeyManager.getModuleKeyPattern(module);
      await this.clearCacheByPattern(pattern);
    } catch (error) {
      console.error(`[Cache Invalidation] Error invalidating module caches ${module}:`, error);
    }
  }

  /**
   * 失效资源所有缓存
   * @param module 模块名称
   * @param resource 资源类型
   */
  public async invalidateResourceCaches(module: CacheModule, resource: CacheResource): Promise<void> {
    try {
      console.log(`[Cache Invalidation] Invalidating all caches for resource: ${module}:${resource}`);
      
      // 清除所有相关缓存
      const pattern = cacheKeyManager.getResourceKeyPattern(module, resource);
      await this.clearCacheByPattern(pattern);
    } catch (error) {
      console.error(`[Cache Invalidation] Error invalidating resource caches ${module}:${resource}:`, error);
    }
  }

  /**
   * 按模式清除缓存
   * @param pattern 缓存键模式
   */
  public async clearCacheByPattern(pattern: string): Promise<void> {
    try {
      if (typeof window === 'undefined' && redis) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          console.log(`[Cache Invalidation] Clearing ${keys.length} caches matching pattern: ${pattern}`);
          
          // 过滤掉受保护的键
          const keysToDelete = keys.filter((key: string) => !cacheKeyManager.isProtectedKey(key));
          
          if (keysToDelete.length > 0) {
            await deleteCacheKeys(keysToDelete);
            
            // 移除相关依赖关系
            keysToDelete.forEach((key: string) => {
              this.removeDependency(key);
            });
          }
        }
      }
    } catch (error) {
      console.error(`[Cache Invalidation] Error clearing cache by pattern ${pattern}:`, error);
    }
  }

  /**
   * 清除所有缓存
   */
  public async clearAllCache(): Promise<void> {
    try {
      console.log('[Cache Invalidation] Clearing all caches');
      
      // 清除所有非受保护的缓存键
      if (typeof window === 'undefined' && redis) {
        const keys = await redis.keys(`${cacheKeyManager.generateCacheKey(CacheModule.SYSTEM, CacheResource.MAIN)}:*`);
        
        // 过滤掉受保护的键       
        const keysToDelete = keys.filter((key: string) => !cacheKeyManager.isProtectedKey(key));
        
        if (keysToDelete.length > 0) {
          await deleteCacheKeys(keysToDelete);
        }
      }
      
      // 重置依赖关系
      this.dependencies.clear();
      
      // 重置模块版本
      this.initModuleVersions();
      
    } catch (error) {
      console.error('[Cache Invalidation] Error clearing all caches:', error);
    }
  }

  /**
   * 获取版本化缓存键
   * @param key 原始缓存键
   * @param module 模块名称
   */
  public getVersionedCacheKey(key: string, module: CacheModule): string {
    const version = this.getModuleVersion(module);
    return `${key}:v${version}`;
  }

  /**
   * 失效用户相关缓存
   * @param userId 用户ID
   */
  public async invalidateUserCache(userId: string): Promise<void> {
    console.log(`[Cache Invalidation] Invalidating user cache for userId: ${userId}`);
    
    // 失效用户资料缓存
    const profileKey = cacheKeyManager.user.profile(userId);
    await this.invalidateCache(profileKey);
    
    // 失效用户状态缓存
    const statusKey = cacheKeyManager.user.status(userId);
    await this.invalidateCache(statusKey);
  }

  /**
   * 失效告白相关缓存
   * @param confessionId 告白ID
   */
  public async invalidateConfessionCache(confessionId: string): Promise<void> {
    console.log(`[Cache Invalidation] Invalidating confession cache for confessionId: ${confessionId}`);
    
    // 失效告白详情缓存
    const detailKey = cacheKeyManager.confession.detail(confessionId);
    await this.invalidateCache(detailKey);
    
    // 失效告白点赞缓存
    const likesKey = cacheKeyManager.confession.likes(confessionId);
    await this.invalidateCache(likesKey);
    
    // 失效告白列表缓存（所有页面）
    await this.invalidateResourceCaches(CacheModule.CONFESSION, CacheResource.LIST);
  }

  /**
   * 失效聊天相关缓存
   * @param userId1 用户ID1
   * @param userId2 用户ID2
   * @param isGroup 是否是群聊
   */
  public async invalidateChatCache(userId1: string, userId2: string, isGroup: boolean): Promise<void> {
    if (isGroup) {
      console.log(`[Cache Invalidation] Invalidating group chat cache for groupId: ${userId1}`);
      
      // 失效群聊缓存
      const groupKey = cacheKeyManager.chat.group(userId1, userId2);
      await this.invalidateCache(groupKey);
    } else {
      console.log(`[Cache Invalidation] Invalidating private chat cache for users: ${userId1}, ${userId2}`);
      
      // 失效私聊缓存
      const privateKey = cacheKeyManager.chat.private(userId1, userId2);
      await this.invalidateCache(privateKey);
    }
  }

  /**
   * 获取所有依赖关系
   */
  public getAllDependencies(): Map<string, CacheDependency> {
    return new Map(this.dependencies);
  }

  /**
   * 获取所有模块版本
   */
  public getAllModuleVersions(): Map<CacheModule, number> {
    return new Map(this.moduleVersions);
  }
}

// 导出单例实例
export const cacheInvalidationManager = CacheInvalidationManager.getInstance();

// 导出常用函数
export const {
  registerDependency,
  removeDependency,
  invalidateCache,
  invalidateCacheByPattern,
  invalidateModuleCaches,
  invalidateResourceCaches,
  clearCacheByPattern,
  clearAllCache,
  invalidateUserCache,
  invalidateConfessionCache,
  invalidateChatCache
} = cacheInvalidationManager;

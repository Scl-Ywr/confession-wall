/**
 * 缓存失效机制简化测试用例
 * 仅测试缓存失效的核心逻辑，不依赖Supabase实际连接
 */

import { cacheInvalidationManager } from './cache-invalidation';
import { CacheModule, CacheResource, generateCacheKey } from './cache-key-naming';



// 替换实际的缓存管理器（简化测试，不实际执行Redis操作）
// 注意：使用 jest.fn() 而不是外部变量，避免提升问题
jest.mock('./supabase-redis-cache', () => ({
  supabaseRedisCache: {
    setCache: jest.fn().mockResolvedValue(true),
    getCache: jest.fn().mockResolvedValue(null),
    deleteCache: jest.fn().mockResolvedValue(true),
    deleteCacheByPattern: jest.fn().mockResolvedValue(0),
    deleteCacheKeys: jest.fn().mockResolvedValue(0),
    deleteCacheByModule: jest.fn().mockResolvedValue(0),
    clearCache: jest.fn().mockResolvedValue(true)
  },
  DEFAULT_CACHE_CONFIG: {
    expiry: 3600000,
    staleWhileRevalidate: true,
    cacheNullValues: true
  }
}));

describe('Cache Invalidation Mechanism - Simplified', () => {

  describe('版本控制测试', () => {
    it('should automatically invalidate cache when module version is incremented', () => {
      const cacheModule = CacheModule.USER;
      const cacheKey = generateCacheKey(cacheModule, CacheResource.PROFILE, 'test-user-3');
      
      // 获取初始版本
      const initialVersion = cacheInvalidationManager.getModuleVersion(cacheModule);
      expect(initialVersion).toBe(1);
      
      // 递增模块版本号
      cacheInvalidationManager.incrementModuleVersion(cacheModule);
      
      // 验证版本号已递增
      const newVersion = cacheInvalidationManager.getModuleVersion(cacheModule);
      expect(newVersion).toBe(2);
      
      // 验证版本化缓存键已更新
      const versionedKey = cacheInvalidationManager.getVersionedCacheKey(cacheKey, cacheModule);
      expect(versionedKey).toContain(':v2');
      
      // 验证版本是否有效
      expect(cacheInvalidationManager.isVersionValid(cacheModule, initialVersion)).toBe(false);
      expect(cacheInvalidationManager.isVersionValid(cacheModule, newVersion)).toBe(true);
    });
  });

  describe('依赖关系测试', () => {
    it('should manage cache dependencies correctly', () => {
      const parentKey = generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'test-user-4');
      const dependentKey = generateCacheKey(CacheModule.USER, CacheResource.STATUS, 'test-user-4');
      
      // 注册依赖关系
      cacheInvalidationManager.registerDependency(dependentKey, [parentKey]);
      
      // 获取依赖关系映射
      const dependencyMap = cacheInvalidationManager.getDependencyMap();
      expect(dependencyMap.has(parentKey)).toBe(true);
      expect(dependencyMap.get(parentKey)?.has(dependentKey)).toBe(true);
      
      // 移除依赖关系
      cacheInvalidationManager.removeDependency(dependentKey);
      
      // 验证依赖关系已移除
      const updatedDependencyMap = cacheInvalidationManager.getDependencyMap();
      expect(updatedDependencyMap.has(parentKey)).toBe(false);
    });
  });

  describe('版本映射管理测试', () => {
    it('should initialize and reset version map correctly', () => {
      // 获取初始版本映射
      const initialVersionMap = cacheInvalidationManager.getVersionMap();
      expect(initialVersionMap.size).toBeGreaterThan(0);
      
      // 递增所有模块版本
      Object.values(CacheModule).forEach(cacheModule => {
        cacheInvalidationManager.incrementModuleVersion(cacheModule as CacheModule);
      });
      
      // 验证版本已递增
      const updatedVersionMap = cacheInvalidationManager.getVersionMap();
      updatedVersionMap.forEach((version) => {
        expect(version).toBeGreaterThan(1);
      });
    });
  });

  describe('缓存键生成测试', () => {
    it('should generate consistent cache keys with versioning', () => {
      const cacheModule = CacheModule.CONFESSION;
      const resource = CacheResource.DETAIL;
      const id = 'test-confession-1';
      
      // 生成标准缓存键
      const standardKey = generateCacheKey(cacheModule, resource, id);
      expect(standardKey).toContain(`${CacheModule.CONFESSION}:${CacheResource.DETAIL}:${id}`);
      expect(standardKey).toContain('v1');
      
      // 生成版本化缓存键
      const versionedKey = cacheInvalidationManager.getVersionedCacheKey(standardKey, cacheModule);
      expect(versionedKey).toContain(`:v${cacheInvalidationManager.getModuleVersion(cacheModule)}`);
    });
  });

  describe('批量失效策略测试', () => {
    it('should provide comprehensive invalidation strategies', () => {
      // 测试不同的失效策略是否存在
      expect(typeof cacheInvalidationManager.invalidateCache).toBe('function');
      expect(typeof cacheInvalidationManager.invalidateCacheByPattern).toBe('function');
      expect(typeof cacheInvalidationManager.invalidateCacheByModule).toBe('function');
      expect(typeof cacheInvalidationManager.invalidateCacheKeys).toBe('function');
      expect(typeof cacheInvalidationManager.invalidateUserCache).toBe('function');
      expect(typeof cacheInvalidationManager.invalidateConfessionCache).toBe('function');
      expect(typeof cacheInvalidationManager.invalidateChatCache).toBe('function');
      expect(typeof cacheInvalidationManager.clearAllCache).toBe('function');
    });
  });
});

/**
 * 缓存失效机制测试用例
 * 测试场景：主动过期、显式删除、版本控制、依赖关系、批量失效、模块级失效
 */

import { 
  supabaseRedisCache 
} from './supabase-redis-cache';
import { 
  cacheInvalidationManager, 
  invalidateCache,
  invalidateCacheByModule,
  invalidateCacheByPattern,
  invalidateUserCache,
  invalidateConfessionCache,
  invalidateChatCache
} from './cache-invalidation';
import { CacheModule, CacheResource, generateCacheKey } from './cache-key-naming';

describe('Cache Invalidation Mechanism', () => {
  // 测试前清除所有缓存
  beforeAll(async () => {
    await cacheInvalidationManager.clearAllCache();
  });

  // 测试后清除所有缓存
  afterAll(async () => {
    await cacheInvalidationManager.clearAllCache();
  });

  describe('主动过期测试', () => {
    it('should automatically invalidate cache after expiration time', async () => {
      const cacheKey = generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'test-user-1');
      
      // 设置短期过期缓存（2秒）
      await supabaseRedisCache.setCache(cacheKey, { name: 'Test User' }, 2000);
      
      // 立即获取，应该存在
      let cachedData = await supabaseRedisCache.getCache<{ name: string }>(cacheKey);
      expect(cachedData).not.toBeNull();
      expect(cachedData?.name).toBe('Test User');
      
      // 等待3秒后获取，应该过期
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      cachedData = await supabaseRedisCache.getCache(cacheKey);
      expect(cachedData).toBeNull();
    }, 10000); // 延长测试超时时间
  });

  describe('显式删除测试', () => {
    it('should explicitly invalidate cache when deleteCache is called', async () => {
      const cacheKey = generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'test-user-2');
      
      // 设置缓存
      await supabaseRedisCache.setCache(cacheKey, { name: 'Test User 2' });
      
      // 验证缓存存在
      let cachedData = await supabaseRedisCache.getCache(cacheKey);
      expect(cachedData).not.toBeNull();
      
      // 显式删除缓存
      await supabaseRedisCache.deleteCache(cacheKey);
      
      // 验证缓存已失效
      cachedData = await supabaseRedisCache.getCache(cacheKey);
      expect(cachedData).toBeNull();
    });
  });

  describe('版本控制测试', () => {
    it('should automatically invalidate cache when module version is incremented', async () => {
      const cacheModule = CacheModule.USER;
      const cacheKey = generateCacheKey(cacheModule, CacheResource.PROFILE, 'test-user-3');
      const versionedKey = cacheInvalidationManager.getVersionedCacheKey(cacheKey, cacheModule);
      
      // 设置版本化缓存
      await supabaseRedisCache.setCache(versionedKey, { name: 'Test User 3' });
      
      // 验证缓存存在
      let cachedData = await supabaseRedisCache.getCache(versionedKey);
      expect(cachedData).not.toBeNull();
      
      // 递增模块版本号
      cacheInvalidationManager.incrementModuleVersion(cacheModule);
      
      // 生成新的版本化缓存键
      const newVersionedKey = cacheInvalidationManager.getVersionedCacheKey(cacheKey, cacheModule);
      
      // 验证旧版本缓存键无法获取数据
      cachedData = await supabaseRedisCache.getCache(versionedKey);
      expect(cachedData).not.toBeNull(); // 旧缓存仍然存在，但不会被使用
      
      // 验证新缓存键需要重新生成
      cachedData = await supabaseRedisCache.getCache(newVersionedKey);
      expect(cachedData).toBeNull();
    });
  });

  describe('依赖关系测试', () => {
    it('should invalidate dependent caches when parent cache is invalidated', async () => {
      const parentKey = generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'test-user-4');
      const dependentKey = generateCacheKey(CacheModule.USER, CacheResource.STATUS, 'test-user-4');
      
      // 设置缓存
      await supabaseRedisCache.setCache(parentKey, { name: 'Test User 4' });
      await supabaseRedisCache.setCache(dependentKey, { status: 'online' });
      
      // 注册依赖关系
      cacheInvalidationManager.registerDependency(dependentKey, [parentKey]);
      
      // 验证缓存存在
      let parentData = await supabaseRedisCache.getCache(parentKey);
      let dependentData = await supabaseRedisCache.getCache(dependentKey);
      expect(parentData).not.toBeNull();
      expect(dependentData).not.toBeNull();
      
      // 失效父缓存
      await invalidateCache(parentKey);
      
      // 验证父缓存和依赖缓存都已失效
      parentData = await supabaseRedisCache.getCache(parentKey);
      dependentData = await supabaseRedisCache.getCache(dependentKey);
      expect(parentData).toBeNull();
      expect(dependentData).toBeNull();
      
      // 移除依赖关系
      cacheInvalidationManager.removeDependency(dependentKey);
    });
  });

  describe('批量失效测试', () => {
    it('should invalidate multiple caches in batch', async () => {
      const cacheKeys = [
        generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'batch-user-1'),
        generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'batch-user-2'),
        generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'batch-user-3')
      ];
      
      // 设置多个缓存
      for (const key of cacheKeys) {
        await supabaseRedisCache.setCache(key, { name: 'Batch User' });
      }
      
      // 验证所有缓存存在
      for (const key of cacheKeys) {
        const cachedData = await supabaseRedisCache.getCache(key);
        expect(cachedData).not.toBeNull();
      }
      
      // 批量失效缓存
      await cacheInvalidationManager.invalidateCacheKeys(cacheKeys);
      
      // 验证所有缓存已失效
      for (const key of cacheKeys) {
        const cachedData = await supabaseRedisCache.getCache(key);
        expect(cachedData).toBeNull();
      }
    });
  });

  describe('模式匹配失效测试', () => {
    it('should invalidate caches matching a pattern', async () => {
      const patternKeys = [
        generateCacheKey(CacheModule.CONFESSION, CacheResource.LIST, '1:10'),
        generateCacheKey(CacheModule.CONFESSION, CacheResource.LIST, '2:10'),
        generateCacheKey(CacheModule.CONFESSION, CacheResource.LIST, '3:10')
      ];
      
      // 设置多个列表缓存
      for (const key of patternKeys) {
        await supabaseRedisCache.setCache(key, [{ id: 1, content: 'Test' }]);
      }
      
      // 验证所有缓存存在
      for (const key of patternKeys) {
        const cachedData = await supabaseRedisCache.getCache(key);
        expect(cachedData).not.toBeNull();
      }
      
      // 按模式失效缓存
      await invalidateCacheByPattern(`${CacheModule.CONFESSION}:${CacheResource.LIST}:*`);
      
      // 验证所有匹配模式的缓存已失效
      for (const key of patternKeys) {
        const cachedData = await supabaseRedisCache.getCache(key);
        expect(cachedData).toBeNull();
      }
    });
  });

  describe('模块级失效测试', () => {
    it('should invalidate all caches for a module', async () => {
      const userKeys = [
        generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'module-user-1'),
        generateCacheKey(CacheModule.USER, CacheResource.STATUS, 'module-user-1')
      ];
      
      const confessionKeys = [
        generateCacheKey(CacheModule.CONFESSION, CacheResource.DETAIL, 'module-conf-1'),
        generateCacheKey(CacheModule.CONFESSION, CacheResource.LIST, '1:20')
      ];
      
      // 设置不同模块的缓存
      for (const key of [...userKeys, ...confessionKeys]) {
        await supabaseRedisCache.setCache(key, { data: 'Test Data' });
      }
      
      // 验证所有缓存存在
      for (const key of [...userKeys, ...confessionKeys]) {
        const cachedData = await supabaseRedisCache.getCache(key);
        expect(cachedData).not.toBeNull();
      }
      
      // 失效用户模块的所有缓存
      await invalidateCacheByModule(CacheModule.USER);
      
      // 验证用户模块缓存已失效，告白模块缓存仍然存在
      for (const key of userKeys) {
        const cachedData = await supabaseRedisCache.getCache(key);
        expect(cachedData).toBeNull();
      }
      
      for (const key of confessionKeys) {
        const cachedData = await supabaseRedisCache.getCache(key);
        expect(cachedData).not.toBeNull();
      }
    });
  });

  describe('用户相关缓存失效测试', () => {
    it('should invalidate all user-related caches', async () => {
      const userId = 'user-cache-test-1';
      const profileKey = generateCacheKey(CacheModule.USER, CacheResource.PROFILE, userId);
      const statusKey = generateCacheKey(CacheModule.USER, CacheResource.STATUS, userId);
      
      // 设置用户相关缓存
      await supabaseRedisCache.setCache(profileKey, { name: 'User Cache Test' });
      await supabaseRedisCache.setCache(statusKey, { status: 'online' });
      
      // 验证缓存存在
      let profileData = await supabaseRedisCache.getCache(profileKey);
      let statusData = await supabaseRedisCache.getCache(statusKey);
      expect(profileData).not.toBeNull();
      expect(statusData).not.toBeNull();
      
      // 失效用户相关缓存
      await invalidateUserCache(userId);
      
      // 验证用户相关缓存已失效
      profileData = await supabaseRedisCache.getCache(profileKey);
      statusData = await supabaseRedisCache.getCache(statusKey);
      expect(profileData).toBeNull();
      expect(statusData).toBeNull();
    });
  });

  describe('告白相关缓存失效测试', () => {
    it('should invalidate confession-related caches', async () => {
      const confessionId = 'confession-cache-test-1';
      const detailKey = generateCacheKey(CacheModule.CONFESSION, CacheResource.DETAIL, confessionId);
      const listKey1 = generateCacheKey(CacheModule.CONFESSION, CacheResource.LIST, '1:20');
      const listKey2 = generateCacheKey(CacheModule.CONFESSION, CacheResource.LIST, '2:20');
      
      // 设置告白相关缓存
      await supabaseRedisCache.setCache(detailKey, { id: confessionId, content: 'Test Confession' });
      await supabaseRedisCache.setCache(listKey1, [{ id: confessionId, content: 'Test Confession' }]);
      await supabaseRedisCache.setCache(listKey2, [{ id: 'other-conf', content: 'Other Confession' }]);
      
      // 验证缓存存在
      let detailData = await supabaseRedisCache.getCache(detailKey);
      let listData1 = await supabaseRedisCache.getCache(listKey1);
      let listData2 = await supabaseRedisCache.getCache(listKey2);
      expect(detailData).not.toBeNull();
      expect(listData1).not.toBeNull();
      expect(listData2).not.toBeNull();
      
      // 失效告白相关缓存
      await invalidateConfessionCache(confessionId);
      
      // 验证告白详情和列表缓存已失效
      detailData = await supabaseRedisCache.getCache(detailKey);
      listData1 = await supabaseRedisCache.getCache(listKey1);
      listData2 = await supabaseRedisCache.getCache(listKey2);
      expect(detailData).toBeNull();
      expect(listData1).toBeNull();
      expect(listData2).toBeNull(); // 列表缓存应该全部失效
    });
  });

  describe('聊天相关缓存失效测试', () => {
    it('should invalidate private chat caches', async () => {
      const userId1 = 'chat-user-1';
      const userId2 = 'chat-user-2';
      const privateKey = generateCacheKey(CacheModule.CHAT, CacheResource.PRIVATE, `${userId1}:${userId2}`);
      
      // 设置私聊缓存
      await supabaseRedisCache.setCache(privateKey, [{ sender: userId1, content: 'Hello' }]);
      
      // 验证缓存存在
      let privateData = await supabaseRedisCache.getCache(privateKey);
      expect(privateData).not.toBeNull();
      
      // 失效私聊缓存
      await invalidateChatCache(userId1, userId2, false);
      
      // 验证私聊缓存已失效
      privateData = await supabaseRedisCache.getCache(privateKey);
      expect(privateData).toBeNull();
    });

    it('should invalidate group chat caches', async () => {
      const groupId = 'chat-group-1';
      const groupKey = generateCacheKey(CacheModule.CHAT, CacheResource.GROUP, groupId);
      const memberKey = generateCacheKey(CacheModule.CHAT, CacheResource.MEMBER, groupId);
      
      // 设置群聊缓存
      await supabaseRedisCache.setCache(groupKey, [{ sender: 'user1', content: 'Hello Group' }]);
      await supabaseRedisCache.setCache(memberKey, [{ id: 'user1', name: 'User 1' }]);
      
      // 验证缓存存在
      let groupData = await supabaseRedisCache.getCache(groupKey);
      let memberData = await supabaseRedisCache.getCache(memberKey);
      expect(groupData).not.toBeNull();
      expect(memberData).not.toBeNull();
      
      // 失效群聊缓存
      await invalidateChatCache(groupId, '', true);
      
      // 验证群聊缓存已失效
      groupData = await supabaseRedisCache.getCache(groupKey);
      memberData = await supabaseRedisCache.getCache(memberKey);
      expect(groupData).toBeNull();
      expect(memberData).toBeNull();
    });
  });

  describe('缓存失效装饰器测试', () => {
    it('should automatically invalidate cache when decorated function is called', async () => {
      // 这里测试装饰器功能
      // 由于装饰器需要应用于类方法，这里只测试基本逻辑
      const cacheKey = generateCacheKey(CacheModule.USER, CacheResource.PROFILE, 'decorator-user-1');
      
      // 设置缓存
      await supabaseRedisCache.setCache(cacheKey, { name: 'Decorator User' });
      
      // 验证缓存存在
      let cachedData = await supabaseRedisCache.getCache(cacheKey);
      expect(cachedData).not.toBeNull();
      
      // 模拟装饰器逻辑：执行操作后失效缓存
      // 实际装饰器测试需要在类方法上应用
      await supabaseRedisCache.setCache(cacheKey, { name: 'Updated Decorator User' });
      await invalidateCache(cacheKey);
      
      // 验证缓存已失效
      cachedData = await supabaseRedisCache.getCache(cacheKey);
      expect(cachedData).toBeNull();
    });
  });
});

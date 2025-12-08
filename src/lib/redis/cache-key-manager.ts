/**
 * 缓存键管理器
 * 统一管理所有缓存键的生成、验证和管理
 */

import { SERVICE_NAME, CacheModule, CacheResource, CACHE_VERSION } from './cache-key-naming';

// 缓存键前缀
const CACHE_PREFIX = SERVICE_NAME;

// 受保护的系统键列表，这些键不会被意外清除
const PROTECTED_KEYS = ['system:cache_version'];

// 缓存键数据结构
interface CacheKeyDefinition {
  module: CacheModule;
  resource: CacheResource;
  id?: string | number;
  version: string;
  fullKey: string;
}

/**
 * 缓存键管理器类
 */
export class CacheKeyManager {
  private static instance: CacheKeyManager;
  private keyDefinitions: Map<string, CacheKeyDefinition> = new Map();

  private constructor() {
    // 初始化时注册一些基础缓存键
    this.registerKey(CacheModule.SYSTEM, CacheResource.MAIN, 'cache_version', CACHE_VERSION);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CacheKeyManager {
    if (!CacheKeyManager.instance) {
      CacheKeyManager.instance = new CacheKeyManager();
    }
    return CacheKeyManager.instance;
  }

  /**
   * 注册缓存键定义
   */
  public registerKey(
    module: CacheModule,
    resource: CacheResource,
    id: string | number = '',
    version: string = CACHE_VERSION
  ): string {
    const fullKey = this.generateCacheKey(module, resource, id, version);
    
    this.keyDefinitions.set(fullKey, {
      module,
      resource,
      id,
      version,
      fullKey
    });
    
    return fullKey;
  }

  /**
   * 生成缓存键
   */
  public generateCacheKey(
    module: CacheModule,
    resource: CacheResource,
    id: string | number = '',
    version: string = CACHE_VERSION
  ): string {
    const parts = [CACHE_PREFIX, module, resource];
    
    if (id) {
      parts.push(String(id));
    }
    
    parts.push(version);
    
    return parts.join(':');
  }

  /**
   * 生成用户相关缓存键
   */
  public user = {
    /**
     * 用户资料缓存键
     */
    profile: (userId: string, version?: string): string => {
      return this.generateCacheKey(CacheModule.USER, CacheResource.PROFILE, userId, version);
    },
    
    /**
     * 用户状态缓存键
     */
    status: (userId: string, version?: string): string => {
      return this.generateCacheKey(CacheModule.USER, CacheResource.STATUS, userId, version);
    }
  };

  /**
   * 生成告白相关缓存键
   */
  public confession = {
    /**
     * 告白列表缓存键
     * 添加用户ID参数，确保每个用户有独立的缓存
     */
    list: (page: number = 1, limit: number = 10, userId?: string, version?: string): string => {
      const id = userId ? `${page}:${limit}:${userId}` : `${page}:${limit}`;
      return this.generateCacheKey(CacheModule.CONFESSION, CacheResource.LIST, id, version);
    },
    
    /**
     * 告白详情缓存键
     * 添加用户ID参数，确保每个用户有独立的缓存
     */
    detail: (confessionId: string, userId?: string, version?: string): string => {
      const id = userId ? `${confessionId}:${userId}` : confessionId;
      return this.generateCacheKey(CacheModule.CONFESSION, CacheResource.DETAIL, id, version);
    },
    
    /**
     * 告白点赞缓存键
     */
    likes: (confessionId: string, userId?: string, version?: string): string => {
      const id = userId ? `${confessionId}:${userId}` : confessionId;
      return this.generateCacheKey(CacheModule.CONFESSION, CacheResource.HIT, id, version);
    }
  };

  /**
   * 生成聊天相关缓存键
   */
  public chat = {
    /**
     * 私聊缓存键
     */
    private: (userId1: string, userId2: string, version?: string): string => {
      const sortedIds = [userId1, userId2].sort();
      return this.generateCacheKey(CacheModule.CHAT, CacheResource.PRIVATE, `${sortedIds[0]}:${sortedIds[1]}`, version);
    },
    
    /**
     * 群聊缓存键
     */
    group: (groupId: string, userId: string, version?: string): string => {
      return this.generateCacheKey(CacheModule.CHAT, CacheResource.GROUP, `${groupId}:${userId}`, version);
    }
  };

  /**
   * 生成统计相关缓存键
   */
  public statistics = {
    /**
     * 缓存统计主键
     */
    main: (version?: string): string => {
      return this.generateCacheKey(CacheModule.STATISTICS, CacheResource.MAIN, '', version);
    },
    
    /**
     * 命中率统计键
     */
    hit: (version?: string): string => {
      return this.generateCacheKey(CacheModule.STATISTICS, CacheResource.HIT, '', version);
    },
    
    /**
     * 未命中率统计键
     */
    miss: (version?: string): string => {
      return this.generateCacheKey(CacheModule.STATISTICS, CacheResource.MISS, '', version);
    }
  };

  /**
   * 生成锁相关缓存键
   */
  public lock = {
    /**
     * 资源锁缓存键
     */
    resource: (resource: string, id: string | number, version?: string): string => {
      return this.generateCacheKey(CacheModule.LOCK, CacheResource.MAIN, `${resource}:${id}`, version);
    }
  };

  /**
   * 生成空值缓存键
   */
  public getNullCacheKey(key: string): string {
    return `${key}:null`;
  }

  /**
   * 生成版本化缓存键
   */
  public getVersionedCacheKey(key: string, version: string = CACHE_VERSION): string {
    const parts = key.split(':');
    // 如果已经有版本号，替换它
    if (parts.length > 1 && /^v\d+$/.test(parts[parts.length - 1])) {
      parts[parts.length - 1] = version;
      return parts.join(':');
    }
    // 否则添加版本号
    return `${key}:${version}`;
  }

  /**
   * 从缓存键中提取版本号
   */
  public extractVersionFromKey(key: string): string | null {
    const parts = key.split(':');
    const lastPart = parts[parts.length - 1];
    if (/^v\d+$/.test(lastPart)) {
      return lastPart;
    }
    return null;
  }

  /**
   * 解析缓存键
   */
  public parseCacheKey(key: string): CacheKeyDefinition | null {
    // 检查是否已注册
    if (this.keyDefinitions.has(key)) {
      return this.keyDefinitions.get(key) || null;
    }

    // 解析未注册的键
    const parts = key.split(':');
    if (parts.length < 3) {
      return null;
    }

    const [prefix, module, resource, ...rest] = parts;
    if (prefix !== CACHE_PREFIX) {
      return null;
    }

    const version = rest.pop() || CACHE_VERSION;
    const id = rest.join(':') || undefined;

    const definition: CacheKeyDefinition = {
      module: module as CacheModule,
      resource: resource as CacheResource,
      id,
      version,
      fullKey: key
    };

    // 缓存解析结果
    this.keyDefinitions.set(key, definition);
    return definition;
  }

  /**
   * 获取模块的所有缓存键模式
   */
  public getModuleKeyPattern(module: CacheModule): string {
    return `${CACHE_PREFIX}:${module}:*`;
  }

  /**
   * 获取资源的所有缓存键模式
   */
  public getResourceKeyPattern(module: CacheModule, resource: CacheResource): string {
    return `${CACHE_PREFIX}:${module}:${resource}:*`;
  }

  /**
   * 检查是否为受保护的键
   */
  public isProtectedKey(key: string): boolean {
    const keyWithoutPrefix = key.replace(`${CACHE_PREFIX}:`, '');
    return PROTECTED_KEYS.includes(keyWithoutPrefix);
  }

  /**
   * 获取所有注册的缓存键
   */
  public getAllKeys(): string[] {
    return Array.from(this.keyDefinitions.keys());
  }

  /**
   * 根据模块获取缓存键
   */
  public getKeysByModule(module: CacheModule): string[] {
    return Array.from(this.keyDefinitions.values())
      .filter(def => def.module === module)
      .map(def => def.fullKey);
  }

  /**
   * 根据资源获取缓存键
   */
  public getKeysByResource(resource: CacheResource): string[] {
    return Array.from(this.keyDefinitions.values())
      .filter(def => def.resource === resource)
      .map(def => def.fullKey);
  }

  /**
   * 清除缓存键定义
   */
  public clearKeyDefinitions(): void {
    this.keyDefinitions.clear();
  }
}

// 导出单例实例
export const cacheKeyManager = CacheKeyManager.getInstance();

// 导出常用的缓存键生成函数
export const {
  generateCacheKey,
  user,
  confession,
  chat,
  statistics,
  lock,
  getNullCacheKey,
  getVersionedCacheKey,
  extractVersionFromKey,
  parseCacheKey,
  getModuleKeyPattern,
  getResourceKeyPattern,
  isProtectedKey,
  getAllKeys,
  getKeysByModule,
  getKeysByResource
} = cacheKeyManager;

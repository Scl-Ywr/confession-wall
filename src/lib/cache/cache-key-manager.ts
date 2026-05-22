import { SERVICE_NAME, CacheModule, CacheResource, CACHE_VERSION } from './cache-key-naming';

const CACHE_PREFIX = SERVICE_NAME;

interface CacheKeyDefinition {
  module: CacheModule;
  resource: CacheResource;
  id?: string | number;
  version: string;
  fullKey: string;
}

export class CacheKeyManager {
  private static instance: CacheKeyManager;
  private keyDefinitions: Map<string, CacheKeyDefinition> = new Map();

  private constructor() {
    this.registerKey(CacheModule.SYSTEM, CacheResource.MAIN, 'cache_version', CACHE_VERSION);
  }

  public static getInstance(): CacheKeyManager {
    if (!CacheKeyManager.instance) {
      CacheKeyManager.instance = new CacheKeyManager();
    }
    return CacheKeyManager.instance;
  }

  public registerKey(
    module: CacheModule,
    resource: CacheResource,
    id: string | number = '',
    version: string = CACHE_VERSION
  ): string {
    const fullKey = this.generateCacheKey(module, resource, id, version);
    this.keyDefinitions.set(fullKey, { module, resource, id, version, fullKey });
    return fullKey;
  }

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

  public user = {
    profile: (userId: string, version?: string): string =>
      this.generateCacheKey(CacheModule.USER, CacheResource.PROFILE, userId, version),
    status: (userId: string, version?: string): string =>
      this.generateCacheKey(CacheModule.USER, CacheResource.STATUS, userId, version),
  };

  public confession = {
    list: (page: number = 1, limit: number = 10, userId?: string, version?: string): string => {
      const id = userId ? `${page}:${limit}:${userId}` : `${page}:${limit}`;
      return this.generateCacheKey(CacheModule.CONFESSION, CacheResource.LIST, id, version);
    },
    detail: (confessionId: string, userId?: string, version?: string): string => {
      const id = userId ? `${confessionId}:${userId}` : confessionId;
      return this.generateCacheKey(CacheModule.CONFESSION, CacheResource.DETAIL, id, version);
    },
    likes: (confessionId: string, userId?: string, version?: string): string => {
      const id = userId ? `${confessionId}:${userId}` : confessionId;
      return this.generateCacheKey(CacheModule.CONFESSION, CacheResource.HIT, id, version);
    },
  };

  public chat = {
    private: (userId1: string, userId2: string, version?: string): string => {
      const sortedIds = [userId1, userId2].sort();
      return this.generateCacheKey(CacheModule.CHAT, CacheResource.PRIVATE, `${sortedIds[0]}:${sortedIds[1]}`, version);
    },
    group: (groupId: string, userId: string, version?: string): string =>
      this.generateCacheKey(CacheModule.CHAT, CacheResource.GROUP, `${groupId}:${userId}`, version),
  };

  public comment = {
    list: (confessionId: string, page: number = 1, limit: number = 10, status: string = 'all', version?: string): string =>
      this.generateCacheKey(CacheModule.COMMENT, CacheResource.LIST, `${confessionId}:${page}:${limit}:${status}`, version),
    detail: (commentId: string, version?: string): string =>
      this.generateCacheKey(CacheModule.COMMENT, CacheResource.DETAIL, commentId, version),
    count: (confessionId: string, version?: string): string =>
      this.generateCacheKey(CacheModule.COMMENT, CacheResource.MAIN, `count:${confessionId}`, version),
  };

  public getNullCacheKey(key: string): string {
    return `${key}:null`;
  }

  public getVersionedCacheKey(key: string, version: string = CACHE_VERSION): string {
    const parts = key.split(':');
    if (parts.length > 1 && /^v\d+$/.test(parts[parts.length - 1])) {
      parts[parts.length - 1] = version;
      return parts.join(':');
    }
    return `${key}:${version}`;
  }

  public extractVersionFromKey(key: string): string | null {
    const lastPart = key.split(':').pop();
    return lastPart && /^v\d+$/.test(lastPart) ? lastPart : null;
  }
}

export const cacheKeyManager = CacheKeyManager.getInstance();

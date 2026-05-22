type CacheStats = {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
};

interface CacheEntry<T> {
  data: T;
  expiry: number | null;
  createdAt: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<unknown>>;
  private stats: CacheStats;

  private constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (entry.expiry === null) return false;
    return Date.now() > entry.expiry;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry !== null && now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  public async getCache<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;
      
      if (!entry) {
        this.stats.misses++;
        return null;
      }

      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.data;
    } catch {
      this.stats.errors++;
      return null;
    }
  }

  public async setCache<T>(key: string, data: T, expiry?: number): Promise<boolean> {
    try {
      const entry: CacheEntry<T> = {
        data,
        expiry: expiry ? Date.now() + expiry : null,
        createdAt: Date.now(),
      };
      this.cache.set(key, entry);
      this.stats.sets++;
      return true;
    } catch {
      this.stats.errors++;
      return false;
    }
  }

  public async deleteCache(key: string): Promise<boolean> {
    try {
      const success = this.cache.delete(key);
      if (success) {
        this.stats.deletes++;
      }
      return success;
    } catch {
      this.stats.errors++;
      return false;
    }
  }

  public async deleteCacheKeys(keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      const success = await this.deleteCache(key);
      if (success) count++;
    }
    return count;
  }

  public async deleteCacheByPattern(pattern: string): Promise<number> {
    try {
      this.cleanExpired();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      let count = 0;
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          this.stats.deletes++;
          count++;
        }
      }
      return count;
    } catch {
      this.stats.errors++;
      return 0;
    }
  }

  public async deleteCacheByModule(module: string): Promise<number> {
    return this.deleteCacheByPattern(`^${module}:`);
  }

  public async updateCache<T>(key: string, updater: (data: T) => T): Promise<T | null> {
    const current = await this.getCache<T>(key);
    if (current === null) {
      return null;
    }

    const updated = updater(current);
    await this.setCache(key, updated);
    return updated;
  }

  public async getOrSetCache<T>(
    key: string,
    dataSource: () => Promise<T>,
    expiry?: number,
    module?: string
  ): Promise<T> {
    const cached = await this.getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await dataSource();
    await this.setCache(key, data, expiry);
    return data;
  }

  public async clearCache(): Promise<boolean> {
    try {
      const size = this.cache.size;
      this.cache.clear();
      this.stats.deletes += size;
      return true;
    } catch {
      this.stats.errors++;
      return false;
    }
  }

  public async getCacheStatistics(): Promise<CacheStats> {
    return { ...this.stats };
  }

  public async getCacheKeys(pattern?: string): Promise<string[]> {
    this.cleanExpired();
    const keys = Array.from(this.cache.keys());
    if (!pattern) {
      return keys;
    }
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }
}

export const cacheManager = CacheManager.getInstance();
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

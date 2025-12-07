import { supabase } from '../supabase/client';
import { cacheManager } from './cache-manager';
import {
  CacheModule,
  getNullCacheKey,
  userCacheKeys,
  chatCacheKeys,
  confessionCacheKeys
} from './cache-key-naming';

import { EXPIRY } from './cache';

export interface CacheConfig {
  expiry: number;
  refreshInterval?: number;
  staleWhileRevalidate?: boolean;
  cacheNullValues?: boolean;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  expiry: EXPIRY.MEDIUM,
  staleWhileRevalidate: true,
  cacheNullValues: true
};

export class SupabaseRedisCache {
  private static instance: SupabaseRedisCache;

  private constructor() {}

  public static getInstance(): SupabaseRedisCache {
    if (!SupabaseRedisCache.instance) {
      SupabaseRedisCache.instance = new SupabaseRedisCache();
    }
    return SupabaseRedisCache.instance;
  }

  public async fetchAndCache<T>(
    cacheKey: string,
    supabaseQuery: () => Promise<T>,
    config: CacheConfig = DEFAULT_CACHE_CONFIG
  ): Promise<T | null> {
    try {
      const cachedData = await cacheManager.getCache<T>(cacheKey);

      if (cachedData !== null && config.staleWhileRevalidate) {
        this.refreshCache(cacheKey, supabaseQuery, config).catch(console.error);
        return cachedData;
      }

      const freshData = await supabaseQuery();

      if (freshData !== null && freshData !== undefined) {
        await cacheManager.setCache(cacheKey, freshData, config.expiry);
      } else if (config.cacheNullValues) {
        await cacheManager.setCache(getNullCacheKey(cacheKey), true, EXPIRY.NULL_VALUE);
      }

      return freshData;
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in fetchAndCache for key ${cacheKey}:`, error);
      
      if (config.staleWhileRevalidate) {
        const staleData = await cacheManager.getCache<T>(cacheKey);
        if (staleData !== null) {
          return staleData;
        }
      }
      
      return null;
    }
  }

  private async refreshCache<T>(
    cacheKey: string,
    supabaseQuery: () => Promise<T>,
    config: CacheConfig
  ): Promise<void> {
    try {
      const freshData = await supabaseQuery();
      
      if (freshData !== null && freshData !== undefined) {
        await cacheManager.setCache(cacheKey, freshData, config.expiry);
      } else if (config.cacheNullValues) {
        await cacheManager.setCache(getNullCacheKey(cacheKey), true, EXPIRY.NULL_VALUE);
      }
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in refreshCache for key ${cacheKey}:`, error);
    }
  }

  public async getUserProfile<T = Record<string, unknown>>(
    userId: string,
    config: CacheConfig = DEFAULT_CACHE_CONFIG
  ): Promise<T | null> {
    const cacheKey = userCacheKeys.profile(userId);
    
    return this.fetchAndCache(cacheKey, async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as T;
    }, config);
  }

  public async getUserStatus<T = { online_status: string; last_seen: string }>(
    userId: string,
    config: CacheConfig = DEFAULT_CACHE_CONFIG
  ): Promise<T | null> {
    const cacheKey = userCacheKeys.status(userId);
    
    return this.fetchAndCache(cacheKey, async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('online_status, last_seen')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as T;
    }, config);
  }

  public async getConfessionList<T = Record<string, unknown>>(
    page: number = 1,
    limit: number = 20,
    config: CacheConfig = DEFAULT_CACHE_CONFIG
  ): Promise<T[] | null> {
    const cacheKey = confessionCacheKeys.list(page, limit);
    
    return this.fetchAndCache(cacheKey, async () => {
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      
      if (error) {
        throw error;
      }
      
      return data as T[];
    }, config);
  }

  public async getConfessionDetail<T = Record<string, unknown>>(
    confessionId: string,
    config: CacheConfig = DEFAULT_CACHE_CONFIG
  ): Promise<T | null> {
    const cacheKey = confessionCacheKeys.detail(confessionId);
    
    return this.fetchAndCache(cacheKey, async () => {
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .eq('id', confessionId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as T;
    }, config);
  }

  public async getPrivateChatMessages<T = Record<string, unknown>>(
    userId1: string,
    userId2: string,
    config: CacheConfig = DEFAULT_CACHE_CONFIG
  ): Promise<T[] | null> {
    const cacheKey = chatCacheKeys.private(userId1, userId2);
    
    return this.fetchAndCache(cacheKey, async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`(sender_id.eq.${userId1},recipient_id.eq.${userId2}),(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
        .order('created_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data as T[];
    }, config);
  }

  public async getGroupChatMessages<T = Record<string, unknown>>(
    groupId: string,
    config: CacheConfig = DEFAULT_CACHE_CONFIG
  ): Promise<T[] | null> {
    const cacheKey = chatCacheKeys.group(groupId);
    
    return this.fetchAndCache(cacheKey, async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data as T[];
    }, config);
  }

  public async deleteCache(cacheKey: string): Promise<boolean> {
    try {
      await cacheManager.deleteCache(cacheKey);
      await cacheManager.deleteCache(getNullCacheKey(cacheKey));
      return true;
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in deleteCache for key ${cacheKey}:`, error);
      return false;
    }
  }

  public async deleteCacheKeys(cacheKeys: string[]): Promise<number> {
    try {
      let deletedCount = 0;
      
      for (const key of cacheKeys) {
        const result = await this.deleteCache(key);
        if (result) {
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in deleteCacheKeys:`, error);
      return 0;
    }
  }

  public async deleteCacheByPattern(pattern: string): Promise<number> {
    try {
      return await cacheManager.deleteCacheByPattern(pattern);
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in deleteCacheByPattern:`, error);
      return 0;
    }
  }

  public async deleteCacheByModule(module: CacheModule): Promise<number> {
    try {
      const pattern = `${module}:*`;
      return await cacheManager.deleteCacheByPattern(pattern);
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in deleteCacheByModule:`, error);
      return 0;
    }
  }

  public async clearAllCache(): Promise<boolean> {
    try {
      return await cacheManager.clearCache();
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in clearAllCache:`, error);
      return false;
    }
  }

  public async setCache<T>(
    cacheKey: string,
    data: T,
    expiry: number = DEFAULT_CACHE_CONFIG.expiry
  ): Promise<boolean> {
    try {
      return await cacheManager.setCache(cacheKey, data, expiry);
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in setCache for key ${cacheKey}:`, error);
      return false;
    }
  }

  public async getCache<T>(cacheKey: string): Promise<T | null> {
    try {
      return await cacheManager.getCache<T>(cacheKey);
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in getCache for key ${cacheKey}:`, error);
      return null;
    }
  }

  public async updateCache<T>(
    cacheKey: string,
    updater: (data: T) => T
  ): Promise<T | null> {
    try {
      return await cacheManager.updateCache(cacheKey, updater);
    } catch (error) {
      console.error(`[SupabaseRedisCache] Error in updateCache for key ${cacheKey}:`, error);
      return null;
    }
  }
}

export const supabaseRedisCache = SupabaseRedisCache.getInstance();

export const { 
  fetchAndCache, 
  getUserProfile, 
  getUserStatus, 
  getConfessionList, 
  getConfessionDetail,
  getPrivateChatMessages,
  getGroupChatMessages,
  deleteCache,
  deleteCacheKeys,
  deleteCacheByPattern,
  deleteCacheByModule,
  clearAllCache,
  setCache,
  getCache,
  updateCache
} = supabaseRedisCache;
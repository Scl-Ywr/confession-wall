# 缓存优化总结文档

## 1. 优化概述

本优化旨在提升匿名表白墙应用的性能，通过引入Redis缓存机制和优化数据库索引，减少数据库查询次数，提高响应速度，改善用户体验。

## 2. 技术栈

- **数据库**: Supabase (PostgreSQL)
- **缓存**: Redis
- **ORM**: Supabase JS Client
- **缓存管理**: 自定义缓存失效管理器

## 3. 完整实施记录

### 3.1 缓存架构设计

#### 3.1.1 缓存策略
- **读写策略**: 读写穿透 (Read-Through, Write-Through)
- **缓存失效**: 基于时间的失效 (TTL) + 事件驱动的失效
- **缓存键命名**: `{resource}:{id}:{variant}` 格式，如 `user:123:profile`

#### 3.1.2 缓存层次

| 层次 | 技术 | 用途 | TTL |
|------|------|------|-----|
| 应用层 | Next.js 内置缓存 | 页面级缓存 | 30秒 |
| 服务层 | Redis | 数据级缓存 | 5分钟-1小时 |
| 数据库层 | PostgreSQL 索引 | 查询优化 | 永久 |

### 3.2 核心组件实现

#### 3.2.1 缓存客户端

```typescript
// src/lib/redis/client.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});
```

#### 3.2.2 缓存管理器

```typescript
// src/lib/redis/cache-manager.ts
import { redis } from './client';

export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  static async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  static async del(key: string): Promise<void> {
    await redis.del(key);
  }

  static async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

#### 3.2.3 缓存失效管理器

```typescript
// src/lib/redis/cache-invalidation-manager.ts
import { redis } from './client';

export class CacheInvalidationManager {
  // 监听数据库变更事件，自动失效相关缓存
  static async listenToDatabaseChanges() {
    // 实现数据库变更监听逻辑
  }

  // 手动触发缓存失效
  static async invalidateResource(resource: string, id?: string) {
    const pattern = id ? `${resource}:${id}:*` : `${resource}:*`;
    await this.invalidatePattern(pattern);
  }

  static async invalidatePattern(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### 3.3 服务层集成

```typescript
// src/services/confessionService.ts
import { CacheManager } from '../lib/redis/cache-manager';
import { CacheInvalidationManager } from '../lib/redis/cache-invalidation-manager';

export async function getConfessions(page: number, limit: number) {
  const cacheKey = `confessions:list:${page}:${limit}`;
  
  // 尝试从缓存获取
  const cached = await CacheManager.get<Confession[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 从数据库获取
  const confessions = await supabase
    .from('confessions')
    .select('*')
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)
    .throwOnError();
  
  // 写入缓存
  await CacheManager.set(cacheKey, confessions.data, 300);
  
  return confessions.data;
}

export async function createConfession(confession: Omit<Confession, 'id' | 'created_at'>) {
  const result = await supabase
    .from('confessions')
    .insert(confession)
    .select()
    .throw
# Redis缓存管理功能实现文档

## 1. 实现概述

本文档描述了为当前项目实现的Redis缓存管理功能，包括缓存键命名规范、CRUD操作、动态数据获取机制和缓存统计功能。

### 1.1 实现目标

- 设计合理的缓存键命名规范
- 实现完整的缓存CRUD操作
- 配置适当的缓存过期策略
- 开发动态数据获取机制
- 验证缓存机制的有效性

### 1.2 技术栈

- Redis 8.4.0
- ioredis 5.8.2
- TypeScript
- Node.js

## 2. 缓存键命名规范

### 2.1 命名格式

```
confession_wall:{模块}:{子模块}:{ID}:{参数}
```

### 2.2 模块划分

| 模块 | 描述 | 示例 |
|------|------|------|
| user | 用户相关 | `confession_wall:user:profile:123` |
| confession | 告白相关 | `confession_wall:confession:detail:456` |
| chat | 聊天相关 | `confession_wall:chat:private:123:456` |
| system | 系统相关 | `confession_wall:system:config` |
| statistics | 统计相关 | `confession_wall:statistics:activity:daily` |

### 2.3 预定义缓存键模式

在 `cache.config.ts` 中定义了常用的缓存键模式，包括：

- USER_PROFILE: 用户资料
- USER_STATUS: 用户状态
- CONFESSION_DETAIL: 告白详情
- CONFESSION_LIST: 告白列表
- CHAT_PRIVATE: 私聊消息
- CHAT_GROUP: 群聊消息
- SYSTEM_CONFIG: 系统配置

## 3. 缓存过期策略

### 3.1 过期时间级别

| 级别 | 过期时间 | 适用场景 |
|------|----------|----------|
| INSTANT | 1分钟 | 实时数据，如在线状态 |
| SHORT | 5分钟 | 频繁更新数据，如告白列表 |
| MEDIUM | 1小时 | 中等频率更新数据，如用户资料 |
| DEFAULT | 7天 | 一般数据，如告白详情 |
| LONG | 30天 | 不常更新数据，如系统配置 |
| FOREVER | 永不过期 | 核心配置数据 |

### 3.2 模块级过期时间

为不同模块配置了默认过期时间，确保数据的时效性和缓存效率。

## 4. 缓存管理器实现

### 4.1 核心功能

#### 4.1.1 缓存CRUD操作

- **setCache**: 设置缓存
- **getCache**: 获取缓存
- **deleteCache**: 删除缓存
- **updateCache**: 更新缓存
- **clearCache**: 清空所有缓存

#### 4.1.2 动态数据获取

- **getOrSetCache**: 先从缓存获取，缓存不存在则从数据源获取并更新缓存

#### 4.1.3 缓存统计

- **getCacheStatistics**: 获取缓存统计信息
- **getCacheKeys**: 获取所有缓存键

### 4.2 缓存防护机制

#### 4.2.1 缓存穿透防护

- 对不存在的数据设置空值缓存
- 空值缓存过期时间为5分钟

#### 4.2.2 缓存击穿防护

- 实现互斥锁机制
- 锁过期时间为10秒
- 防止大量请求同时穿透到数据库

#### 4.2.3 缓存雪崩防护

- 为缓存添加随机过期时间
- 随机范围为5分钟
- 避免大量缓存同时过期

## 5. 代码结构

### 5.1 文件结构

```
src/lib/redis/
├── client.ts              # Redis客户端实例
├── cache.ts               # 对外暴露的缓存工具（向后兼容）
├── cache.config.ts        # 缓存配置（命名规范、过期策略）
└── cache-manager.ts       # 核心缓存管理器实现
```

### 5.2 主要类和函数

#### 5.2.1 RedisCacheManager类

- 单例模式实现
- 完整的缓存管理功能
- 支持缓存防护机制
- 提供缓存统计功能

#### 5.2.2 常用函数

```typescript
// 获取缓存
export const getCache = cacheManager.getCache.bind(cacheManager);

// 设置缓存
export const setCache = cacheManager.setCache.bind(cacheManager);

// 删除缓存
export const deleteCache = cacheManager.deleteCache.bind(cacheManager);

// 更新缓存
export const updateCache = cacheManager.updateCache.bind(cacheManager);

// 动态数据获取
export const getOrSetCache = cacheManager.getOrSetCache.bind(cacheManager);

// 获取缓存统计
export const getCacheStatistics = cacheManager.getCacheStatistics.bind(cacheManager);
```

## 6. 使用示例

### 6.1 基本CRUD操作

```typescript
import { setCache, getCache, deleteCache, updateCache } from '@/lib/redis/cache';

// 设置缓存
await setCache('user:profile:123', { id: '123', name: '测试用户' });

// 获取缓存
const user = await getCache('user:profile:123');

// 更新缓存
await updateCache('user:profile:123', (data) => ({
  ...data,
  name: '更新后的用户'
}));

// 删除缓存
await deleteCache('user:profile:123');
```

### 6.2 动态数据获取

```typescript
import { getOrSetCache, CACHE_KEY_PATTERNS, generatePatternCacheKey } from '@/lib/redis/cache';

// 生成缓存键
const cacheKey = generatePatternCacheKey(CACHE_KEY_PATTERNS.CONFESSION_LIST, { page: 1, limit: 20 });

// 动态获取告白列表
const confessions = await getOrSetCache(
  cacheKey,
  async () => {
    // 从数据库获取数据
    const data = await fetchConfessionsFromDatabase(1, 20);
    return data;
  },
  undefined,
  'CONFESSION_LIST' // 自动使用模块默认过期时间
);
```

### 6.3 获取缓存统计

```typescript
import { getCacheStatistics } from '@/lib/redis/cache';

// 获取缓存统计信息
const stats = await getCacheStatistics();
console.log('缓存命中率:', (stats.hitRate * 100).toFixed(2) + '%');
console.log('缓存请求数:', stats.requests);
console.log('缓存命中数:', stats.hits);
console.log('缓存未命中数:', stats.misses);
```

## 7. 验证结果

### 7.1 功能验证

| 功能 | 验证结果 |
|------|----------|
| Redis连接 | ✅ 成功 |
| 缓存设置 | ✅ 成功 |
| 缓存获取 | ✅ 成功 |
| 缓存更新 | ✅ 成功 |
| 缓存删除 | ✅ 成功 |
| 缓存过期 | ✅ 成功 |
| 批量操作 | ✅ 成功 |
| 键模式匹配 | ✅ 成功 |
| 缓存统计 | ✅ 成功 |

### 7.2 性能验证

- **缓存命中率**: 预期 > 80%
- **响应时间**: 缓存命中时 < 10ms
- **数据库压力**: 预期降低 > 50%

## 8. 配置说明

### 8.1 环境变量配置

在 `.env.local` 文件中配置Redis连接信息：

```
REDIS_HOST=14.103.131.228
REDIS_PORT=6379
REDIS_PASSWORD=redis
REDIS_USERNAME=default
```

### 8.2 缓存配置修改

可以在 `cache.config.ts` 中修改缓存配置：

- 调整缓存键模式
- 修改过期时间
- 启用/禁用缓存防护机制
- 调整缓存统计采样率

## 9. 监控和维护

### 9.1 监控指标

- 缓存命中率
- 缓存请求数
- 缓存命中数
- 缓存未命中数
- Redis内存使用情况
- Redis连接数

### 9.2 维护建议

- 定期检查缓存统计信息
- 根据业务需求调整过期时间
- 及时清理无效缓存
- 监控Redis内存使用情况
- 定期备份Redis数据

## 10. 向后兼容性

为了确保现有代码的正常运行，我们保持了向后兼容性：

- 保留了原有的函数签名
- 保持了原有的缓存键生成方式
- 兼容原有的使用方式

## 11. 总结

本次实现了完整的Redis缓存管理功能，包括：

- ✅ 合理的缓存键命名规范
- ✅ 完整的缓存CRUD操作
- ✅ 适当的缓存过期策略
- ✅ 动态数据获取机制
- ✅ 缓存防护机制（穿透、击穿、雪崩）
- ✅ 缓存统计功能
- ✅ 向后兼容性

该实现可以有效提高系统性能，降低数据库压力，同时确保数据的一致性和时效性。
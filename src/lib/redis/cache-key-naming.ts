/**
 * 缓存键命名规范
 * 设计原则：清晰的层次结构、模块分离、唯一性保证、可扩展性、可读性
 * 基本格式：{service}:{module}:{resource}:{id}:{version}
 */

// 服务名称（固定前缀）
export const SERVICE_NAME = 'confession_wall';

// 版本号（用于缓存版本管理）
export const CACHE_VERSION = 'v1';

// 模块名称枚举
export enum CacheModule {
  USER = 'user',
  CHAT = 'chat',
  CONFESSION = 'confession',
  NOTIFICATION = 'notification',
  STATISTICS = 'statistics',
  LOCK = 'lock',
  SYSTEM = 'system'
}

// 资源类型枚举
export enum CacheResource {
  PROFILE = 'profile',
  STATUS = 'status',
  MESSAGE = 'message',
  LIST = 'list',
  DETAIL = 'detail',
  PRIVATE = 'private',
  GROUP = 'group',
  MEMBER = 'member',
  HIT = 'hit',
  MISS = 'miss',
  REQUEST = 'request',
  MAIN = 'main'
}

/**
 * 生成标准缓存键
 * @param module 模块名称
 * @param resource 资源类型
 * @param id 资源ID或唯一标识符
 * @param version 版本号（可选，默认使用全局版本）
 * @returns 完整的缓存键
 */
export const generateCacheKey = (
  module: CacheModule,
  resource: CacheResource,
  id: string | number = '',
  version: string = CACHE_VERSION
): string => {
  const parts = [SERVICE_NAME, module, resource];
  
  if (id) {
    parts.push(String(id));
  }
  
  parts.push(version);
  
  return parts.join(':');
};

/**
 * 生成用户相关缓存键
 */
export const userCacheKeys = {
  /**
   * 用户资料缓存键
   * @param userId 用户ID
   * @returns 缓存键
   */
  profile: (userId: string): string => generateCacheKey(
    CacheModule.USER, 
    CacheResource.PROFILE, 
    userId
  ),
  
  /**
   * 用户状态缓存键
   * @param userId 用户ID
   * @returns 缓存键
   */
  status: (userId: string): string => generateCacheKey(
    CacheModule.USER, 
    CacheResource.STATUS, 
    userId
  )
};

/**
 * 生成聊天相关缓存键
 */
export const chatCacheKeys = {
  /**
   * 私聊消息缓存键
   * @param userId1 用户ID1
   * @param userId2 用户ID2
   * @returns 缓存键（确保顺序一致）
   */
  private: (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return generateCacheKey(
      CacheModule.CHAT, 
      CacheResource.PRIVATE, 
      `${sortedIds[0]}:${sortedIds[1]}`
    );
  },
  
  /**
   * 群聊消息缓存键
   * @param groupId 群ID
   * @returns 缓存键
   */
  group: (groupId: string): string => generateCacheKey(
    CacheModule.CHAT, 
    CacheResource.GROUP, 
    groupId
  ),
  
  /**
   * 群成员列表缓存键
   * @param groupId 群ID
   * @returns 缓存键
   */
  groupMembers: (groupId: string): string => generateCacheKey(
    CacheModule.CHAT, 
    CacheResource.MEMBER, 
    groupId
  )
};

/**
 * 生成告白墙相关缓存键
 */
export const confessionCacheKeys = {
  /**
   * 告白列表缓存键
   * @param page 页码
   * @param limit 每页数量
   * @returns 缓存键
   */
  list: (page: number = 1, limit: number = 20): string => generateCacheKey(
    CacheModule.CONFESSION, 
    CacheResource.LIST, 
    `${page}:${limit}`
  ),
  
  /**
   * 告白详情缓存键
   * @param confessionId 告白ID
   * @returns 缓存键
   */
  detail: (confessionId: string): string => generateCacheKey(
    CacheModule.CONFESSION, 
    CacheResource.DETAIL, 
    confessionId
  )
};

/**
 * 生成统计相关缓存键
 */
export const statisticsCacheKeys = {
  /**
   * 主统计缓存键
   * @returns 缓存键
   */
  main: (): string => generateCacheKey(
    CacheModule.STATISTICS, 
    CacheResource.MAIN
  )
};

/**
 * 生成锁相关缓存键
 */
export const lockCacheKeys = {
  /**
   * 资源锁缓存键
   * @param resource 资源类型
   * @param id 资源ID
   * @returns 缓存键
   */
  resource: (resource: string, id: string | number): string => generateCacheKey(
    CacheModule.LOCK, 
    CacheResource.MAIN, 
    `${resource}:${id}`
  )
};

/**
 * 生成空值缓存键
 * @param key 原始缓存键
 * @returns 空值缓存键
 */
export const getNullCacheKey = (key: string): string => `${key}:null`;

/**
 * 生成版本化缓存键
 * @param key 原始缓存键
 * @param version 版本号
 * @returns 版本化缓存键
 */
export const getVersionedCacheKey = (key: string, version: string = CACHE_VERSION): string => {
  const parts = key.split(':');
  // 如果已经有版本号，替换它
  if (parts.length > 1 && /^v\d+$/.test(parts[parts.length - 1])) {
    parts[parts.length - 1] = version;
    return parts.join(':');
  }
  // 否则添加版本号
  return `${key}:${version}`;
};

/**
 * 从缓存键中提取版本号
 * @param key 缓存键
 * @returns 版本号或null
 */
export const extractVersionFromKey = (key: string): string | null => {
  const parts = key.split(':');
  const lastPart = parts[parts.length - 1];
  if (/^v\d+$/.test(lastPart)) {
    return lastPart;
  }
  return null;
};

/**
 * 获取模块的所有缓存键模式
 * @param module 模块名称
 * @returns 缓存键模式
 */
export const getModuleKeyPattern = (module: CacheModule): string => {
  return `${SERVICE_NAME}:${module}:*`;
};

/**
 * 获取资源的所有缓存键模式
 * @param module 模块名称
 * @param resource 资源类型
 * @returns 缓存键模式
 */
export const getResourceKeyPattern = (module: CacheModule, resource: CacheResource): string => {
  return `${SERVICE_NAME}:${module}:${resource}:*`;
};

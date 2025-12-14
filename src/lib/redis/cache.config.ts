// Redis缓存配置文件

/**
 * 缓存键命名规范
 * 
 * 命名格式：confession_wall:{模块}:{子模块}:{ID}:{参数}
 * 
 * 模块划分：
 * - user: 用户相关
 * - confession: 告白相关
 * - chat: 聊天相关
 * - system: 系统相关
 * - statistics: 统计相关
 * 
 * 命名示例：
 * - confession_wall:user:profile:123
 * - confession_wall:confession:detail:456
 * - confession_wall:chat:private:123:456
 * - confession_wall:system:config
 */

export const CACHE_KEY_PATTERNS = {
  // 用户相关
  USER_PROFILE: 'user:profile:{userId}',
  USER_STATUS: 'user:status:{userId}',
  USER_SETTINGS: 'user:settings:{userId}',
  USER_BY_ID: 'admin:user:{id}',
  USER_POINTS: 'user:points:{userId}',
  USER_STATS: 'user:stats:{userId}',
  
  // 告白相关
  CONFESSION_DETAIL: 'confession:detail:{confessionId}',
  CONFESSION_LIST: 'confession:list:{page}:{limit}',
  CONFESSION_LIKES: 'confession:likes:{confessionId}',
  CONFESSION_COMMENTS: 'confession:comments:{confessionId}:{page}:{limit}',
  CONFESSION_BY_ID: 'admin:confession:{id}',
  
  // 聊天相关
  CHAT_PRIVATE: 'chat:private:{userId1}:{userId2}',
  CHAT_GROUP: 'chat:group:{groupId}:{userId}',
  CHAT_UNREAD_COUNT: 'chat:unread:{userId}',
  
  // 系统相关
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_STATUS: 'system:status',
  CACHE_VERSION: 'system:cache_version',
  
  // 统计相关
  STATISTICS_CONFESSIONS: 'statistics:confessions',
  STATISTICS_USERS: 'statistics:users',
  STATISTICS_ACTIVITY: 'statistics:activity:{period}',
  ADMIN_STATS: 'admin:stats',
  TREND_DATA: 'admin:trend:{days}',
  RECENT_CONFESSIONS: 'admin:recent_confessions:{limit}',
  RECENT_USERS: 'admin:recent_users:{limit}',
  
  // 锁相关
  LOCK: 'lock:{key}',
} as const;

/**
 * 缓存过期策略配置（毫秒）
 */
export const CACHE_EXPIRY = {
  // 短期缓存（频繁更新）
  SHORT: 5 * 60 * 1000, // 5分钟
  
  // 中期缓存
  MEDIUM: 1 * 60 * 60 * 1000, // 1小时
  
  // 默认缓存
  DEFAULT: 7 * 24 * 60 * 60 * 1000, // 7天
  
  // 长期缓存（不常更新）
  LONG: 30 * 24 * 60 * 60 * 1000, // 30天
  
  // 极短缓存（实时数据）
  INSTANT: 60 * 1000, // 1分钟
  
  // 永久缓存
  FOREVER: 0, // 0表示永不过期
  
  // 缓存穿透防护：空值缓存
  NULL_VALUE: 5 * 60 * 1000, // 5分钟
  
  // 缓存击穿防护：互斥锁
  LOCK: 10 * 1000, // 10秒
} as const;

/**
 * 模块级过期时间配置
 */
export const MODULE_EXPIRY = {
  // 用户相关
  USER_PROFILE: CACHE_EXPIRY.MEDIUM,
  USER_STATUS: CACHE_EXPIRY.INSTANT,
  USER_SETTINGS: CACHE_EXPIRY.DEFAULT,
  
  // 告白相关
  CONFESSION_DETAIL: CACHE_EXPIRY.DEFAULT,
  CONFESSION_LIST: CACHE_EXPIRY.SHORT,
  CONFESSION_LIKES: CACHE_EXPIRY.INSTANT,
  CONFESSION_COMMENTS: CACHE_EXPIRY.SHORT,
  
  // 聊天相关
  CHAT_PRIVATE: CACHE_EXPIRY.DEFAULT,
  CHAT_GROUP: CACHE_EXPIRY.DEFAULT,
  CHAT_UNREAD_COUNT: CACHE_EXPIRY.INSTANT,
  
  // 系统相关
  SYSTEM_CONFIG: CACHE_EXPIRY.LONG,
  SYSTEM_STATUS: CACHE_EXPIRY.SHORT,
  CACHE_VERSION: CACHE_EXPIRY.FOREVER,
  
  // 统计相关
  STATISTICS_CONFESSIONS: CACHE_EXPIRY.MEDIUM,
  STATISTICS_USERS: CACHE_EXPIRY.MEDIUM,
  STATISTICS_ACTIVITY: CACHE_EXPIRY.SHORT,
} as const;

/**
 * 生成完整的缓存键
 * @param pattern 缓存键模式
 * @param params 模式参数
 * @returns 完整的缓存键
 */
export const generateCacheKey = <T extends keyof typeof CACHE_KEY_PATTERNS>(
  pattern: T,
  params: Record<string, string | number>
): string => {
  let key: string = CACHE_KEY_PATTERNS[pattern] || `${pattern}`;
  
  // 替换参数
  for (const [param, value] of Object.entries(params)) {
    key = key.replace(`{${param}}`, String(value));
  }
  
  return key;
};

/**
 * 获取模块默认过期时间
 * @param module 模块名称
 * @returns 过期时间（毫秒）
 */
export const getModuleExpiry = (module: keyof typeof MODULE_EXPIRY): number => {
  return MODULE_EXPIRY[module] || CACHE_EXPIRY.DEFAULT;
};

/**
 * 获取当前环境
 */
const getCurrentEnvironment = (): 'development' | 'test' | 'production' => {
  return process.env.NODE_ENV as 'development' | 'test' | 'production' || 'development';
};

const ENVIRONMENT = getCurrentEnvironment();

/**
 * 缓存统计配置
 */
export const CACHE_STATISTICS = {
  ENABLED: true,
  KEY_PREFIX: 'statistics:cache:',
  SAMPLE_RATE: ENVIRONMENT === 'test' ? 1.0 : 0.5, // 测试环境100%采样，生产环境50%采样
};

/**
 * 缓存穿透防护配置
 */
export const CACHE_PENETRATION_PROTECTION = {
  ENABLED: true,
  NULL_VALUE_EXPIRY: CACHE_EXPIRY.NULL_VALUE,
};

/**
 * 缓存击穿防护配置
 */
export const CACHE_BREAKDOWN_PROTECTION = {
  ENABLED: true,
  LOCK_EXPIRY: CACHE_EXPIRY.LOCK,
};

/**
 * 缓存雪崩防护配置
 */
export const CACHE_AVALANCHE_PROTECTION = {
  ENABLED: true,
  // 环境差异化配置：测试环境固定过期，生产环境随机偏移
  RANDOM_EXPIRY_RANGE: ENVIRONMENT === 'test' ? 0 : 300000, // 生产环境5分钟随机过期范围，测试环境固定过期
  // 优化：使用相对比例而非绝对时间，确保过期时间更合理
  RANDOM_EXPIRY_RATIO: 0.1, // 随机范围为过期时间的10%
};

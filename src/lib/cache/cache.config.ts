export const CACHE_KEY_PATTERNS = {
  USER_PROFILE: 'user:profile:{userId}',
  USER_STATUS: 'user:status:{userId}',
  USER_SETTINGS: 'user:settings:{userId}',
  USER_BY_ID: 'admin:user:{id}',
  USER_POINTS: 'user:points:{userId}',
  USER_STATS: 'user:stats:{userId}',
  CONFESSION_DETAIL: 'confession:detail:{confessionId}',
  CONFESSION_LIST: 'confession:list:{page}:{limit}',
  CONFESSION_LIKES: 'confession:likes:{confessionId}',
  CONFESSION_COMMENTS: 'confession:comments:{confessionId}:{page}:{limit}',
  CONFESSION_BY_ID: 'admin:confession:{id}',
  CHAT_PRIVATE: 'chat:private:{userId1}:{userId2}',
  CHAT_GROUP: 'chat:group:{groupId}:{userId}',
  CHAT_UNREAD_COUNT: 'chat:unread:{userId}',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_STATUS: 'system:status',
  CACHE_VERSION: 'system:cache_version',
  STATISTICS_CONFESSIONS: 'statistics:confessions',
  STATISTICS_USERS: 'statistics:users',
  STATISTICS_ACTIVITY: 'statistics:activity:{period}',
  ADMIN_STATS: 'admin:stats',
  TREND_DATA: 'admin:trend:{days}',
  RECENT_CONFESSIONS: 'admin:recent_confessions:{limit}',
  RECENT_USERS: 'admin:recent_users:{limit}',
  LOCK: 'lock:{key}',
} as const;

export const CACHE_EXPIRY = {
  SHORT: 5 * 60 * 1000,
  MEDIUM: 1 * 60 * 60 * 1000,
  DEFAULT: 7 * 24 * 60 * 60 * 1000,
  LONG: 30 * 24 * 60 * 60 * 1000,
  INSTANT: 60 * 1000,
  FOREVER: 0,
  NULL_VALUE: 5 * 60 * 1000,
  LOCK: 10 * 1000,
} as const;

export const MODULE_EXPIRY = {
  USER_PROFILE: CACHE_EXPIRY.MEDIUM,
  USER_STATUS: CACHE_EXPIRY.INSTANT,
  USER_SETTINGS: CACHE_EXPIRY.DEFAULT,
  CONFESSION_DETAIL: CACHE_EXPIRY.DEFAULT,
  CONFESSION_LIST: CACHE_EXPIRY.SHORT,
  CONFESSION_LIKES: CACHE_EXPIRY.INSTANT,
  CONFESSION_COMMENTS: CACHE_EXPIRY.SHORT,
  CHAT_PRIVATE: CACHE_EXPIRY.DEFAULT,
  CHAT_GROUP: CACHE_EXPIRY.DEFAULT,
  CHAT_UNREAD_COUNT: CACHE_EXPIRY.INSTANT,
  SYSTEM_CONFIG: CACHE_EXPIRY.LONG,
  SYSTEM_STATUS: CACHE_EXPIRY.SHORT,
  CACHE_VERSION: CACHE_EXPIRY.FOREVER,
  STATISTICS_CONFESSIONS: CACHE_EXPIRY.MEDIUM,
  STATISTICS_USERS: CACHE_EXPIRY.MEDIUM,
  STATISTICS_ACTIVITY: CACHE_EXPIRY.SHORT,
  COMMENT_LIST: CACHE_EXPIRY.SHORT,
  COMMENT_DETAIL: CACHE_EXPIRY.MEDIUM,
  COMMENT_COUNT: CACHE_EXPIRY.SHORT,
  COMMENT_USER_HISTORY: CACHE_EXPIRY.SHORT,
  SEARCH_RESULT: CACHE_EXPIRY.MEDIUM,
  SEARCH_TRENDING: CACHE_EXPIRY.SHORT,
  SEARCH_SUGGESTION: CACHE_EXPIRY.MEDIUM,
} as const;

export const generateCacheKey = <T extends keyof typeof CACHE_KEY_PATTERNS>(
  pattern: T,
  params: Record<string, string | number>
): string => {
  let key: string = CACHE_KEY_PATTERNS[pattern] || `${pattern}`;

  for (const [param, value] of Object.entries(params)) {
    key = key.replace(`{${param}}`, String(value));
  }

  return key;
};

export const getModuleExpiry = (module: keyof typeof MODULE_EXPIRY): number => {
  return MODULE_EXPIRY[module] || CACHE_EXPIRY.DEFAULT;
};

export const SERVICE_NAME = 'confession_wall';
export const CACHE_VERSION = 'v1';

export enum CacheModule {
  USER = 'user',
  CHAT = 'chat',
  CONFESSION = 'confession',
  COMMENT = 'comment',
  NOTIFICATION = 'notification',
  STATISTICS = 'statistics',
  SEARCH = 'search',
  LOCK = 'lock',
  SYSTEM = 'system'
}

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
  RESULT = 'result',
  SUGGESTION = 'suggestion',
  MAIN = 'main'
}

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

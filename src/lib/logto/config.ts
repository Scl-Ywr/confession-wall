// 创建客户端配置，不包含敏感信息
export const logtoClientConfig = {
  endpoint: process.env.NEXT_PUBLIC_LOGTO_ENDPOINT || '',
  appId: process.env.NEXT_PUBLIC_LOGTO_APP_ID || '',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  cookieSecure: process.env.NODE_ENV === 'production',
  resources: [],
  scopes: ['openid', 'profile', 'email'],
  // 添加调试信息
  debug: process.env.NODE_ENV !== 'production',
};

// 创建服务器配置，包含敏感信息
export const logtoServerConfig = {
  ...logtoClientConfig,
  appSecret: process.env.LOGTO_APP_SECRET || '',
  cookieSecret: process.env.LOGTO_COOKIE_SECRET || 'complex_password_at_least_32_characters_long',
};

// 验证配置是否完整
console.log('Logto Config:', {
  endpoint: logtoClientConfig.endpoint,
  appId: logtoClientConfig.appId,
  appSecret: logtoServerConfig.appSecret ? '[REDACTED]' : 'NOT_SET',
  baseUrl: logtoClientConfig.baseUrl,
  cookieSecure: logtoClientConfig.cookieSecure,
});

// Logto社交登录提供商映射
// 使用 direct_sign_in 参数格式：social:<provider>
export const logtoProviders = {
  google: 'social:google',
  github: 'social:github',
  wechat: 'social:wechat',
  qq: 'social:qq',
};

export type LogtoProvider = keyof typeof logtoProviders;

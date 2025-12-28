import LogtoClient from '@logto/next';
import { logtoServerConfig } from './config';

/**
 * Logto客户端库
 *
 * 注意：@logto/next设计用于Pages Router的API路由，不能在客户端或App Router中直接使用。
 * 此文件提供：
 * 1. 服务端单例（仅用于Pages API路由）
 * 2. 客户端辅助函数（重定向到API路由）
 */

/**
 * 获取Logto客户端实例（服务端）
 * 仅在Pages API路由中使用
 * 使用服务器配置，包含敏感信息
 * 为每个请求创建新实例，避免会话状态共享导致的问题
 */
export const getLogtoClient = (): LogtoClient => {
  // 为每个请求创建新的LogtoClient实例，避免会话状态共享
  return new LogtoClient(logtoServerConfig);
};

/**
 * 客户端辅助函数：触发Logto登录
 * @param connectorId - Logto direct_sign_in 参数（格式：'social:github', 'social:google', 'social:wechat', 'social:qq'）
 */
export const signInWithLogto = async (connectorId?: string): Promise<void> => {
  console.log('signInWithLogto called with connectorId:', connectorId);
  
  const params = new URLSearchParams();
  if (connectorId) {
    params.set('connectorId', connectorId);
    console.log('Setting connectorId to:', connectorId);
  }

  const redirectUrl = `/api/auth/logto/sign-in?${params.toString()}`;
  console.log('Redirecting to:', redirectUrl);
  
  // 重定向到Pages API路由处理实际的OAuth流程
  window.location.href = redirectUrl;
};

/**
 * 客户端辅助函数：登出
 */
export const signOutWithLogto = async (): Promise<void> => {
  window.location.href = '/api/auth/logto/sign-out';
};

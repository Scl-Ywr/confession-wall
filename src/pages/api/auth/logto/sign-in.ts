import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Logto OAuth登录启动API路由
 *
 * 此路由处理OAuth登录流程的启动，将用户重定向到Logto的OAuth提供商页面
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 获取查询参数 (使用 direct_sign_in 参数)
    const { connectorId } = req.query as { connectorId?: string };
    
    // 获取Logto配置
    const logtoEndpoint = process.env.NEXT_PUBLIC_LOGTO_ENDPOINT || '';
    const clientId = process.env.NEXT_PUBLIC_LOGTO_APP_ID || '';
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/logto/callback`;
    
    // 确保endpoint没有双斜杠
    const endpoint = logtoEndpoint.replace(/\/$/, '');
    
    // 构建授权URL
    // 使用标准的 OAuth 2.0 重定向模式
    // 这个 Logto 实例可能使用自定义的端点配置
    const authUrl = new URL(`${endpoint}/authorize`);
    
    // 设置查询参数
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    
    // 如果提供了connectorId（格式为 social:github），使用 direct_sign_in 参数
    if (connectorId) {
      authUrl.searchParams.set('direct_sign_in', connectorId);
    }
    
    console.log('Logto sign-in redirectUri:', authUrl.toString());
    
    // 使用Next.js 16兼容的重定向格式
    res.redirect(302, authUrl.toString());
  } catch (error) {
    console.error('Error in Logto sign-in:', error);
    // 使用Next.js 16兼容的重定向格式
    res.redirect(302, '/auth/login?error=signin_failed');
  }
}

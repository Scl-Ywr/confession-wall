import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

/**
 * Logto OAuth回调处理API路由
 *
 * 此路由处理OAuth提供商的回调，完成以下步骤：
 * 1. 处理Logto回调，验证state和code
 * 2. 获取用户信息
 * 3. 调用用户映射API创建/关联Supabase用户
 * 4. 创建Supabase会话
 * 5. 通过HTTP-only cookies设置会话（安全）
 * 6. 重定向到首页
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 获取查询参数
    const { code, state } = req.query as { code: string; state: string };
    
    // 验证必要参数
    if (!code || !state) {
      console.error('Missing required parameters: code or state');
      res.redirect(302, '/auth/login?error=missing_parameters');
      return;
    }
    
    // 获取Logto配置
    const logtoEndpoint = process.env.NEXT_PUBLIC_LOGTO_ENDPOINT || '';
    const clientId = process.env.NEXT_PUBLIC_LOGTO_APP_ID || '';
    const clientSecret = process.env.LOGTO_APP_SECRET || '';
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/logto/callback`;
    
    // 确保endpoint没有双斜杠
    const endpoint = logtoEndpoint.replace(/\/$/, '');
    
    // 1. 手动获取token
    const tokenResponse = await axios.post(
      `${endpoint}/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        state
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { id_token, access_token } = tokenResponse.data;
    
    // 2. 解析JWT获取用户信息
    const decodeJwt = (token: string) => {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64url').toString());
    };
    
    const claims = decodeJwt(id_token);
    
    // 3. 获取用户信息
    const userInfoResponse = await axios.get(
      `${endpoint}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );
    
    const userInfo = userInfoResponse.data;
    
    // 4. 提取provider信息
    const provider = extractProviderFromClaims(claims);
    const logtoUserId = claims.sub;
    const email = userInfo.email;
    const displayName = userInfo.name || userInfo.nickname;
    const avatarUrl = userInfo.picture;
    
    // 5. 调用用户映射函数
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: mappingResult, error: mappingError } = await supabase.rpc(
      'find_or_create_user_identity',
      {
        p_logto_user_id: logtoUserId,
        p_provider: provider,
        p_email: email,
        p_display_name: displayName,
        p_avatar_url: avatarUrl,
        p_metadata: userInfo
      }
    );
    
    if (mappingError) {
      console.error('Error mapping user identity:', mappingError);
      res.redirect(302, '/auth/login?error=user_mapping_failed');
      return;
    }
    
    // 6. 获取映射结果
    const { is_new_user } = mappingResult[0];
    
    // 7. 创建Supabase会话
    const userEmail = email || `${logtoUserId}@logto.local`;
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        data: {
          provider: provider,
          logto_user_id: logtoUserId,
          is_oauth_user: true
        }
      }
    } as unknown as {
      type: 'magiclink';
      email: string;
      options?: {
        data?: Record<string, unknown>;
      };
    });
    
    if (authError) {
      console.error('Error generating auth link:', authError);
      res.redirect(302, '/auth/login?error=auth_session_failed');
      return;
    }
    
    // 8. 设置HTTP-only cookies存储会话token
    const properties = authData.properties as Record<string, unknown>;
    const accessToken = (properties.access_token as string) || '';
    const refreshToken = (properties.refresh_token as string) || '';
    
    res.setHeader('Set-Cookie', [
      serialize('sb-access-token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      }),
      serialize('sb-refresh-token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      }),
    ]);
    
    // 9. 获取登录后重定向URI
    const postSignInRedirectUri = '/';
    
    // 10. 重定向到目标页面，如果是新用户则添加提示
    const redirectUrl = is_new_user 
      ? `${postSignInRedirectUri}?welcome=true&provider=${provider}`
      : postSignInRedirectUri;
    
    // 使用Next.js 16兼容的重定向格式
    res.redirect(302, redirectUrl);
  } catch (error) {
    console.error('Error in Logto callback:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    res.redirect(302, '/auth/login?error=callback_failed');
    return;
  }
}

/**
 * 从JWT claims中提取provider信息
 */
function extractProviderFromClaims(claims: Record<string, unknown>): string {
  // Logto在claims中存储了identities信息
  if (claims.identities && typeof claims.identities === 'object') {
    const identityKeys = Object.keys(claims.identities as Record<string, unknown>);
    if (identityKeys.length > 0) {
      const provider = identityKeys[0];
      // 映射connector ID到简化的provider名称
      if (provider.includes('google')) return 'google';
      if (provider.includes('github')) return 'github';
      if (provider.includes('wechat')) return 'wechat';
      if (provider.includes('qq')) return 'qq';
      return provider;
    }
  }

  return 'logto';
}

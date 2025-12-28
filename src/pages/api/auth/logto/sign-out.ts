import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import { getLogtoClient } from '@/lib/logto/client';

/**
 * Logto OAuth登出API路由
 *
 * 此路由处理Logto登出流程，完成以下步骤：
 * 1. 清除Supabase会话cookies
 * 2. 处理Logto登出
 * 3. 重定向到首页
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 清除Supabase会话cookies
    res.setHeader('Set-Cookie', [
      serialize('sb-access-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      }),
      serialize('sb-refresh-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      }),
    ]);
    
    // 获取Logto客户端实例
    const logtoClient = getLogtoClient();
    
    // 使用SDK提供的handleSignOut方法，它返回一个处理器函数
    const signOutHandler = logtoClient.handleSignOut('/');
    
    // 调用返回的处理器函数处理请求
    // 注意：Next.js 16的API handler不应该返回值，所以直接调用，不返回结果
    signOutHandler(req, res);
  } catch (error) {
    console.error('Logto sign-out error:', error);
    // 即使Logto登出失败，也重定向到首页
    // 注意：Next.js 16的API handler不应该返回值，所以直接调用，不返回结果
    res.redirect(302, '/');
  }
}

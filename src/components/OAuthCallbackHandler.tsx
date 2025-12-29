'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * OAuth 回调处理组件
 *
 * 处理 Supabase OAuth 回调流程:
 * 1. 检测 URL hash fragment 中的 access_token
 * 2. 等待 Supabase 客户端自动处理 token
 * 3. 验证会话已建立
 * 4. 自动跳转到首页或指定页面
 */
export function OAuthCallbackHandler() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // 1. 首先检查 URL query string 中是否有 code (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // 2. 如果有错误,显示错误信息
        if (error) {
          setStatus('error');
          setErrorMessage(errorDescription || error);
          return;
        }

        // 3. 如果有 code，使用 PKCE flow 交换 session
        if (code) {
          try {
            // 添加超时处理
            const exchangePromise = supabase.auth.exchangeCodeForSession(code);
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Exchange timeout after 10 seconds')), 10000);
            });

            const result = await Promise.race([exchangePromise, timeoutPromise]) as Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>;

            if (result.error) {
              setStatus('error');
              setErrorMessage(result.error.message || '授权失败，请重试');
              return;
            }

            if (result.data?.session) {
              setStatus('authenticated');

              // 清理 URL 中的 code 参数
              window.history.replaceState({}, document.title, window.location.pathname);

              // 延迟跳转，让用户看到成功提示
              setTimeout(() => {
                router.push('/');
              }, 1000);
              return;
            } else {
              setStatus('error');
              setErrorMessage('登录失败：未能建立会话');
              return;
            }
          } catch (exchangeErr) {
            setStatus('error');
            setErrorMessage(exchangeErr instanceof Error ? exchangeErr.message : '交换授权码时发生错误');
            return;
          }
        }

        // 4. 检查 hash fragment 中是否有 access_token (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
          // 使用 polling 等待会话建立 (最多等待 5 秒)
          let attempts = 0;
          const maxAttempts = 10;
          const checkInterval = 500; // 每 500ms 检查一次

          const waitForSession = async (): Promise<boolean> => {
            while (attempts < maxAttempts) {
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();

              if (sessionError) {
                return false;
              }

              if (session) {
                return true;
              }

              attempts++;
              await new Promise(resolve => setTimeout(resolve, checkInterval));
            }

            return false;
          };

          const sessionEstablished = await waitForSession();

          if (sessionEstablished) {
            setStatus('authenticated');

            // 清理 URL hash
            window.history.replaceState({}, document.title, window.location.pathname);

            // 延迟跳转,让用户看到成功提示
            setTimeout(() => {
              router.push('/');
            }, 1000);
            return;
          } else {
            setStatus('error');
            setErrorMessage('登录超时,请重试');
            return;
          }
        }

        // 5. 如果既没有 code 也没有 access_token,检查是否已经有会话
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setStatus('authenticated');

          // 延迟跳转,让用户看到成功提示
          setTimeout(() => {
            router.push('/');
          }, 1000);
        } else {
          setStatus('error');
          setErrorMessage('未找到登录会话');
        }

      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : '未知错误');
      }
    };

    // 只在客户端执行
    if (typeof window !== 'undefined') {
      handleOAuthCallback();
    }
  }, [router]);

  // 渲染加载/成功/错误状态
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {status === 'checking' && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                正在登录...
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                请稍候,正在完成授权流程
              </p>
            </div>
          )}

          {status === 'authenticated' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-6">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                登录成功!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                正在跳转到主页...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-6">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                登录失败
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {errorMessage || '发生未知错误'}
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                返回登录页
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

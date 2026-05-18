'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { EmailOtpType, User as SupabaseUser } from '@supabase/supabase-js';

// 错误信息翻译函数，将英文错误转换为中文
const translateError = (error: Error): string => {
  const errorMessage = error.message.toLowerCase();
  
  // 邮箱验证相关错误
  if (errorMessage.includes('invalid token') || errorMessage.includes('token expired') || errorMessage.includes('invalid otp')) {
    return '验证链接无效或已过期，请重新注册获取新的验证链接';
  }
  if (errorMessage.includes('rate limit exceeded')) {
    return '操作过于频繁，请稍后再试';
  }
  
  // 网络错误
  if (errorMessage.includes('network error') || errorMessage.includes('failed to fetch')) {
    return '网络连接失败，请检查您的网络设置';
  }
  
  // 其他错误
  return error.message || '发生未知错误，请重试';
};

const VerifyEmailPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    // 防止重复执行验证
    if (verificationStatus !== 'idle') {
      return;
    }

    const verifyEmail = async () => {
      setVerificationStatus('verifying');
      setErrorMessage(null);

      try {
        // 1. 添加详细的调试日志  
        // 2. 检查URL fragment中的参数（用于PKCE流程）
        let fragmentParams = new URLSearchParams();
        if (typeof window !== 'undefined' && window.location.hash) {
          fragmentParams = new URLSearchParams(window.location.hash.slice(1));
          console.log('Fragment params:', Object.fromEntries(fragmentParams.entries()));
        }
        
        // 3. 检查是否已经通过URL fragment自动登录（PKCE流程）
        let user: SupabaseUser | null = null;
        let getUserError: Error | null = null;
        
        // 首先尝试获取会话，触发Supabase自动处理fragment中的令牌
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const sessionUser = sessionData.session?.user;
          if (sessionUser) {
            user = sessionUser;
            console.log('Found existing session:', sessionUser.id);
          }
        } catch {
          console.log('No existing session found');
        }
        
        // 如果没有会话，尝试获取用户信息
        if (!user) {
          try {
            const { data: userData, error } = await supabase.auth.getUser();
            user = userData.user;
            if (error) {
              getUserError = new Error(error.message);
            }
          } catch (getUserCatchError) {
            // 捕获getUser抛出的错误
            getUserError = getUserCatchError instanceof Error ? getUserCatchError : new Error('Unknown error');
            console.error('getUser error:', getUserError);
          }
        }
        
        if (user) {
          // 验证成功 - 用户已经通过PKCE流程自动登录
          console.log('Verification successful: User is already authenticated');
          
          // 检查并创建profile
          const userId = user.id;
          const userEmail = user.email;
          
          if (userEmail) {
            // 检查profile是否存在
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (!profileData) {
              // 创建默认profile
              const username = userEmail.split('@')[0];
              
              await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  username,
                  display_name: username
                });
            }
          }
          
          // 验证成功
          setVerificationStatus('success');
          return;
        }
        
        // 4. 如果没有自动登录，尝试处理传统的token验证（非PKCE流程）
        // 从URL中获取token_hash和type参数
        const token = searchParams?.get('token');
        const token_hash = searchParams?.get('token_hash');
        const type = searchParams?.get('type');
        
        // 检查fragment中的token参数
        const fragmentToken = fragmentParams.get('token');
        const fragmentTokenHash = fragmentParams.get('token_hash');
        const fragmentType = fragmentParams.get('type');
        
        // 合并所有可能的参数来源
        const finalToken = token || token_hash || fragmentToken || fragmentTokenHash;
        const finalType = type || fragmentType;
        
        console.log('Final token:', finalToken);
        console.log('Final type:', finalType);

        // 5. 如果有token和type，尝试手动验证
        if (finalToken && finalType) {
          console.log('Attempting manual token verification');
          
          // 首先检查是否已经通过PKCE流程自动验证（用户已存在会话）
          try {
            const { data: currentUserData } = await supabase.auth.getUser();
            if (currentUserData.user) {
              console.log('User already verified through PKCE, skipping manual verification');
              setVerificationStatus('success');
              return;
            }
          } catch {
            console.log('No current user found, proceeding with manual verification');
          }
          
          // 如果没有当前用户，尝试手动验证OTP
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: finalToken,
            type: finalType as EmailOtpType,
          });

          if (error) {
            console.error('Manual verification error:', error);
            throw error;
          }

          // 验证成功后，检查并创建profile
          if (data.user) {
            const userId = data.user.id;
            const userEmail = data.user.email;
            
            if (userEmail) {
              // 检查profile是否存在
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
              
              if (!profileData) {
                // 创建默认profile
                const username = userEmail.split('@')[0];
                
                await supabase
                  .from('profiles')
                  .insert({
                    id: userId,
                    username,
                    display_name: username
                  });
              }
            }
          }

          // 验证成功
          setVerificationStatus('success');
          return;
        }
        
        // 7. 检查是否有访问令牌在fragment中（PKCE流程）
        const accessToken = fragmentParams.get('access_token');
        const refreshToken = fragmentParams.get('refresh_token');
        if (accessToken || refreshToken) {
          console.log('Found tokens in fragment, but user not authenticated. Setting session...');
          
          // 如果找到访问令牌，尝试设置会话
          if (accessToken) {
            try {
              // 手动设置访问令牌到本地存储，让Supabase处理
              localStorage.setItem('sb-access-token', accessToken);
              if (refreshToken) {
                localStorage.setItem('sb-refresh-token', refreshToken);
              }
              
              // 尝试获取会话，触发Supabase自动处理fragment中的令牌
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData.session) {
                // 会话已创建，验证成功
                console.log('Session created from fragment tokens');
                setVerificationStatus('success');
                return;
              }
            } catch (tokenError) {
              console.error('Error setting session from tokens:', tokenError);
            }
          }
        }
        
        // 8. 如果所有方法都失败，检查是否有错误信息
        if (getUserError && !(getUserError.message.includes('Auth session missing') || getUserError.message.includes('Session not found'))) {
          console.error('Get user error:', getUserError);
          throw getUserError;
        }
        
        // 9. 如果没有任何token，可能是Supabase已经自动验证了，尝试获取当前用户
        console.log('No verification tokens found, checking if user is already verified...');
        
        try {
          const { data: finalUserCheck } = await supabase.auth.getUser();
          if (finalUserCheck.user && finalUserCheck.user.email_confirmed_at) {
            console.log('User already verified and email confirmed');
            setVerificationStatus('success');
            return;
          }
        } catch (finalCheckError) {
          console.log('Final user check failed:', finalCheckError);
        }
        
        // 如果所有方法都失败，抛出无效链接错误
        throw new Error('无效的验证链接');
        
      } catch (error) {
        console.error('Verification failed:', error);
        // 验证失败
        setVerificationStatus('error');
        const errorObj = error instanceof Error ? error : new Error('验证失败，请重试');
        setErrorMessage(translateError(errorObj));
      }
    };

    // 设置超时机制，防止无限等待
    const timeoutId = setTimeout(() => {
      console.log('Verification timeout reached, showing error');
      setVerificationStatus('error');
      setErrorMessage('验证超时，请检查链接是否有效或重新注册');
    }, 10000); // 10秒超时

    verifyEmail().finally(() => {
      clearTimeout(timeoutId);
    });
  }, [searchParams, verificationStatus]); // 添加所有必要的依赖

  // 验证成功后自动跳转到登录页面
  useEffect(() => {
    if (verificationStatus === 'success') {
      // 显示成功页面2秒后自动跳转到登录页面
      const timer = setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [verificationStatus, router]);

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleHome = () => {
    router.push('/');
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendSuccess(false);
    setResendError(null);
    setResendLoading(true);

    // 简单验证邮箱格式
    if (!resendEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail)) {
      setResendError('请输入有效的邮箱地址');
      setResendLoading(false);
      return;
    }

    try {
      // 使用应用URL配置，不区分环境
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      setResendSuccess(true);
      setResendEmail('');
      setTimeout(() => setResendSuccess(false), 3000); // 3秒后隐藏成功提示
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('重新发送验证邮件失败，请重试');
      setResendError(translateError(errorObj));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 dark:from-gray-900 dark:via-orange-900/20 dark:to-gray-900">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob dark:bg-orange-900/30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 dark:bg-pink-900/30"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000 dark:bg-purple-900/30"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10 p-8 glass rounded-3xl animate-fade-in">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
            <span className="text-3xl">💌</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600 dark:from-orange-400 dark:to-pink-400">
            邮箱验证
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            验证您的邮箱，开启表白之旅
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {verificationStatus === 'verifying' && (
            <div className="text-center p-8 bg-white/50 dark:bg-gray-800/50 rounded-2xl backdrop-blur-sm">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-700 dark:text-gray-300">正在验证您的邮箱...</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">请稍候，我们正在处理您的请求</p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="bg-gradient-to-br from-green-50 to-orange-50 border border-green-200 rounded-2xl p-8 text-center shadow-lg dark:bg-green-900/20 dark:border-green-800">
              <div className="text-green-600 text-7xl mb-6">🎉</div>
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-400 mb-3">恭喜你验证成功！</h3>
              <p className="text-green-700 dark:text-green-300 mb-8 text-lg">
                您的邮箱已成功验证，欢迎加入表白墙社区！
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleLogin}
                  className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-gray-800 dark:text-gray-300 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-lg shadow-orange-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  立即登录
                </button>
                <button
                  onClick={handleHome}
                  className="group relative w-full flex justify-center py-4 px-6 border border-gray-200 dark:border-gray-700 text-base font-bold rounded-xl text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-md transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  浏览首页
                </button>
              </div>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-8 text-center backdrop-blur-sm dark:bg-red-900/30 dark:border-red-800">
              <div className="text-red-600 text-6xl mb-4">❌</div>
              <h3 className="text-2xl font-bold text-red-900 dark:text-red-400 mb-3">验证失败</h3>
              <p className="text-red-700 dark:text-red-300 mb-6 text-lg">
                {errorMessage || '验证链接无效或已过期，请重新注册获取新的验证链接。'}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleHome}
                  className="group relative w-full flex justify-center py-3 px-5 border border-gray-200 dark:border-gray-700 text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-sm transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  返回首页
                </button>
                <button
                  onClick={() => router.push('/auth/register')}
                  className="group relative w-full flex justify-center py-3 px-5 border border-gray-200 dark:border-gray-700 text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-sm transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  返回注册
                </button>
              </div>

              {/* 重新发送验证邮件区域 */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowResendForm(!showResendForm)}
                    className="text-sm text-gray-500 hover:text-orange-600 font-medium transition-colors dark:text-gray-400 dark:hover:text-orange-400"
                  >
                    {showResendForm ? '取消' : '未收到验证邮件？重新发送'}
                  </button>
                </div>

                {showResendForm && (
                  <form className="mt-4 space-y-4 animate-slide-up" onSubmit={handleResendVerification}>
                    <div className="relative group">
                      <label htmlFor="resendEmail" className="sr-only">邮箱</label>
                      <input
                        id="resendEmail"
                        type="email"
                        placeholder="请输入您的邮箱"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className={`block w-full px-5 py-3 bg-white/50 dark:bg-gray-800/50 border ${resendError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white`}
                      />
                      {resendError && (
                        <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{resendError}</p>
                      )}
                      {resendSuccess && (
                        <p className="mt-1 text-sm text-green-500 pl-1 animate-slide-up">验证邮件已重新发送，请检查您的邮箱！</p>
                      )}
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={resendLoading}
                        className={`group relative w-full flex justify-center py-3 px-6 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-lg shadow-orange-500/30 transform hover:-translate-y-0.5 transition-all duration-200 ${resendLoading ? 'opacity-70 cursor-wait' : ''}`}
                      >
                        {resendLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>发送中...</span>
                          </div>
                        ) : '重新发送验证邮件'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 返回注册页面链接 */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            需要重新注册？
            <a 
              href="/auth/register" 
              className="font-medium text-orange-600 hover:text-orange-500 transition-colors dark:text-orange-400 dark:hover:text-orange-300 ml-1"
            >
              返回注册页面
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
export default VerifyEmailPage;

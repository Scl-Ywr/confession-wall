'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { EmailOtpType } from '@supabase/supabase-js';

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
    const verifyEmail = async () => {
      setVerificationStatus('verifying');
      setErrorMessage(null);

      try {
        // 从URL中获取token和type参数
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || !type) {
          throw new Error('无效的验证链接');
        }

        // 调用Supabase的verifyOtp方法验证邮箱
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as EmailOtpType,
        });

        if (error) {
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
      } catch (error) {
        // 验证失败
        setVerificationStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '验证失败，请重试');
      }
    };

    verifyEmail();
  }, [searchParams]);

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
      // 只在客户端执行，确保window对象存在
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/verify-email` 
        : '';
      
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
      setResendError(error instanceof Error ? error.message : '重新发送验证邮件失败，请重试');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            邮箱验证
          </h2>
        </div>

        <div className="mt-8 space-y-6">
          {verificationStatus === 'verifying' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在验证邮箱...</p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-2xl p-8 text-center shadow-lg">
              <div className="text-green-600 text-6xl mb-6">🎉</div>
              <h3 className="text-2xl font-bold text-green-900 mb-3">恭喜你注册成功！</h3>
              <p className="text-green-700 mb-8 text-lg">
                您的邮箱已成功验证，欢迎加入我们的社区！
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleLogin}
                  className="group relative w-full flex justify-center py-3 px-6 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all"
                >
                  立即登录
                </button>
                <button
                  onClick={handleHome}
                  className="group relative w-full flex justify-center py-3 px-6 border border-gray-300 text-base font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm hover:shadow-md transform hover:-translate-y-1 transition-all"
                >
                  浏览首页
                </button>
              </div>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
              <div className="text-red-600 text-4xl mb-4">✗</div>
              <h3 className="text-lg font-medium text-red-900 mb-2">邮箱验证失败</h3>
              <p className="text-red-600 mb-6">
                {errorMessage || '验证链接无效或已过期，请重新注册获取新的验证链接。'}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleHome}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  返回首页
                </button>
                <button
                  onClick={() => router.push('/auth/register')}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  返回注册
                </button>
              </div>

              {/* 重新发送验证邮件区域 */}
              <div className="mt-6">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowResendForm(!showResendForm)}
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    {showResendForm ? '取消' : '未收到验证邮件？重新发送'}
                  </button>
                </div>

                {showResendForm && (
                  <form className="mt-4 space-y-4" onSubmit={handleResendVerification}>
                    <div>
                      <input
                        type="email"
                        placeholder="请输入您的邮箱"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${resendError ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                      />
                      {resendError && (
                        <p className="mt-1 text-sm text-red-600">{resendError}</p>
                      )}
                      {resendSuccess && (
                        <p className="mt-1 text-sm text-green-600">验证邮件已重新发送，请检查您的邮箱！</p>
                      )}
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={resendLoading}
                        className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${resendLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {resendLoading ? '发送中...' : '重新发送验证邮件'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 返回注册页面链接 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            需要重新注册？
            <a 
              href="/auth/register" 
              className="font-medium text-blue-600 hover:text-blue-500 ml-1"
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

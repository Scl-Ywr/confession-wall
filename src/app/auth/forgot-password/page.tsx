'use client';

import React, { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Turnstile from '@/components/Turnstile';

// 创建密码重置表单的Zod schema
const forgotPasswordSchema = z.object({
  email: z.string()
    .nonempty('请输入邮箱')
    .email('请输入有效的邮箱地址'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // Captcha callbacks
  const handleCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  }, []);

  const handleCaptchaError = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaError('验证失败，请重试');
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaError('验证已过期，请刷新页面重试');
  }, []);

  const handleCaptchaTimeout = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaError('验证超时，请刷新页面重试');
  }, []);

  // 使用react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError(null);

    // 验证captchaToken
    if (!captchaToken) {
      setCaptchaError('请完成验证');
      setLoading(false);
      return;
    }

    try {
      // 步骤1：调用RPC函数生成密码重置令牌
      const { data: tokenData, error: tokenError } = await supabase.rpc(
        'generate_password_reset_token',
        { p_email: data.email }
      );
      
      if (tokenError) {
        console.error('生成密码重置令牌失败:', tokenError);
        throw new Error('生成密码重置令牌失败，请重试');
      }
      
      const resetToken = tokenData as string;
      console.log('生成的密码重置令牌:', resetToken);
      
      // 步骤2：发送密码重置邮件，配置正确的redirectTo参数
      // 将生成的token添加到URL中，用于跨设备验证
      // 使用应用URL配置，不区分环境
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
      
      // 为resetPasswordForEmail添加超时处理，避免无限期挂起
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('发送邮件超时，请稍后重试'));
        }, 10000); // 10秒超时
      });
      
      // 使用Promise.race实现超时控制
      const { error } = await Promise.race([
        supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: redirectUrl
        }),
        timeoutPromise
      ]);
      
      console.log('密码重置邮件已发送，redirectTo:', redirectUrl);

      if (error) {
        throw error;
      }

      // 确认邮件发送成功
      setSuccess(true);
      reset();
    } catch (error) {
      const errorObj = error as Error;
      setError(errorObj.message || '发送密码重置邮件失败，请重试');
      console.error('发送密码重置邮件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      <MeteorShower className="opacity-50" />
      
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob dark:bg-purple-900/30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 dark:bg-blue-900/30"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000 dark:bg-pink-900/30"></div>

      <div className="max-w-md w-full space-y-8 relative z-10 p-8 glass rounded-3xl animate-fade-in">
        <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
          <span className="text-3xl">🔐</span>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400">
          重置密码
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          输入您的邮箱地址，我们将发送密码重置链接
        </p>
      </div>

        {success ? (
          <div className="bg-green-50/80 border border-green-200 rounded-2xl p-8 text-center shadow-lg dark:bg-green-900/20 dark:border-green-800">
            <div className="text-green-600 text-7xl mb-6">🎉</div>
            <h3 className="text-2xl font-bold text-green-900 dark:text-green-400 mb-3">邮件已发送</h3>
            <p className="text-green-700 dark:text-green-300 mb-8 text-lg">
              请检查您的邮箱，点击邮件中的链接重置密码
            </p>
            <div className="space-y-4">
              <Link 
                href="/auth/login" 
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-gray-800 dark:text-gray-300 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                返回登录页面
              </Link>
              <Link 
                href="/auth/reset-password" 
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-gray-800 dark:text-gray-300 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                前往重置密码页面
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="relative group">
                <label htmlFor="email" className="sr-only">邮箱</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.email ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                  placeholder="请输入邮箱"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Cloudflare Turnstile 验证 */}
            <div className="mt-4">
              {!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <div className="p-3 rounded-xl text-sm bg-red-50/80 border border-red-200 text-red-600">
                  Turnstile site key not configured
                </div>
              )}
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                    onSuccess={handleCaptchaSuccess}
                    onError={handleCaptchaError}
                    onExpire={handleCaptchaExpire}
                    onTimeout={handleCaptchaTimeout}
                  />
              )}
              {captchaError && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{captchaError}</p>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-red-900/30 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-gray-800 dark:text-gray-300 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all duration-200 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>发送确认邮件...</span>
                </div>
              ) : '发送确认邮件'}
            </button>

            <div className="space-y-4 text-center">
              <Link 
                href="/auth/login" 
                className="block text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors dark:text-gray-400 dark:hover:text-primary-400"
              >
                返回登录
              </Link>
              <Link 
                href="/auth/reset-password" 
                className="block text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors dark:text-blue-400 dark:hover:text-blue-300"
              >
                前往重置密码页面
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

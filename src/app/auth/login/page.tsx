'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import SocialLoginButtons from '@/components/SocialLoginButtons';
import Turnstile from '@/components/Turnstile';


// 创建登录表单的Zod schema
const loginSchema = z.object({
  email: z.string()
    .nonempty('请输入邮箱')
    .email('请输入有效的邮箱地址'),
  password: z.string()
    .nonempty('请输入密码')
    .min(8, '密码长度不能少于8个字符'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuth();
  const [loginAttemptInfo, setLoginAttemptInfo] = React.useState<{ remainingAttempts: number; isLocked: boolean }>({ 
    remainingAttempts: 5, 
    isLocked: false 
  });
  const [emailInput, setEmailInput] = React.useState<string>('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // 组件挂载时清除错误信息
  React.useEffect(() => {
    clearError();
  }, [clearError]);

  // 监听邮箱输入变化，获取登录尝试信息
  React.useEffect(() => {
    const fetchLoginAttemptInfo = async () => {
      if (!emailInput) {
        setLoginAttemptInfo({ remainingAttempts: 5, isLocked: false });
        return;
      }

      try {
        // 获取客户端IP
        const ipResponse = await fetch('/api/get-ip');
        const ipData = await ipResponse.json();
        const ipAddress = ipData.ip || 'unknown';

        // 调用Supabase RPC函数获取登录尝试信息
        const supabase = (await import('@/lib/supabase/client')).supabase;
        const { data, error } = await supabase
          .rpc('check_login_attempts', { 
            p_email: emailInput, 
            p_ip_address: ipAddress 
          });

        if (error) {
          console.error('Error fetching login attempt info:', error);
          return;
        }

        if (data) {
          setLoginAttemptInfo({
            remainingAttempts: data.remaining_attempts || 5,
            isLocked: data.is_locked || false
          });
        }
      } catch (error) {
        console.error('Error fetching login attempt info:', error);
      }
    };

    // 使用防抖，避免每次输入都调用API
    const timer = setTimeout(fetchLoginAttemptInfo, 500);
    return () => clearTimeout(timer);
  }, [emailInput]);

  // 使用react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 添加事件监听器处理Turnstile回调
  React.useEffect(() => {
    // 监听Turnstile成功事件
    const handleTurnstileSuccess = (event: CustomEvent) => {
      setCaptchaToken(event.detail.token);
      setCaptchaError(null);
    };
    
    // 监听Turnstile错误事件
    const handleTurnstileError = () => {
      setCaptchaError('验证失败，请重试');
    };
    
    window.addEventListener('login-turnstile-success', handleTurnstileSuccess as EventListener);
    window.addEventListener('login-turnstile-error', handleTurnstileError as EventListener);
    
    return () => {
      // 清理事件监听器
      window.removeEventListener('login-turnstile-success', handleTurnstileSuccess as EventListener);
      window.removeEventListener('login-turnstile-error', handleTurnstileError as EventListener);
    };
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    // 验证captchaToken
    if (!captchaToken) {
      setCaptchaError('请完成验证');
      return;
    }
    
    try {
      await login(data.email, data.password, captchaToken);
      router.push('/');
    } catch{
      // 错误已在AuthContext中处理
      // 登录失败后，重新获取登录尝试信息
      const ipResponse = await fetch('/api/get-ip');
      const ipData = await ipResponse.json();
      const ipAddress = ipData.ip || 'unknown';
      
      const supabase = (await import('@/lib/supabase/client')).supabase;
      const { data: attemptData } = await supabase
        .rpc('check_login_attempts', { 
          p_email: data.email, 
          p_ip_address: ipAddress 
        });
      
      if (attemptData) {
        setLoginAttemptInfo({
          remainingAttempts: attemptData.remaining_attempts || 5,
          isLocked: attemptData.is_locked || false
        });
      }
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
            欢迎回来
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            还没有账号？
            <Link href="/auth/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors dark:text-primary-400 dark:hover:text-primary-300 ml-1">
              立即注册
            </Link>
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            忘记密码？
            <Link href="/auth/forgot-password" className="font-medium text-primary-600 hover:text-primary-500 transition-colors dark:text-primary-400 dark:hover:text-primary-300 ml-1">
              重置密码
            </Link>
          </p>
        </div>

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
                {...register('email', { 
                  onChange: (e) => setEmailInput(e.target.value) 
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.email.message}</p>
              )}
            </div>

            <div className="relative group">
              <label htmlFor="password" className="sr-only">密码</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.password ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                placeholder="请输入密码"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* 登录尝试信息 */}
          {emailInput && (
            <div className={`p-3 rounded-xl text-sm ${loginAttemptInfo.isLocked ? 'bg-red-50/80 border border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : 'bg-blue-50/80 border border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'}`}>
              {loginAttemptInfo.isLocked ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>您的账号已被锁定，请稍后再试</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>剩余登录尝试次数：{loginAttemptInfo.remainingAttempts}</p>
                </div>
              )}
            </div>
          )}

          {/* Cloudflare Turnstile 验证 */}
          <div className="mt-4">
            {/* Cloudflare Turnstile 验证 */}
            <Turnstile
              siteKey="0x4AAAAAACJs5Xb_A9aqqv_u"
              onSuccess={(token) => {
                setCaptchaToken(token);
                setCaptchaError(null);
              }}
              onError={() => {
                setCaptchaError('验证失败，请重试');
              }}
            />
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
                <span>登录中...</span>
              </div>
            ) : '登录'}
          </button>
        </form>

        <SocialLoginButtons disabled={loading} loading={loading} />
      </div>
    </div>
  );
};

export default LoginPage;

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import SocialLoginButtons from '@/components/SocialLoginButtons';
import Turnstile from '@/components/Turnstile';
import { LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';


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
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 组件挂载时清除错误信息
  React.useEffect(() => {
    clearError();
  }, [clearError]);

  // Captcha callbacks
  const handleCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  }, []);

  const handleCaptchaError = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaError('验证失败，请重试');
  }, []);

  const resetCaptcha = useCallback((message?: string) => {
    setCaptchaToken(null);
    setCaptchaResetKey((key) => key + 1);
    if (message) {
      setCaptchaError(message);
    }
  }, []);

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

  const onSubmit = async (data: LoginFormData) => {
    // 防止重复提交
    if (isSubmitting) {
      return;
    }

    // 验证captchaToken
    if (!captchaToken) {
      setCaptchaError('请完成验证');
      return;
    }

    setIsSubmitting(true);
    setCaptchaError(null);

    try {
      // Turnstile token 是一次性的，直接交给 Supabase Auth 验证，避免本地预验证消费 token。
      await login(data.email, data.password, captchaToken);
      router.push('/');
    } catch (err) {
      resetCaptcha();
      // 错误已在AuthContext中处理
      // 登录失败后，重新获取登录尝试信息
      let ipAddress = 'unknown';
      try {
        const ipResponse = await fetch('/api/get-ip');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip || 'unknown';
      } catch (ipError) {
        console.error('Failed to get IP address:', ipError);
      }

      try {
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
      } catch (rpcError) {
        console.error('Failed to get login attempt info:', rpcError);
      }

      // 验证码错误，重置验证码
      const errorMessage = error || (err instanceof Error ? err.message : '');
      if (errorMessage.includes('验证码') || errorMessage.includes('captcha')) {
        resetCaptcha(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cw-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="cw-decor-grid" />
      <MeteorShower className="opacity-20" />
      <div className="pointer-events-none absolute left-10 top-32 h-20 w-20 rotate-[-18deg] rounded-[36%] bg-pink-300/25 blur-sm" />
      <div className="pointer-events-none absolute right-16 bottom-28 h-24 w-24 rotate-12 rounded-[36%] bg-rose-300/25 blur-sm" />

      <div className="cw-panel relative z-10 w-full max-w-md animate-fade-in space-y-8 rounded-[2rem] p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 shadow-[0_14px_35px_rgba(244,63,94,.18)] transition-transform duration-300 hover:rotate-3 dark:bg-rose-500/15">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <h2 className="mt-6 bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-3xl font-black text-transparent">
            欢迎回来
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            还没有账号？
            <Link href="/auth/register" className="ml-1 font-bold text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-300">
              立即注册
            </Link>
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            忘记密码？
            <Link href="/auth/forgot-password" className="ml-1 font-bold text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-300">
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
                className={`cw-input placeholder:text-slate-400 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                className={`cw-input placeholder:text-slate-400 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                  onExpire={() => setCaptchaToken(null)}
                  onTimeout={() => setCaptchaToken(null)}
                  resetSignal={captchaResetKey}
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
            disabled={loading || isSubmitting || loginAttemptInfo.isLocked}
            className={`cw-primary-btn w-full text-base ${(loading || isSubmitting || loginAttemptInfo.isLocked) ? 'cursor-wait opacity-70' : ''}`}
          >
            {(loading || isSubmitting) ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>登录中...</span>
              </div>
            ) : loginAttemptInfo.isLocked ? '账号已锁定' : (
              <span className="inline-flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                登录
              </span>
            )}
          </button>
        </form>

        <SocialLoginButtons disabled={loading} loading={loading} />
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          你的隐私会被温柔保护
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

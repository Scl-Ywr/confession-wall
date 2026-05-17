'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Turnstile from '@/components/Turnstile';
import { ShieldCheck, Sparkles, UserPlus } from 'lucide-react';


// 创建注册表单的Zod schema
const registerSchema = z.object({
  email: z.string()
    .nonempty('请输入邮箱')
    .email('请输入有效的邮箱地址'),
  password: z.string()
    .nonempty('请输入密码')
    .min(8, '密码长度不能少于8个字符')
    .max(32, '密码长度不能超过32个字符')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, '密码必须同时包含字母和数字'),
  confirmPassword: z.string()
    .nonempty('请确认密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// 创建重新发送邮件表单的Zod schema
const resendEmailSchema = z.object({
  resendEmail: z.string()
    .nonempty('请输入邮箱')
    .email('请输入有效的邮箱地址'),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type ResendEmailFormData = z.infer<typeof resendEmailSchema>;

const RegisterPage: React.FC = () => {
  const router = useRouter();
  const { register: registerUser, resendVerificationEmail, loading, error } = useAuth();
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Captcha callbacks
  const handleCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  }, []);

  const resetCaptcha = useCallback((message?: string) => {
    setCaptchaToken(null);
    setCaptchaResetKey((key) => key + 1);
    if (message) {
      setCaptchaError(message);
    }
  }, []);

  // 移除handleCaptchaError，使用组件内部的错误信息
  const handleCaptchaError = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  // 使用react-hook-form管理注册表单
  const {
    register,
    handleSubmit: handleRegisterSubmit,
    reset,
    formState: { errors: registerErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // 使用react-hook-form管理重新发送邮件表单
  const {
    register: registerResend,
    handleSubmit: handleResendSubmit,
    reset: resetResend,
    formState: { errors: resendErrors },
  } = useForm<ResendEmailFormData>({
    resolver: zodResolver(resendEmailSchema),
    defaultValues: {
      resendEmail: '',
    },
  });


  // 处理注册表单提交
  const onRegisterSubmit = async (data: RegisterFormData) => {
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
      await registerUser(data.email, data.password, captchaToken);
      // 注册成功后显示页面内提示，不直接跳转
      setRegisterSuccess(true);
      // 清空表单
      reset();
      resetCaptcha();
      // 3秒后隐藏成功提示
      setTimeout(() => setRegisterSuccess(false), 3000);
    } catch (err) {
      resetCaptcha();
      // 使用catch块的err参数而不是error状态
      const errorMessage = err instanceof Error ? err.message : '注册失败，请重试';

      if (errorMessage.includes('您已经注册成功')) {
        // 已验证邮箱用户：显示提示，2秒后自动跳转登录
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else if (errorMessage.includes('验证码') || errorMessage.includes('captcha')) {
        // 验证码错误，重置验证码
        resetCaptcha(errorMessage);
      }

      // 对于数据库操作失败，提供更友好的提示
      if (errorMessage.includes('数据库连接失败')) {
        // 可以在这里添加重试按钮或其他UI提示
        console.log('数据库连接失败，提示用户检查网络');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重新发送验证邮件的处理函数
  const onResendSubmit = async (data: ResendEmailFormData) => {
    setResendSuccess(false);
    setResendError(null);
    setResendLoading(true);

    try {
      await resendVerificationEmail(data.resendEmail);
      setResendSuccess(true);
      resetResend();
      setTimeout(() => setResendSuccess(false), 3000); // 3秒后隐藏成功提示
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重新发送验证邮件失败，请重试';
      // 处理特定错误情况
      if (errorMessage.toLowerCase().includes('rate limit')) {
        setResendError('操作过于频繁，请稍后再试');
      } else if (errorMessage.toLowerCase().includes('network')) {
        setResendError('网络连接失败，请检查您的网络设置');
      } else if (errorMessage.toLowerCase().includes('user not found')) {
        setResendError('该邮箱尚未注册，请先注册');
      } else {
        setResendError(errorMessage);
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="cw-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="cw-decor-grid" />
      <MeteorShower className="opacity-20" />
      <div className="pointer-events-none absolute left-12 top-24 h-20 w-20 rotate-[-18deg] rounded-[36%] bg-pink-300/25 blur-sm" />
      <div className="pointer-events-none absolute right-14 bottom-28 h-24 w-24 rotate-12 rounded-[36%] bg-rose-300/25 blur-sm" />

      <div className="cw-panel relative z-10 w-full max-w-md animate-fade-in space-y-8 rounded-[2rem] p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 shadow-[0_14px_35px_rgba(244,63,94,.18)] transition-transform duration-300 hover:-rotate-3 dark:bg-rose-500/15">
            <UserPlus className="h-8 w-8" />
          </div>
          <h2 className="mt-6 bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-3xl font-black text-transparent">
            创建账号
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            已有账号？
            <Link href="/auth/login" className="ml-1 font-bold text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-300">
              立即登录
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit(onRegisterSubmit)}>
          <div className="space-y-4">
            <div className="relative group">
              <label htmlFor="email" className="sr-only">邮箱</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`cw-input placeholder:text-slate-400 ${registerErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请输入邮箱"
                {...register('email')}
              />
              {registerErrors.email && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{registerErrors.email.message}</p>
              )}
            </div>

            <div className="relative group">
              <label htmlFor="password" className="sr-only">密码</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={`cw-input placeholder:text-slate-400 ${registerErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="密码"
                {...register('password')}
              />
              {registerErrors.password && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{registerErrors.password.message}</p>
              )}
            </div>

            <div className="relative group">
              <label htmlFor="confirmPassword" className="sr-only">确认密码</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`cw-input placeholder:text-slate-400 ${registerErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="确认密码"
                {...register('confirmPassword')}
              />
              {registerErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{registerErrors.confirmPassword.message}</p>
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
                  onExpire={() => setCaptchaToken(null)}
                  onTimeout={() => setCaptchaToken(null)}
                  resetSignal={captchaResetKey}
                />
            )}
            {captchaError && (
              <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{captchaError}</p>
            )}
          </div>

          {/* 注册错误提示 */}
          {error && (
            <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-red-900/30 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">{error}</p>
              </div>
              {/* 注销用户特殊处理 */}
              {error.includes('已注销') && (
                <div className="mt-4">
                  <Link 
                    href="/auth/forgot-password" 
                    className="cw-primary-btn w-full text-sm"
                  >
                    前往密码重置页面
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 注册成功提示 */}
          {registerSuccess && (
            <div className="p-4 bg-green-50/80 border border-green-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-green-900/30 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium">注册成功！请检查您的邮箱，点击验证链接完成注册后再登录。</p>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className={`cw-primary-btn w-full text-base ${(loading || isSubmitting) ? 'cursor-wait opacity-70' : ''}`}
            >
              {(loading || isSubmitting) ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>注册中...</span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  注册
                </span>
              )}
            </button>
          </div>
        </form>

        {/* 重新发送验证邮件区域 */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowResendForm(!showResendForm)}
              className="text-sm font-semibold text-slate-500 transition-colors hover:text-rose-500 dark:text-slate-400"
            >
              {showResendForm ? '返回注册' : '未收到验证邮件？重新发送'}
            </button>
          </div>

          {showResendForm && (
            <form className="mt-4 space-y-4 animate-slide-up" onSubmit={handleResendSubmit(onResendSubmit)}>
              <div className="relative group">
                <label htmlFor="resendEmail" className="sr-only">邮箱</label>
                <input
                  id="resendEmail"
                  type="email"
                  autoComplete="email"
                  className={`cw-input min-h-12 placeholder:text-slate-400 ${resendError || resendErrors.resendEmail ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="请输入邮箱"
                  {...registerResend('resendEmail')}
                />
                {resendErrors.resendEmail && (
                  <p className="mt-1 text-sm text-red-500 pl-1">{resendErrors.resendEmail.message}</p>
                )}
                {resendError && !resendErrors.resendEmail && (
                  <p className="mt-1 text-sm text-red-500 pl-1">{resendError}</p>
                )}
                {resendSuccess && (
                  <p className="mt-1 text-sm text-green-500 pl-1">验证邮件已重新发送，请检查您的邮箱！</p>
                )}
              </div>

              <div>
                      <button
                        type="submit"
                        disabled={resendLoading}
                        className={`cw-secondary-btn w-full text-sm ${resendLoading ? 'cursor-wait opacity-70' : ''}`}
                      >
                        {resendLoading ? '发送中...' : '重新发送验证邮件'}
                      </button>
                    </div>
            </form>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          欢迎来到安全的心声空间
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

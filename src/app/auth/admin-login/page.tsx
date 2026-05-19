'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

type AdminStatusResponse = {
  authenticated: boolean;
  isAdmin: boolean;
  reason?: string;
};

const AdminLoginPage: React.FC = () => {
  const router = useRouter();
  const { login, error, clearError } = useAuth();
  
  // 使用useState和useEffect获取重定向URL，避免在组件顶层使用useSearchParams
  const [redirectUrl, setRedirectUrl] = React.useState<string>('/admin');
  // 本地状态跟踪登录操作的加载状态
  const [isLoggingIn, setIsLoggingIn] = React.useState<boolean>(false);
  // 登录尝试信息
  const [loginAttemptInfo, setLoginAttemptInfo] = React.useState<{ remainingAttempts: number; isLocked: boolean }>({ 
    remainingAttempts: 5, 
    isLocked: false 
  });
  const [emailInput, setEmailInput] = React.useState<string>('');
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);
  const [captchaError, setCaptchaError] = React.useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = React.useState(0);
  const [adminLoginError, setAdminLoginError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    // 从window.location.search中解析redirect参数
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }, []);

  // 组件挂载时清除错误信息
  React.useEffect(() => {
    clearError();
  }, [clearError]);

  const handleCaptchaSuccess = React.useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  }, []);

  const handleCaptchaError = React.useCallback(() => {
    setCaptchaToken(null);
    setCaptchaError('验证失败，请重试');
  }, []);

  const resetCaptcha = React.useCallback((message?: string) => {
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
    if (!captchaToken) {
      setCaptchaError('请完成验证');
      return;
    }

    setIsLoggingIn(true);
    setCaptchaError(null);
    setAdminLoginError(null);

    try {
      // Turnstile token 是一次性的，直接交给 Supabase Auth 验证。
      await login(data.email, data.password, captchaToken, true);

      const statusResponse = await fetch('/api/auth/admin-status', {
        cache: 'no-store',
        credentials: 'include',
      });
      const adminStatus = await statusResponse.json() as AdminStatusResponse;

      if (!statusResponse.ok || !adminStatus.authenticated || !adminStatus.isAdmin) {
        throw new Error(getAdminStatusMessage(adminStatus.reason));
      }

      // 登录成功后跳转到管理员页面
      router.replace(redirectUrl);
      router.refresh();
    } catch (err) {
      resetCaptcha();
      // 登录失败后，重新获取登录尝试信息
      try {
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
      } catch (attemptError) {
        console.error('Failed to refresh admin login attempt info:', attemptError);
      }

      const errorMessage = error || (err instanceof Error ? err.message : '');
      setAdminLoginError(errorMessage || '管理员登录失败，请重试');
      if (errorMessage.includes('验证码') || errorMessage.includes('captcha')) {
        resetCaptcha(errorMessage);
      }
    } finally {
      setIsLoggingIn(false);
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
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
            <span className="text-3xl">🔑</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            管理员登录
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            还没有管理员账号？
            <Link href="/auth/admin-register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors dark:text-blue-400 dark:hover:text-blue-300 ml-1">
              立即注册
            </Link>
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            忘记密码？
            <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 transition-colors dark:text-blue-400 dark:hover:text-blue-300 ml-1">
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
                className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.email ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-blue-300 dark:group-hover:border-blue-700'}`}
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
                className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.password ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-blue-300 dark:group-hover:border-blue-700'}`}
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

          {adminLoginError && adminLoginError !== error && (
            <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-red-900/30 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">{adminLoginError}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className={`w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200 ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isLoggingIn ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>登录中...</span>
              </div>
            ) : '管理员登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

function getAdminStatusMessage(reason?: string) {
  switch (reason) {
    case 'not_authenticated':
      return '登录会话没有写入成功，请刷新页面后重试';
    case 'profile_check_failed':
      return '无法读取管理员资料，请稍后重试';
    case 'no_admin_role':
    case 'insufficient_role':
      return '该账号没有管理员权限';
    case 'role_check_failed':
      return '无法校验管理员角色，请稍后重试';
    default:
      return '管理员登录校验失败，请稍后重试';
  }
}

// 标记为动态页面，避免预渲染错误
export const dynamic = 'force-dynamic';

export default AdminLoginPage;

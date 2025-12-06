'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 创建修改密码表单的Zod schema
const changePasswordSchema = z.object({
  currentPassword: z.string()
    .nonempty('请输入当前密码'),
  newPassword: z.string()
    .nonempty('请输入新密码')
    .min(6, '密码长度不能少于6个字符'),
  confirmNewPassword: z.string()
    .nonempty('请确认新密码'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: '两次输入的新密码不一致',
  path: ['confirmNewPassword'],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

const ChangePasswordPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 如果用户未登录，重定向到登录页面
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // 使用react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({ 
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    if (!user || !user.email) {
      setError('用户信息不存在');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 首先使用当前密码登录，验证身份
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });

      if (loginError) {
        throw loginError;
      }

      // 然后更新密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // 密码修改成功
      setSuccess(true);
      reset();
      
      // 3秒后跳转回个人资料页
      setTimeout(() => {
        router.push('/profile');
      }, 3000);
    } catch (error) {
      const errorObj = error as Error;
      const errorMsg = errorObj.message.toLowerCase();
      
      if (errorMsg.includes('invalid login credentials')) {
        setError('当前密码错误');
      } else {
        setError(errorObj.message || '修改密码失败，请重试');
      }
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
            修改密码
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            更改您的登录密码
          </p>
        </div>

        {success ? (
          <div className="bg-green-50/80 border border-green-200 rounded-2xl p-8 text-center shadow-lg dark:bg-green-900/20 dark:border-green-800">
            <div className="text-green-600 text-7xl mb-6">🎉</div>
            <h3 className="text-2xl font-bold text-green-900 dark:text-green-400 mb-3">密码修改成功！</h3>
            <p className="text-green-700 dark:text-green-300 mb-8 text-lg">
              您的密码已成功修改，3秒后将自动返回个人资料页
            </p>
            <div className="space-y-4">
              <Link 
                href="/profile" 
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-gray-800 dark:text-gray-300 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                立即返回个人资料
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="relative group">
                <label htmlFor="currentPassword" className="sr-only">当前密码</label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.currentPassword ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                  placeholder="请输入当前密码"
                  {...register('currentPassword')}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.currentPassword.message}</p>
                )}
              </div>

              <div className="relative group">
                <label htmlFor="newPassword" className="sr-only">新密码</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.newPassword ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                  placeholder="请输入新密码"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="relative group">
                <label htmlFor="confirmNewPassword" className="sr-only">确认新密码</label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.confirmNewPassword ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                  placeholder="请确认新密码"
                  {...register('confirmNewPassword')}
                />
                {errors.confirmNewPassword && (
                  <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.confirmNewPassword.message}</p>
                )}
              </div>
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
                  <span>修改中...</span>
                </div>
              ) : '确认修改'}
            </button>

            <div className="text-center">
              <Link 
                href="/profile" 
                className="text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors dark:text-gray-400 dark:hover:text-primary-400"
              >
                返回个人资料
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordPage;

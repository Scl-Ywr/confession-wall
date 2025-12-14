'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeftCircleIcon } from '@heroicons/react/24/outline';

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

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 如果用户未登录，重定向到登录页面
  useEffect(() => {
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">安全设置</h1>
        <button
          onClick={() => router.push('/admin/settings')}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeftCircleIcon className="w-5 h-5" />
          返回设置
        </button>
      </div>

      {/* 安全设置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-blue-800 mb-1">安全提示</h2>
        <p className="text-sm text-blue-700">
          定期修改密码有助于保护您的账户安全。建议使用包含字母、数字和特殊字符的强密码。
        </p>
      </div>

      {/* 密码修改表单 */}
      <div className="max-w-2xl">
        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-800">密码修改成功！</h3>
            </div>
            <p className="text-green-700">
              您的密码已成功修改。请妥善保管您的新密码。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  当前密码
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.currentPassword ? 'border-red-500' : ''}`}
                  placeholder="输入当前密码"
                  {...register('currentPassword')}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.newPassword ? 'border-red-500' : ''}`}
                  placeholder="输入新密码（至少6个字符）"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  确认新密码
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.confirmNewPassword ? 'border-red-500' : ''}`}
                  placeholder="再次输入新密码"
                  {...register('confirmNewPassword')}
                />
                {errors.confirmNewPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.confirmNewPassword.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => reset()}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                重置
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>修改中...</span>
                  </div>
                ) : '确认修改'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 安全建议卡片 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-5">
        <h3 className="text-lg font-medium text-gray-900 mb-3">安全建议</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>使用包含字母、数字和特殊字符的强密码</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>定期更换密码，建议每3-6个月更换一次</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>不要在多个网站使用相同的密码</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>启用邮箱验证，确保账户安全</span>
          </li>
        </ul>
      </div>
    </div>
  );
}


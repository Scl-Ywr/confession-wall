'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 创建注册表单的Zod schema
const registerSchema = z.object({
  email: z.string()
    .nonempty('请输入邮箱')
    .email('请输入有效的邮箱地址'),
  code: z.string()
    .nonempty('请输入验证码')
    .length(6, '验证码长度必须为6个字符'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const AdminRegisterPage: React.FC = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 使用react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      code: '',
    },
  });

  // 处理表单提交
  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    console.log('Admin registration attempt:', { email: data.email, code: data.code });

    try {
      // 调用API注册管理员
      const response = await fetch('/api/admin/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('Admin registration API response:', { status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || '注册失败，请重试');
      }

      console.log('Admin registration successful:', { email: data.email });
      setSuccessMessage('管理员注册成功！即将跳转到登录页面...');
      reset();
      
      // 2秒后跳转回管理员登录页面
      setTimeout(() => {
        router.push('/auth/admin-login');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册失败，请重试';
      console.error('Admin registration failed:', { email: data.email, error: errorMessage });
      setErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
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
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            管理员注册
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            已有管理员账号？
            <Link href="/auth/admin-login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors dark:text-blue-400 dark:hover:text-blue-300 ml-1">
              立即登录
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
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.email.message}</p>
              )}
            </div>

            <div className="relative group">
              <label htmlFor="code" className="sr-only">验证码</label>
              <input
                id="code"
                type="text"
                autoComplete="off"
                className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.code ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-blue-300 dark:group-hover:border-blue-700'}`}
                placeholder="请输入验证码"
                {...register('code')}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.code.message}</p>
              )}
            </div>
          </div>

          {/* 错误提示 */}
          {errorMessage && (
            <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-red-900/30 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* 成功提示 */}
          {successMessage && (
            <div className="p-4 bg-green-50/80 border border-green-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-green-900/30 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>注册中...</span>
              </div>
            ) : '注册管理员'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminRegisterPage;
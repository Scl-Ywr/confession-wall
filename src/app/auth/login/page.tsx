'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoginFormData } from '@/types/auth';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<LoginFormData>>({});

  const validateForm = () => {
    const errors: Partial<LoginFormData> = {};

    if (!formData.email) {
      errors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!formData.password) {
      errors.password = '请输入密码';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.email, formData.password);
      // 登录成功后跳转到首页
      router.push('/');
    } catch {
      // 错误已在AuthContext中处理
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 清除对应字段的错误信息
    if (formErrors[name as keyof LoginFormData]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof LoginFormData];
        return newErrors;
      });
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
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative group">
              <label htmlFor="email" className="sr-only">邮箱</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${formErrors.email ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                placeholder="请输入邮箱"
                value={formData.email}
                onChange={handleChange}
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{formErrors.email}</p>
              )}
            </div>

            <div className="relative group">
              <label htmlFor="password" className="sr-only">密码</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${formErrors.password ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleChange}
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{formErrors.password}</p>
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
                <span>登录中...</span>
              </div>
            ) : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

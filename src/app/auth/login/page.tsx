'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoginFormData } from '@/types/auth';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            登录账号
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            还没有账号？
            <a href="/auth/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors dark:text-primary-400 dark:hover:text-primary-300">
              立即注册
            </a>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-transparent ${formErrors.email ? 'border-red-500 dark:border-red-600' : ''}`}
                placeholder="邮箱"
                value={formData.email}
                onChange={handleChange}
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" id="email-error">
                  {formErrors.email}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-transparent ${formErrors.password ? 'border-red-500 dark:border-red-600' : ''}`}
                placeholder="密码"
                value={formData.password}
                onChange={handleChange}
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" id="password-error">
                  {formErrors.password}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/30 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''} dark:bg-primary-500 dark:hover:bg-primary-400 dark:focus:ring-offset-gray-900`}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

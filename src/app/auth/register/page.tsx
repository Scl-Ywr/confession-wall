'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RegisterFormData } from '@/types/auth';
import MeteorShower from '@/components/MeteorShower';
import Link from 'next/link';

const RegisterPage: React.FC = () => {
  const { register, resendVerificationEmail, loading, error } = useAuth();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<RegisterFormData>>({});
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const validateForm = () => {
    const errors: Partial<RegisterFormData> = {};

    if (!formData.email) {
      errors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!formData.password) {
      errors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      errors.password = '密码长度不能少于6个字符';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = '两次输入的密码不一致';
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
      await register(formData.email, formData.password);
      // 注册成功后显示页面内提示，不直接跳转
      setRegisterSuccess(true);
      // 清空表单
      setFormData({ email: '', password: '', confirmPassword: '' });
      // 3秒后隐藏成功提示
      setTimeout(() => setRegisterSuccess(false), 3000);
    } catch {
      // 错误已在AuthContext中处理
    }
  };

  // 重新发送验证邮件的处理函数
  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendSuccess(false);
    setResendError(null);

    // 简单验证邮箱格式
    if (!resendEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail)) {
      setResendError('请输入有效的邮箱地址');
      return;
    }

    try {
      await resendVerificationEmail(resendEmail);
      setResendSuccess(true);
      setResendEmail('');
      setTimeout(() => setResendSuccess(false), 3000); // 3秒后隐藏成功提示
    } catch (error) {
      setResendError(error instanceof Error ? error.message : '重新发送验证邮件失败，请重试');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 清除对应字段的错误信息
    if (formErrors[name as keyof RegisterFormData]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof RegisterFormData];
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
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400">
            创建账号
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            已有账号？
            <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors dark:text-primary-400 dark:hover:text-primary-300 ml-1">
              立即登录
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
                placeholder="邮箱"
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
                autoComplete="new-password"
                required
                className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${formErrors.password ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                placeholder="密码"
                value={formData.password}
                onChange={handleChange}
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{formErrors.password}</p>
              )}
            </div>

            <div className="relative group">
              <label htmlFor="confirmPassword" className="sr-only">确认密码</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`block w-full px-5 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${formErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                placeholder="确认密码"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{formErrors.confirmPassword}</p>
              )}
            </div>
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
              disabled={loading}
              className={`w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-gray-800 dark:text-gray-300 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all duration-200 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>注册中...</span>
                </div>
              ) : '注册'}
            </button>
          </div>
        </form>

        {/* 重新发送验证邮件区域 */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowResendForm(!showResendForm)}
              className="text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors dark:text-gray-400 dark:hover:text-primary-400"
            >
              {showResendForm ? '返回注册' : '未收到验证邮件？重新发送'}
            </button>
          </div>

          {showResendForm && (
            <form className="mt-4 space-y-4 animate-slide-up" onSubmit={handleResendVerification}>
              <div className="relative group">
                <label htmlFor="resendEmail" className="sr-only">邮箱</label>
                <input
                  id="resendEmail"
                  name="resendEmail"
                  type="email"
                  autoComplete="email"
                  required
                  className={`block w-full px-5 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm dark:text-white ${resendError ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-300 dark:group-hover:border-primary-700'}`}
                  placeholder="请输入您的邮箱"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
                {resendError && (
                  <p className="mt-1 text-sm text-red-500 pl-1">{resendError}</p>
                )}
                {resendSuccess && (
                  <p className="mt-1 text-sm text-green-500 pl-1">验证邮件已重新发送，请检查您的邮箱！</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-3 px-6 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-xl text-gray-700 dark:text-gray-200 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {loading ? '发送中...' : '重新发送验证邮件'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
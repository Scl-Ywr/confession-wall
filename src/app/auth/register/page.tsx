'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RegisterFormData } from '@/types/auth';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            注册账号
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            已有账号？
            <a href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors dark:text-primary-400 dark:hover:text-primary-300">
              立即登录
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
                autoComplete="new-password"
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
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-transparent ${formErrors.confirmPassword ? 'border-red-500 dark:border-red-600' : ''}`}
                placeholder="确认密码"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" id="confirmPassword-error">
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* 注册错误提示 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg transition-all duration-300 dark:bg-red-900/30 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 注册成功提示 */}
          {registerSuccess && (
            <div className="mt-4 p-3 bg-secondary-50 border border-secondary-200 rounded-lg transition-all duration-300 dark:bg-secondary-900/30 dark:border-secondary-800">
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                注册成功！请检查您的邮箱，点击验证链接完成注册后再登录。
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''} dark:bg-primary-500 dark:hover:bg-primary-400 dark:focus:ring-offset-gray-900`}
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </div>
        </form>

        {/* 重新发送验证邮件区域 */}
        <div className="mt-6">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowResendForm(!showResendForm)}
              className="text-sm text-primary-600 hover:text-primary-500 font-medium transition-colors dark:text-primary-400 dark:hover:text-primary-300"
            >
              {showResendForm ? '返回注册' : '未收到验证邮件？重新发送'}
            </button>
          </div>

          {showResendForm && (
            <form className="mt-4 space-y-6" onSubmit={handleResendVerification}>
              <div>
                <label htmlFor="resendEmail" className="sr-only">
                  邮箱
                </label>
                <input
                  id="resendEmail"
                  name="resendEmail"
                  type="email"
                  autoComplete="email"
                  required
                  className={`block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-transparent ${resendError ? 'border-red-500 dark:border-red-600' : ''}`}
                  placeholder="请输入您的邮箱"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
                {resendError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400" id="resendEmail-error">
                    {resendError}
                  </p>
                )}
                {resendSuccess && (
                  <p className="mt-1 text-sm text-secondary-600 dark:text-secondary-400">
                    验证邮件已重新发送，请检查您的邮箱！
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''} dark:bg-primary-500 dark:hover:bg-primary-400 dark:focus:ring-offset-gray-900`}
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
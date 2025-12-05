'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LoginPromptProps {
  message?: string;
  duration?: number;
  onClose?: () => void;
}

const LoginPrompt: React.FC<LoginPromptProps> = ({ 
  message = '请先登录后再进行操作', 
  duration = 2000,
  onClose 
}) => {
  const router = useRouter();

  useEffect(() => {
    // 延迟指定时间后跳转到登录页面
    const timer = setTimeout(() => {
      router.push('/auth/login');
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, router]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 relative">
        {/* 关闭按钮 */}
        {onClose && (
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            需要登录
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-black font-medium rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              立即登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPrompt;
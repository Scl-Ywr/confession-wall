'use client';

import { useEffect } from 'react';

interface MessageToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

const MessageToast = ({ message, type = 'info', duration = 3000, onClose }: MessageToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icon = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  }[type];

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 max-w-sm w-full border-l-4 border-primary-500 dark:border-primary-400">
      <span className="text-xl">{icon}</span>
      <p className="text-gray-800 dark:text-white flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        aria-label="关闭提示"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};

export default MessageToast;
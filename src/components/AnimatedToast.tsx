'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  onClose,
  duration = 3000,
}) => {
  React.useEffect(() => {
    if (onClose && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
    error: <XCircleIcon className="w-5 h-5 text-red-500" />,
    info: <InformationCircleIcon className="w-5 h-5 text-blue-500" />,
    warning: <InformationCircleIcon className="w-5 h-5 text-yellow-500" />,
  };

  const colors = {
    success: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    error: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300,
      }}
      className={`fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-lg shadow-lg border-l-4 ${colors[type]}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
};

interface ToastContainerProps {
  children: React.ReactNode;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {children}
    </div>
  );
};

export default Toast;

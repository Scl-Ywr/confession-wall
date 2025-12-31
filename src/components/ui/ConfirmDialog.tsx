// 通用确认对话框组件
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'blue' | 'red' | 'green';
}

export function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmColor = 'red'
}: ConfirmDialogProps) {
  // 确认按钮颜色映射
  const confirmColorMap = {
    blue: {
      bg: 'bg-blue-500 hover:bg-blue-600',
      ring: 'ring-blue-400',
      icon: 'text-blue-500'
    },
    red: {
      bg: 'bg-red-500 hover:bg-red-600',
      ring: 'ring-red-400',
      icon: 'text-red-500'
    },
    green: {
      bg: 'bg-green-500 hover:bg-green-600',
      ring: 'ring-green-400',
      icon: 'text-green-500'
    }
  };

  const currentColor = confirmColorMap[confirmColor];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30 
            }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700/50 dark:to-gray-800/50 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-lg ${currentColor.icon}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
              </div>
            </div>
            
            {/* 内容 */}
            <div className="p-8">
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                {message}
              </p>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-4 p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-6 py-2.5 text-sm font-bold text-white rounded-lg ${currentColor.bg} transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus:ring-4 focus:ring-opacity-50 ${currentColor.ring} focus:outline-none`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
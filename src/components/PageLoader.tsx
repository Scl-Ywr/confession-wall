'use client';

import React from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import Skeleton from './Skeleton';

interface PageLoaderProps {
  type?: 'spinner' | 'skeleton' | 'profile' | 'content';
  message?: string;
  showNavbar?: boolean;
  fullscreen?: boolean;
  className?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  type = 'spinner',
  message = '加载中...',
  showNavbar = false,
  fullscreen = true,
  className = ''
}) => {
  const renderContent = () => {
    switch (type) {
      case 'spinner':
        return (
          <motion.div
            className="flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <LoadingSpinner 
              type="climbingBox" 
              size={25} 
              color="#f97316"
              gradient={true}
            />
            <motion.p
              className="text-gray-600 dark:text-gray-300 text-lg font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {message}
            </motion.p>
          </motion.div>
        );

      case 'skeleton':
        return (
          <motion.div
            className="space-y-6 w-full max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {[1, 2, 3].map((index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton variant="circular" width={50} height={50} />
                  <div className="flex-1">
                    <Skeleton variant="text" width={200} height={20} />
                    <Skeleton variant="text" width={150} height={16} className="mt-2" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton variant="text" width="100%" height={16} />
                  <Skeleton variant="text" width="90%" height={16} />
                  <Skeleton variant="text" width="95%" height={16} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        );

      case 'profile':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-6 mb-6">
                <Skeleton variant="circular" width={120} height={120} />
                <div className="flex-1 space-y-3">
                  <Skeleton variant="text" width={200} />
                  <Skeleton variant="text" width={150} />
                  <Skeleton variant="text" width={300} height={60} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
                  >
                    <Skeleton variant="text" width={80} className="mx-auto mb-2" />
                    <Skeleton variant="text" width={60} className="mx-auto" />
                  </motion.div>
                ))}
              </div>

              <div className="space-y-4">
                <Skeleton variant="rectangular" width="100%" height={40} />
                <Skeleton variant="rectangular" width="100%" height={200} />
              </div>
            </div>
          </div>
        );

      case 'content':
        return (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Skeleton variant="circular" width={40} height={40} />
                    <div className="flex-1">
                      <Skeleton variant="text" width={120} height={16} />
                      <Skeleton variant="text" width={80} height={12} className="mt-1" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <Skeleton variant="text" width="100%" height={16} />
                    <Skeleton variant="text" width="90%" height={16} />
                    <Skeleton variant="text" width="95%" height={16} />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <Skeleton variant="text" width={60} height={20} />
                      <Skeleton variant="text" width={60} height={20} />
                    </div>
                    <Skeleton variant="circular" width={32} height={32} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (fullscreen) {
    return (
      <motion.div
        className={`fixed inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg z-50 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {showNavbar && (
          <div className="absolute top-0 left-0 right-0 h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50">
            {/* 导航栏占位 */}
          </div>
        )}
        <div className={showNavbar ? 'pt-16' : ''}>
          {renderContent()}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      {renderContent()}
    </div>
  );
};

export default PageLoader;
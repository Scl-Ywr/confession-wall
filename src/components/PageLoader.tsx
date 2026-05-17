'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Skeleton from './Skeleton';
import { Heart, MessageCircleHeart, PenLine, Sparkles } from 'lucide-react';

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
  const SoftConfessionLoader = () => (
    <motion.div
      className="relative flex flex-col items-center justify-center text-center"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="relative mb-8 flex h-36 w-36 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-200/60 via-white/70 to-orange-100/70 blur-xl"
          animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute h-28 w-28 rounded-[2rem] border border-white/80 bg-white/75 shadow-[0_18px_45px_rgba(244,63,94,.16)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
          animate={{ rotate: [-4, 4, -4], y: [0, -4, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-[0_16px_30px_rgba(244,63,94,.32)]"
          animate={{ scale: [1, 1.08, 1], rotate: [0, -5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <MessageCircleHeart className="h-8 w-8" />
        </motion.div>
        <motion.div
          className="absolute right-6 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-500 shadow-lg dark:bg-white/15 dark:text-rose-200"
          animate={{ x: [0, 8, 0], y: [0, 12, 0], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Heart className="h-5 w-5 fill-current" />
        </motion.div>
        <motion.div
          className="absolute bottom-5 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-orange-400 shadow-lg dark:bg-white/15"
          animate={{ x: [0, -7, 0], y: [0, -10, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <PenLine className="h-5 w-5" />
        </motion.div>
        <motion.div
          className="absolute left-8 top-7 text-amber-300"
          animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="h-5 w-5" />
        </motion.div>
      </div>

      <motion.div
        className="cw-panel rounded-[1.75rem] px-8 py-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35 }}
      >
        <p className="text-base font-bold text-rose-500">
          {message}
          <motion.span
            className="inline-block w-8 text-left"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ...
          </motion.span>
        </p>
        <p className="mt-3 text-2xl font-black text-slate-700 dark:text-slate-100">
          正在整理新的心声
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="h-2.5 w-2.5 rounded-full bg-rose-400"
              animate={{ y: [0, -8, 0], opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.14, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );

  const renderContent = () => {
    switch (type) {
      case 'spinner':
        return <SoftConfessionLoader />;

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
                className="cw-panel rounded-[1.75rem] p-6"
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
            <div className="cw-panel rounded-[2rem] p-6">
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
                    className="rounded-2xl bg-white/60 p-4 text-center dark:bg-white/10"
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
                className="cw-panel overflow-hidden rounded-[1.75rem]"
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
        className={`cw-page fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {showNavbar && (
          <div className="absolute left-0 right-0 top-0 h-16 border-b border-white/60 bg-white/70 backdrop-blur-lg dark:border-white/10 dark:bg-slate-950/50">
            {/* 导航栏占位 */}
          </div>
        )}
        <div className="cw-decor-grid" />
        <div className="pointer-events-none absolute left-12 top-24 h-20 w-20 rotate-[-18deg] rounded-[36%] bg-pink-300/25 blur-sm" />
        <div className="pointer-events-none absolute right-16 bottom-28 h-24 w-24 rotate-12 rounded-[36%] bg-rose-300/25 blur-sm" />
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

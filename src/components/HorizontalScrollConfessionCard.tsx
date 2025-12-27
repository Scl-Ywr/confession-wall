'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Confession } from '@/types/confession';
import Image from 'next/image';

interface HorizontalScrollConfessionCardProps {
  confession: Confession;
  onDelete?: (id: string) => void;
  onClick?: (confession: Confession) => void;
}

export default function HorizontalScrollConfessionCard({
  confession,
  onClick,
}: HorizontalScrollConfessionCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(confession);
    }
  };

  // 截断长文本
  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  return (
    <motion.div
      className="glass-card rounded-xl p-4 border border-white/30 min-w-[320px] max-w-[320px] cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        y: -4
      }}
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      aria-label={`查看表白: ${truncateText(confession.content, 30)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
          e.preventDefault();
        }
      }}
    >
      {/* 用户信息 */}
      <div className="flex items-center mb-3">
        {/* 用户头像 */}
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 border-2 border-white/60 shadow-md">
          {confession.is_anonymous ? (
            <div className="w-full h-full bg-gradient-to-br from-warm-100 to-warm-200 flex items-center justify-center dark:from-warm-900/40 dark:to-warm-800/40">
              <span className="text-warm-600 font-bold text-base dark:text-warm-300">?</span>
            </div>
          ) : confession.profile?.avatar_url ? (
            <Image
              src={confession.profile.avatar_url}
              alt={confession.profile.display_name || '用户头像'}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center dark:from-secondary-900/40 dark:to-secondary-800/40">
              <span className="text-secondary-600 font-bold text-base dark:text-secondary-300">
                {confession.profile?.display_name?.[0] || 'U'}
              </span>
            </div>
          )}
        </div>

        {/* 用户名和日期 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
            {confession.is_anonymous ? '匿名用户' : confession.profile?.display_name || '未知用户'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(confession.created_at)}
          </p>
        </div>
      </div>

      {/* 表白内容 */}
      <div className="mb-3">
        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-4">
          {truncateText(confession.content)}
        </p>
      </div>

      {/* 互动数据 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
            {Math.max(0, Number(confession.likes_count) || 0)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

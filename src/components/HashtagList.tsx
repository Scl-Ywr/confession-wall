'use client';

import React, { useState, useEffect } from 'react';
import { Hashtag } from '@/types/confession';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface HashtagListProps {
  limit?: number;
  showTitle?: boolean;
  className?: string;
}

export function HashtagList({ limit = 10, showTitle = true, className = '' }: HashtagListProps) {
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchHashtags = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hashtags?limit=${limit}`);
        if (!response.ok) {
          throw new Error('Failed to fetch hashtags');
        }
        const result = await response.json();
        setHashtags(result.hashtags || []);
      } catch (error) {
        console.error('Error fetching hashtags:', error);
        setHashtags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHashtags();
  }, [limit, mounted]);

  const handleHashtagClick = (tag: string) => {
    // 导航到标签页面
    router.push(`/hashtag/${encodeURIComponent(tag.substring(1))}`); // 移除#号
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${className}`}>
        {showTitle && <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">热门话题</h3>}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${className}`}>
        {showTitle && <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">热门话题</h3>}
        <p className="text-gray-500 dark:text-gray-400 text-sm">暂无热门话题</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${className}`}>
      {showTitle && <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">热门话题</h3>}
      <div className="flex flex-wrap gap-2">
        {hashtags.map((hashtag, index) => (
          <motion.button
            key={hashtag.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => handleHashtagClick(hashtag.tag)}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 transition-all duration-200 cursor-pointer border border-blue-200 dark:border-blue-800"
          >
            <span>{hashtag.tag}</span>
            <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full">
              {hashtag.usage_count}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
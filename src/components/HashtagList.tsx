'use client';

import React, { useState, useEffect } from 'react';
import { Hashtag } from '@/types/confession';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronRight, Flame } from 'lucide-react';

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
      <div className={`rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_55px_rgba(31,41,55,.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 ${className}`}>
        {showTitle && <h3 className="mb-5 flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white"><Flame className="h-6 w-6 text-rose-500" />热门话题</h3>}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-slate-100/80 animate-pulse dark:bg-white/10"
            />
          ))}
        </div>
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className={`rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_55px_rgba(31,41,55,.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 ${className}`}>
        {showTitle && <h3 className="mb-5 flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white"><Flame className="h-6 w-6 text-rose-500" />热门话题</h3>}
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">暂无热门话题</p>
      </div>
    );
  }

  const tagThemes = [
    'from-rose-50 to-red-50 text-rose-500 border-rose-100 dark:from-rose-500/15 dark:to-red-500/10 dark:text-rose-200 dark:border-rose-400/20',
    'from-fuchsia-50 to-violet-50 text-violet-500 border-violet-100 dark:from-violet-500/15 dark:to-fuchsia-500/10 dark:text-violet-200 dark:border-violet-400/20',
    'from-amber-50 to-orange-50 text-orange-500 border-orange-100 dark:from-orange-500/15 dark:to-amber-500/10 dark:text-orange-200 dark:border-orange-400/20',
    'from-emerald-50 to-teal-50 text-teal-600 border-teal-100 dark:from-teal-500/15 dark:to-emerald-500/10 dark:text-teal-200 dark:border-teal-400/20',
  ];

  return (
    <div className={`rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_55px_rgba(31,41,55,.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 ${className}`}>
      {showTitle && (
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Flame className="h-6 w-6 fill-rose-100 text-rose-500" />
            热门话题
          </h3>
          <button className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition-colors hover:text-rose-500 dark:text-slate-400">
            查看更多
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {hashtags.map((hashtag, index) => (
          <motion.button
            key={hashtag.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => handleHashtagClick(hashtag.tag)}
            className={`flex h-20 min-h-20 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br px-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${tagThemes[index % tagThemes.length]}`}
          >
            <span className="w-full truncate text-base font-black">{hashtag.tag}</span>
            <span className="mt-1 w-full truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
              {hashtag.usage_count} 条内容
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { ConfessionCategory } from '@/types/confession';
import { confessionService } from '@/services/confessionService';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronRight, Grid2X2 } from 'lucide-react';

interface CategoryListProps {
  showTitle?: boolean;
  className?: string;
}

export function CategoryList({ showTitle = true, className = '' }: CategoryListProps) {
  const [categories, setCategories] = useState<ConfessionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await confessionService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [mounted]);

  const handleCategoryClick = (categoryId: string) => {
    // 导航到分类页面
    router.push(`/category/${categoryId}`);
  };

  if (loading) {
    return (
      <div className={`rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_55px_rgba(31,41,55,.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 ${className}`}>
        {showTitle && <h3 className="mb-5 flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white"><Grid2X2 className="h-6 w-6 text-rose-500" />分类浏览</h3>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100/80 animate-pulse dark:bg-white/10"
            />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={`rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_55px_rgba(31,41,55,.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 ${className}`}>
        {showTitle && <h3 className="mb-5 flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white"><Grid2X2 className="h-6 w-6 text-rose-500" />分类浏览</h3>}
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">暂无分类</p>
      </div>
    );
  }

  return (
    <div className={`rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_55px_rgba(31,41,55,.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 ${className}`}>
      {showTitle && (
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Grid2X2 className="h-6 w-6 text-rose-500" />
            分类浏览
          </h3>
          <button className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition-colors hover:text-rose-500 dark:text-slate-400">
            查看更多
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => handleCategoryClick(category.id)}
            className="group flex h-24 min-h-24 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-white/55 p-3 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/5"
            style={{ 
              backgroundColor: `${category.color}12` || 'rgba(255,255,255,.55)',
              borderColor: category.color || undefined
            }}
          >
            <div 
              className="mb-2 text-3xl transition-transform duration-200 group-hover:scale-110"
              style={{ color: category.color || undefined }}
            >
              {category.icon || '📝'}
            </div>
            <span className="w-full truncate text-sm font-black text-slate-700 transition-colors duration-200 group-hover:text-slate-950 dark:text-slate-200 dark:group-hover:text-white">
              {category.name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

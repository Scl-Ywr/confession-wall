'use client';

import React, { useState, useEffect } from 'react';
import { ConfessionCategory } from '@/types/confession';
import { confessionService } from '@/services/confessionService';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface CategoryListProps {
  showTitle?: boolean;
  className?: string;
}

export function CategoryList({ showTitle = true, className = '' }: CategoryListProps) {
  const [categories, setCategories] = useState<ConfessionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await confessionService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    // 导航到分类页面
    router.push(`/category/${categoryId}`);
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${className}`}>
        {showTitle && <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">分类浏览</h3>}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${className}`}>
        {showTitle && <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">分类浏览</h3>}
        <p className="text-gray-500 dark:text-gray-400 text-sm">暂无分类</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm ${className}`}>
      {showTitle && <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-800 dark:text-white">分类浏览</h3>}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {categories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => handleCategoryClick(category.id)}
            className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer hover:shadow-md group"
            style={{ 
              backgroundColor: `${category.color}10` || 'transparent',
              borderColor: category.color || undefined
            }}
          >
            <div 
              className="text-xl sm:text-2xl mb-1 sm:mb-1 group-hover:scale-110 transition-transform duration-200"
              style={{ color: category.color || undefined }}
            >
              {category.icon || '📝'}
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-200">
              {category.name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
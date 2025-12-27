'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Confession } from '@/types/confession';
import HorizontalScrollConfessionCard from './HorizontalScrollConfessionCard';

interface HorizontalConfessionHistoryProps {
  confessions: Confession[];
  totalCount: number;
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onConfessionClick?: (confession: Confession) => void;
}

export default function HorizontalConfessionHistory({
  confessions,
  totalCount,
  isLoading = false,
  onDelete,
  onConfessionClick,
}: HorizontalConfessionHistoryProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollPosition, setScrollPosition] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 });

  // 过滤表白
  const filteredConfessions = useMemo(() => {
    if (!searchTerm.trim()) {
      return confessions;
    }

    return confessions.filter(confession => {
      return confession.content.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [confessions, searchTerm]);

  // 检查滚动位置，更新左右滚动按钮的可用性
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    setScrollPosition({ scrollLeft, scrollWidth, clientWidth });
  };

  // 滚动处理
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const scrollAmount = 350; // 每次滚动的距离
    const currentScroll = scrollContainerRef.current.scrollLeft;
    
    scrollContainerRef.current.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  };

  // 键盘导航支持
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scroll('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scroll('right');
    }
  };

  // 初始化和监听滚动事件
  useEffect(() => {
    checkScrollPosition();
    
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    scrollContainer.addEventListener('scroll', checkScrollPosition);
    return () => {
      scrollContainer.removeEventListener('scroll', checkScrollPosition);
    };
  }, [confessions]);

  return (
    <div className="glass-card p-6 rounded-2xl mt-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">📝</span>
        创作历史
      </h3>
      
      <div className="text-center mb-4">
        <p className="text-gray-600 dark:text-gray-300">共发布了 {totalCount} 条表白</p>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索表白内容..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 dark:bg-gray-800/80 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      <div className="relative">
        {/* 左滚动按钮 */}
        <motion.button
          className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md border border-gray-200 dark:bg-gray-800/80 dark:border-gray-700 transition-opacity duration-300 ${canScrollLeft ? 'opacity-100 cursor-pointer' : 'opacity-0 cursor-not-allowed'}`}
          onClick={() => scroll('left')}
          aria-label="向左滚动"
          disabled={!canScrollLeft}
          whileHover={{
            scale: canScrollLeft ? 1.1 : 1
          }}
          whileTap={{
            scale: canScrollLeft ? 0.95 : 1
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>

        {/* 水平滚动容器 */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-4 pb-4 pr-4 scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
          style={{
            scrollbarWidth: 'thin'
          }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label="表白创作历史水平滚动"
          role="region"
          aria-describedby="horizontal-scroll-desc"
        >
          {/* 无障碍描述 */}
          <div id="horizontal-scroll-desc" className="sr-only">
            表白创作历史水平滚动区域。使用左右箭头键导航，点击表白项查看详情。
          </div>

          {/* 滚动指示器 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-500 dark:bg-primary-400 rounded-full transition-all duration-300"
              style={{
                width: scrollPosition.scrollWidth > 0 ? `${(scrollPosition.clientWidth / scrollPosition.scrollWidth) * 100}%` : '0%',
                transform: scrollPosition.scrollWidth > 0 ? `translateX(${(scrollPosition.scrollLeft / (scrollPosition.scrollWidth - scrollPosition.clientWidth)) * 100}%)` : 'translateX(0%)'
              }}
            />
          </div>

          {/* 表白卡片 */}
          {isLoading ? (
            // 加载状态
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex-shrink-0 w-[320px] rounded-xl p-4 bg-white/80 backdrop-blur-sm shadow-md border border-gray-200 dark:bg-gray-800/80 dark:border-gray-700 animate-pulse">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-3"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-1"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/5"></div>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-4">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConfessions.length > 0 ? (
            // 表白卡片列表
            filteredConfessions.map((confession) => (
              <HorizontalScrollConfessionCard
                key={confession.id}
                confession={confession}
                onDelete={onDelete}
                onClick={() => onConfessionClick?.(confession)}
              />
            ))
          ) : searchTerm ? (
            // 搜索结果为空状态
            <div className="flex items-center justify-center py-10 px-4">
              <div className="text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500 dark:text-gray-400">没有找到匹配的表白内容</p>
              </div>
            </div>
          ) : (
            // 空状态
            <div className="flex items-center justify-center py-10 px-4">
              <div className="text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500 dark:text-gray-400">该用户还没有发布任何表白</p>
              </div>
            </div>
          )}
        </div>

        {/* 右滚动按钮 */}
        <motion.button
          className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md border border-gray-200 dark:bg-gray-800/80 dark:border-gray-700 transition-opacity duration-300 ${canScrollRight ? 'opacity-100 cursor-pointer' : 'opacity-0 cursor-not-allowed'}`}
          onClick={() => scroll('right')}
          aria-label="向右滚动"
          disabled={!canScrollRight}
          whileHover={{
            scale: canScrollRight ? 1.1 : 1
          }}
          whileTap={{
            scale: canScrollRight ? 0.95 : 1
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
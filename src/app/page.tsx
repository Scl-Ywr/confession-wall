'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useLike } from '@/context/LikeContext';
import { confessionService } from '@/services/confessionService';
import { Confession } from '@/types/confession';
import { useRouter } from 'next/navigation';
import ConfessionCard from '@/components/ConfessionCard';
import CreateConfessionForm from '@/components/CreateConfessionForm';
import { CustomSelect } from '@/components/CustomSelect';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import LoginPrompt from '@/components/LoginPrompt';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { toggleLike, likeLoading, showLoginPrompt } = useLike();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchType, setSearchType] = useState<'content' | 'username'>('content');
  const queryClient = useQueryClient();

  // 处理点赞操作，使用React Query的乐观更新
  const handleLike = async (confessionId: string) => {
    try {
      // 乐观更新本地缓存
      queryClient.setQueryData<{ pages: Confession[][] }>(['confessions'], (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((confession) =>
              confession.id === confessionId
                ? {
                    ...confession,
                    likes_count: confession.liked_by_user ? confession.likes_count - 1 : confession.likes_count + 1,
                    liked_by_user: !confession.liked_by_user
                  }
                : confession
            )
          )
        };
      });
      
      // 执行实际的点赞/取消点赞操作
      await toggleLike(confessionId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // 出错时刷新数据以恢复正确状态
      await queryClient.invalidateQueries({ queryKey: ['confessions'] });
    }
  };

  // 使用React Query的无限查询获取表白列表
  const { 
    data: infiniteData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isLoadingConfessions,
    isError: isErrorConfessions,
    error: errorConfessions
  } = useInfiniteQuery<Confession[], Error>({
    queryKey: ['confessions'],
    queryFn: (context) => confessionService.getConfessions(context.pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      // 如果还有数据，返回下一页页码
      return lastPage.length > 0 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // 使用React Query管理搜索结果
  const { 
    data: searchResults = [], 
    isLoading: isSearching,
    refetch: refetchSearch
  } = useQuery({
    queryKey: ['search', searchKeyword, searchType],
    queryFn: () => {
      if (!searchKeyword.trim()) return [];
      return confessionService.searchConfessions(searchKeyword, searchType, 1);
    },
    enabled: false, // 禁用自动执行，手动触发
  });

  // 在输入变化时触发防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      refetchSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword, searchType, refetchSearch]);

  // 处理无限滚动
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isSearching) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isSearching, fetchNextPage]);

  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = observerRef.current;
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    });

    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [handleObserver]);

  const handleDeleteConfession = async (confessionId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // 使用中文提示，确保用户能理解
    const isConfirmed = window.confirm('确定要删除这条表白吗？此操作不可恢复。');
    if (!isConfirmed) {
      return;
    }

    try {
      await confessionService.deleteConfession(confessionId);
      // 刷新数据以确保准确性
      await queryClient.invalidateQueries({ queryKey: ['confessions'] });
    } catch (err) {
      console.error('Delete error:', err);
      // 使用中文提示，确保用户能理解
      window.alert('删除表白失败，请稍后重试。');
    }
  };

  // 合并所有表白数据
  const confessions = infiniteData?.pages.flat() || [];
  // 确定当前显示的数据（搜索结果或所有表白）
  const displayConfessions = searchKeyword.trim() ? searchResults : confessions;
  // 确定当前加载状态
  const isLoading = searchKeyword.trim() ? isSearching : isLoadingConfessions;
  const isError = searchKeyword.trim() ? false : isErrorConfessions;
  const error = searchKeyword.trim() ? null : errorConfessions;

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      
      {/* 登录提示组件 */}
      {showLoginPrompt && <LoginPrompt />}
      
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-10 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary-600 via-purple-600 to-secondary-500 bg-clip-text text-transparent drop-shadow-sm">
            Confession Wall
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            一个倾诉秘密、表达爱意或发泄情绪的安全空间。
            <span className="block mt-2 font-medium text-primary-600 dark:text-primary-400">匿名 安全 免费</span>
          </p>
        </div>
        
        <CreateConfessionForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ['confessions'] })} user={user} />
        
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-3xl">🌟</span> 最新表白
            </h2>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                refetchSearch();
              }}
              className="w-full md:w-auto flex flex-col sm:flex-row gap-3"
            >
              <div className="w-full sm:w-32">
                <CustomSelect
                  options={[
                    { value: 'content', label: '表白内容' },
                    { value: 'username', label: '用户名' }
                  ]}
                  value={searchType}
                  onChange={(value) => setSearchType(value)}
                  className="w-full"
                />
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="搜索表白..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all duration-300 hover:border-primary-300 dark:hover:border-primary-600 shadow-sm hover:shadow-md text-sm"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-primary-400 disabled:to-primary-500 flex items-center justify-center gap-2 min-w-12"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    搜索中...
                  </>
                ) : (
                  '搜索'
                )}
              </button>
            </form>
          </div>
          
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">{searchKeyword ? '搜索中...' : '加载秘密中...'}</p>
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600 mb-4">{error?.message || '加载失败'}</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['confessions'] })}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                重试
              </button>
            </div>
          ) : displayConfessions.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-lg">{searchKeyword ? '没有找到匹配的表白' : '还没有表白。成为第一个吧！'}</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {displayConfessions.map((confession) => (
                <ConfessionCard
                key={confession.id}
                confession={confession}
                currentUserId={user?.id}
                onLike={handleLike}
                onDelete={handleDeleteConfession}
                isLikeLoading={likeLoading[confession.id] || false}
              />
              ))}
            </div>
          )}
          
          <div ref={observerRef} className="flex justify-center py-8">
            {isFetchingNextPage && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            )}
            {!hasNextPage && confessions.length > 0 && !searchKeyword.trim() && (
              <p className="text-gray-400 text-sm">你已经到达世界的尽头了 🌍</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

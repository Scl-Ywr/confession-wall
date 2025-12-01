'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { confessionService } from '@/services/confessionService';
import { Confession } from '@/types/confession';
import { useRouter } from 'next/navigation';
import ConfessionCard from '@/components/ConfessionCard';
import CreateConfessionForm from '@/components/CreateConfessionForm';
import { CustomSelect } from '@/components/CustomSelect';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchType, setSearchType] = useState<'content' | 'username'>('content'); // 添加搜索类型状态
  
  // Like loading state
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});

  // 添加搜索参数状态，用于存储当前搜索条件
  const [currentSearchParams, setCurrentSearchParams] = useState({
    keyword: '',
    type: 'content' as 'content' | 'username'
  });

  const fetchConfessions = useCallback(async (isLoadMore: boolean = false) => {
    const currentPage = isLoadMore ? page + 1 : 1;
    const loadingState = isLoadMore ? setLoadingMore : setLoading;
    const errorState = isLoadMore ? setError : setError;

    loadingState(true);
    if (!isLoadMore) errorState(null);
    
    try {
      let data;
      if (searchKeyword.trim()) {
        // 直接使用最新的searchKeyword和searchType，而不是依赖currentSearchParams
        data = await confessionService.searchConfessions(
          searchKeyword,
          searchType,
          currentPage
        );
        
        // 更新currentSearchParams，用于显示当前搜索状态
        setCurrentSearchParams({
          keyword: searchKeyword,
          type: searchType
        });
      } else {
        data = await confessionService.getConfessions(currentPage);
        
        // 清空搜索参数
        setCurrentSearchParams({
          keyword: '',
          type: 'content'
        });
      }
      
      if (isLoadMore) {
        if (data.length === 0) {
          setHasMore(false);
        } else {
          // 检查是否有重复项，避免重复加载
          setConfessions(prev => {
            const newConfessions = data.filter(newConfession => 
              !prev.some(existingConfession => existingConfession.id === newConfession.id)
            );
            if (newConfessions.length > 0) {
              setPage(currentPage);
              return [...prev, ...newConfessions];
            } else {
              setHasMore(false);
              return prev;
            }
          });
        }
      } else {
        setConfessions(data);
        setPage(1);
        setHasMore(data.length > 0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load confessions';
      errorState(errorMessage);
    } finally {
      loadingState(false);
    }
  }, [page, searchKeyword, searchType]);

  // 初始加载
  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]); // 添加fetchConfessions到依赖数组，确保依赖数组大小一致

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
      fetchConfessions(true);
    }
  }, [hasMore, loadingMore, loading, fetchConfessions]);

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

  const handleLike = async (confessionId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (likeLoading[confessionId]) return;

    try {
      setLikeLoading(prev => ({ ...prev, [confessionId]: true }));
      const isLiked = await confessionService.checkIfLiked(confessionId);
      
      if (isLiked) {
        await confessionService.unlikeConfession(confessionId);
        setConfessions(prev => prev.map(c => 
          c.id === confessionId ? { ...c, likes_count: Math.max(c.likes_count - 1, 0), liked_by_user: false } : c
        ));
      } else {
        await confessionService.likeConfession(confessionId);
        setConfessions(prev => prev.map(c => 
          c.id === confessionId ? { ...c, likes_count: c.likes_count + 1, liked_by_user: true } : c
        ));
      }
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLikeLoading(prev => ({ ...prev, [confessionId]: false }));
    }
  };

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
      setConfessions(prev => prev.filter(c => c.id !== confessionId));
    } catch (err) {
      console.error('Delete error:', err);
      // 使用中文提示，确保用户能理解
      window.alert('删除表白失败，请稍后重试。');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-10 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary-600 via-purple-600 to-secondary-500 bg-clip-text text-transparent drop-shadow-sm">
            Confession Wall
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            一个倾诉秘密、表达爱意或发泄情绪的安全空间。
            <span className="block mt-2 font-medium text-primary-600 dark:text-primary-400">匿名 安全 免费</span>
          </p>
        </div>
        
        <CreateConfessionForm onSuccess={() => fetchConfessions()} user={user} />
        
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-3xl">🌟</span> 最新表白
            </h2>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                // 直接调用fetchConfessions，它会自动处理搜索参数
                fetchConfessions();
              }}
              className="w-full md:w-auto flex gap-2"
            >
              <CustomSelect
                options={[
                  { value: 'content', label: '表白内容' },
                  { value: 'username', label: '用户名' }
                ]}
                value={searchType}
                onChange={(value) => setSearchType(value)}
                className="w-32"
              />
              <input
                type="text"
                placeholder="搜索表白..."
                className="w-full md:w-64 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all duration-300 hover:border-primary-300 dark:hover:border-primary-600 shadow-sm hover:shadow-md"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-primary-400 disabled:to-primary-500 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
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
          
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">{currentSearchParams.keyword ? '搜索中...' : '加载秘密中...'}</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => fetchConfessions()}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                重试
              </button>
            </div>
          ) : confessions.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-lg">{currentSearchParams.keyword ? '没有找到匹配的表白' : '还没有表白。成为第一个吧！'}</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {confessions.map((confession) => (
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
            {loadingMore && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            )}
            {!hasMore && confessions.length > 0 && (
              <p className="text-gray-400 text-sm">你已经到达世界的尽头了 🌍</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { confessionService } from '@/services/confessionService';
import { Confession } from '@/types/confession';
import { useRouter } from 'next/navigation';
import ConfessionCard from '@/components/ConfessionCard';
import CreateConfessionForm from '@/components/CreateConfessionForm';

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
  
  // Like loading state
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});

  const fetchConfessions = useCallback(async (isLoadMore: boolean = false) => {
    const currentPage = isLoadMore ? page + 1 : 1;
    const loadingState = isLoadMore ? setLoadingMore : setLoading;
    const errorState = isLoadMore ? setError : setError;

    loadingState(true);
    if (!isLoadMore) errorState(null);
    
    try {
      let data;
      if (searchKeyword.trim()) {
        data = await confessionService.searchConfessions(searchKeyword);
      } else {
        data = await confessionService.getConfessions(currentPage);
      }
      
      if (isLoadMore) {
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setConfessions(prev => [...prev, ...data]);
          setPage(currentPage);
        }
      } else {
        setConfessions(data);
        setPage(1);
        setHasMore(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load confessions';
      errorState(errorMessage);
    } finally {
      loadingState(false);
    }
  }, [page, searchKeyword]);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

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
          c.id === confessionId ? { ...c, likes_count: Math.max(c.likes_count - 1, 0) } : c
        ));
      } else {
        await confessionService.likeConfession(confessionId);
        setConfessions(prev => prev.map(c => 
          c.id === confessionId ? { ...c, likes_count: c.likes_count + 1 } : c
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
                fetchConfessions();
              }}
              className="w-full md:w-auto flex gap-2"
            >
              <input
                type="text"
                placeholder="搜索表白..."
                className="w-full md:w-64 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <button
                type="submit"
                className="px-6 py-2 bg-white dark:bg-gray-800 text-primary-600 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700"
              >
                搜索
              </button>
            </form>
          </div>
          
          {loading && confessions.length === 0 ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">加载秘密中...</p>
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
              <p className="text-gray-500 text-lg">还没有表白。成为第一个吧！</p>
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

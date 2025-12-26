'use client';

import { useState, useEffect, useCallback } from 'react';
import { Confession } from '@/types/confession';
import { confessionService } from '@/services/confessionService';
import ConfessionCard from '@/components/ConfessionCard';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { HashtagIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/LoadingSpinner';

interface HashtagConfessionsClientProps {
  tag: string;
}

export default function HashtagConfessionsClient({ tag }: HashtagConfessionsClientProps) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const router = useRouter();

  const loadConfessions = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      const newConfessions = await confessionService.getConfessionsByHashtag(`#${tag}`, pageNum, 10);
      
      if (append) {
        setConfessions(prev => [...prev, ...newConfessions]);
      } else {
        setConfessions(newConfessions);
      }
      
      setHasMore(newConfessions.length >= 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载表白失败');
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(1);
    loadConfessions(1, false);
  }, [tag, loadConfessions]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadConfessions(nextPage, true);
    }
  };

  const handleDeleteConfession = async (confessionId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const isConfirmed = window.confirm('确定要删除这条表白吗？此操作不可恢复。');
    if (!isConfirmed) {
      return;
    }

    try {
      await confessionService.deleteConfession(confessionId);
      // 重新加载表白列表
      setPage(1);
      loadConfessions(1, false);
    } catch (err) {
      console.error('Delete error:', err);
      window.alert('删除表白失败，请稍后重试。');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
              <HashtagIcon className="w-5 h-5 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                #{tag}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && confessions.length === 0 ? (
          <div className="text-center py-20">
            <LoadingSpinner 
              type="climbingBox" 
              size={40} 
              color="#3b82f6" 
              className="mx-auto"
              message={`加载话题 #${tag} 的表白中...`}
              showMessage={true}
              gradient={true}
            />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadConfessions(1, false);
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              重试
            </button>
          </div>
        ) : confessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              话题 #{tag} 下还没有表白
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              成为第一个在这个话题下分享的人吧！
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <p className="text-gray-600 dark:text-gray-300">
                话题 #{tag} 下共有 {confessions.length} 条表白
              </p>
            </div>
            
            <div className="grid gap-6">
              {confessions.map((confession) => (
                <ConfessionCard
                  key={confession.id}
                  confession={confession}
                  currentUserId={user?.id}
                  onDelete={handleDeleteConfession}
                />
              ))}
            </div>
            
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
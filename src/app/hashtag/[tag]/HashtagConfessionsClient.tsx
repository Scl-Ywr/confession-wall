'use client';

import { useState, useEffect, useCallback } from 'react';
import { Confession } from '@/types/confession';
import { confessionService } from '@/services/confessionService';
import ConfessionCard from '@/components/ConfessionCard';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Modal from '@/components/AnimatedModal';
import toast from 'react-hot-toast';
import PageLoader from '@/components/PageLoader';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Hash } from 'lucide-react';

interface HashtagConfessionsClientProps {
  tag: string;
}

export default function HashtagConfessionsClient({ tag }: HashtagConfessionsClientProps) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confessionToDelete, setConfessionToDelete] = useState<string | null>(null);
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

  const handleDeleteConfession = (confessionId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setConfessionToDelete(confessionId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!confessionToDelete) return;

    try {
      await confessionService.deleteConfession(confessionToDelete);
      // 重新加载表白列表
      setPage(1);
      loadConfessions(1, false);
      setShowDeleteModal(false);
      // 显示删除成功提示
      toast.success('删除表白成功', {
        position: 'top-right',
        duration: 3000,
        style: {
          backgroundColor: '#10b981',
          color: '#fff',
          borderRadius: '0.5rem',
        },
      });
    } catch (err) {
      console.error('Delete error:', err);
      setShowDeleteModal(false);
      // 显示删除失败提示
      toast.error('删除表白失败，请稍后重试', {
        position: 'top-right',
        duration: 3000,
        style: {
          backgroundColor: '#ef4444',
          color: '#fff',
          borderRadius: '0.5rem',
        },
      });
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setConfessionToDelete(null);
  };

  return (
    <div className="cw-page relative min-h-screen overflow-hidden pb-20">
      <div className="cw-decor-grid" />
      {/* 删除确认模态框 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        title="确认删除"
        size="sm"
        closeOnOverlayClick={true}
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            确定要删除这条表白吗？此操作不可恢复。
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={cancelDelete}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
      
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1760px] px-4 py-8 sm:px-8 lg:px-14">
        <section className="cw-panel mb-8 rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="app-btn shrink-0" aria-label="返回">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-lg dark:bg-rose-500/15 dark:text-rose-200">
                  <Hash className="h-8 w-8" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-bold text-rose-500">话题聚合</p>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
                    #{tag}
                  </h1>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    所有与这个话题相关的表白都会汇聚在这里。
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/60 px-5 py-3 text-sm font-bold text-slate-500 shadow-inner dark:bg-white/10 dark:text-slate-300">
              已收录 <span className="text-2xl text-rose-500">{confessions.length}</span> 条心声
            </div>
          </div>
        </section>

        {loading && confessions.length === 0 ? (
          <PageLoader 
            type="content" 
            fullscreen={false}
            className="py-20"
          />
        ) : error ? (
          <div className="cw-panel rounded-[2rem] p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadConfessions(1, false);
              }}
              className="cw-primary-btn"
            >
              重试
            </button>
          </div>
        ) : confessions.length === 0 ? (
          <div className="cw-panel rounded-[2rem] py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              话题 #{tag} 下还没有表白
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              成为第一个在这个话题下分享的人吧！
            </p>
            <button
              onClick={() => router.push('/')}
              className="cw-primary-btn"
            >
              返回首页
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mb-6 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 text-center shadow-[0_12px_35px_rgba(31,41,55,.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              <p className="font-medium text-slate-600 dark:text-slate-300">
                话题 #{tag} 下共有 {confessions.length} 条表白
              </p>
            </div>
            
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                  className="cw-primary-btn disabled:cursor-not-allowed disabled:opacity-50"
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

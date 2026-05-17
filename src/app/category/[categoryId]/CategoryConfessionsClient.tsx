'use client';

import { useState, useEffect, useCallback } from 'react';
import { Confession, ConfessionCategory } from '@/types/confession';
import { confessionService } from '@/services/confessionService';
import ConfessionCard from '@/components/ConfessionCard';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Modal from '@/components/AnimatedModal';
import toast from 'react-hot-toast';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import PageLoader from '@/components/PageLoader';
import Navbar from '@/components/Navbar';
import { ArrowLeft, FolderOpen } from 'lucide-react';

interface CategoryConfessionsClientProps {
  categoryId: string;
}

export default function CategoryConfessionsClient({ categoryId }: CategoryConfessionsClientProps) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [category, setCategory] = useState<ConfessionCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confessionToDelete, setConfessionToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  // 获取分类信息
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const categories = await confessionService.getCategories();
        const foundCategory = categories.find(cat => cat.id === categoryId);
        setCategory(foundCategory || null);
      } catch (err) {
        console.error('Error fetching category:', err);
      }
    };

    fetchCategory();
  }, [categoryId]);

  const loadConfessions = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      const newConfessions = await confessionService.getConfessionsByCategory(categoryId, pageNum, 10);
      
      if (append) {
        setConfessions(prev => [...prev, ...newConfessions]);
      } else {
        setConfessions(newConfessions);
      }
      
      // 如果返回的表白数量少于10，说明没有更多数据了
      setHasMore(newConfessions.length >= 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载表白失败');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(1);
    loadConfessions(1, false);
  }, [categoryId, loadConfessions]);

  // 页面刷新机制 - 当页面重新获得焦点时刷新数据
  usePageRefresh(
    async () => {
      setPage(1);
      await loadConfessions(1, false);
    },
    [loadConfessions]
  );

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      setLoading(true);
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
    <motion.div
      className="cw-page relative min-h-screen overflow-hidden pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
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
            <motion.button
              onClick={cancelDelete}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              取消
            </motion.button>
            <motion.button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              确认删除
            </motion.button>
          </div>
        </div>
      </Modal>
      <div className="cw-decor-grid" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1760px] px-4 py-8 sm:px-8 lg:px-14">
        <section className="cw-panel mb-8 rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => router.back()}
                className="app-btn shrink-0"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                aria-label="返回"
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.button>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg"
                  style={{ backgroundColor: `${category?.color}18` || 'rgba(255, 241, 242, .95)' }}
                >
                  <span style={{ color: category?.color || '#fb7185' }}>{category?.icon || '📂'}</span>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-2 text-sm font-bold text-rose-500">
                    <FolderOpen className="h-4 w-4" />
                    分类浏览
                  </p>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
                    {category?.name || '分类'}
                  </h1>
                  {category?.description && (
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {category.description}
                    </p>
                  )}
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
            className="py-8"
          />
        ) : error ? (
          <motion.div
            className="cw-panel rounded-[2rem] p-8 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <motion.button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadConfessions(1, false);
              }}
              className="cw-primary-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              重试
            </motion.button>
          </motion.div>
        ) : !category ? (
          <motion.div 
            className="cw-panel rounded-[2rem] py-20 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="text-6xl mb-4"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              📂
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              分类不存在
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              请检查链接是否正确
            </p>
            <motion.button
              onClick={() => router.push('/')}
              className="cw-primary-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              返回首页
            </motion.button>
          </motion.div>
        ) : confessions.length === 0 ? (
          <motion.div 
            className="cw-panel rounded-[2rem] py-20 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="text-8xl mb-6"
              style={{ color: category.color }}
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -10, 10, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {category.icon || '📝'}
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
              {category.name} 下还没有表白
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
              成为第一个在这个分类下分享的人吧！
            </p>
            <motion.button
              onClick={() => router.push('/')}
              className="cw-primary-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              返回首页
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="mb-8 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 text-center shadow-[0_12px_35px_rgba(31,41,55,.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl" style={{ color: category.color }}>
                  {category.icon || '📝'}
                </span>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  <span className="font-bold text-2xl" style={{ color: category.color }}>
                    {confessions.length}
                  </span>
                  {' '}条表白在
                  <span className="font-bold mx-1" style={{ color: category.color }}>
                    {category.name}
                  </span>
                  分类下
                </p>
              </div>
            </motion.div>
            
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {confessions.map((confession, index) => (
                <motion.div
                  key={confession.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <ConfessionCard
                    confession={confession}
                    currentUserId={user?.id}
                    onDelete={handleDeleteConfession}
                  />
                </motion.div>
              ))}
            </div>
            
            {hasMore && (
              <motion.div 
                className="text-center mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="cw-primary-btn disabled:cursor-not-allowed disabled:opacity-50"
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div 
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      加载中...
                    </span>
                  ) : (
                    '加载更多'
                  )}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}

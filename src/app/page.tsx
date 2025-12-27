'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useLike } from '@/context/LikeContext';
import { confessionService } from '@/services/confessionService';
import { Confession } from '@/types/confession';
import { useRouter } from 'next/navigation';
import ConfessionCard from '@/components/ConfessionCard';
import CreateConfessionForm from '@/components/CreateConfessionForm';
import { CustomSelect } from '@/components/CustomSelect';
import { HashtagList } from '@/components/HashtagList';
import { CategoryList } from '@/components/CategoryList';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import LoginPrompt from '@/components/LoginPrompt';
import ConfessionCardSkeleton from '@/components/ConfessionCardSkeleton';
import { FadeInStagger } from '@/components/Transitions';
import Modal from '@/components/AnimatedModal';
import toast from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showLoginPrompt } = useLike();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchType, setSearchType] = useState<'content' | 'username'>('content');
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confessionToDelete, setConfessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);



  // 使用React Query的无限查询获取表白列表
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError: isErrorConfessions,
    error: errorConfessions,
    refetch: refetchConfessions
  } = useInfiniteQuery<Confession[], Error>({
    queryKey: ['confessions'],
    queryFn: (context) => confessionService.getConfessions(context.pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      // 如果返回的数据数量少于请求的limit，说明没有更多数据了
      return lastPage.length >= 10 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5分钟缓存有效期
    refetchOnMount: true, // 组件挂载时重新获取数据
    refetchOnWindowFocus: false, // 窗口获得焦点时不重新获取
    retry: 3, // 失败时重试3次
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数退避
    placeholderData: (previousData) => previousData, // 重新获取数据时保留之前的数据，避免空白
  });

  // 使用React Query管理搜索结果
  const { 
    data: searchResults = [], 
    isLoading: isSearching,
    refetch: refetchSearch
  } = useQuery<Confession[]>({
    queryKey: ['search', searchKeyword, searchType],
    queryFn: () => {
      if (!searchKeyword.trim()) return [];
      return confessionService.searchConfessions(searchKeyword, searchType, 1);
    },
    enabled: false, // 禁用自动执行，手动触发
    staleTime: 3 * 60 * 1000, // 3分钟缓存有效期
    // cacheTime已移到queryClient默认选项中，不再在单个查询中设置
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
      await queryClient.invalidateQueries({ queryKey: ['confessions'] });
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditConfession = async (_confessionId: string, _newContent: string) => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['confessions'] });
    } catch (err) {
      console.error('Edit error:', err);
      window.alert('编辑表白失败，请稍后重试。');
    }
  };

  // 合并所有表白数据
  const confessions = useMemo(() => infiniteData?.pages.flat() || [], [infiniteData]);
  // 添加useState来管理表白列表，确保新表白添加后页面会重新渲染
  const [displayConfessions, setDisplayConfessions] = useState<Confession[]>([]);
  // 添加一个强制重新渲染的key
  const [forceRenderKey, setForceRenderKey] = useState(0);
  
  // 添加一个标志来跟踪是否刚刚添加了新表白
  const [justAddedConfession, setJustAddedConfession] = useState(false);
  
  // 当confessions或searchResults变化时，更新displayConfessions
  useEffect(() => {
    console.log('useEffect triggered:', { searchKeyword: searchKeyword.trim(), confessionsLength: confessions.length, searchResultsLength: searchResults.length, justAddedConfession });
    setTimeout(() => {
      if (searchKeyword.trim()) {
        setDisplayConfessions(searchResults as Confession[]);
      } else if (!justAddedConfession) {
        // 只有在没有刚刚添加表白时才更新
        setDisplayConfessions(confessions as Confession[]);
      }
    }, 0);
  }, [confessions, searchResults, searchKeyword, justAddedConfession]);
  
  // 初始化displayConfessions
  useEffect(() => {
    console.log('Initialization useEffect:', { displayConfessionsLength: displayConfessions.length, confessionsLength: confessions.length });
    setTimeout(() => {
      if (displayConfessions.length === 0 && confessions.length > 0 && !justAddedConfession) {
        console.log('Setting initial displayConfessions');
        setDisplayConfessions(confessions as Confession[]);
      }
    }, 0);
  }, [confessions, displayConfessions.length, justAddedConfession]);
  
  // 添加调试信息
  useEffect(() => {
    console.log('displayConfessions updated:', displayConfessions);
  }, [displayConfessions]);
  
  // 重置justAddedConfession标志
  useEffect(() => {
    if (justAddedConfession) {
      const timer = setTimeout(() => {
        setJustAddedConfession(false);
      }, 1000); // 1秒后重置标志
      return () => clearTimeout(timer);
    }
  }, [justAddedConfession]);
  
  // 确定当前加载状态
  // 使用isLoading而不是isInitialLoading，这样在重新获取数据时不会显示骨架屏
  const currentLoading = searchKeyword.trim() ? isSearching : isLoading;
  const isError = searchKeyword.trim() ? false : isErrorConfessions;
  const error = searchKeyword.trim() ? null : errorConfessions;

  // 等待组件挂载和认证完成后再渲染内容
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen pb-20 smooth-scroll"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Navbar />
      
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
      
      {/* 登录提示组件 */}
      {showLoginPrompt && <LoginPrompt />}
      
      <main className="w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <motion.div 
          className="text-center mb-8 sm:mb-12 md:mb-20 pt-6 sm:pt-10 md:pt-14"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold mb-4 sm:mb-6 md:mb-8 gradient-text drop-shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            Confession Wall
          </motion.h1>
          <motion.p 
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-light px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            一个倾诉秘密、表达爱意或发泄情绪的安全空间。
            <motion.span 
              className="block mt-2 sm:mt-3 md:mt-4 font-medium text-warm-600 dark:text-warm-400"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              匿名 · 安全 · 免费
            </motion.span>
          </motion.p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <CreateConfessionForm 
            onSuccess={(newConfession) => {
              console.log('onSuccess called with newConfession:', newConfession);
              
              if (!newConfession) {
                // 如果没有新表白，直接重新获取数据
                refetchConfessions();
                return;
              }
              
              // 直接更新displayConfessions状态，将新表白添加到列表开头
              setDisplayConfessions((prev) => {
                // 创建新的表白对象，确保格式正确
                const confessionToAdd = {
                  ...newConfession,
                  likes_count: 0,
                  liked_by_user: false,
                  comments_count: 0,
                  images: newConfession.images || [],
                  hashtags: newConfession.hashtags || [],
                  category: newConfession.category || undefined,
                  profile: newConfession.profile || undefined
                };
                
                // 检查新表白是否已经存在于列表中
                const existingConfession = prev.find((c) => c.id === newConfession.id);
                if (existingConfession) {
                  // 如果已经存在，直接返回旧数据
                  return prev;
                }
                
                // 将新表白添加到列表开头
                return [confessionToAdd, ...prev];
              });
              
              // 设置刚刚添加了表白的标志
              setJustAddedConfession(true);
              
              // 强制组件重新渲染
              setForceRenderKey(prev => prev + 1);
              
              // 同时更新React Query缓存，确保数据一致性
              queryClient.setQueryData(['confessions'], (oldData: { pages: Confession[][], pageParams: number[] } | undefined) => {
                console.log('oldData before update:', oldData);
                
                // 如果没有旧数据，创建新的数据结构
                if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                  console.log('No old data, creating new structure');
                  return {
                    pages: [[newConfession]],
                    pageParams: [1]
                  };
                }
                
                // 创建新的表白对象，确保格式正确
                const confessionToAdd = {
                  ...newConfession,
                  likes_count: 0,
                  liked_by_user: false,
                  comments_count: 0,
                  images: newConfession.images || [],
                  hashtags: newConfession.hashtags || [],
                  category: newConfession.category || undefined,
                  profile: newConfession.profile || undefined
                };
                
                console.log('confessionToAdd:', confessionToAdd);
                
                // 检查新表白是否已经存在于列表中
                const existingConfession = oldData.pages[0].find((c: Confession) => c.id === newConfession.id);
                if (existingConfession) {
                  // 如果已经存在，直接返回旧数据
                  console.log('Confession already exists in list');
                  return oldData;
                }
                
                // 创建新的页面数组，将新表白添加到第一页的开头
                const updatedPages = [...oldData.pages];
                updatedPages[0] = [confessionToAdd, ...updatedPages[0]];
                
                console.log('updatedPages:', updatedPages);
                
                // 返回更新后的数据
                const result = {
                  ...oldData,
                  pages: updatedPages
                };
                
                console.log('final result:', result);
                return result;
              });
              
              // 使缓存失效，确保数据同步
              queryClient.invalidateQueries({ queryKey: ['confessions'] });
            }} 
            user={user} 
          />
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <HashtagList limit={8} />
          <CategoryList />
        </motion.div>
        
        <div className="space-y-8">
          <motion.div 
            className="space-y-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <motion.span 
                className="text-3xl inline-block"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                🌟
              </motion.span> 
              最新表白
            </h2>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                refetchSearch();
              }}
              className="w-full flex flex-col gap-3"
            >
              <div className="w-full flex flex-col sm:flex-row gap-3">
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all duration-300 hover:border-primary-300 dark:hover:border-primary-600 shadow-sm hover:shadow-md text-sm input-focus-ring"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <motion.button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-primary-400 disabled:to-primary-500 flex items-center justify-center gap-2 min-w-12 btn-hover-lift btn-press ripple-effect"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {currentLoading ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span>搜索中...</span>
                    </motion.div>
                  ) : (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                      搜索
                    </motion.span>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
          
          {isLoading ? (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ConfessionCardSkeleton count={3} />
            </motion.div>
          ) : isError ? (
            <motion.div 
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <p className="text-red-600 dark:text-red-400 mb-4">{error?.message || '加载失败'}</p>
              <motion.button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['confessions'] })}
                className="text-primary-600 hover:text-primary-700 font-medium btn-hover-lift"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                重试
              </motion.button>
            </motion.div>
          ) : displayConfessions.length === 0 ? (
            <motion.div 
              className="glass rounded-2xl p-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <motion.p 
                className="text-gray-500 dark:text-gray-400 text-lg"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {searchKeyword ? '没有找到匹配的表白' : '还没有表白。成为第一个吧！'}
              </motion.p>
            </motion.div>
          ) : (
            <FadeInStagger key={forceRenderKey} className="grid gap-6">
              {displayConfessions.map((confession) => (
                <ConfessionCard
                  key={confession.id}
                  confession={confession}
                  currentUserId={user?.id}
                  onDelete={handleDeleteConfession}
                  onEdit={handleEditConfession}
                />
              ))}
            </FadeInStagger>
          )}
          
          <motion.div ref={observerRef} className="flex justify-center py-8">
            {isFetchingNextPage && (
              <motion.div 
                className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}
            {!hasNextPage && confessions.length > 0 && !searchKeyword.trim() && (
              <motion.p 
                className="text-gray-400 dark:text-gray-500 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                你已经到达世界的尽头了 🌍
              </motion.p>
            )}
          </motion.div>
        </div>
      </main>
    </motion.div>
  );
}

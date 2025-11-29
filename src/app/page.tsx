'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import CommentSection from '@/components/CommentSection';
import { useAuth } from '@/context/AuthContext';
import { confessionService } from '@/services/confessionService';
import { Confession, ConfessionFormData } from '@/types/confession';
import { useRouter } from 'next/navigation';

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
  const [formData, setFormData] = useState<ConfessionFormData>({
    content: '',
    is_anonymous: false,
    images: [],
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  
  // 图片放大状态
  const [enlargedImageId, setEnlargedImageId] = useState<string | null>(null);

  // 获取表白列表
  const fetchConfessions = async (isLoadMore: boolean = false) => {
    const currentPage = isLoadMore ? page + 1 : 1;
    const loadingState = isLoadMore ? setLoadingMore : setLoading;
    const errorState = isLoadMore ? setError : setError;

    loadingState(true);
    errorState(null);
    try {
      let data;
      
      if (searchKeyword.trim()) {
        // 如果有搜索关键词，使用搜索功能
        data = await confessionService.searchConfessions(searchKeyword);
      } else {
        // 否则获取普通列表
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
      const errorMessage = err instanceof Error ? err.message : '获取表白列表失败';
      errorState(errorMessage);
    } finally {
      loadingState(false);
    }
  };

  useEffect(() => {
    fetchConfessions();
  }, []);

  // 无限滚动逻辑
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
      fetchConfessions(true);
    }
  }, [hasMore, loadingMore, loading, fetchConfessions]);

  useEffect(() => {
    const currentRef = observerRef.current;
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    });

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [handleObserver]);

  // 处理图片选择
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const newSelectedImages = [...selectedImages, ...newFiles];
      setSelectedImages(newSelectedImages);
      
      // 更新表单数据
      setFormData(prev => ({
        ...prev,
        images: newSelectedImages
      }));
      
      // 生成预览URL
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  // 移除图片
  const removeImage = (index: number) => {
    const newSelectedImages = selectedImages.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    
    // 释放URL对象
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedImages(newSelectedImages);
    setPreviewUrls(newPreviewUrls);
    
    // 更新表单数据
    setFormData(prev => ({
      ...prev,
      images: newSelectedImages
    }));
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!formData.content.trim()) {
      setFormError('表白内容不能为空');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      await confessionService.createConfession(formData);
      // 重置表单
      setFormData({
        content: '',
        is_anonymous: false,
        images: [],
      });
      // 重置图片选择
      setSelectedImages([]);
      // 释放所有预览URL
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      
      setFormSuccess(true);
      // 重新获取表白列表（从第一页开始）
      fetchConfessions();
      // 3秒后隐藏成功提示
      setTimeout(() => {
        setFormSuccess(false);
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发布表白失败';
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 切换图片放大状态
  const toggleImageEnlarge = (imageId: string) => {
    if (enlargedImageId === imageId) {
      // 如果已经放大，就恢复原状
      setEnlargedImageId(null);
    } else {
      // 否则放大当前图片
      setEnlargedImageId(imageId);
    }
  };

  // 处理点赞
  const handleLike = async (confessionId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      // 检查用户是否已经点赞
      const isLiked = await confessionService.checkIfLiked(confessionId);
      
      if (isLiked) {
        // 取消点赞
        await confessionService.unlikeConfession(confessionId);
        // 更新本地状态
        setConfessions(prev => prev.map(confession => 
          confession.id === confessionId 
            ? { ...confession, likes_count: confession.likes_count - 1 } 
            : confession
        ));
      } else {
        // 点赞
        await confessionService.likeConfession(confessionId);
        // 更新本地状态
        setConfessions(prev => prev.map(confession => 
          confession.id === confessionId 
            ? { ...confession, likes_count: confession.likes_count + 1 } 
            : confession
        ));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '操作失败';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            欢迎来到表白墙
          </h1>
          <p className="text-gray-600">
            在这里，你可以勇敢地表达自己的心声
          </p>
        </div>
        
        {/* 表白发布表单 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 transition-all duration-300 hover:shadow-md dark:bg-gray-800 dark:shadow-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 dark:text-white">
            发布表白
          </h2>
          {formSuccess && (
            <div className="mb-4 p-3 bg-secondary-50 border border-secondary-200 rounded-lg transition-all duration-300 dark:bg-secondary-900/30 dark:border-secondary-800">
              <p className="text-sm text-secondary-600 dark:text-secondary-400">表白发布成功！</p>
            </div>
          )}
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg transition-all duration-300 dark:bg-red-900/30 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
            </div>
          )}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-transparent"
                rows={5}
                placeholder="写下你的表白..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              ></textarea>
            </div>
            
            {/* 图片上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 dark:text-gray-300">
                添加图片 (可选，支持多张)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 transform hover:scale-105 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    选择图片
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                </label>
                {selectedImages.length > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    已选择 {selectedImages.length} 张图片
                  </span>
                )}
              </div>
              
              {/* 图片预览 */}
              {previewUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="w-full aspect-video rounded-lg border border-gray-200 overflow-hidden dark:border-gray-700">
                        <Image
                          src={url}
                          alt={`Preview ${index + 1}`}
                          width={150}
                          height={100}
                          className="w-full h-full object-cover transition-all duration-300 transform group-hover:scale-105"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 dark:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="anonymous"
                className="mr-2 rounded text-primary-600 focus:ring-primary-500 dark:text-primary-400 dark:focus:ring-primary-600"
                checked={formData.is_anonymous}
                onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
              />
              <label htmlFor="anonymous" className="text-gray-700 dark:text-gray-300">
                匿名发布
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className={`flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 ${formLoading ? 'opacity-50 cursor-not-allowed' : ''} dark:bg-primary-500 dark:hover:bg-primary-400`}
              >
                {formLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    发布中...
                  </>
                ) : (
                  '发布'
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* 表白列表 */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              最新表白
            </h2>
            {/* 搜索框 */}
            <div className="w-full">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchConfessions();
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="搜索表白内容..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors whitespace-nowrap"
                  >
                    搜索
                  </button>
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchKeyword('');
                        fetchConfessions();
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors whitespace-nowrap"
                    >
                      清除
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">加载中...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => fetchConfessions()}
                className="mt-2 text-blue-600 hover:text-blue-500"
              >
                重试
              </button>
            </div>
          ) : confessions.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
              <p className="text-gray-600">还没有表白，快来发布第一条吧！</p>
            </div>
          ) : (
            <>
              {confessions.map((confession) => (
                <div 
                  key={confession.id} 
                  className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 dark:bg-gray-800 dark:shadow-gray-700"
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center">
                      {confession.is_anonymous ? (
                        <div className="w-11 h-11 bg-gray-200 rounded-full flex items-center justify-center mr-4 transition-all duration-300 transform hover:scale-110 dark:bg-gray-700">
                          <span className="text-gray-600 font-medium dark:text-gray-300">匿</span>
                        </div>
                      ) : confession.profile ? (
                        confession.profile.avatar_url ? (
                          <Image
                            src={confession.profile.avatar_url}
                            alt={confession.profile.display_name}
                            width={44}
                            height={44}
                            className="w-11 h-11 rounded-full object-cover mr-4 border-2 border-gray-200 transition-all duration-300 transform hover:scale-110 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-gray-200 rounded-full flex items-center justify-center mr-4 transition-all duration-300 transform hover:scale-110 dark:bg-gray-700">
                            <span className="text-gray-600 font-medium dark:text-gray-300">用</span>
                          </div>
                        )
                      ) : (
                        <div className="w-11 h-11 bg-gray-200 rounded-full flex items-center justify-center mr-4 transition-all duration-300 transform hover:scale-110 dark:bg-gray-700">
                          <span className="text-gray-600 font-medium dark:text-gray-300">用</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {confession.is_anonymous ? '匿名用户' : confession.profile?.display_name || '未知用户'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(confession.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-5 leading-relaxed dark:text-gray-300">
                        {confession.content}
                      </p>
                      
                      {/* 表白图片 */}
                      {confession.images && confession.images.length > 0 && (
                        <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {confession.images.map((image) => (
                            <div 
                              key={image.id} 
                              className={`relative group transition-all duration-300 ${enlargedImageId === image.id ? 'z-10 col-span-full sm:col-span-2 md:col-span-3' : ''}`}
                            >
                              {/* 图片容器 */}
                              <div 
                                className="w-full aspect-video overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                              >
                                <Image
                                  src={image.image_url}
                                  alt="Confession image"
                                  width={200}
                                  height={150}
                                  className={`w-full h-full object-cover transition-all duration-300 transform cursor-pointer hover:shadow-lg ${enlargedImageId === image.id ? 'scale-100 shadow-xl' : 'group-hover:scale-105'}`}
                                  onClick={() => toggleImageEnlarge(image.id)}
                                />
                                {/* 放大/缩小图标 - 只在图片上显示 */}
                                <div 
                                  className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg cursor-pointer"
                                  onClick={() => toggleImageEnlarge(image.id)}
                                >
                                  <span className="text-white text-2xl">{enlargedImageId === image.id ? '🗙' : '🔍'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-8">
                        <button 
                          onClick={() => handleLike(confession.id)}
                          className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-all duration-200 transform hover:scale-110 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <span className="text-xl">❤️</span>
                          <span className="font-medium">{confession.likes_count}</span>
                        </button>
                      </div>
                  
                  {/* 评论区 */}
                  <CommentSection confessionId={confession.id} />
                </div>
              ))}
              
              {/* 加载更多指示器 */}
              <div ref={observerRef} className="flex justify-center py-8">
                {loadingMore ? (
                  <p className="text-gray-600">加载更多...</p>
                ) : hasMore ? (
                  <p className="text-gray-500">滚动到底部加载更多</p>
                ) : (
                  <p className="text-gray-500">没有更多表白了</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

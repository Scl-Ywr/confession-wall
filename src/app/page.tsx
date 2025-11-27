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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            发布表白
          </h2>
          {formSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">表白发布成功！</p>
            </div>
          )}
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{formError}</p>
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="写下你的表白..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              ></textarea>
            </div>
            
            {/* 图片上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                添加图片 (可选，支持多张)
              </label>
              <div className="flex items-center space-x-4">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
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
                  <span className="text-sm text-gray-500">
                    已选择 {selectedImages.length} 张图片
                  </span>
                )}
              </div>
              
              {/* 图片预览 */}
              {previewUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={url}
                        alt={`Preview ${index + 1}`}
                        width={150}
                        height={100}
                        className="w-full h-24 object-cover rounded-md border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="mr-2"
                checked={formData.is_anonymous}
                onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
              />
              <label htmlFor="anonymous" className="text-gray-700">
                匿名发布
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors ${formLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {formLoading ? '发布中...' : '发布'}
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
                  className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      {confession.is_anonymous ? (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3 transition-colors hover:bg-gray-300">
                          <span className="text-gray-600 font-medium">匿</span>
                        </div>
                      ) : confession.profile ? (
                        confession.profile.avatar_url ? (
                          <Image
                            src={confession.profile.avatar_url}
                            alt={confession.profile.display_name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3 transition-colors hover:bg-gray-300">
                            <span className="text-gray-600 font-medium">用</span>
                          </div>
                        )
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3 transition-colors hover:bg-gray-300">
                          <span className="text-gray-600 font-medium">用</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {confession.is_anonymous ? '匿名用户' : confession.profile?.display_name || '未知用户'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(confession.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                        {confession.content}
                      </p>
                      
                      {/* 表白图片 */}
                      {confession.images && confession.images.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {confession.images.map((image) => (
                            <div key={image.id} className="relative group">
                              <Image
                                src={image.image_url}
                                alt="Confession image"
                                width={200}
                                height={150}
                                className="w-full h-32 object-cover rounded-md border border-gray-200 transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-6">
                        <button 
                          onClick={() => handleLike(confession.id)}
                          className="flex items-center space-x-1 text-red-500 hover:text-red-600 transition-all duration-200 transform hover:scale-105"
                        >
                          <span className="text-lg">❤️</span>
                          <span>{confession.likes_count}</span>
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

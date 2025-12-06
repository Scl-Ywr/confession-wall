'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ConfessionFormData } from '@/types/confession';
import { confessionService } from '@/services/confessionService';
import { PhotoIcon, PaperAirplaneIcon, XMarkIcon, FilmIcon } from '@heroicons/react/24/outline';
import VideoUploader from './VideoUploader';
import VideoPlayer from './VideoPlayer';
import { motion } from 'framer-motion';

interface CreateConfessionFormProps {
  onSuccess: () => void;
  user: { id: string; email?: string } | null;
}

export default function CreateConfessionForm({ onSuccess, user }: CreateConfessionFormProps) {
  const [formData, setFormData] = useState<ConfessionFormData>({
    content: '',
    is_anonymous: false,
    images: [],
    videoUrls: [],
  });
  const [videoPosters, setVideoPosters] = useState<Record<string, string>>({});
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const newSelectedImages = [...selectedImages, ...newFiles];
      setSelectedImages(newSelectedImages);
      setFormData(prev => ({ ...prev, images: newSelectedImages }));
      
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    const newSelectedImages = selectedImages.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedImages(newSelectedImages);
    setPreviewUrls(newPreviewUrls);
    setFormData(prev => ({ ...prev, images: newSelectedImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // 清除之前的错误信息
    setError(null);
    
    // 检查是否有文字内容
    if (!formData.content.trim()) {
      // 没有文字内容，检查是否有视频
      if (formData.videoUrls && formData.videoUrls.length > 0) {
        // 有视频，显示确认提示
        setShowConfirmModal(true);
      } else {
        // 没有视频，直接提示错误
        setError('请先输入文字内容再进行发布');
      }
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      await confessionService.createConfession(formData);
      // 重置表单数据，包括videoUrls
      setFormData({ content: '', is_anonymous: false, images: [], videoUrls: [] });
      setSelectedImages([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      // 重置视频相关状态
      setVideoUrl(null);
      setShowVideoUploader(false);
      setSuccess(true);
      onSuccess();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布表白失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理直接发布
  const handleDirectPublish = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await confessionService.createConfession(formData);
      // 重置表单数据，包括videoUrls
      setFormData({ content: '', is_anonymous: false, images: [], videoUrls: [] });
      setSelectedImages([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      // 重置视频相关状态
      setVideoUrl(null);
      setShowVideoUploader(false);
      setSuccess(true);
      onSuccess();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布表白失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理输入文字后发布
  const handleAddTextPublish = () => {
    setShowConfirmModal(false);
    // 焦点设置到文本框
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };

  if (!user) {
    return (
      <div className="glass rounded-2xl p-8 mb-10 text-center animate-fade-in border border-white/20 shadow-xl">
        <div className="bg-primary-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-primary-900/30">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">加入我们</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
          登录后即可分享你的秘密，点赞他人的故事，并参与互动。
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/auth/login"
            className="px-6 py-2.5 bg-primary-600 text-black rounded-xl font-medium hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 dark:text-white"
          >
            登录
          </a>
          <a
            href="/auth/register"
            className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all hover:-translate-y-0.5 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            注册
          </a>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="glass rounded-2xl p-6 md:p-8 mb-10 shadow-xl border border-white/20 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 rounded-bl-full -z-10"></div>
      
      <motion.h2 
        className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        <span className="text-3xl">✨</span> 写下你的秘密
      </motion.h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div 
          className="relative group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          <textarea
            className="w-full h-40 px-6 py-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none text-lg placeholder-gray-400 dark:text-white dark:placeholder-gray-500 group-hover:bg-white/80 dark:group-hover:bg-gray-800/80"
            placeholder="在这里写下你想说的话..."
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            disabled={loading}
          ></textarea>
          <div className="absolute bottom-4 right-4 text-xs text-gray-400 font-medium bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-lg backdrop-blur-sm">
            {formData.content.length} 字
          </div>
        </motion.div>

        {/* Image Upload Preview */}
        {previewUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 animate-fade-in">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                <Image
                  src={url}
                  alt={`Preview ${index}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 transform group-hover:scale-110"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Video Uploader */}
        {showVideoUploader && (
          <div className="mt-6 animate-fade-in">
            <VideoUploader 
              onUploadSuccess={(videoUrl, posterUrl) => {
                setVideoUrl(videoUrl);
                setShowVideoUploader(false);
                // Add the video URL to the confession data
                setFormData(prev => ({
                  ...prev,
                  videoUrls: [...(prev.videoUrls || []), videoUrl]
                }));
                // Store the poster URL if provided
                if (posterUrl) {
                  setVideoPosters(prev => ({
                    ...prev,
                    [videoUrl]: posterUrl
                  }));
                }
              }} 
            />
          </div>
        )}

        {/* Video Preview */}
        {videoUrl && (
          <div className="mt-6 animate-fade-in">
            <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
              <VideoPlayer 
                videoUrl={videoUrl} 
                posterUrl={videoPosters[videoUrl]}
              />
              <button
                type="button"
                onClick={() => {
                  setVideoUrl(null);
                  // Remove the video URL from the confession data
                  setFormData(prev => ({
                    ...prev,
                    videoUrls: prev.videoUrls?.filter(url => url !== videoUrl) || []
                  }));
                  // Remove the poster URL if it exists
                  setVideoPosters(prev => {
                    const newPosters = { ...prev };
                    delete newPosters[videoUrl];
                    return newPosters;
                  });
                }}
                className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full backdrop-blur-sm transition-all transform hover:scale-110 z-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <label className="cursor-pointer group relative">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
                disabled={loading || previewUrls.length >= 9}
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-xl transition-all border border-gray-200 dark:border-gray-700 group-hover:border-primary-300 dark:group-hover:border-primary-700">
                <PhotoIcon className="w-5 h-5 text-primary-500 group-hover:scale-110 transition-transform" />
                <span className="font-medium">添加图片</span>
              </div>
            </label>

            <button
              type="button"
              onClick={() => setShowVideoUploader(!showVideoUploader)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-xl transition-all border border-gray-200 dark:border-gray-700 group-hover:border-primary-300 dark:group-hover:border-primary-700"
            >
              <FilmIcon className="w-5 h-5 text-primary-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{showVideoUploader ? '关闭视频上传' : '上传视频'}</span>
            </button>

            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </div>
              <span className="text-gray-600 dark:text-gray-300 font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">匿名发布</span>
            </label>
          </div>

          <button
              type="submit"
              disabled={loading}
              className={`w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-pink-500/50 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
            >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>发布中...</span>
              </>
            ) : (
              <>
                <span>发布表白</span>
                <PaperAirplaneIcon className="w-5 h-5 -rotate-45 mb-1" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-fade-in">
            <span className="text-xl">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-600 dark:text-green-400 animate-fade-in">
            <span className="text-xl">🎉</span>
            <p>发布成功！</p>
          </div>
        )}
      </form>
      
      {/* 视频发布确认提示模态框 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-200 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🎬</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">确认发布</h3>
              <p className="text-gray-600 dark:text-gray-300">您当前有视频但没有文字内容，您想如何发布？</p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={handleAddTextPublish}
                className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-lg hover:-translate-y-0.5"
              >
                输入文字后发布
              </button>
              
              <button
                onClick={handleDirectPublish}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-pink-500/50 transform hover:-translate-y-0.5 transition-all"
              >
                直接发布
              </button>
            </div>
            
            <button
              onClick={() => setShowConfirmModal(false)}
              className="mt-4 w-full px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-medium transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ConfessionFormData, Confession } from '@/types/confession';
import { confessionService } from '@/services/confessionService';
import { PhotoIcon, PaperAirplaneIcon, XMarkIcon, FilmIcon, PencilIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import VideoUploader from './VideoUploader';
import VideoPlayer from './VideoPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { HashtagInput } from './HashtagInput';
import { CategorySelect } from './CategorySelect';
import { MentionInput } from './MentionInput';
import MarkdownEditor from './MarkdownEditor';
import { CustomSelect } from './CustomSelect';

interface CreateConfessionFormProps {
  onSuccess: (newConfession: Confession) => void;
  user: { id: string; email?: string } | null;
  groupId?: string;
}

export default function CreateConfessionForm({ onSuccess, user, groupId }: CreateConfessionFormProps) {
  const [formData, setFormData] = useState<ConfessionFormData>({
    content: '',
    is_anonymous: false,
    images: [],
    videoUrls: [],
    category_id: undefined,
    hashtags: [],
    group_id: groupId,
  });
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch user's groups when component mounts
  React.useEffect(() => {
    const fetchGroups = async () => {
      if (user) {
        setLoadingGroups(true);
        try {
          // This would be a real API call in production
          // const response = await fetch('/api/interest-groups/user');
          // const data = await response.json();
          // setAvailableGroups(data.groups);
          // For now, we'll use mock data
          setAvailableGroups([
            { id: '1', name: '情感交流圈' },
            { id: '2', name: '校园生活圈' },
            { id: '3', name: '兴趣爱好圈' }
          ]);
        } catch (error) {
          console.error('Failed to fetch groups:', error);
        } finally {
          setLoadingGroups(false);
        }
      }
    };

    fetchGroups();
  }, [user]);
  const [videoPosters, setVideoPosters] = useState<Record<string, string>>({});
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);

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
      // 保存新创建的表白对象
      const newConfession = await confessionService.createConfession(formData);
      // 重置表单数据，包括videoUrls
      setFormData({ 
        content: '', 
        is_anonymous: false, 
        images: [], 
        videoUrls: [],
        category_id: undefined,
        hashtags: []
      });
      setSelectedImages([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      // 重置视频相关状态
      setVideoUrl(null);
      setShowVideoUploader(false);
      setSuccess(true);
      onSuccess(newConfession);
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
      // 保存新创建的表白对象
      const newConfession = await confessionService.createConfession(formData);
      // 重置表单数据，包括videoUrls
      setFormData({ content: '', is_anonymous: false, images: [], videoUrls: [] });
      setSelectedImages([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      // 重置视频相关状态
      setVideoUrl(null);
      setShowVideoUploader(false);
      setSuccess(true);
      onSuccess(newConfession);
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
      <div className="animate-fade-in rounded-[2rem] border border-white/70 bg-white/78 p-7 shadow-[0_24px_70px_rgba(31,41,55,.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-500 shadow-[0_14px_35px_rgba(244,63,94,.18)] dark:bg-rose-500/15">
            <LockClosedIcon className="h-8 w-8" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">加入我们</h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">登录后即可分享你的秘密，点赞他人的故事，并参与互动。</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <a
            href="/auth/login"
            className="flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 px-6 font-bold text-white shadow-[0_16px_30px_rgba(244,63,94,.25)] transition-all hover:-translate-y-0.5 hover:from-rose-600 hover:to-red-600"
          >
            登录
          </a>
          <a
            href="/auth/register"
            className="flex h-14 items-center justify-center rounded-2xl border border-rose-200 bg-white/60 px-6 font-bold text-rose-500 transition-all hover:-translate-y-0.5 hover:bg-white dark:border-rose-300/30 dark:bg-white/5 dark:text-rose-200"
          >
            注册
          </a>
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <LockClosedIcon className="h-4 w-4 text-slate-400" />
          我们保护你的隐私，所有内容将匿名发布
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_24px_70px_rgba(31,41,55,.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10 sm:p-6 md:p-7"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Decorative elements */}
      <div className="absolute right-0 top-0 -z-10 h-32 w-32 rounded-bl-full bg-gradient-to-br from-rose-400/14 to-orange-300/14"></div>
      
      <motion.h2 
        className="mb-4 flex items-center gap-3 text-xl font-black text-slate-900 dark:text-white sm:mb-6 sm:text-2xl"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-lg shadow-orange-300/30">
          <PencilIcon className="h-5 w-5" />
        </span>
        写下你的秘密
      </motion.h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <motion.div 
          className="relative group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          <MentionInput
            value={formData.content}
            onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
            placeholder="在这里写下你想说的话..."
            onMention={(username) => {
              console.log('Mentioned user:', username);
            }}
          />
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center gap-2">
            <div className="text-xs text-gray-400 font-medium bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-lg backdrop-blur-sm">
              {formData.content.length} 字
            </div>
            <motion.button
              type="button"
              onClick={() => setShowMarkdownEditor(true)}
              className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="打开Markdown编辑器"
            >
              <PencilIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </motion.button>
          </div>
        </motion.div>

        {/* Category Selection */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
        >
          <CategorySelect
            value={formData.category_id}
            onChange={(categoryId) => setFormData(prev => ({ ...prev, category_id: categoryId }))}
            placeholder="选择分类（可选）"
          />
        </motion.div>

        {/* Interest Group Selection */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
        >
          <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">发布到圈子（可选）</div>
          <CustomSelect
            value={formData.group_id || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, group_id: value || undefined }))}
            options={[
              { value: '', label: '不发布到特定圈子' },
              ...availableGroups.map(group => ({ value: group.id, label: group.name }))
            ]}
            className="w-full"
            disabled={loadingGroups}
          />
        </motion.div>

        {/* Hashtag Input */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
        >
          <HashtagInput
            hashtags={formData.hashtags || []}
            onChange={(hashtags) => setFormData(prev => ({ ...prev, hashtags }))}
            placeholder="添加话题标签..."
          />
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
                id="preview-video"
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

        <div className="flex flex-col gap-4 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
            <motion.label 
              className="cursor-pointer group relative"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
                disabled={loading || previewUrls.length >= 9}
              />
              <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-lg sm:rounded-xl transition-all border border-gray-200 dark:border-gray-700 group-hover:border-primary-300 dark:group-hover:border-primary-700 text-sm btn-hover-lift ripple-effect">
                <motion.div
                  animate={previewUrls.length >= 9 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <PhotoIcon className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
                </motion.div>
                <span className="font-medium">图片</span>
              </div>
            </motion.label>

            <motion.button
              type="button"
              onClick={() => setShowVideoUploader(!showVideoUploader)}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-lg sm:rounded-xl transition-all border border-gray-200 dark:border-gray-700 group-hover:border-primary-300 dark:group-hover:border-primary-700 text-sm btn-hover-lift btn-press ripple-effect"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                animate={showVideoUploader ? { rotate: [0, 360] } : {}}
                transition={{ duration: 0.5 }}
              >
                <FilmIcon className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
              </motion.div>
              <span className="font-medium">视频</span>
            </motion.button>

            <motion.label 
              className="flex items-center justify-center gap-2 cursor-pointer group select-none px-3 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg sm:rounded-xl transition-all border border-gray-200 dark:border-gray-700 group-hover:border-primary-300 dark:group-hover:border-primary-700 btn-hover-lift"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                />
                <motion.div 
                  className={`w-9 h-5 rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 transition-all duration-300 ${formData.is_anonymous ? 'bg-primary-600 after:translate-x-full' : 'bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 dark:bg-gray-700'}`}
                  animate={formData.is_anonymous ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <motion.span 
                className="text-gray-600 dark:text-gray-300 font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-sm"
                animate={formData.is_anonymous ? { color: ['#4b5563', '#ea580c'] } : {}}
                transition={{ duration: 0.3 }}
              >
                匿名
              </motion.span>
            </motion.label>
          </div>

          <motion.button
              type="submit"
              disabled={loading}
              className={`w-full px-6 py-3 sm:py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-pink-500/50 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 btn-hover-lift btn-press ripple-effect`}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(236, 72, 153, 0.4)' }}
              whileTap={{ scale: 0.98 }}
            >
            {loading ? (
              <>
                <motion.div 
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  发布中...
                </motion.span>
              </>
            ) : (
              <>
                <motion.span
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  发布表白
                </motion.span>
                <motion.div
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: -45, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <PaperAirplaneIcon className="w-5 h-5 -rotate-45 mb-1" />
                </motion.div>
              </>
            )}
          </motion.button>
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

      {/* Markdown编辑器模态框 */}
      <AnimatePresence>
        {showMarkdownEditor && (
          <MarkdownEditor
            content={formData.content}
            onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
            onClose={() => setShowMarkdownEditor(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

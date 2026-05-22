'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Confession, ConfessionImage } from '@/types/confession';
import CommentSection from '@/components/CommentSection';
import VideoPlayer from '@/components/VideoPlayer';
import LikeButton from './LikeButton';
import { TrashIcon, TagIcon, FolderIcon, PencilIcon } from '@heroicons/react/24/outline';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import MarkdownRenderer from './MarkdownRenderer';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ConfessionCardProps {
  confession: Confession;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
}

export default function ConfessionCard({
  confession,
  currentUserId,
  onDelete,
  onEdit,
}: ConfessionCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [downloadMedia, setDownloadMedia] = useState<ConfessionImage | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // 使用 useMemo 优化日期格式化
  const formattedDate = useMemo(() => {
    const date = new Date(confession.created_at);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [confession.created_at]);

  const handleEditClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
      setEditContent(confession.content);
    }
  }, [isEditing, confession.content]);

  const handleSaveEdit = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/confessions/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          id: confession.id,
          content: editContent,
        }),
      });

      if (response.ok) {
        toast.success('修改成功', {
          duration: 3000,
          position: 'top-right',
        });
        setIsEditing(false);
        setEditContent('');
        if (onEdit) {
          onEdit(confession.id, editContent);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || '修改失败', {
          duration: 3000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Error editing confession:', error);
      toast.error('修改失败，请重试', {
        duration: 3000,
        position: 'top-right',
      });
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, confession.id, editContent, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent('');
  }, []);

  // Handle profile click
  const handleProfileClick = () => {
    if (!confession.is_anonymous && confession.profile?.username) {
      router.push(`/profile/${confession.profile.username}`);
    }
  };

  // Lock settings modal state
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockType, setLockType] = useState<'password' | 'user' | 'public'>('password');
  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const [isLocking, setIsLocking] = useState<boolean>(false);

  // Handle lock toggle
  const handleToggleLock = async (imageId: string, shouldLock: boolean) => {
    if (shouldLock) {
      setSelectedImageId(imageId);
      setIsLocking(true);
      setLockType('password');
      setLockPassword('');
      setShowLockModal(true);
    } else {
      setSelectedImageId(imageId);
      setIsLocking(false);
      setLockType('public');
      setLockPassword('');
      setShowLockModal(true);
    }
  };

  // Update lock status
  const updateLockStatus = async (imageId: string, isLocked: boolean, lockType: 'password' | 'user' | 'public', password: string) => {
    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/toggle-media-lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ imageId, isLocked, lockType, password }),
      });

      if (response.ok) {
        // Show success message using react-hot-toast
        toast.success(isLocked ? '锁定设置已更新' : '已成功解锁', {
          duration: 3000,
          position: 'top-right',
        });

        // Invalidate React Query cache to fetch fresh data
        await queryClient.invalidateQueries({ queryKey: ['confessions'] });

        // Reload the page to show updated lock status
        router.refresh();
      } else {
        const errorData = await response.json();
        console.error('Failed to toggle lock:', errorData);
        toast.error(errorData.error || '切换锁定状态失败，请重试', {
          duration: 3000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
      toast.error('切换锁定状态失败，请重试', {
        duration: 3000,
        position: 'top-right',
      });
    }
  };

  // Handle lock modal submit
  const handleLockModalSubmit = async () => {
    if (isLocking && lockType === 'password' && !lockPassword) {
      toast.error('请输入密码', {
        duration: 3000,
        position: 'top-right',
      });
      return;
    }
    
    await updateLockStatus(selectedImageId, isLocking, lockType, lockPassword);
    setShowLockModal(false);
  };
  
  // State for password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForDownload, setPasswordForDownload] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [downloadImageId, setDownloadImageId] = useState('');
  const [passwordError, setPasswordError] = useState(''); // Error message for incorrect password

  // Handle media download
  const handleDownload = async (imageId: string, media: ConfessionImage) => {
    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();


      // Check if media is locked with other lock types first
      if (media.is_locked) {
        // For locked media, check if user is logged in first
        if (!session) {
          toast.error('请先登录才能下载此媒体', {
            duration: 3000,
            position: 'top-right',
          });
          return;
        }

        // Password lock: show password modal
        if (media.lock_type === 'password') {
          setDownloadImageId(imageId);
          setPasswordForDownload('');
          setShowPassword(false);
          setShowPasswordModal(true);
          return;
        }
      }
      
      // Show download confirmation modal for all media
      setDownloadImageId(imageId);
      setDownloadMedia(media);
      setShowDownloadConfirm(true);
    } catch (error) {
      console.error('Error in download process:', error);
      toast.error('下载失败，请重试', {
        duration: 3000,
        position: 'top-right',
      });
    }
  };
  
  // Actual download implementation
  const performDownload = async (imageId: string, media: ConfessionImage, session: { access_token: string } | null) => {
    try {
      // Use the download API endpoint with proper authorization
      // Let the API handle all other validation (user lock, ownership, etc.)
      const response = await fetch('/api/download-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ imageId }),
      });

      if (response.ok) {
        // Create a blob from the response
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `media_${imageId}`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Revoke the blob URL after download
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);

        // Show success message
        toast.success('下载成功', {
          duration: 3000,
          position: 'top-right',
        });
      } else {
        const error = await response.json();
        // 根据lock_type显示不同的错误信息
        let errorMessage = error.error || '下载失败';
        
        if (media.lock_type === 'user') {
          errorMessage = '您没有权限下载此媒体，只有授权用户才能访问';
        } else if (media.lock_type === 'password') {
          errorMessage = error.error || '密码错误或您没有权限下载此媒体';
        }
        
        toast.error(errorMessage, {
          duration: 3000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Error performing download:', error);
      throw error;
    }
  };
  
  // Handle download confirmation
  const handleConfirmDownload = async () => {
    if (!downloadImageId || !downloadMedia) {
      setShowDownloadConfirm(false);
      return;
    }
    
    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      // Proceed with actual download
      await performDownload(downloadImageId, downloadMedia, session);
    } catch (error) {
      console.error('Error in confirm download:', error);
      toast.error('下载失败，请重试', {
        duration: 3000,
        position: 'top-right',
      });
    } finally {
      // Close confirmation modal and reset state
      setShowDownloadConfirm(false);
      setDownloadImageId('');
      setDownloadMedia(null);
    }
  };
  
  // Handle download cancellation
  const handleCancelDownload = () => {
    // Close confirmation modal and reset state
    setShowDownloadConfirm(false);
    setDownloadImageId('');
    setDownloadMedia(null);
  };
  
  // Handle password submission for download
  const handlePasswordSubmit = async () => {
    if (!passwordForDownload) {
      setPasswordError('请输入密码');
      return;
    }
    
    try {
      // Clear previous error
      setPasswordError('');
      
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use the download API endpoint with password
      const response = await fetch('/api/download-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          imageId: downloadImageId,
          password: passwordForDownload,
        }),
      });
      
      if (response.ok) {
        // Create a blob from the response
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `media_${downloadImageId}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Revoke the blob URL after download
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        
        // Close the modal
        setShowPasswordModal(false);
        setPasswordForDownload(''); // Clear password
        
        // Show success message
        toast.success('下载成功', {
          duration: 3000,
          position: 'top-right',
        });
      } else {
        const error = await response.json();
        setPasswordError(error.error || '密码错误，请重试');
      }
    } catch (error) {
      console.error('Error downloading media with password:', error);
      setPasswordError('下载失败，请重试');
    }
  };
  
  return (
    <motion.article
      className="h-fit rounded-[1.75rem] border border-white/75 bg-white/80 p-5 shadow-[0_18px_55px_rgba(31,41,55,.10)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-white/10 sm:p-6"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.25, 0.1, 0.25, 1] 
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 24px 65px -24px rgba(244, 63, 94, 0.35), 0 16px 45px -24px rgba(15, 23, 42, 0.28)'
      }}
    >
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center">
          {confession.is_anonymous ? (
            <div className="mr-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-orange-100 shadow-md ring-4 ring-white/70 dark:from-rose-500/20 dark:to-orange-500/20 dark:ring-white/10">
              <span className="text-lg font-black text-rose-500 dark:text-rose-200">?</span>
            </div>
          ) : (
            <div 
              className="relative mr-3 h-14 w-14 cursor-pointer overflow-hidden rounded-full border-2 border-white/80 bg-gradient-to-br from-slate-100 to-slate-200 shadow-md ring-4 ring-white/55 transition-transform duration-300 hover:scale-105 dark:border-white/20 dark:from-slate-700 dark:to-slate-800 dark:ring-white/10"
              onClick={handleProfileClick}
            >
              {confession.profile?.avatar_url ? (
                <Image
                  src={confession.profile.avatar_url}
                  alt={confession.profile.display_name}
                  fill
                  sizes="56px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-100 to-orange-100 dark:from-pink-500/20 dark:to-orange-500/20">
                  <span className="text-lg font-black text-rose-500 dark:text-rose-200">
                    {confession.profile?.display_name?.[0] || 'U'}
                  </span>
                </div>
              )}
            </div>
          )}
          <div>
            <h3 
              className="cursor-pointer text-base font-black text-slate-950 transition-colors duration-300 hover:text-rose-500 dark:text-white dark:hover:text-rose-300 sm:text-lg"
              onClick={handleProfileClick}
            >
              {confession.is_anonymous ? '匿名用户' : confession.profile?.display_name || '未知用户'}
            </h3>
            <p className="mt-1 text-sm font-medium tracking-normal text-slate-500 dark:text-slate-400">
              {formattedDate}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white resize-none"
              rows={6}
              placeholder="编辑内容..."
            />
            <div className="flex gap-2">
              <motion.button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                whileHover={{ scale: isSaving ? 1 : 1.02 }}
                whileTap={{ scale: isSaving ? 1 : 0.98 }}
              >
                {isSaving ? '保存中...' : '保存'}
              </motion.button>
              <motion.button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isSaving ? 1 : 1.02 }}
                whileTap={{ scale: isSaving ? 1 : 0.98 }}
              >
                取消
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-slate-700 prose-p:leading-7 dark:prose-invert dark:text-slate-200 sm:prose-base">
            <MarkdownRenderer content={confession.content} />
          </div>
        )}
      </div>

      {confession.category && (
        <div className="mb-4">
          <button
            onClick={() => router.push(`/category/${confession.category!.id}`)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg sm:text-sm"
            style={{ 
              backgroundColor: `${confession.category.color}20` || '#f3f4f6',
              borderColor: confession.category.color || '#d1d5db',
              color: confession.category.color || '#374151'
            }}
          >
            <FolderIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{confession.category.name}</span>
          </button>
        </div>
      )}

      {confession.hashtags && confession.hashtags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {confession.hashtags.map((confessionHashtag) => (
            <button
              key={confessionHashtag.id}
              onClick={() => router.push(`/hashtag/${encodeURIComponent(confessionHashtag.hashtag!.tag.substring(1))}`)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-100 bg-rose-50/80 px-2.5 py-1 text-xs font-bold text-rose-500 transition-all duration-300 hover:scale-105 hover:bg-rose-100 hover:shadow-md dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200"
            >
              <TagIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{confessionHashtag.hashtag?.tag}</span>
            </button>
          ))}
        </div>
      )}

      {confession.images && confession.images.length > 0 && (
          <PhotoProvider>
            <div className="mb-5 grid grid-cols-1 gap-3">
              {confession.images.map((media) => (
                <div
                  key={media.id}
                  className={`group relative w-full overflow-hidden rounded-2xl border border-white/80 shadow-sm transition-all duration-500 ease-in-out dark:border-white/10 ${
                    media.file_type === 'image' ? 'aspect-[16/9]' : 'flex justify-center bg-black/95'
                  }`}
                >
                    {media.file_type === 'image' ? (
                      <PhotoView src={media.image_url}>
                        <Image
                          src={media.image_url}
                          alt="Confession image"
                          width={600}
                          height={600}
                          className="w-full h-full object-cover transition-transform duration-500 cursor-pointer group-hover:scale-110"
                          loading="lazy"
                        />
                      </PhotoView>
                    ) : media.file_type === 'video' && media.image_url ? (
                      <VideoPlayer
                        id={`${confession.id}-${media.id}`}
                        videoUrl={media.image_url}
                        className="w-full cursor-pointer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <p className="text-white text-sm">无效的视频</p>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </PhotoProvider>
        )}

      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10 sm:flex-row">
        <div className="flex items-center space-x-3 md:space-x-5">
          <LikeButton
            confessionId={confession.id}
            initialLikesCount={Math.max(0, Number(confession.likes_count) || 0)}
            initialLiked={confession.liked_by_user || false}
          />
          
          {confession.images && confession.images.length > 0 && (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {currentUserId === confession.user_id && (
                <div className="relative group">
                  <button
                    onClick={() => {
                      confession.images!.forEach((media) => {
                        handleToggleLock(media.id, !media.is_locked);
                      });
                    }}
                    className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 cursor-pointer"
                    aria-label={confession.images![0].is_locked ? '解锁所有内容' : '锁定所有内容'}
                    title={confession.images![0].is_locked ? '解锁所有内容' : '锁定所有内容'}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors duration-200 ${confession.images![0].is_locked ? 'text-blue-500' : 'text-yellow-500'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                  <span className="absolute top-full right-1/2 transform translate-x-1/2 mt-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/90 backdrop-blur-sm text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {confession.images![0].is_locked ? '解锁所有内容' : '锁定所有内容'}
                  </span>
                </div>
              )}
              
              <div className="relative group">
                <button
                  onClick={() => {
                    handleDownload(confession.images![0].id, confession.images![0]);
                  }}
                  className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 cursor-pointer"
                  aria-label="下载"
                  title="下载"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                {confession.images!.length > 1 && (
                  <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/80 backdrop-blur-sm text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    点击下载第一个媒体
                  </span>
                )}
              </div>
            </div>
          )}

        </div>

        {currentUserId && confession.user_id === currentUserId && (
          <>
            <div className="flex items-center justify-center gap-6 sm:gap-4">
              <motion.button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors duration-300"
              >
                <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-medium">删除</span>
              </motion.button>
              
              <motion.button
                onClick={handleEditClick}
                className="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors duration-300"
              >
                <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-medium">编辑</span>
              </motion.button>
            </div>
            
            {/* 自定义删除确认对话框 */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">⚠️</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">确认删除</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      确定要删除这条表白吗？此操作不可恢复。
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        if (onDelete) {
                          onDelete(confession.id);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                    >
                      确定删除
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Lock settings modal */}
            {showLockModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🔒</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{isLocking ? '锁定设置' : '解锁确认'}</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {isLocking ? '请设置或修改媒体的锁定方式' : '确认要解锁此媒体吗？'}
                    </p>
                  </div>
                  
                  {isLocking && (
                    <div className="mb-4">
                      <label className="block text-left text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        锁定类型
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="lockType"
                            value="password"
                            checked={lockType === 'password'}
                            onChange={(e) => setLockType(e.target.value as 'password')}
                            className="w-4 h-4 text-primary-600 dark:text-primary-400"
                          />
                          <span className="text-gray-700 dark:text-gray-300">密码锁</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="lockType"
                            value="user"
                            checked={lockType === 'user'}
                            onChange={(e) => setLockType(e.target.value as 'user')}
                            className="w-4 h-4 text-primary-600 dark:text-primary-400"
                          />
                          <span className="text-gray-700 dark:text-gray-300">仅用户可访问</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="lockType"
                            value="public"
                            checked={lockType === 'public'}
                            onChange={(e) => setLockType(e.target.value as 'public')}
                            className="w-4 h-4 text-primary-600 dark:text-primary-400"
                          />
                          <span className="text-gray-700 dark:text-gray-300">公开锁定（仅视觉提示）</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {isLocking && lockType === 'password' && (
                    <div className="mb-4">
                      <label className="block text-left text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        修改密码
                      </label>
                      <input
                        type="password"
                        value={lockPassword}
                        onChange={(e) => setLockPassword(e.target.value)}
                        placeholder="请输入新密码"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-all"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLockModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleLockModalSubmit}
                      className="flex-1 px-4 py-3 bg-primary-500 text-black font-bold text-lg rounded-xl hover:bg-primary-400 hover:text-black transition-all shadow-lg hover:shadow-xl focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 dark:bg-primary-400 dark:text-black dark:hover:bg-primary-300"
                    >
                      {isLocking ? '确认锁定' : '确认解锁'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Password input modal for locked media - always rendered */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🔒</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">内容已加密保护</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  请输入密码解锁下载
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-left text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  访问密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordForDownload}
                    onChange={(e) => {
                      setPasswordForDownload(e.target.value);
                      setPasswordError(''); // Clear error when user types
                    }}
                    placeholder="请输入密码"
                    className="w-full px-4 py-2 pr-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-all"
                    autoFocus
                  />
                  {/* Password visibility toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    title={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Password error message */}
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">
                    {passwordError}
                  </p>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForDownload(''); // Clear password
                    setPasswordError(''); // Clear error
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  className="flex-1 px-4 py-3 bg-primary-500 text-black font-bold text-lg rounded-xl hover:bg-primary-400 hover:text-black transition-all shadow-lg hover:shadow-xl focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 dark:bg-primary-400 dark:text-black dark:hover:bg-primary-300"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5">
        <CommentSection confessionId={confession.id} />
      </div>
      
      {/* Download Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDownloadConfirm}
        onClose={handleCancelDownload}
        onConfirm={handleConfirmDownload}
        title="确认下载"
        message="此媒体为公开锁定状态，您确定要下载吗？"
        confirmText="确认下载"
        cancelText="取消"
        confirmColor="green"
      />

    </motion.article>
  );
}

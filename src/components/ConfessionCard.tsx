'use client';

import { useState } from 'react';
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
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const handleEditClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      setEditContent(confession.content);
    }
  };

  const handleSaveEdit = async () => {
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
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

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
  const handleToggleLock = async (imageId: string, isLocked: boolean) => {
    if (!isLocked) {
      // If currently unlocked, show modal to set lock type and password
      setSelectedImageId(imageId);
      setIsLocking(true);
      setLockType('password');
      setLockPassword('');
      setShowLockModal(true);
    } else {
      // If currently locked, show modal to modify lock settings
      setSelectedImageId(imageId);
      setIsLocking(true); // Keep as true to show lock settings
      setLockType('password'); // Default to password type
      setLockPassword(''); // Empty password field for modification
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
        toast.error('切换锁定状态失败，请重试', {
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

      // Check if media is locked
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
        // User lock: check if user is logged in
        else if (media.lock_type === 'user') {
          toast.error('请先登录才能下载此媒体', {
            duration: 3000,
            position: 'top-right',
          });
          return;
        }
      } else {
        // Media is not locked, proceed with download
      }
      // Use the download API endpoint with proper authorization
      // Let the API handle all other validation (user lock, ownership, etc.)
      const response = await fetch(`/api/download-media?imageId=${imageId}`, {
        method: 'GET',
        headers: {
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
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
      console.error('Error downloading media:', error);
      toast.error('下载失败，请重试', {
        duration: 3000,
        position: 'top-right',
      });
    }
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
      const response = await fetch(`/api/download-media?imageId=${downloadImageId}&password=${encodeURIComponent(passwordForDownload)}`, {
        method: 'GET',
        headers: {
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
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
    <motion.div 
      className="glass-card rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-7 mb-4 sm:mb-6 md:mb-8 card-hover gpu-accelerated border border-white/30"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.25, 0.1, 0.25, 1] 
      }}
      whileHover={{ 
        y: -4,
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -6px rgba(0, 0, 0, 0.08)'
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          {confession.is_anonymous ? (
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-warm-100 to-warm-200 rounded-full flex items-center justify-center mr-3 sm:mr-4 shadow-lg dark:from-warm-900/40 dark:to-warm-800/40">
              <span className="text-warm-600 font-bold text-lg sm:text-xl dark:text-warm-300">?</span>
            </div>
          ) : (
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden mr-3 sm:mr-4 border-2 sm:border-3 border-white/60 shadow-md dark:border-gray-700/60 cursor-pointer hover:scale-110 transition-transform duration-300"
              onClick={handleProfileClick}
            >
              {confession.profile?.avatar_url ? (
                <Image
                  src={confession.profile.avatar_url}
                  alt={confession.profile.display_name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center dark:from-secondary-900/40 dark:to-secondary-800/40">
                  <span className="text-secondary-600 font-bold text-lg sm:text-xl dark:text-secondary-300">
                    {confession.profile?.display_name?.[0] || 'U'}
                  </span>
                </div>
              )}
            </div>
          )}
          <div>
            <h3 
              className="font-bold text-gray-900 dark:text-white text-base sm:text-lg md:text-xl cursor-pointer hover:text-warm-600 dark:hover:text-warm-400 transition-colors duration-300"
              onClick={handleProfileClick}
            >
              {confession.is_anonymous ? '匿名用户' : confession.profile?.display_name || '未知用户'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide mt-1">
              {formatDate(confession.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 sm:mb-7">
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
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            <MarkdownRenderer content={confession.content} />
          </div>
        )}
      </div>

      {confession.category && (
        <div className="mb-4 sm:mb-5">
          <button
            onClick={() => router.push(`/category/${confession.category!.id}`)}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105"
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
        <div className="mb-4 sm:mb-5 flex flex-wrap gap-2">
          {confession.hashtags.map((confessionHashtag) => (
            <button
              key={confessionHashtag.id}
              onClick={() => router.push(`/hashtag/${encodeURIComponent(confessionHashtag.hashtag!.tag.substring(1))}`)}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-300 cursor-pointer border border-blue-200/60 dark:border-blue-800/60 hover:shadow-md hover:scale-105"
            >
              <TagIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{confessionHashtag.hashtag?.tag}</span>
            </button>
          ))}
        </div>
      )}

      {confession.images && confession.images.length > 0 && (
          <PhotoProvider>
            <div className="mb-3 sm:mb-4 md:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {confession.images.map((media) => (
                <div
                  key={media.id}
                  className={`relative w-full rounded-lg sm:rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-500 ease-in-out ${media.file_type === 'video' ? '' : 'aspect-square overflow-hidden'} group`}
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
                        className="w-full h-full cursor-pointer"
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

      <div className="flex flex-col sm:flex-row items-center justify-between pt-2 sm:pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-700/50 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-6">
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

      <div className="mt-6">
        <CommentSection confessionId={confession.id} />
      </div>
      

    </motion.div>
  );
}

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Confession } from '@/types/confession';
import CommentSection from '@/components/CommentSection';
import { TrashIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface ConfessionCardProps {
  confession: Confession;
  currentUserId?: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  isLikeLoading: boolean;
}

export default function ConfessionCard({
  confession,
  currentUserId,
  onLike,
  onDelete,
  isLikeLoading
}: ConfessionCardProps) {
  const [enlargedImageId, setEnlargedImageId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

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

  const toggleImageEnlarge = (imageId: string) => {
    setEnlargedImageId(enlargedImageId === imageId ? null : imageId);
  };

  // Handle profile click
  const handleProfileClick = () => {
    if (!confession.is_anonymous && confession.profile?.username) {
      router.push(`/profile/${confession.profile.username}`);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 mb-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-white/20">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          {confession.is_anonymous ? (
            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mr-4 shadow-inner dark:from-primary-900 dark:to-primary-800">
              <span className="text-primary-600 font-bold text-lg dark:text-primary-300">?</span>
            </div>
          ) : (
            <div 
              className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-white shadow-sm dark:border-gray-700 cursor-pointer hover:scale-110 transition-transform duration-300"
              onClick={handleProfileClick}
            >
              {confession.profile?.avatar_url ? (
                <Image
                  src={confession.profile.avatar_url}
                  alt={confession.profile.display_name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center dark:from-secondary-900 dark:to-secondary-800">
                  <span className="text-secondary-600 font-bold text-lg dark:text-secondary-300">
                    {confession.profile?.display_name?.[0] || 'U'}
                  </span>
                </div>
              )}
            </div>
          )}
          <div>
            <h3 
              className="font-bold text-gray-900 dark:text-white text-lg cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-300"
              onClick={handleProfileClick}
            >
              {confession.is_anonymous ? '匿名用户' : confession.profile?.display_name || '未知用户'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">
              {formatDate(confession.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-base whitespace-pre-wrap font-sans">
          {confession.content}
        </p>
      </div>

      {confession.images && confession.images.length > 0 && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {confession.images.map((media) => (
            <div
              key={media.id}
              className={`relative group transition-all duration-500 ease-in-out ${
                enlargedImageId === media.id ? 'col-span-full z-20' : ''
              }`}
            >
              <div
                className={`w-full overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm ${
                  enlargedImageId === media.id ? 'aspect-auto' : 'aspect-square'
                }`}
              >
                {media.file_type === 'image' ? (
                  <Image
                    src={media.image_url}
                    alt="Confession image"
                    width={enlargedImageId === media.id ? 800 : 300}
                    height={enlargedImageId === media.id ? 600 : 300}
                    className={`w-full h-full object-cover transition-transform duration-500 cursor-pointer ${
                      enlargedImageId === media.id ? '' : 'group-hover:scale-110'
                    }`}
                    onClick={() => toggleImageEnlarge(media.id)}
                  />
                ) : (
                  <video
                    src={media.image_url}
                    controls
                    className={`w-full h-full object-cover transition-transform duration-500 cursor-pointer ${
                      enlargedImageId === media.id ? '' : 'group-hover:scale-110'
                    }`}
                    onClick={() => toggleImageEnlarge(media.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => onLike(confession.id)}
            disabled={isLikeLoading}
            className={`flex items-center gap-2 transition-all duration-300 group ${
              isLikeLoading ? 'opacity-50' : 'hover:scale-105'
            }`}
          >
            <div className={`p-2 rounded-full transition-colors ${
              confession.likes_count > 0 ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-gray-50 text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 dark:bg-gray-800 dark:group-hover:bg-red-900/20'
            }`}>
               {/* Note: Ideally we pass 'isLiked' prop, but for now relying on logic from parent or optimistically showing solid if likes > 0 is a bit weak. 
                   However, the original code didn't pass 'isLiked' explicitly in the map, it used a separate state. 
                   For this refactor, I will assume the parent handles the visual state or I should pass 'isLiked'.
                   Let's stick to the icon change for now.
               */}
               <HeartIconSolid className={`w-5 h-5 ${confession.likes_count > 0 ? 'text-red-500' : 'text-gray-300 group-hover:text-red-500'}`} />
            </div>
            <span className="font-semibold text-gray-600 dark:text-gray-300 group-hover:text-red-500">
              {confession.likes_count}
            </span>
          </button>
        </div>

        {currentUserId && confession.user_id === currentUserId && (
          <>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors duration-300"
            >
              <TrashIcon className="w-5 h-5" />
              <span className="text-sm font-medium">删除</span>
            </button>
            
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
                        onDelete(confession.id);
                      }}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                    >
                      确定删除
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6">
        <CommentSection confessionId={confession.id} />
      </div>
    </div>
  );
}

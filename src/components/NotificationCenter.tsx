'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Notification } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BellIcon, 
  XMarkIcon, 
  HeartIcon, 
  UsersIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const notificationRef = useRef<HTMLDivElement>(null);

  // 获取通知
  const fetchNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications?user_id=${user.id}&limit=20&offset=${(pageNum - 1) * 20}`);
      const data = await response.json();
      
      if (response.ok) {
        if (append) {
          setNotifications(prev => [...prev, ...(data.notifications || [])]);
        } else {
          setNotifications(data.notifications || []);
        }
        setUnreadCount(data.unreadCount || 0);
        
        // 如果返回的通知数量少于20，说明没有更多数据了
        setHasMore((data.notifications || []).length >= 20);
      } else {
        console.error('Error fetching notifications:', data.error);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 标记通知为已读
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });
      
      if (response.ok) {
        // 更新本地状态
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read_status: true }
              : notif
          )
        );
        
        // 减少未读数量
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        const data = await response.json();
        console.error('Error marking notification as read:', data.error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // 标记所有通知为已读
  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications?user_id=${user.id}`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        // 更新本地状态
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read_status: true }))
        );
        setUnreadCount(0);
      } else {
        const data = await response.json();
        console.error('Error marking all notifications as read:', data.error);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // 处理通知点击
  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    if (!notification.read_status) {
      markAsRead(notification.id);
    }
    
    // 根据通知类型导航到相应页面
    if (notification.type === 'group_invite') {
      // 导航到群聊页面
      window.location.href = `/chat/group/${notification.group_id}`;
    } else if (notification.type === 'friend_request' || notification.type === 'friend_accepted' || notification.type === 'friend_rejected' || notification.type === 'friend_request_sent') {
      // 导航到好友请求页面
      window.location.href = `/profile/friends`;
    }
    
    // 关闭通知中心
    onClose();
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
      case 'friend_rejected':
      case 'friend_request_sent':
        return <HeartIcon className="w-5 h-5 text-red-500" />;
      case 'group_invite':
        return <UsersIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  // 加载更多通知
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage, true);
    }
  };

  // 点击外部关闭
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setPage(1);
      fetchNotifications(1, false);
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, fetchNotifications, handleClickOutside]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="absolute left-0 top-full mt-2 w-[95vw] max-w-80 max-h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
        ref={notificationRef}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BellIcon className="w-5 h-5" />
            通知
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                全部已读
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-80">
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              暂无通知
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    !notification.read_status ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.sender_profile?.avatar_url ? (
                        <Image
                          src={notification.sender_profile.avatar_url}
                          alt={notification.sender_profile.display_name}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {notification.sender_profile?.display_name?.[0] || 'U'}
                          </span>
                        </div>
                      )}
                      {!notification.read_status && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-2 text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
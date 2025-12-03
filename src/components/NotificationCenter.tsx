'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Notification } from '@/types/chat';
import { BellIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { chatService } from '@/services/chatService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: () => void;
}

export default function NotificationCenter({ isOpen, onClose, onNotificationClick }: NotificationCenterProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const notifications = await chatService.getNotifications();
      setNotifications(notifications);
      
      // 计算未读通知数量
      const count = notifications.filter(n => !n.read_status).length;
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 初始加载通知
  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user, fetchNotifications]);

  // 监听通知变化
  useEffect(() => {
    if (!user) return;

    // 创建Realtime通道监听通知变化
    const channel = supabase.channel('user-notifications');

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // 新通知
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        } else if (payload.eventType === 'UPDATE') {
          // 更新通知状态
          setNotifications(prev => prev.map(notification => 
            notification.id === payload.new.id ? payload.new as Notification : notification
          ));
          
          // 更新未读计数
          const updatedUnreadCount = notifications.filter(n => !n.read_status).length;
          setUnreadCount(updatedUnreadCount);
        } else if (payload.eventType === 'DELETE') {
          // 删除通知
          setNotifications(prev => prev.filter(notification => notification.id !== payload.old?.id));
          
          // 更新未读计数
          const updatedUnreadCount = notifications.filter(n => !n.read_status).length;
          setUnreadCount(updatedUnreadCount);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, notifications]);

  // 标记通知为已读
  const markAsRead = async (notificationId: string) => {
    try {
      const updatedNotification = await chatService.markNotificationAsRead(notificationId);
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId ? updatedNotification : notification
      ));
      setUnreadCount(prev => Math.max(prev - 1, 0));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 标记所有通知为已读
  const markAllAsRead = async () => {
    try {
      await chatService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(notification => ({ ...notification, read_status: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // 删除通知
  const deleteNotification = async (notificationId: string) => {
    try {
      await chatService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
      
      // 更新未读计数
      const updatedUnreadCount = notifications.filter(n => !n.read_status).length;
      setUnreadCount(updatedUnreadCount);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // 处理通知点击
  const handleNotificationClick = (notification: Notification) => {
    // 如果通知未读，标记为已读
    if (!notification.read_status) {
      markAsRead(notification.id);
    }
    
    // 根据通知类型导航到相应页面
    switch (notification.type) {
      case 'friend_request':
        router.push('/friends/requests');
        break;
      case 'friend_accepted':
        router.push('/chat');
        break;
      case 'group_invite':
        router.push('/chat/groups');
        break;
      default:
        break;
    }
    
    if (onNotificationClick) {
      onNotificationClick();
    }
    onClose();
  };

  // 获取通知类型的图标和颜色
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return { icon: <ClockIcon className="w-5 h-5" />, color: 'text-blue-500', bgColor: 'bg-blue-100' };
      case 'friend_accepted':
        return { icon: <CheckCircleIcon className="w-5 h-5" />, color: 'text-green-500', bgColor: 'bg-green-100' };
      case 'friend_rejected':
        return { icon: <XCircleIcon className="w-5 h-5" />, color: 'text-red-500', bgColor: 'bg-red-100' };
      case 'group_invite':
        return { icon: <BellIcon className="w-5 h-5" />, color: 'text-purple-500', bgColor: 'bg-purple-100' };
      default:
        return { icon: <BellIcon className="w-5 h-5" />, color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-end">
      {/* 点击外部关闭 */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* 通知中心 */}
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-l-xl shadow-2xl h-full overflow-hidden flex flex-col">
        {/* 通知中心头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <BellIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">通知中心</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                全部已读
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="关闭"
            >
              <XCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* 通知列表 */}
        <div className="flex-grow overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">暂无通知</h3>
              <p className="text-gray-500 dark:text-gray-400">当有新的好友请求或通知时，这里会显示</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const iconProps = getNotificationIcon(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                      notification.read_status
                        ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        : 'border-primary-200 bg-primary-50 dark:border-primary-900/50 dark:bg-primary-900/10'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${iconProps.bgColor} ${iconProps.color}`}>
                        {iconProps.icon}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                          {notification.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(notification.created_at).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          
                          <div className="flex gap-1">
                            {!notification.read_status && (
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1 hover:text-red-500 transition-colors"
                              aria-label="删除通知"
                            >
                              <XCircleIcon className="w-4 h-4 text-gray-400 hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

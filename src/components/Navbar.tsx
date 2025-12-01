'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HomeIcon, UserIcon, ArrowLeftOnRectangleIcon, UserPlusIcon, MoonIcon, SunIcon, BellIcon, TrashIcon } from '@heroicons/react/20/solid';
import { MessageCircleIcon } from 'lucide-react';
import { chatService } from '@/services/chatService';
import { Notification } from '@/types/chat';
import { useRouter } from 'next/navigation';
import Alert from './Alert';
import { supabase } from '@/lib/supabase/client';

const Navbar: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  // 跟踪已处理的好友请求ID，防止重复点击
  const [processedRequests, setProcessedRequests] = useState<Set<string>>(new Set());
  // 未读消息数量
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // 确保组件在客户端 hydration 完成后再渲染主题相关内容
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingNotifications(true);
      const fetchedNotifications = await chatService.getNotifications();
      setNotifications(fetchedNotifications);
    } catch (error) {
      // 正确处理错误对象，显示详细错误信息
      console.error('Error fetching notifications:', error instanceof Error ? error.message : JSON.stringify(error));
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  // 获取未读消息数量
  const fetchUnreadMessageCount = async () => {
    if (!user) return;
    
    try {
      const { data: unreadMessages, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error fetching unread messages:', error);
        return;
      }
      
      setUnreadMessageCount(unreadMessages?.length || 0);
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  };

  // 初始获取未读消息数量
  useEffect(() => {
    if (!user) return;
    fetchUnreadMessageCount();
  }, [user]);

  // 实时订阅通知和未读消息
  useEffect(() => {
    if (!user) return;
    
    // 初始获取通知
    fetchNotifications();
    
    // 订阅新通知
    const subscription = chatService.subscribeToNotifications(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });
    
    // 订阅未读消息变化 - 简化过滤条件，确保能收到所有相关事件
    const messageChannel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件类型
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}` // 只过滤当前用户接收的消息
        },
        () => {
          fetchUnreadMessageCount();
        }
      )
      .subscribe();
    
    // 清理订阅
    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(messageChannel);
    };
  }, [user, fetchNotifications]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 切换通知列表显示状态
  const toggleNotifications = () => {
    if (!user) {
      // 用户未登录，显示自定义Alert
      setShowAlert(true);
      return;
    }
    setShowNotifications(!showNotifications);
  };

  // 处理Alert确认
  const handleAlertConfirm = () => {
    // 跳转到登录页面
    router.push('/auth/login');
    // 关闭Alert
    setShowAlert(false);
  };

  // 标记所有通知为已读
  const markAllAsRead = async () => {
    try {
      await chatService.markAllNotificationsAsRead();
      // 更新本地状态
      setNotifications(prev => prev.map(notification => ({ ...notification, read_status: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // 标记单个通知为已读
  const markAsRead = async (notificationId: string) => {
    try {
      await chatService.markNotificationAsRead(notificationId);
      // 更新本地状态
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId ? { ...notification, read_status: true } : notification
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // 删除通知
  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatService.deleteNotification(notificationId);
      // 更新本地状态，移除已删除的通知
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // 计算未读通知数量
  const unreadCount = notifications.filter(notification => !notification.read_status).length;

  return (
    <>
      <nav className="sticky top-4 z-50 mx-4 mt-4 rounded-2xl glass shadow-lg transition-all duration-300 dark:bg-gray-900/80 dark:shadow-gray-900/50 backdrop-blur-md border border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {/* 消息通知按钮 */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100/50 hover:bg-white transition-all duration-200 transform hover:scale-110 dark:bg-gray-700/50 dark:hover:bg-gray-600 backdrop-blur-sm relative"
                  aria-label="查看通知"
                >
                  <BellIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  {/* 动态通知数量指示器 */}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {/* 通知列表 */}
                {showNotifications && (
                  <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white">通知</h3>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          加载中...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          暂无通知
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${!notification.read_status ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            onClick={() => !notification.read_status && markAsRead(notification.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <BellIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900 dark:text-white">
                                  {notification.content}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {new Date(notification.created_at).toLocaleString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                {!notification.read_status && (
                                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                                )}
                                <button
                                  onClick={(e) => deleteNotification(notification.id, e)}
                                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 flex-shrink-0"
                                  aria-label="删除通知"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {/* 好友请求操作按钮 */}
                            {notification.type === 'friend_request' && notification.friend_request_id && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // 检查是否已经处理过该请求
                                    if (processedRequests.has(notification.friend_request_id!)) {
                                      return;
                                    }
                                    
                                    // 将请求标记为已处理
                                    setProcessedRequests(prev => new Set(prev).add(notification.friend_request_id!));
                                    
                                    try {
                                      await chatService.handleFriendRequest(notification.friend_request_id!, 'accepted');
                                      // 更新通知内容
                                      await markAsRead(notification.id);
                                    } catch (error) {
                                      console.error('Error accepting friend request:', error);
                                      // 如果处理失败，从已处理集合中移除
                                      setProcessedRequests(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(notification.friend_request_id!);
                                        return newSet;
                                      });
                                    }
                                  }}
                                  className="flex-1 px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                                  disabled={processedRequests.has(notification.friend_request_id!)}
                                >
                                  接受
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // 检查是否已经处理过该请求
                                    if (processedRequests.has(notification.friend_request_id!)) {
                                      return;
                                    }
                                    
                                    // 将请求标记为已处理
                                    setProcessedRequests(prev => new Set(prev).add(notification.friend_request_id!));
                                    
                                    try {
                                      await chatService.handleFriendRequest(notification.friend_request_id!, 'rejected');
                                      // 更新通知内容
                                      await markAsRead(notification.id);
                                    } catch (error) {
                                      console.error('Error rejecting friend request:', error);
                                      // 如果处理失败，从已处理集合中移除
                                      setProcessedRequests(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(notification.friend_request_id!);
                                        return newSet;
                                      });
                                    }
                                  }}
                                  className="flex-1 px-3 py-1 text-xs bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors duration-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                                  disabled={processedRequests.has(notification.friend_request_id!)}
                                >
                                  拒绝
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={markAllAsRead}
                        className="w-full text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                      >
                        标记所有为已读
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex items-center">
                <Link 
                    href="/" 
                    className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                  >
                  <HomeIcon className="w-6 h-6 text-primary-500" />
                  表白墙
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              {/* 主题切换按钮 */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100/50 hover:bg-white transition-all duration-200 transform hover:scale-110 dark:bg-gray-700/50 dark:hover:bg-gray-600 backdrop-blur-sm"
                aria-label={isHydrated ? (isDarkMode ? '切换到浅色模式' : '切换到深色模式') : '切换到深色模式'}
              >
                {/* 使用 isHydrated 确保客户端和服务器渲染一致 */}
                {isHydrated ? (
                  isDarkMode ? (
                    <SunIcon className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <MoonIcon className="w-5 h-5 text-primary-600" />
                  )
                ) : (
                  /* 服务器渲染时默认显示 MoonIcon，与初始 isDarkMode=false 匹配 */
                  <MoonIcon className="w-5 h-5 text-primary-600" />
                )}
              </button>
              
              {user ? (
                <div className="ml-4 flex items-center md:ml-6 gap-3">
                  <Link
                    href="/"
                    className="flex items-center gap-1 text-gray-700 hover:text-primary-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-primary-400"
                  >
                    <HomeIcon className="w-5 h-5" />
                    <span className="hidden md:inline">表白墙</span>
                  </Link>
                  <Link
                    href="/chat"
                    className="flex items-center gap-1 text-gray-700 hover:text-primary-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-primary-400 relative"
                  >
                    <MessageCircleIcon className="w-5 h-5" />
                    <span className="hidden md:inline">聊天</span>
                    {/* 未读消息提示红点 */}
                    {unreadMessageCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md">
                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-1 text-gray-700 hover:text-primary-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-primary-400"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span className="hidden md:inline">个人资料</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex items-center gap-1 bg-white/50 hover:bg-white text-gray-800 font-medium py-2 px-4 rounded-xl shadow-sm transition-all duration-200 transform hover:scale-105 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-200 border border-gray-100 dark:border-gray-600"
                  >
                    {loading ? '...' : (
                      <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="ml-4 flex items-center space-x-3">
                  <Link
                    href="/auth/login"
                    className="hidden sm:flex items-center gap-1 text-gray-700 hover:text-primary-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-primary-400"
                  >
                    登录
                  </Link>
                  <Link
                    href="/auth/register"
                    className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all duration-200 transform hover:scale-105 hover:-translate-y-0.5"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {/* 登录提示Alert */}
      <Alert
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        onConfirm={handleAlertConfirm}
        title="请先登录"
        message="您需要登录才能查看通知"
        confirmText="去登录"
        cancelText="取消"
      />
    </>
  );
};

export default Navbar;

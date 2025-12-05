'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HomeIcon, UserIcon, ArrowLeftOnRectangleIcon, UserPlusIcon, MoonIcon, SunIcon, BellIcon, TrashIcon, VideoCameraIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';
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
  // 确认弹窗状态
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // 存储要跳转的URL
  const [targetUrl, setTargetUrl] = useState('');
  // 浏览器窗口模态框状态
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  // 浏览器窗口大小状态
  const [browserModalMaximized, setBrowserModalMaximized] = useState(false);
  // iframe ref 用于控制前进后退刷新
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // 浏览器导航状态
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  // 浏览器窗口类型（电脑/手机）
  const [browserType, setBrowserType] = useState<'desktop' | 'mobile'>('desktop');

  // 检测屏幕尺寸并设置浏览器类型
  const checkScreenSize = () => {
    const width = window.innerWidth;
    const isMobile = width < 768;
    // 根据屏幕尺寸自动切换浏览器类型
    if (isMobile) {
      setBrowserType('mobile');
    } else {
      setBrowserType('desktop');
    }
  };

  // 初始化和监听屏幕尺寸变化
  useEffect(() => {
    setIsHydrated(true);
    // 初始检测
    checkScreenSize();
    // 监听窗口大小变化
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // 手动切换浏览器类型
  const toggleBrowserType = () => {
    setBrowserType(prev => prev === 'desktop' ? 'mobile' : 'desktop');
  };

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

  // 获取未读消息数量（包括私聊和群聊）
  const fetchUnreadMessageCount = useCallback(async () => {
    if (!user) return;
    
    try {
      // 1. 获取私聊未读消息数量
      const { data: privateUnreadMessages, error: privateError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      
      if (privateError) {
        console.error('Error fetching private unread messages:', privateError);
        return;
      }
      
      const privateCount = privateUnreadMessages?.length || 0;
      
      // 2. 获取群聊未读消息数量
      // 先获取用户所在的所有群聊ID
      const { data: groupMemberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      
      if (membershipError) {
        console.error('Error fetching group memberships:', membershipError);
        return;
      }
      
      let groupCount = 0;
      if (groupMemberships && groupMemberships.length > 0) {
        // 获取所有群聊ID
        const groupIds = groupMemberships.map(membership => membership.group_id);
        
        // 查询群聊未读消息数量
        const { data: groupUnreadMessages, error: groupError } = await supabase
          .from('group_message_read_status')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .in('group_id', groupIds);
        
        if (groupError) {
          console.error('Error fetching group unread messages:', groupError);
          return;
        }
        
        groupCount = groupUnreadMessages?.length || 0;
      }
      
      // 总未读消息数量 = 私聊未读消息数量 + 群聊未读消息数量
      const totalUnreadCount = privateCount + groupCount;
      setUnreadMessageCount(totalUnreadCount);
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  }, [user]);

  // 初始获取未读消息数量
  useEffect(() => {
    if (!user) return;
    fetchUnreadMessageCount();
  }, [user, fetchUnreadMessageCount]);

  // 实时订阅通知和未读消息
  useEffect(() => {
    if (!user) return;
    
    // 初始获取通知
    fetchNotifications();
    
    // 订阅新通知
    const subscription = chatService.subscribeToNotifications(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });
    
    // 订阅未读消息变化
    const messageChannel = supabase
      .channel('unread-messages')
      // 监听私聊消息变化
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件类型
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id.eq.${user.id}`
        },
        () => {
          fetchUnreadMessageCount();
        }
      )
      // 监听群聊消息未读状态变化
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件类型
          schema: 'public',
          table: 'group_message_read_status',
          filter: `user_id.eq.${user.id}`
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
  }, [user, fetchNotifications, fetchUnreadMessageCount]);

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

  // 处理视频/音乐按钮点击，显示确认弹窗
  const handleMediaButtonClick = (url: string) => {
    setTargetUrl(url);
    setShowConfirmModal(true);
  };

  // 处理确认跳转
  const handleConfirmRedirect = () => {
    setShowConfirmModal(false);
    setShowBrowserModal(true);
  };

  // 处理取消跳转
  const handleCancelRedirect = () => {
    setShowConfirmModal(false);
    setTargetUrl('');
  };

  // 处理关闭浏览器模态窗口
  const handleCloseBrowserModal = () => {
    setShowBrowserModal(false);
    setTargetUrl('');
    setBrowserModalMaximized(false);
  };

  // 处理切换浏览器模态窗口大小
  const handleToggleMaximize = () => {
    setBrowserModalMaximized(!browserModalMaximized);
  };

  // 浏览器导航功能 - 注意：跨域iframe无法直接访问history对象，所以仅保留刷新功能
  const handleGoBack = () => {
    // 跨域iframe无法访问history.back()，忽略此操作

  };

  const handleGoForward = () => {
    // 跨域iframe无法访问history.forward()，忽略此操作

  };

  const handleRefresh = () => {
    // 刷新功能仍然可用，因为它使用iframe的src属性重新加载
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = currentSrc;
    }
  };

  // 监听iframe加载事件，更新导航状态
  const handleIframeLoad = () => {
    // 跨域iframe无法访问history对象，所以固定导航状态
    setCanGoBack(false);
    setCanGoForward(false);
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
                <motion.button
                  onClick={toggleNotifications}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100/50 hover:bg-white transition-all duration-200 transform hover:scale-110 dark:bg-gray-700/50 dark:hover:bg-gray-600 backdrop-blur-sm relative"
                  aria-label="查看通知"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <BellIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  {/* 动态通知数量指示器 */}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </motion.button>
                
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
                            
                            {/* 群聊邀请操作按钮 */}
                            {notification.type === 'group_invite' && notification.group_id && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // 检查是否已经处理过该请求
                                    if (processedRequests.has(notification.id)) {
                                      return;
                                    }
                                    
                                    // 将请求标记为已处理
                                    setProcessedRequests(prev => new Set(prev).add(notification.id));
                                    
                                    try {
                                      // 接受群聊邀请
                                      // 这里需要实现接受群聊邀请的逻辑
                                      // 由于群聊邀请已经直接添加了用户到群成员列表，所以只需要标记通知为已读
                                      await markAsRead(notification.id);
                                      // 可以添加额外的成功提示

                                    } catch (error) {
                                      console.error('Error accepting group invite:', error);
                                      // 如果处理失败，从已处理集合中移除
                                      setProcessedRequests(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(notification.id);
                                        return newSet;
                                      });
                                    }
                                  }}
                                  className="flex-1 px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                                  disabled={processedRequests.has(notification.id)}
                                >
                                  接受
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // 检查是否已经处理过该请求
                                    if (processedRequests.has(notification.id)) {
                                      return;
                                    }
                                    
                                    // 将请求标记为已处理
                                    setProcessedRequests(prev => new Set(prev).add(notification.id));
                                    
                                    try {
                                      // 拒绝群聊邀请
                                      // 从群成员列表中移除当前用户
                                      await chatService.leaveGroup(notification.group_id!);
                                      // 标记通知为已读
                                      await markAsRead(notification.id);
                                      // 可以添加额外的成功提示

                                    } catch (error) {
                                      console.error('Error rejecting group invite:', error);
                                      // 如果处理失败，从已处理集合中移除
                                      setProcessedRequests(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(notification.id);
                                        return newSet;
                                      });
                                    }
                                  }}
                                  className="flex-1 px-3 py-1 text-xs bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors duration-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                                  disabled={processedRequests.has(notification.id)}
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
            <div className="flex items-center gap-2">
              {/* 主题切换按钮 */}
              <motion.button
                onClick={toggleTheme}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100/50 hover:bg-white transition-all duration-200 transform hover:scale-110 dark:bg-gray-700/50 dark:hover:bg-gray-600 backdrop-blur-sm"
                aria-label={isHydrated ? (isDarkMode ? '切换到浅色模式' : '切换到深色模式') : '切换到深色模式'}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* 使用 isHydrated 确保客户端和服务器渲染一致 */}
                {isHydrated ? (
                  isDarkMode ? (
                    <SunIcon className="w-6 h-6 text-yellow-500" />
                  ) : (
                    <MoonIcon className="w-6 h-6 text-primary-600" />
                  )
                ) : (
                  /* 服务器渲染时默认显示 MoonIcon，与初始 isDarkMode=false 匹配 */
                  <MoonIcon className="w-6 h-6 text-primary-600" />
                )}
              </motion.button>
              
              {/* 视频图标按钮 */}
              <button
                className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100/50 hover:bg-white transition-all duration-200 transform hover:scale-110 dark:bg-gray-700/50 dark:hover:bg-gray-600 backdrop-blur-sm"
                aria-label="视频"
                onClick={() => handleMediaButtonClick('https://alist.suchuanli.me:1234')}
              >
                <VideoCameraIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </button>
              
              {/* 音乐图标按钮 */}
              <button
                className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100/50 hover:bg-white transition-all duration-200 transform hover:scale-110 dark:bg-gray-700/50 dark:hover:bg-gray-600 backdrop-blur-sm"
                aria-label="音乐"
                onClick={() => handleMediaButtonClick('https://solara.suchuanli.me:2340')}
              >
                <MusicalNoteIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </button>
              
              {/* 在认证状态加载中时，保持布局稳定，不显示具体的登录/未登录内容 */}
              {loading ? (
                <div className="ml-4 flex items-center md:ml-6 gap-3">
                  {/* 显示占位符，保持布局一致 */}
                  <div className="w-16 h-8 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  <div className="w-16 h-8 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  <div className="w-16 h-8 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  <div className="w-16 h-8 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                </div>
              ) : user ? (
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
                    className="hidden sm:flex items-center justify-center gap-1 bg-white/50 hover:bg-white text-gray-800 font-medium py-2 px-4 sm:px-4 rounded-xl shadow-sm transition-all duration-200 transform hover:scale-105 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-200 border border-gray-100 dark:border-gray-600 min-w-12 min-h-12"
                    aria-label="退出登录"
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
      
      {/* IPv6支持提示弹窗 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">提示</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">当前网站只支持IPv6，您确定要继续访问吗？</p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelRedirect}
                className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors duration-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRedirect}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 浏览器窗口模态框 */}
      {showBrowserModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          {/* 电脑模式浏览器窗口 */}
          {browserType === 'desktop' && (
            <div 
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out transform ${browserModalMaximized ? 'w-full h-full' : 'w-[80%] h-[70%] max-w-7xl max-h-[80vh]'}`}
            >
              {/* 浏览器窗口标题栏 */}
              <div className="flex flex-col bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                {/* 窗口控制和URL栏 */}
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{targetUrl}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 最大化/最小化按钮 */}
                    <button
                      onClick={handleToggleMaximize}
                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                      aria-label={browserModalMaximized ? "最小化" : "最大化"}
                    >
                      {browserModalMaximized ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                        </svg>
                      )}
                    </button>
                    {/* 关闭按钮 */}
                    <button
                      onClick={handleCloseBrowserModal}
                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                      aria-label="关闭"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* 导航按钮栏 */}
                <div className="flex items-center gap-1 px-4 pb-2">
                  <button
                    onClick={handleGoBack}
                    disabled={!canGoBack}
                    className={`p-1.5 rounded-lg transition-colors duration-200 ${canGoBack ? 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300' : 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'}`}
                    aria-label="后退"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={handleGoForward}
                    disabled={!canGoForward}
                    className={`p-1.5 rounded-lg transition-colors duration-200 ${canGoForward ? 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300' : 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'}`}
                    aria-label="前进"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-gray-600 dark:text-gray-300"
                    aria-label="刷新"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                  </button>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  {/* 切换浏览器类型按钮 */}
                  <button
                    onClick={toggleBrowserType}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-gray-600 dark:text-gray-300"
                    aria-label={`切换到${browserType === 'desktop' ? '手机' : '电脑'}模式`}
                  >
                    {browserType === 'desktop' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <path d="M12 18h.01"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                        <line x1="8" y1="2" x2="16" y2="2"></line>
                        <line x1="12" y1="6" x2="12" y2="6"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* 浏览器窗口内容区域 - iframe */}
              <div className="w-full h-[calc(100%-72px)]">
                <iframe 
                  ref={iframeRef}
                  src={targetUrl} 
                  className="w-full h-full border-0"
                  title="External Website"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  onLoad={handleIframeLoad}
                />
              </div>
            </div>
          )}
          
          {/* 手机模式浏览器窗口 */}
          {browserType === 'mobile' && (
            <div 
              className={`bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out transform ${browserModalMaximized ? 'w-full h-full' : 'w-[375px] max-w-full h-[812px]'}`}
              style={{ aspectRatio: '9/19.5' }}
            >
              {/* 手机顶部状态栏 */}
              <div className="bg-gray-900 text-white h-6 flex items-center justify-between px-4 text-xs">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>
              
              {/* 浏览器窗口标题栏 */}
              <div className="flex flex-col bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                {/* 窗口控制和URL栏 */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[180px]">{targetUrl}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* 关闭按钮 */}
                    <button
                      onClick={handleCloseBrowserModal}
                      className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                      aria-label="关闭"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* 导航按钮栏 */}
                <div className="flex items-center gap-1 px-3 pb-2">
                  <button
                    onClick={handleGoBack}
                    disabled={!canGoBack}
                    className={`p-1.5 rounded-lg transition-colors duration-200 ${canGoBack ? 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300' : 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'}`}
                    aria-label="后退"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={handleGoForward}
                    disabled={!canGoForward}
                    className={`p-1.5 rounded-lg transition-colors duration-200 ${canGoForward ? 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300' : 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'}`}
                    aria-label="前进"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-gray-600 dark:text-gray-300"
                    aria-label="刷新"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                  </button>
                  <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  {/* 切换浏览器类型按钮 */}
                  <button
                    onClick={toggleBrowserType}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-gray-600 dark:text-gray-300"
                    aria-label="切换到电脑模式"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                      <line x1="8" y1="2" x2="16" y2="2"></line>
                      <line x1="12" y1="6" x2="12" y2="6"></line>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* 浏览器窗口内容区域 - iframe */}
              <div className="w-full h-[calc(100%-76px)]">
                <iframe 
                  ref={iframeRef}
                  src={targetUrl} 
                  className="w-full h-full border-0"
                  title="External Website"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  onLoad={handleIframeLoad}
                />
              </div>
              
              {/* 手机底部导航栏 */}
              <div className="bg-gray-100 dark:bg-gray-700 h-10 flex items-center justify-center border-t border-gray-200 dark:border-gray-600">
                <div className="w-20 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Navbar;

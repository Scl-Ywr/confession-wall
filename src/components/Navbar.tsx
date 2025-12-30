'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { useChat } from '@/context/ChatContext';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { HomeIcon, UserIcon, ArrowLeftOnRectangleIcon, UserPlusIcon, UsersIcon, MoonIcon, SunIcon, BellIcon, VideoCameraIcon, MusicalNoteIcon, XMarkIcon, PaintBrushIcon, HeartIcon } from '@heroicons/react/20/solid';
import { MessageCircleIcon } from 'lucide-react';
import { chatService } from '@/services/chatService';
import { Notification } from '@/types/chat';
import { useRouter } from 'next/navigation';
import Alert from './Alert';
import { NotificationCenter } from './NotificationCenter';
import { themes } from '@/theme/themes';

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const { theme, setTheme, isDarkMode, toggleTheme } = useTheme();
  const { totalUnreadCount } = useChat();
  const router = useRouter();
  const { isMobile } = useDeviceDetection();
  const [isHydrated, setIsHydrated] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [browserModalMaximized, setBrowserModalMaximized] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
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

  // 监听屏幕尺寸变化
  useEffect(() => {
    // 监听窗口大小变化
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // 使用useEffect在客户端渲染后设置isHydrated
  useEffect(() => {
    // 在客户端渲染完成后设置isHydrated为true
    const timer = setTimeout(() => {
      setIsHydrated(true);
      checkScreenSize();
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  // 手动切换浏览器类型
  const toggleBrowserType = () => {
    setBrowserType(prev => prev === 'desktop' ? 'mobile' : 'desktop');
  };

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const fetchedNotifications = await chatService.getNotifications();
      setNotifications(fetchedNotifications);
    } catch (error) {
      // 正确处理错误对象，显示详细错误信息
      console.error('Error fetching notifications:', error instanceof Error ? error.message : JSON.stringify(error));
    }
  }, [user]);

  // 实时订阅通知 - 延迟执行，优先渲染UI
  useEffect(() => {
    if (!user) return;
    
    // 延迟2秒执行，让UI先渲染完成
    const timer = setTimeout(() => {
      // 初始获取通知
      fetchNotifications();
      
      // 订阅新通知
      const subscription = chatService.subscribeToNotifications(user.id, (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
      });
      
      // 清理订阅
      return () => {
        subscription.unsubscribe();
      };
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user, fetchNotifications]);

  const handleLogout = async () => {
    try {
      await logout({ 
        redirect: true, 
        redirectUrl: '/' // 确保登出后返回首页
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 切换通知列表显示状态
  const toggleNotifications = async () => {
    if (!user) {
      // 用户未登录，显示自定义Alert
      setShowAlert(true);
      return;
    }
    
    // 如果当前是关闭状态，则打开并获取通知
    if (!showNotifications && !showMobileNotifications) {
      if (isMobile) {
        setShowMobileNotifications(true);
      } else {
        setShowNotifications(true);
      }
      // 打开通知列表时，获取最新通知
      await fetchNotifications();
    } else {
      // 当前是打开状态，则关闭并标记所有通知为已读
      setShowNotifications(false);
      setShowMobileNotifications(false);
      // 关闭通知列表时，标记所有通知为已读
      if (unreadCount > 0) {
        try {
          await chatService.markAllNotificationsAsRead();
          // 更新本地状态
          setNotifications(prev => prev.map(notification => ({ ...notification, read_status: true })));
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
        }
      }
    }
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
      } else {
        const data = await response.json();
        console.error('Error marking notification as read:', data.error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
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

  // 计算未读通知数量
  const unreadCount = notifications.filter(notification => !notification.read_status).length;

  return (
    <>
      <nav className="sticky top-2 sm:top-4 z-50 mx-2 sm:mx-4 mt-2 sm:mt-4 rounded-2xl sm:rounded-3xl glass shadow-2xl transition-all duration-500 backdrop-blur-xl border border-white/40" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-7">
          <div className="flex justify-between h-16 sm:h-18">
            <div className="flex items-center gap-4">
              {isMobile && (
                <motion.button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm shadow-sm hover:shadow-md"
                  style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                  aria-label="菜单"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showMobileMenu ? (
                    <XMarkIcon className="w-5.5 h-5.5" />
                  ) : (
                    <span className="text-lg">🍔</span>
                  )}
                </motion.button>
              )}
              
              <div className="flex-shrink-0 flex items-center">
                <Link 
                    href="/" 
                    className="flex items-center gap-2 text-xl sm:text-2xl font-bold hover:opacity-90 transition-opacity"
                    style={{ color: 'var(--color-primary)' }}
                  >
                  <HomeIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                  <span className="hidden sm:inline">表白墙</span>
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!isMobile && (
                <>
                  <div className="relative">
                    <motion.button
                      onClick={toggleNotifications}
                      className="flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm relative shadow-sm hover:shadow-md"
                      style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                      aria-label="查看通知"
                      whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                    >
                      <BellIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: 'var(--color-accent)' }}>
                          {unreadCount}
                        </span>
                      )}
                    </motion.button>
                    
                    <NotificationCenter 
                      isOpen={showNotifications} 
                      onClose={() => setShowNotifications(false)} 
                    />
                  </div>
                  
                  <motion.button
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm shadow-sm hover:shadow-md"
                    style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                    aria-label={isHydrated ? (isDarkMode ? '切换到浅色模式' : '切换到深色模式') : '切换到深色模式'}
                    whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                  >
                    {isHydrated ? (
                      isDarkMode ? (
                        <SunIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
                      ) : (
                        <MoonIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
                      )
                    ) : (
                      <MoonIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
                    )}
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setShowThemeSwitcher(!showThemeSwitcher)}
                    className="flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm shadow-sm hover:shadow-md"
                    style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                    aria-label="主题设置"
                    whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                  >
                    <PaintBrushIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
                  </motion.button>
                  
                  <Link
                    href="/"
                    className="flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm shadow-sm hover:shadow-md"
                    style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                    aria-label="主界面"
                  >
                    <HomeIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
                  </Link>
                  
                  <button
                    className="flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm shadow-sm hover:shadow-md"
                    style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                    aria-label="视频"
                    onClick={() => handleMediaButtonClick('https://alist.suchuanli.me:1234')}
                  >
                    <VideoCameraIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
                  </button>
                  
                  <button
                    className="flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm shadow-sm hover:shadow-md"
                    style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                    aria-label="音乐"
                    onClick={() => handleMediaButtonClick('https://solara.suchuanli.me:2340')}
                  >
                    <MusicalNoteIcon className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5" />
                  </button>
                </>
              )}
              
              {loading ? (
                <div className="ml-3 flex items-center md:ml-5 gap-2.5">
                  <div className="w-14 h-7 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  <div className="w-14 h-7 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  <div className="w-14 h-7 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                </div>
              ) : user ? (
                <div className="ml-3 flex items-center md:ml-5 gap-2.5">
                  <Link
                    href="/chat"
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-warm-50/70 hover:bg-warm-100 transition-all duration-300 transform hover:scale-110 dark:bg-warm-900/30 dark:hover:bg-warm-800/40 backdrop-blur-sm relative shadow-sm hover:shadow-md"
                    aria-label="聊天"
                  >
                    <MessageCircleIcon className="w-5.5 h-5.5 text-warm-600 dark:text-warm-400" />
                    {totalUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md">
                        {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-warm-50/70 hover:bg-warm-100 transition-all duration-300 transform hover:scale-110 dark:bg-warm-900/30 dark:hover:bg-warm-800/40 backdrop-blur-sm shadow-sm hover:shadow-md"
                    aria-label="个人资料"
                  >
                    <UserIcon className="w-5.5 h-5.5 text-warm-600 dark:text-warm-400" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-warm-50/70 hover:bg-warm-100 transition-all duration-300 transform hover:scale-110 dark:bg-warm-900/30 dark:hover:bg-warm-800/40 backdrop-blur-sm shadow-sm hover:shadow-md"
                    aria-label="退出登录"
                  >
                    {loading ? '...' : (
                      <ArrowLeftOnRectangleIcon className="w-5.5 h-5.5 text-warm-600 dark:text-warm-400" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="ml-3 flex items-center gap-2.5">
                  <Link
                    href="/auth/login"
                    className="hidden sm:flex items-center gap-1.5 text-gray-700 hover:text-warm-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-warm-400 px-4 py-2 rounded-xl hover:bg-warm-50/50 dark:hover:bg-warm-900/20"
                  >
                    登录
                  </Link>
                  <Link
                    href="/auth/register"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl shadow-orange-500/60"
                    aria-label="注册"
                  >
                    <UserPlusIcon className="w-6 h-6" />
                    <span>注册</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold gradient-text">菜单</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <Link
                    href="/"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-warm-50 dark:hover:bg-warm-900/20 transition-all duration-300"
                  >
                    <HomeIcon className="w-6 h-6 text-warm-600 dark:text-warm-400" />
                    <span className="text-lg font-medium text-gray-800 dark:text-white">首页</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      toggleNotifications();
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center justify-between w-full p-4 rounded-xl hover:bg-warm-50 dark:hover:bg-warm-900/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <BellIcon className="w-6 h-6 text-warm-600 dark:text-warm-400" />
                      <span className="text-lg font-medium text-gray-800 dark:text-white">通知</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowThemeSwitcher(!showThemeSwitcher);
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center justify-between w-full p-4 rounded-xl hover:bg-warm-50 dark:hover:bg-warm-900/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <PaintBrushIcon className="w-6 h-6 text-warm-600 dark:text-warm-400" />
                      <span className="text-lg font-medium text-gray-800 dark:text-white">主题设置</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleMediaButtonClick('https://alist.suchuanli.me:1234');
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-warm-50 dark:hover:bg-warm-900/20 transition-all duration-300"
                  >
                    <VideoCameraIcon className="w-6 h-6 text-warm-600 dark:text-warm-400" />
                    <span className="text-lg font-medium text-gray-800 dark:text-white">视频</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleMediaButtonClick('https://solara.suchuanli.me:2340');
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-warm-50 dark:hover:bg-warm-900/20 transition-all duration-300"
                  >
                    <MusicalNoteIcon className="w-6 h-6 text-warm-600 dark:text-warm-400" />
                    <span className="text-lg font-medium text-gray-800 dark:text-white">音乐</span>
                  </button>
                  
                  {user ? (
                    <>
                      <Link
                        href="/chat"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center justify-between w-full p-4 rounded-xl transition-all duration-300"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <div className="flex items-center gap-4">
                          <MessageCircleIcon className="w-6 h-6" />
                          <span className="text-lg font-medium">聊天</span>
                        </div>
                        {totalUnreadCount > 0 && (
                          <span className="w-6 h-6 text-white text-xs font-bold rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent)' }}>
                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                          </span>
                        )}
                      </Link>
                      
                      <Link
                        href="/profile"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <UserIcon className="w-6 h-6" />
                        <span className="text-lg font-medium">个人资料</span>
                      </Link>
                      
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowMobileMenu(false);
                        }}
                        className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 w-full"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                        <span className="text-lg font-medium">退出登录</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/login"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <span className="text-lg font-medium">登录</span>
                      </Link>
                      
                      <Link
                        href="/auth/register"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center justify-center w-full p-4 rounded-xl text-white font-medium transition-all duration-300 shadow-lg"
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        <UserPlusIcon className="w-6 h-6 mr-2" />
                        注册
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showThemeSwitcher && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowThemeSwitcher(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.3 }}
              className="fixed top-4 right-4 z-50"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 w-80"
                style={{ backgroundColor: 'var(--color-surface)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    主题设置
                  </h3>
                  <button
                    onClick={() => setShowThemeSwitcher(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      当前主题
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTheme(t.id);
                            setShowThemeSwitcher(false);
                          }}
                          className={`relative p-3 rounded-xl border-2 transition-all ${
                            theme.id === t.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="text-2xl mb-1">{t.emoji}</div>
                          <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                            {t.name}
                          </div>
                          {theme.id === t.id && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
                    {theme.description}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
      
      {/* 移动端通知模态框 */}
      {showMobileNotifications && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
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
              <button
                onClick={() => setShowMobileNotifications(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-60">
              {notifications.length === 0 ? (
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
                      onClick={() => {
                        // 标记为已读
                        if (!notification.read_status) {
                          markAsRead(notification.id);
                        }
                        
                        // 根据通知类型导航到相应页面
                        if (notification.type === 'group_invite') {
                          window.location.href = `/chat/group/${notification.group_id}`;
                        } else if (notification.type === 'friend_request' || notification.type === 'friend_accepted' || notification.type === 'friend_rejected' || notification.type === 'friend_request_sent') {
                          window.location.href = `/profile/friends`;
                        }
                        
                        // 关闭通知模态框
                        setShowMobileNotifications(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {notification.type === 'group_invite' ? (
                            <UsersIcon className="w-5 h-5 text-blue-500" />
                          ) : (
                            <HeartIcon className="w-5 h-5 text-red-500" />
                          )}
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

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={async () => {
                  if (unreadCount > 0) {
                    try {
                      await chatService.markAllNotificationsAsRead();
                      // 更新本地状态
                      setNotifications(prev => prev.map(notification => ({ ...notification, read_status: true })));
                    } catch (error) {
                      console.error('Error marking all notifications as read:', error);
                    }
                  }
                  setShowMobileNotifications(false);
                }}
                className="w-full py-2 text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {unreadCount > 0 ? '全部已读' : '关闭'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default Navbar;

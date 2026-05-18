'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { useChat } from '@/context/ChatContext';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { HomeIcon, UserIcon, ArrowRightOnRectangleIcon, UserPlusIcon, UsersIcon, BellIcon, VideoCameraIcon, MusicalNoteIcon, XMarkIcon, PaintBrushIcon, HeartIcon } from '@heroicons/react/20/solid';
import { MessageCircleIcon } from 'lucide-react';
import { chatService } from '@/services/chatService';
import { Notification } from '@/types/chat';
import { usePathname, useRouter } from 'next/navigation';
import Alert from './Alert';
import { NotificationCenter } from './NotificationCenter';
import { themes } from '@/theme/themes';
import { BackgroundCustomizer } from './BackgroundCustomizer';

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const { theme, setTheme, isDarkMode, toggleTheme } = useTheme();
  const { totalUnreadCount } = useChat();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useDeviceDetection();
  const [isHydrated, setIsHydrated] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '请先登录',
    message: '您需要登录才能查看通知',
    confirmText: '去登录',
    cancelText: '取消'
  });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [browserModalMaximized, setBrowserModalMaximized] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  const [showBackgroundCustomizer, setShowBackgroundCustomizer] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [browserType, setBrowserType] = useState<'desktop' | 'mobile'>('desktop');
  
  // 检查是否在聊天列表页面（/chat 或 /chat/search）
  const isInChatListPage = pathname === '/chat' || pathname === '/chat/search';

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
      // 用户未登录，显示通知相关的登录提示
      setAlertConfig({
        title: '请先登录',
        message: '您需要登录才能查看通知',
        confirmText: '去登录',
        cancelText: '取消'
      });
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

  // 处理视频/音乐按钮点击，直接打开浏览器模态框
  const handleMediaButtonClick = (url: string) => {
    setTargetUrl(url);
    setShowBrowserModal(true);
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
                  className="app-btn"
                  aria-label="菜单"
                  whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                >
                  {showMobileMenu ? (
                    <XMarkIcon className="w-5.5 h-5.5" />
                  ) : (
                    <span className="text-lg">🍔</span>
                  )}
                </motion.button>
              )}
              <div className="flex-shrink-0">
                <Link 
                    href="/" 
                    className="app-btn"
                    aria-label="首页"
                  >
                  <HomeIcon className="w-5.5 h-5.5" />
                </Link>
              </div>

            </div>
            
            <div className="flex items-center gap-3">
              {!isMobile && (
                <>
                  <div className="relative">
                    <motion.button
                      onClick={toggleNotifications}
                      className="app-btn"
                      aria-label="查看通知"
                      whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                    >
                      <BellIcon className="w-5.5 h-5.5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4.5 h-4.5 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: 'var(--color-accent)' }}>
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
                    className="theme-toggle"
                    id="theme-toggle-btn"
                    role="switch"
                    aria-checked={isHydrated ? isDarkMode : false}
                    aria-label={isHydrated ? (isDarkMode ? '切换到浅色模式' : '切换到深色模式') : '切换到深色模式'}
                    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                  >
                    <div className="theme-toggle__container">
                      <div className="theme-toggle__clouds"></div>
                      <div className="theme-toggle__stars">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
                          <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545Z"/>
                        </svg>
                      </div>
                      <div className="theme-toggle__sun">
                        <div className="theme-toggle__moon-mask">
                          <div className="theme-toggle__crater"></div>
                          <div className="theme-toggle__crater"></div>
                          <div className="theme-toggle__crater"></div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setShowThemeSwitcher(!showThemeSwitcher)}
                    className="app-btn"
                    aria-label="主题设置"
                    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                  >
                    <PaintBrushIcon className="w-5.5 h-5.5" />
                  </motion.button>
                  
                  <motion.button
                    onClick={() => {
                      if (!user) {
                        // 用户未登录，显示特定的背景设置登录提示
                        setAlertConfig({
                          title: '请先登录',
                          message: '您需要登录才能设置背景图片',
                          confirmText: '去登录',
                          cancelText: '取消'
                        });
                        setShowAlert(true);
                      } else {
                        // 用户已登录，打开背景自定义器
                        setShowBackgroundCustomizer(true);
                      }
                    }}
                    className="app-btn"
                    aria-label="自定义背景"
                    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </motion.button>
                  

                  
                  <button
                    className="app-btn"
                    aria-label="视频"
                    onClick={() => handleMediaButtonClick('https://alist.suchuanli.dpdns.org')}
                  >
                    <VideoCameraIcon className="w-5.5 h-5.5" />
                  </button>
                  
                  <button
                    className="app-btn"
                    aria-label="音乐"
                    onClick={() => handleMediaButtonClick('https://solara.christmas.qzz.io')}
                  >
                    <MusicalNoteIcon className="w-5.5 h-5.5" />
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
                    className="app-btn relative"
                    aria-label="聊天"
                  >
                    <MessageCircleIcon className="w-5.5 h-5.5" />
                    {totalUnreadCount > 0 && !isInChatListPage && (
                      <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md">
                        {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profile"
                    className="app-btn"
                    aria-label="个人资料"
                  >
                    <UserIcon className="w-5.5 h-5.5" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="app-btn"
                    aria-label="退出登录"
                  >
                    {loading ? '...' : (
                      <ArrowRightOnRectangleIcon className="w-5.5 h-5.5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="ml-3 flex items-center gap-2 sm:gap-2.5 h-full">
                  {/* 未登录状态按钮优化 */}
                  <Link
                    href="/auth/login"
                    className="app-btn relative flex items-center justify-center transition-all duration-300 hover:bg-primary-100/50 dark:hover:bg-primary-900/30"
                    aria-label="登录"
                  >
                    <UserIcon className="w-5.5 h-5.5" />
                  </Link>
                  <Link
                    href="/auth/register"
                    className="group relative flex items-center justify-center gap-1.5 h-12 px-3 py-2 sm:h-14 sm:px-5 sm:py-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/50 hover:shadow-xl hover:shadow-orange-500/70 overflow-hidden"
                    aria-label="注册"
                  >
                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <UserPlusIcon className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 relative z-10" />
                    <span className="relative z-10 whitespace-nowrap">注册</span>
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
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">菜单</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 rounded-full bg-white/80 hover:bg-gray-100 dark:bg-gray-700/80 dark:hover:bg-gray-600 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <Link
                    href="/"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transition-all duration-300 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                      <HomeIcon className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-medium text-gray-800 dark:text-white">首页</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      toggleNotifications();
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center justify-between w-full p-4 rounded-2xl hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transition-all duration-300 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                        <BellIcon className="w-5 h-5" />
                      </div>
                      <span className="text-lg font-medium text-gray-800 dark:text-white">通知</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  
                  <div
                    onClick={() => {
                      toggleTheme();
                      // 不关闭菜单栏，等待用户手动关闭
                    }}
                    className="flex items-center justify-between w-full p-4 rounded-2xl hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transition-all duration-300 transform hover:-translate-x-1 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="theme-toggle">
                        <div className="theme-toggle__container">
                          <div className="theme-toggle__clouds"></div>
                          <div className="theme-toggle__stars">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
                              <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545Z"/>
                            </svg>
                          </div>
                          <div className="theme-toggle__sun">
                            <div className="theme-toggle__moon-mask">
                              <div className="theme-toggle__crater"></div>
                              <div className="theme-toggle__crater"></div>
                              <div className="theme-toggle__crater"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>{isDarkMode ? '深色模式' : '浅色模式'}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowThemeSwitcher(!showThemeSwitcher);
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center justify-between w-full p-4 rounded-2xl hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transition-all duration-300 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                        <PaintBrushIcon className="w-5 h-5" />
                      </div>
                      <span className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>主题设置</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!user) {
                        // 用户未登录，显示特定的背景设置登录提示
                        setAlertConfig({
                          title: '请先登录',
                          message: '您需要登录才能设置背景图片',
                          confirmText: '去登录',
                          cancelText: '取消'
                        });
                        setShowAlert(true);
                      } else {
                        // 用户已登录，打开背景自定义器
                        setShowBackgroundCustomizer(true);
                      }
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center justify-between w-full p-4 rounded-2xl hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transition-all duration-300 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>自定义背景</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleMediaButtonClick('https://alist.suchuanli.dpdns.org');
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transition-all duration-300 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                      <VideoCameraIcon className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>视频</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleMediaButtonClick('https://solara.christmas.qzz.io');
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transition-all duration-300 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                      <MusicalNoteIcon className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>音乐</span>
                  </button>
                  
                  {user ? (
                    <>
                      <Link
                        href="/chat"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center justify-between w-full p-4 rounded-2xl transition-all duration-300 hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                            <MessageCircleIcon className="w-5 h-5" />
                          </div>
                          <span className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>聊天</span>
                        </div>
                        {totalUnreadCount > 0 && !isInChatListPage && (
                          <span className="w-7 h-7 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: 'var(--color-accent)' }}>
                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                          </span>
                        )}
                      </Link>
                      
                      <Link
                        href="/profile"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <span className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>个人资料</span>
                        </div>
                      </Link>
                      
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowMobileMenu(false);
                        }}
                        className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 w-full hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                            <ArrowRightOnRectangleIcon className="w-5 h-5" />
                          </div>
                          <span className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>退出登录</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <div className="pt-4 space-y-3">
                      <Link
                        href="/auth/login"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:bg-gradient-to-r from-orange-50 to-red-50 dark:hover:bg-gradient-to-r from-orange-900/20 to-red-900/20 transform hover:-translate-x-1 shadow-sm hover:shadow-md"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <span className="text-lg font-medium">登录</span>
                      </Link>
                      
                      <Link
                        href="/auth/register"
                        onClick={() => setShowMobileMenu(false)}
                        className="group relative flex items-center justify-center w-full gap-2 p-4 rounded-2xl text-white font-medium transition-all duration-300 shadow-xl shadow-orange-500/60 hover:shadow-2xl hover:shadow-orange-500/80 transform hover:scale-105"
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                        <UserPlusIcon className="w-6 h-6 relative z-10" />
                        <span className="text-lg font-bold relative z-10">注册</span>
                      </Link>
                    </div>
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
              <div
                className="cw-panel max-h-[calc(100vh-2rem)] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto p-5"
              >
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTheme(t.id);
                          }}
                          className="group relative min-h-[8.75rem] overflow-hidden rounded-2xl border-2 p-0 text-left transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4"
                          style={{
                            borderColor: theme.id === t.id ? t.colors.primary : 'var(--color-border)',
                            background: theme.id === t.id ? t.gradients.background : 'var(--color-surface)',
                            boxShadow: theme.id === t.id ? t.effects.glow : 'var(--effect-shadow)',
                          }}
                        >
                          <div
                            className="absolute inset-x-0 top-0 h-16 opacity-95 transition-transform duration-300 group-hover:scale-105"
                            style={{ background: t.gradients.background }}
                          />
                          <div
                            className="absolute inset-x-0 top-0 h-16 opacity-50"
                            style={{
                              backgroundImage: 'linear-gradient(rgba(255,255,255,.38) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.38) 1px, transparent 1px)',
                              backgroundSize: '18px 18px',
                            }}
                          />
                          <div className="relative flex h-full flex-col justify-end gap-2 p-3 pt-16">
                            <div className="absolute left-3 top-8 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/75 text-2xl shadow-lg backdrop-blur-md dark:bg-black/25">
                              {t.emoji}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[t.colors.primary, t.colors.secondary, t.colors.accent].map((color) => (
                                <span
                                  key={color}
                                  className="h-3 w-3 rounded-full ring-2 ring-white/70"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                              {t.name}
                            </div>
                            <div className="line-clamp-2 text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>
                              {t.description}
                            </div>
                          </div>
                          {theme.id === t.id && (
                            <div
                              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg"
                              style={{ backgroundColor: t.colors.primary }}
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
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
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
      

      
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
      
      {/* 背景自定义面板 */}
      <AnimatePresence>
        {showBackgroundCustomizer && (
          <BackgroundCustomizer
            onClose={() => setShowBackgroundCustomizer(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;

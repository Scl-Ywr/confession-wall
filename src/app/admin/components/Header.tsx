'use client';

// 后台管理系统顶部导航组件
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/lib/supabase/client';
import { getUsers, getConfessions } from '@/services/admin/adminService';

// 通知类型定义
interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// 搜索建议类型
interface SearchSuggestion {
  id: string;
  type: 'user' | 'confession' | 'chat';
  title: string;
  subtitle: string;
  icon: string;
  url: string;
}

export function AdminHeader() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  
  // 使用客户端状态管理主题图标，避免水合不匹配
  const [clientTheme, setClientTheme] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  
  // 在客户端挂载后更新主题状态
  useEffect(() => {
    setClientTheme(isDarkMode);
    setHydrated(true);
  }, [isDarkMode]);
  
  // 搜索建议相关状态
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const suggestionsPerPage = 10;
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchSuggestionsRef = useRef<HTMLDivElement>(null);

  // 生成用户头像的首字母
  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.length > 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
  };

  // 获取通知数据
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [user]);

  // 监听用户登录状态变化，获取通知
  useEffect(() => {
    if (user?.id) {
      // 使用setTimeout避免直接在effect中调用setState
      const timer = setTimeout(() => {
        fetchNotifications();
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [user?.id, fetchNotifications]);

  // 获取搜索建议
  const fetchSearchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    
    try {
      setSearchLoading(true);
      
      // 调用真实API获取用户搜索建议
      const { users } = await getUsers({
        search: query,
        page: 1,
        pageSize: 12
      });
      
      // 格式化用户搜索建议
      const userSuggestions: SearchSuggestion[] = users.map(user => ({
        id: user.id,
        type: 'user' as const,
        title: user.username || user.display_name || '未知用户',
        subtitle: user.email || '未知邮箱',
        icon: '👤',
        url: `/admin/users/${user.id}`
      }));
      
      // 调用真实API获取表白搜索建议
      const { confessions } = await getConfessions({
        search: query,
        page: 1,
        pageSize: 8
      });
      
      // 格式化表白搜索建议
      const confessionSuggestions: SearchSuggestion[] = confessions.map(confession => ({
        id: confession.id,
        type: 'confession' as const,
        title: confession.content?.substring(0, 30) || '无内容',
        subtitle: `创建于: ${new Date(confession.created_at).toLocaleString()}`,
        icon: '💌',
        url: `/admin/confessions/${confession.id}`
      }));
      
      // 合并所有搜索建议
      const allSuggestions = [...userSuggestions, ...confessionSuggestions];
      
      setSearchSuggestions(allSuggestions);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch search suggestions:', error);
      setSearchSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };
  
  // 防抖处理搜索输入
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 设置新的定时器，300ms后执行搜索
    searchTimeoutRef.current = setTimeout(() => {
      fetchSearchSuggestions(query);
    }, 300);
  };
  
  // 搜索功能
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 根据搜索内容跳转到不同的搜索结果页面
      if (searchQuery.includes('@')) {
        // 搜索用户
        window.location.href = `/admin/users?search=${encodeURIComponent(searchQuery)}`;
      } else {
        // 搜索表白
        window.location.href = `/admin/confessions?search=${encodeURIComponent(searchQuery)}`;
      }
      setSearchSuggestionsOpen(false);
    }
  };
  
  // 处理搜索建议点击
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    window.location.href = suggestion.url;
    setSearchSuggestionsOpen(false);
    setSearchQuery('');
  };
  
  // 分页处理
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  // 获取当前页的搜索建议
  const currentSuggestions = searchSuggestions.slice(
    (currentPage - 1) * suggestionsPerPage,
    currentPage * suggestionsPerPage
  );
  
  // 总页数
  const totalPages = Math.ceil(searchSuggestions.length / suggestionsPerPage);

  // 标记通知为已读
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      
      // 更新本地状态
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [user]);

  // 标记所有通知为已读
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      // 更新本地状态
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [user]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 关闭用户下拉菜单
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      
      // 关闭通知下拉菜单
      if (
        notificationDropdownRef.current && 
        !notificationDropdownRef.current.contains(event.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setNotificationDropdownOpen(false);
      }
      
      // 关闭搜索建议下拉菜单
      if (
        searchSuggestionsRef.current && 
        !searchSuggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setSearchSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 切换用户下拉菜单
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };
  
  // 切换通知下拉菜单
  const toggleNotificationDropdown = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* 左侧搜索框 */}
        <motion.div 
          className="relative w-64"
          initial={{ scale: 1 }}
          animate={{ scale: searchFocused ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <form onSubmit={handleSearch} className="w-full">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索用户、表白、聊天..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              className={`w-full pl-10 pr-4 py-2 border ${searchFocused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:outline-none transition-all duration-200 bg-white dark:bg-gray-700 dark:text-white`}
              onFocus={() => {
                setSearchFocused(true);
                setSearchSuggestionsOpen(true);
              }}
              onBlur={() => {
                setSearchFocused(false);
                // 延迟关闭，以便点击建议时能触发点击事件
                setTimeout(() => {
                  setSearchSuggestionsOpen(false);
                }, 200);
              }}
            />
            <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${searchFocused ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'} transition-colors duration-200`}>🔍</span>
          </form>
          
          {/* 搜索建议列表 */}
          <AnimatePresence>
            {searchSuggestionsOpen && (searchQuery.trim() || searchLoading) && (
              <motion.div
                ref={searchSuggestionsRef}
                className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-[400px] overflow-hidden"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* 搜索建议内容 */}
                {searchLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : searchSuggestions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    暂无搜索结果
                  </div>
                ) : (
                  <>
                    {/* 建议列表 */}
                    <div className="max-h-[300px] overflow-y-auto">
                      {currentSuggestions.map((suggestion) => (
                        <motion.div
                          key={suggestion.id}
                          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-xl">{suggestion.icon}</div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{suggestion.title}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{suggestion.subtitle}</p>
                            </div>
                            <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {suggestion.type === 'user' ? '用户' : suggestion.type === 'confession' ? '表白' : '聊天'}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* 分页 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          共 {searchSuggestions.length} 条结果，第 {currentPage} / {totalPages} 页
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            className={`px-2 py-1 text-sm rounded-md transition-colors ${currentPage === 1 ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                          >
                            首页
                          </button>
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-2 py-1 text-sm rounded-md transition-colors ${currentPage === 1 ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                          >
                            上一页
                          </button>
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-2 py-1 text-sm rounded-md transition-colors ${currentPage === totalPages ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                          >
                            下一页
                          </button>
                          <button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className={`px-2 py-1 text-sm rounded-md transition-colors ${currentPage === totalPages ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                          >
                            末页
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* 查看全部按钮 */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <button
                        onClick={handleSearch}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                      >
                        查看全部结果
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 右侧操作区 */}
        <div className="flex items-center space-x-4">
          {/* 通知图标 */}
          <div className="relative" ref={notificationDropdownRef}>
            <motion.button 
              ref={notificationButtonRef}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleNotificationDropdown}
            >
              <span className={`text-gray-600 dark:text-gray-300`}>🔔</span>
              {unreadCount > 0 && (
                <motion.span 
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </motion.button>
            
            {/* 通知下拉菜单 */}
            <AnimatePresence>
              {notificationDropdownOpen && (
                <motion.div 
                  className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">通知</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                      >
                        全部已读
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        暂无通知
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-300">📢</span>
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${notification.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {notification.content}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 主题切换 */}
          <motion.button 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
          >
            <span className={`${hydrated && clientTheme ? 'text-yellow-400' : 'text-gray-600 dark:text-gray-300'}`}>
              {hydrated && clientTheme ? '☀️' : '🌙'}
            </span>
          </motion.button>

          {/* 用户信息 */}
          <div className="flex items-center space-x-3">
            <motion.div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
              whileHover={{ scale: 1.1, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
            >
              {user?.avatar_url ? (
                <Image 
                  src={user.avatar_url} 
                  alt="用户头像" 
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {user?.email ? getInitials(user.email) : 'AD'}
                </div>
              )}
            </motion.div>
            <div className="text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">管理员</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || 'admin@example.com'}</p>
            </div>
            <div className="relative" ref={dropdownRef}>
              <motion.button 
                ref={buttonRef}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleDropdown}
              >
                <span className="text-gray-600 dark:text-gray-300">▼</span>
              </motion.button>
              {/* 下拉菜单 */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div 
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="py-1">
                      <Link
                        href="/admin/settings/profile"
                        className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-150"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <span>👤</span>
                          <span>个人资料</span>
                        </div>
                      </Link>
                      <Link
                        href="/admin/settings/security"
                        className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-150"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <span>🔒</span>
                          <span>安全设置</span>
                        </div>
                      </Link>
                      <button
                        onClick={async () => {
                          // 管理员退出登录，跳转到管理员登录页面
                          window.location.href = '/auth/admin-login';
                        }}
                        className="block w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-150"
                      >
                        <div className="flex items-center space-x-2">
                          <span>🚪</span>
                          <span>退出登录</span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

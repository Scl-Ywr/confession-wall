'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getUserPermissionsClient } from '@/utils/permissionCheck';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  permission?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: '仪表盘',
    icon: '📊',
    permission: 'view_system_stats'
  },
  {
    href: '/admin/users',
    label: '用户管理',
    icon: '👥',
    permission: 'view_users'
  },
  {
    href: '/admin/confessions',
    label: '表白墙管理',
    icon: '💬',
    permission: 'view_confessions'
  },
  {
    href: '/admin/comments',
    label: '评论管理',
    icon: '💬',
    permission: 'view_comments'
  },
  {
    href: '/admin/chats',
    label: '聊天管理',
    icon: '💬',
    permission: 'view_chat_messages'
  },
  {
    href: '/admin/friends',
    label: '好友管理',
    icon: '🤝',
    permission: 'view_users'
  },
  {
    href: '/admin/logs',
    label: '日志管理',
    icon: '📋',
    permission: 'view_logs'
  },
  {
    href: '/admin/roles',
    label: '角色管理',
    icon: '🔑',
    permission: 'view_roles'
  },
  {
    href: '/admin/settings',
    label: '系统设置',
    icon: '⚙️',
    permission: 'manage_system_settings'
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (user?.id) {
        const permissions = await getUserPermissionsClient(user.id);
        setUserPermissions(permissions);
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [user?.id]);

  const isActive = (href: string) => {
    return pathname ? pathname === href || pathname.startsWith(`${href}/`) : false;
  };

  const hasPermission = (item: NavItem) => {
    if (!item.permission) {
      return true;
    }
    
    const isSuperAdmin = user?.is_admin || 
                        userPermissions.includes('super_admin') || 
                        userPermissions.includes('admin') ||
                        userPermissions.includes('moderator');
    
    if (isSuperAdmin) {
      return true;
    }
    
    return userPermissions.includes(item.permission);
  };

  const filteredNavItems = navItems.filter(hasPermission);

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">后台管理系统</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">表白墙项目管理</p>
        </motion.div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredNavItems.map((item, index) => (
              <motion.li 
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive(item.href) ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-800 dark:text-blue-300 border-l-4 border-blue-500' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-l-4 hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                  {isActive(item.href) && (
                    <motion.span 
                      className="ml-auto text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      ✔️
                    </motion.span>
                  )}
                </Link>
                
                {item.children && item.children.length > 0 && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {item.children
                      .filter(hasPermission)
                      .map((child) => (
                        <motion.li 
                          key={child.href}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Link
                            href={child.href}
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${isActive(child.href) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          >
                            <span className="mr-3 text-lg">{child.icon}</span>
                            {child.label}
                          </Link>
                        </motion.li>
                      ))}
                  </ul>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-xs text-green-600 dark:text-green-400">系统正常运行</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">表白墙后台 v1.0.0</p>
        </motion.div>
      </div>
    </aside>
  );
}

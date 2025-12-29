'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: '仪表盘',
    icon: '📊',
  },
  {
    href: '/admin/users',
    label: '用户管理',
    icon: '👥',
  },
  {
    href: '/admin/confessions',
    label: '表白墙管理',
    icon: '💬',
  },
  {
    href: '/admin/comments',
    label: '评论管理',
    icon: '💬',
  },
  {
    href: '/admin/chats',
    label: '聊天管理',
    icon: '💬',
  },
  {
    href: '/admin/friends',
    label: '好友管理',
    icon: '🤝',
  },
  {
    href: '/admin/logs',
    label: '日志管理',
    icon: '📋',
  },
  {
    href: '/admin/roles',
    label: '角色管理',
    icon: '🔑',
  },
  {
    href: '/admin/settings',
    label: '系统设置',
    icon: '⚙️',
  },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname ? pathname === href || pathname.startsWith(`${href}/`) : false;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">后台管理</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">表白墙项目</p>
            </div>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={onClose}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {navItems.map((item, index) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive(item.href) ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-800 dark:text-blue-300 border-l-4 border-blue-500' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-l-4 hover:border-gray-300 dark:hover:border-gray-600'}`}
                      onClick={onClose}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-xs text-green-600 dark:text-green-400">系统正常运行</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">表白墙后台 v1.0.0</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

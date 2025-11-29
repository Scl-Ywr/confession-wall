'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HomeIcon, UserIcon, ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon, UserPlusIcon, MoonIcon, SunIcon } from '@heroicons/react/20/solid';

const Navbar: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm transition-all duration-300 dark:bg-gray-800 dark:shadow-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-xl font-bold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <HomeIcon className="w-6 h-6" />
                表白墙
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {/* 主题切换按钮 */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 transform hover:scale-110 dark:bg-gray-700 dark:hover:bg-gray-600"
              aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDarkMode ? (
                <SunIcon className="w-5 h-5 text-yellow-500" />
              ) : (
                <MoonIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            
            {user ? (
              <div className="ml-4 flex items-center md:ml-6 gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-1 text-gray-700 hover:text-primary-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-primary-400"
                >
                  <UserIcon className="w-5 h-5" />
                  个人资料
                </Link>
                <span className="hidden md:inline-block text-sm text-gray-700 dark:text-gray-300">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-105 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                >
                  {loading ? '登出中...' : (
                    <>
                      <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                      登出
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="ml-4 flex items-center space-x-3">
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1 text-gray-700 hover:text-primary-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-primary-400"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-105 dark:bg-primary-500 dark:hover:bg-primary-400"
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
  );
};

export default Navbar;

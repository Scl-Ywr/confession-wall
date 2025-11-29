'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HomeIcon, UserIcon, ArrowLeftOnRectangleIcon, UserPlusIcon, MoonIcon, SunIcon } from '@heroicons/react/20/solid';

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
    <nav className="sticky top-4 z-50 mx-4 mt-4 rounded-2xl glass shadow-lg transition-all duration-300 dark:bg-gray-900/80 dark:shadow-gray-900/50 backdrop-blur-md border border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
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
              aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDarkMode ? (
                <SunIcon className="w-5 h-5 text-yellow-500" />
              ) : (
                <MoonIcon className="w-5 h-5 text-primary-600" />
              )}
            </button>
            
            {user ? (
              <div className="ml-4 flex items-center md:ml-6 gap-3">
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
  );
};

export default Navbar;

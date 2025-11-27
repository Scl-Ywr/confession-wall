'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                表白墙
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="ml-4 flex items-center md:ml-6">
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-blue-600 font-medium mr-4"
                >
                  个人资料
                </Link>
                <span className="text-sm text-gray-700 mr-4">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {loading ? '登出中...' : '登出'}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
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

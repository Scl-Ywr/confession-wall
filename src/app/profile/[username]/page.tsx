'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { profileService, Profile } from '@/services/profileService';
import MeteorShower from '@/components/MeteorShower';
import { ArrowLeftIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const UserProfilePage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile by username
  const fetchProfile = async () => {
    if (!username) {
      setError('用户名不能为空');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await profileService.getProfileByUsername(username);
      if (!data) {
        setError('无法找到该用户或用户资料不存在');
      }
      setProfile(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户资料失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  // Handle back button click
  const handleBack = () => {
    router.back();
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 glass rounded-2xl">
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error || '用户不存在或已被删除'}</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all"
          >
            返回表白墙
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden">
      <MeteorShower className="opacity-30" />
      
      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob dark:bg-purple-900/20"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 dark:bg-blue-900/20"></div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg font-bold"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>返回表白墙</span>
          </button>
        </div>

        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-center gap-3">
            <span className="text-4xl">👤</span> 用户资料
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Basic Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-2xl text-center animate-slide-up">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/50 shadow-lg mx-auto mb-4">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    fill
                    sizes="128px"
                    className="object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400 dark:text-gray-500">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{profile.display_name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium">@{profile.username}</p>
              
              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">{profile.bio}</p>
              )}
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">注册时间</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100">{new Date(profile.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Additional Info */}
          <div className="md:col-span-2">
            <div className="glass-card p-8 rounded-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">个人信息</h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                    用户名
                  </label>
                  <div className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl backdrop-blur-sm dark:text-white font-medium text-gray-900">
                    {profile.username}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                    显示名称
                  </label>
                  <div className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl backdrop-blur-sm dark:text-white font-medium text-gray-900">
                    {profile.display_name}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                    个人简介
                  </label>
                  <div className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl backdrop-blur-sm dark:text-white font-medium text-gray-900 min-h-[100px]">
                    {profile.bio || '该用户还没有填写个人简介'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                    注册时间
                  </label>
                  <div className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl backdrop-blur-sm dark:text-white font-medium text-gray-900">
                    {new Date(profile.created_at).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
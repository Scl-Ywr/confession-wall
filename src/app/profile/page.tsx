'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { profileService, Profile, ProfileUpdateData } from '@/services/profileService';
import MeteorShower from '@/components/MeteorShower';
import { UserCircleIcon, PhotoIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileUpdateData>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await profileService.getCurrentProfile();
      setProfile(data);
      if (data) {
        setFormData({
          username: data.username,
          display_name: data.display_name,
          bio: data.bio,
        });
        setAvatarPreview(data.avatar_url || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取个人资料失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile();
    }
  }, [user, authLoading, fetchProfile]);

  // 处理重定向逻辑
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAvatar(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      // 只保留有值的字段
      const updatedData: ProfileUpdateData = {};
      
      // 处理用户名
      if (formData.username && formData.username.trim() !== '') {
        updatedData.username = formData.username.trim();
      }
      
      // 处理显示名称
      if (formData.display_name && formData.display_name.trim() !== '') {
        updatedData.display_name = formData.display_name.trim();
      }
      
      // 处理个人简介
      if (formData.bio !== undefined) {
        updatedData.bio = formData.bio.trim();
      }

      // Upload avatar if a new one is selected
      if (selectedAvatar) {
        const avatarUrl = await profileService.uploadAvatar(selectedAvatar);
        updatedData.avatar_url = avatarUrl;
      }

      // Update profile
      const updatedProfile = await profileService.updateProfile(updatedData);
      setProfile(updatedProfile);
      setFormSuccess(true);

      // Reset form state
      setSelectedAvatar(null);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setFormSuccess(false);
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新个人资料失败';
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

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
          <p className="text-gray-600 dark:text-gray-300 mb-4">无法获取个人资料</p>
          <button
            onClick={fetchProfile}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all"
          >
            重试
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
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-center gap-3">
            <span className="text-4xl">👤</span> 个人资料
          </h1>
          <p className="text-white dark:text-white">
            管理你的个人信息，打造独特的你
          </p>
        </div>

        {error && (
          <div className="glass p-4 mb-6 border-l-4 border-red-500 text-red-700 dark:text-red-300">
            <p>{error}</p>
            <button
              onClick={fetchProfile}
              className="mt-2 text-primary-800 hover:text-primary-900 font-bold underline decoration-2 underline-offset-2"
            >
              重试
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Quick Stats */}
          <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-2xl text-center animate-slide-up">
              <div className="relative inline-block mb-4 group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/50 shadow-lg mx-auto relative">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Avatar"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                      <span className="text-4xl font-bold text-gray-400 dark:text-gray-500">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-2.5 cursor-pointer hover:bg-primary-700 transition-all shadow-lg transform hover:scale-110 hover:-rotate-12">
                  <PhotoIcon className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{profile.display_name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium">@{profile.username}</p>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">注册时间</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100">{new Date(profile.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">邮箱</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100 truncate max-w-[150px]" title={user.email || ''}>{user.email}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full glass-card p-4 rounded-xl flex items-center justify-center gap-2 text-red-800 bg-red-50/50 hover:bg-red-100/80 dark:text-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-all group font-bold shadow-sm"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>退出登录</span>
            </button>
          </div>

          {/* Right Column: Edit Form */}
          <div className="md:col-span-2">
            <div className="glass-card p-8 rounded-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <UserCircleIcon className="w-6 h-6 text-primary-600" />
                编辑资料
              </h3>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="username" className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                      用户名
                    </label>
                    <input
                      type="text"
                      id="username"
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all backdrop-blur-sm dark:text-white font-medium text-gray-900"
                      value={formData.username || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="输入用户名"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="display_name" className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                      显示名称
                    </label>
                    <input
                      type="text"
                      id="display_name"
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all backdrop-blur-sm dark:text-white font-medium text-gray-900"
                      value={formData.display_name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="输入显示名称"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="bio" className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                    个人简介
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all backdrop-blur-sm resize-none dark:text-white font-medium text-gray-900"
                    value={formData.bio || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="写一段关于你的介绍..."
                  ></textarea>
                </div>

                <div className="pt-4 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="px-6 py-2.5 border border-gray-400 dark:border-gray-500 rounded-xl text-gray-900 dark:text-white bg-white/50 hover:bg-white/80 dark:bg-gray-800/50 dark:hover:bg-gray-700/80 transition-all font-bold shadow-sm"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className={`px-8 py-2.5 bg-gradient-to-r from-primary-600 to-secondary-600 text-black dark:text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transform hover:-translate-y-0.5 transition-all ${formLoading ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {formLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>保存中...</span>
                      </div>
                    ) : '保存修改'}
                  </button>
                </div>

                {/* Form Messages */}
                {formError && (
                  <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-red-900/30 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-4 bg-green-50/80 border border-green-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-green-900/30 dark:border-green-800">
                    <p className="text-sm text-green-600 dark:text-green-400">✨ 个人资料更新成功！</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;

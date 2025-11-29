'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { profileService, Profile, ProfileUpdateData } from '@/services/profileService';

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  const fetchProfile = async () => {
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
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile();
    }
  }, [user, authLoading]);

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
      const updatedData = { ...formData };

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  // 重定向逻辑移到useEffect中
  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">无法获取个人资料</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            个人资料
          </h1>
          <p className="text-gray-600">
            管理你的个人信息
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchProfile}
              className="mt-2 text-blue-600 hover:text-blue-500"
            >
              重试
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar"
                    width={150}
                    height={150}
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-200">
                    <span className="text-gray-600 text-2xl font-medium">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500">
                点击头像上传新的头像图片
              </p>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                type="text"
                id="username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.username || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="输入用户名"
              />
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                显示名称
              </label>
              <input
                type="text"
                id="display_name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.display_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="输入显示名称"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                个人简介
              </label>
              <textarea
                id="bio"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.bio || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="输入个人简介"
              ></textarea>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${formLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {formLoading ? '保存中...' : '保存修改'}
              </button>
            </div>

            {/* Form Messages */}
            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">个人资料更新成功！</p>
              </div>
            )}
          </form>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            账户信息
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">邮箱</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">注册时间</span>
              <span className="font-medium">{new Date(profile.created_at).toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">最后更新</span>
              <span className="font-medium">{new Date(profile.updated_at).toLocaleString('zh-CN')}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;

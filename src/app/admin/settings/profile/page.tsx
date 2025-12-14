'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { profileService, ProfileUpdateData } from '@/services/profileService';
import { Profile } from '@/types/confession';
import { UserCircleIcon, PhotoIcon, ArrowLeftCircleIcon } from '@heroicons/react/24/outline';

const AdminProfilePage: React.FC = () => {
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
          bio: data.bio
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle avatar selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAvatar(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      // Upload avatar if selected
      let avatarUrl: string | undefined;
      if (selectedAvatar) {
        avatarUrl = await profileService.uploadAvatar(selectedAvatar);
      }

      // Update profile
      await profileService.updateProfile({
        ...formData,
        avatar_url: avatarUrl
      });

      setFormSuccess(true);
      setSelectedAvatar(null);
      setAvatarPreview(null);
      await fetchProfile(); // Refresh profile data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">个人资料</h1>
        <button
          onClick={() => router.push('/admin/settings')}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeftCircleIcon className="w-5 h-5" />
          返回设置
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* 表单 */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 头像上传 */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">个人头像</h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                {avatarPreview && (
                  <Image
                    src={avatarPreview}
                    alt="用户头像"
                    width={120}
                    height={120}
                    className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                )}
                {!avatarPreview && profile.avatar_url && (
                  <Image
                    src={profile.avatar_url}
                    alt="用户头像"
                    width={120}
                    height={120}
                    className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                )}
                {!avatarPreview && !profile.avatar_url && (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    <UserCircleIcon className="w-12 h-12" />
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  <PhotoIcon className="w-5 h-5" />
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-gray-600">上传头像图片</p>
                <p className="text-xs text-gray-500 mt-1">支持 JPG、PNG 格式，建议尺寸 200x200px</p>
              </div>
            </div>
          </div>

          {/* 基本信息 */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">基本信息</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入用户名"
                />
              </div>

              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                  显示名称
                </label>
                <input
                  type="text"
                  id="display_name"
                  name="display_name"
                  value={formData.display_name || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入显示名称"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  个人简介
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入个人简介"
                ></textarea>
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={fetchProfile}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={formLoading}
            >
              {formLoading ? '保存中...' : '保存个人资料'}
            </button>
          </div>
        </form>

        {formSuccess && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            个人资料更新成功！
          </div>
        )}

        {formError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {formError}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProfilePage;

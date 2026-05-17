'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { profileService, ProfileUpdateData } from '@/services/profileService';
import { Profile } from '@/types/confession';
import MeteorShower from '@/components/MeteorShower';
import { UserCircleIcon, PhotoIcon, ArrowLeftCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import Navbar from '@/components/Navbar';
import KawaiiDecor from '@/components/KawaiiDecor';
import { CalendarDays, Heart, MapPin, Pencil, Star, ThumbsUp, UserRound } from 'lucide-react';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showResetPasswordPrompt, setShowResetPasswordPrompt] = useState(false);
  const [showLogoutAfterDeletePrompt, setShowLogoutAfterDeletePrompt] = useState(false);
  const [userIp, setUserIp] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userProvince, setUserProvince] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let data = await profileService.getCurrentProfile();
      
      // 如果是OAuth用户，使用user对象中的OAuth信息覆盖profile对象中的对应字段
      if (user.oauth_provider && user.oauth_avatar_url) {
        data = {
          ...data,
          oauth_provider: user.oauth_provider,
          oauth_avatar_url: user.oauth_avatar_url,
          oauth_username: user.oauth_username,
          // 当通过OAuth登录时，优先使用OAuth头像
          avatar_url: user.avatar_url
        };
      }
      
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
  // Client-side IP detection as fallback with multiple services
  const clientSideIpDetection = useCallback(async (): Promise<{ ip: string; city: string; province?: string; country: string } | null> => {
    // 客户端IP检测服务列表，按可靠性排序
    const clientIpServices = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json',
      'https://jsonip.com/',
      'https://checkip.amazonaws.com/'
    ];
    
    try {
      // 尝试多个客户端IP服务
      for (const serviceUrl of clientIpServices) {
        try {
          // 使用AbortController实现超时
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          let ipAddress: string;
          
          if (serviceUrl === 'https://checkip.amazonaws.com/') {
            // AWS服务直接返回IP字符串
            const response = await fetch(serviceUrl, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              ipAddress = (await response.text()).trim();
              return {
                ip: ipAddress,
                city: '未知城市',
                province: '未知省份',
                country: '未知国家'
              };
            }
          } else {
            // 其他服务返回JSON
            const response = await fetch(serviceUrl, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              if (data.ip) {
                return {
                  ip: data.ip,
                  city: '未知城市',
                  province: '未知省份',
                  country: '未知国家'
                };
              }
            }
          }
        } catch {
          // 继续尝试下一个服务
          continue;
        }
      }
      
      // 所有客户端服务都失败
      return null;
    } catch {
      return null;
    }
  }, []);

  // Fetch user IP address from server-side API with client-side fallback
  const fetchUserIp = useCallback(async () => {
    setIpLoading(true);
    let ipData: { ip: string; city: string; province?: string; country: string; is_proxy?: boolean; debugging?: Record<string, unknown> } | null = null;
    
    try {
      // 使用AbortController实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('请求超时'));
      }, 15000); // 增加到15秒超时，给服务器足够时间尝试多个服务
      
      // 调用我们自己的API路由，服务器端处理IP获取
      const response = await fetch('/api/get-ip', {
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          if (data.ip) {
            ipData = {
              ip: data.ip,
              city: data.city || '未知城市',
              province: data.province || '未知省份',
              country: data.country || '未知国家',
              is_proxy: data.is_proxy || false,
              debugging: data.debugging
            };
          } else if (data.error) {
            throw new Error(`服务器获取IP失败: ${data.error}`);
          } else {
            throw new Error('无效的IP地址格式');
          }
        } catch {
          // 尝试客户端回退
          ipData = await clientSideIpDetection();
        }
      } else {
        // 服务器返回错误，尝试客户端回退
        ipData = await clientSideIpDetection();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 处理超时错误，尝试客户端回退
      if (errorMessage.includes('abort') || errorMessage.includes('timeout') || errorMessage.includes('Failed to fetch')) {
        ipData = await clientSideIpDetection();
      }
    } finally {
      if (ipData) {
        // 更新状态
        setUserIp(ipData.ip + (ipData.is_proxy ? ' (代理IP)' : ''));
        setUserCity(ipData.city);
        setUserProvince(ipData.province || '未知省份');
        setUserCountry(ipData.country);
        
        // 存储IP和地理位置信息到数据库
        try {
          await profileService.updateIpLocation({
            user_ip: ipData.ip,
            user_city: ipData.city,
            user_province: ipData.province,
            user_country: ipData.country
          });
        } catch {
          // 保存失败不影响用户体验，继续显示IP信息
        }
      } else {
        // 所有方法都失败，显示友好错误信息
        setUserIp('获取失败: 无法连接到IP服务');
        setUserCity('获取失败');
        setUserProvince('获取失败');
        setUserCountry('获取失败');
      }
      setIpLoading(false);
    }
  }, [clientSideIpDetection]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  // Fetch IP address when component mounts and set up real-time updates
  useEffect(() => {
    fetchUserIp();
    
    // Set up periodic IP check every 5 minutes to detect IP changes
    const ipCheckInterval = setInterval(() => {
      fetchUserIp();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Listen for network status changes
    const handleOnline = () => {
      fetchUserIp();
    };
    
    const handleOffline = () => {
      // 网络离线时，不需要立即更新，等待重新连接
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup event listeners and interval
    return () => {
      clearInterval(ipCheckInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchUserIp]);

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
      // 表单验证
      if (!formData.username || (formData.username as string).trim() === '') {
        throw new Error('请设置用户名');
      }
      
      if (!formData.display_name || (formData.display_name as string).trim() === '') {
        throw new Error('请设置显示名称');
      }
      
      // 只保留有值的字段
      const updatedData: ProfileUpdateData = {};
      
      // 处理用户名
      updatedData.username = (formData.username as string).trim();
      
      // 处理显示名称
      updatedData.display_name = (formData.display_name as string).trim();
      
      // 处理个人简介
      if (formData.bio !== undefined && formData.bio !== null) {
        updatedData.bio = (formData.bio as string).trim();
      } else {
        updatedData.bio = '';
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
      await logout({ redirect: false });
      router.push('/auth/login');
    } catch {
      // 登出失败，静默处理
    }
  };

  // 执行实际的注销操作
  const executeAccountDeletion = async () => {
    if (!user) {
      return;
    }

    setDeleteLoading(true);
    try {
      const userId = user.id;

      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        throw new Error(result.error || '注销账号失败，请稍后重试');
      }

      await logout({ redirect: false });

      setShowLogoutAfterDeletePrompt(false);
      setShowResetPasswordPrompt(true);
    } catch (error) {
      alert('注销失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle account deletion confirmation
  const handleDeleteAccount = () => {
    // 不直接执行注销操作，而是显示提示组件
    setShowDeleteConfirm(false);
    setShowLogoutAfterDeletePrompt(true);
  };

  if (authLoading || loading) {
    return (
      <div className="cw-page flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!profile && user) {
    // 如果profile不存在，自动创建默认profile
    const createDefaultProfile = async () => {
      try {
        if (!user.email) return;
        
        const username = user.email.split('@')[0];
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username,
            display_name: username
          });
        
        if (!createError) {
          // 重新获取profile
          fetchProfile();
        }
      } catch {
      // 创建失败，静默处理
    }
    };
    
    createDefaultProfile();
    
    return (
      <div className="cw-page flex min-h-screen items-center justify-center">
        <div className="cw-panel rounded-[2rem] p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-rose-500"></div>
          <p className="mb-4 font-medium text-slate-600 dark:text-slate-300">正在初始化您的个人资料...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cw-page relative min-h-screen overflow-hidden pb-20">
      <div className="cw-decor-grid" />
      <MeteorShower className="opacity-15" />
      <KawaiiDecor />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1360px] px-4 py-8 sm:px-8 lg:px-12">
        <div className="relative mb-8 flex items-center justify-center">
          <button
            onClick={() => router.back()}
            className="cw-panel-sm absolute left-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:text-rose-500 dark:text-slate-200"
          >
            <ArrowLeftCircleIcon className="h-5 w-5" />
            返回
          </button>
          <h1 className="flex items-center justify-center gap-3 text-3xl font-black text-slate-800 dark:text-white sm:text-4xl">
            <UserRound className="h-9 w-9 text-rose-500" />
            用户资料
          </h1>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          {/* Left Column: Avatar & Quick Stats */}
          <div className="space-y-5">
            <div className="cw-panel rounded-[2rem] p-6 text-center animate-slide-up">
              <div className="relative inline-block mb-4 group">
                <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full border-4 border-white/80 shadow-lg ring-2 ring-rose-100 dark:border-white/20 dark:ring-white/10">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Avatar"
                      fill
                      sizes="(max-width: 768px) 8rem, 12rem"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : profile?.oauth_avatar_url ? (
                    <Image
                      src={profile.oauth_avatar_url}
                      alt="OAuth Avatar"
                      fill
                      sizes="(max-width: 768px) 8rem, 12rem"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Avatar"
                      fill
                      sizes="(max-width: 768px) 8rem, 12rem"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                      <span className="text-4xl font-bold text-gray-400 dark:text-gray-500">
                        {profile?.display_name.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <label className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-gradient-to-br from-rose-400 to-red-500 p-3 text-white shadow-lg transition-all hover:scale-110 hover:-rotate-12">
                  <PhotoIcon className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <h2 className="mb-1 text-2xl font-black text-slate-900 dark:text-white">{profile?.oauth_username || profile?.display_name || '未设置'}</h2>
              <p className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">@{profile?.username || '未设置'}</p>
              
              <div className="border-t border-slate-100 pt-5 dark:border-white/10">
                <div className="mb-3 flex justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-500 dark:text-slate-400"><CalendarDays className="h-4 w-4" />注册时间</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{profile && profile.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '未知'}</span>
                </div>
                <div className="mb-3 flex justify-between gap-4 text-sm">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">邮箱</span>
                  <span className="truncate font-bold text-slate-800 dark:text-slate-100">{user.email}</span>
                </div>
                <div className="mb-3 flex justify-between gap-4 text-sm">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">当前IP地址</span>
                  <span className="truncate font-bold text-slate-800 dark:text-slate-100" title={userIp || '未知'}>
                    {ipLoading ? '获取中...' : userIp}
                  </span>
                </div>
                <div className="mb-3 flex justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-500 dark:text-slate-400"><MapPin className="h-4 w-4" />所在省份</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100" title={userProvince || '未知'}>
                    {ipLoading ? '获取中...' : userProvince}
                  </span>
                </div>
                <div className="mb-3 flex justify-between gap-4 text-sm">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">所在城市</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100" title={`${userCity || ''}, ${userCountry || ''}`}>
                    {ipLoading ? '获取中...' : `${userCity || ''}, ${userCountry || ''}`}
                  </span>
                </div>
                {/* OAuth信息 */}
                {profile?.oauth_provider && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">登录方式</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                        {profile.oauth_provider === 'github' && '🐙'}
                        {profile.oauth_provider === 'google' && '🔍'}
                        {profile.oauth_provider === 'apple' && '🍎'}
                        {profile.oauth_provider === 'facebook' && '📘'}
                        {profile.oauth_provider.charAt(0).toUpperCase() + profile.oauth_provider.slice(1)}
                      </span>
                    </div>
                    {profile.oauth_username && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">第三方用户名</span>
                        <span className="font-bold text-gray-800 dark:text-gray-100 truncate max-w-[150px]">
                          {profile.oauth_username}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 p-3 dark:from-rose-500/10 dark:to-orange-500/10">
                  <div className="text-center">
                    <Heart className="mx-auto mb-1 h-5 w-5 fill-rose-400 text-rose-400" />
                    <div className="text-lg font-black text-slate-800 dark:text-white">12</div>
                    <div className="text-xs font-bold text-slate-500">表白</div>
                  </div>
                  <div className="text-center">
                    <ThumbsUp className="mx-auto mb-1 h-5 w-5 fill-rose-400 text-rose-400" />
                    <div className="text-lg font-black text-slate-800 dark:text-white">268</div>
                    <div className="text-xs font-bold text-slate-500">获赞</div>
                  </div>
                  <div className="text-center">
                    <Star className="mx-auto mb-1 h-5 w-5 fill-amber-400 text-amber-400" />
                    <div className="text-lg font-black text-slate-800 dark:text-white">36</div>
                    <div className="text-xs font-bold text-slate-500">收藏</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="cw-panel-sm flex w-full items-center justify-center gap-2 rounded-2xl p-4 font-bold text-red-600 transition-all hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-900/20"
            >
              <ArrowLeftCircleIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>退出登录</span>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="cw-panel-sm flex w-full items-center justify-center gap-2 rounded-2xl p-4 font-bold text-red-600 transition-all hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-900/20"
            >
              <TrashIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>注销账号</span>
            </button>
          </div>

          {/* Right Column: Edit Form */}
          <div>
            <div className="cw-panel rounded-[2rem] p-6 animate-slide-up sm:p-8" style={{ animationDelay: '0.1s' }}>
              <h3 className="mb-6 flex items-center justify-between gap-3 text-2xl font-black text-slate-900 dark:text-white">
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/15">
                    <UserCircleIcon className="h-6 w-6" />
                  </span>
                编辑资料
                </span>
                <span className="cw-secondary-btn min-h-11 px-4 text-sm">
                  <Pencil className="h-4 w-4" />
                  编辑资料
                </span>
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
                      className="cw-input"
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
                      className="cw-input"
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
                    className="cw-input min-h-28 resize-none"
                    value={formData.bio || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="写一段关于你的介绍..."
                  ></textarea>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="cw-secondary-btn w-full sm:w-auto"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className={`cw-primary-btn w-full sm:w-auto ${formLoading ? 'cursor-wait opacity-70' : ''}`}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card rounded-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">确认注销账号</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              您确定要注销账号吗？此操作将永久删除您的账号及所有关联数据，包括表白、评论、点赞和个人资料。此操作不可撤销！
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full sm:w-auto px-6 py-3 border border-gray-400 dark:border-gray-500 rounded-xl text-gray-900 dark:text-white bg-white/50 hover:bg-white/80 dark:bg-gray-800/50 dark:hover:bg-gray-700/80 transition-all font-bold shadow-sm min-h-12 flex items-center justify-center"
              >
                取消
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className={`w-full sm:w-auto px-8 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transform hover:-translate-y-0.5 transition-all min-h-12 flex items-center justify-center ${deleteLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {deleteLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>注销中...</span>
                  </div>
                ) : '确认注销'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout After Delete Prompt */}
      {showLogoutAfterDeletePrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card rounded-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">确认注销账号</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              注销账号后，您将无法直接登录。如果您希望重新使用此邮箱登录，需要先进行密码重置。
            </p>
            <div className="flex flex-col gap-4 mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-bold">注意：</span>
                注销操作将永久删除您的所有数据，包括表白、评论和点赞记录。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                onClick={() => {
                  // 点击取消，关闭提示组件，回到之前的状态
                  setShowLogoutAfterDeletePrompt(false);
                  setShowDeleteConfirm(true);
                }}
                className="w-full sm:w-auto px-6 py-3 border border-gray-400 dark:border-gray-500 rounded-xl text-gray-900 dark:text-white bg-white/50 hover:bg-white/80 dark:bg-gray-800/50 dark:hover:bg-gray-700/80 transition-all font-bold shadow-sm min-h-12 flex items-center justify-center"
              >
                取消
              </button>
              <button
                onClick={() => {
                  // 点击重置密码，执行注销操作
                  executeAccountDeletion();
                }}
                className={`w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-black dark:text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transform hover:-translate-y-0.5 transition-all min-h-12 flex items-center justify-center`}
              >
                确认注销
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Prompt */}
      {showResetPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card rounded-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">账号已成功注销</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              您的账号已成功注销，所有关联数据已被清理。如果您希望继续使用此邮箱，请重新注册账号。
            </p>
            <div className="flex flex-col gap-4 mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-bold">注意：</span>
                您的账号和关联内容已删除。如需继续使用，请重新注册账号。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowResetPasswordPrompt(false);
                  router.push('/auth/login');
                }}
                className="w-full sm:w-auto px-6 py-3 border border-gray-400 dark:border-gray-500 rounded-xl text-gray-900 dark:text-white bg-white/50 hover:bg-white/80 dark:bg-gray-800/50 dark:hover:bg-gray-700/80 transition-all font-bold shadow-sm min-h-12 flex items-center justify-center"
              >
                前往登录页面
              </button>
              <button
                onClick={() => {
                  setShowResetPasswordPrompt(false);
                  router.push('/auth/register');
                }}
                className={`w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-black dark:text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transform hover:-translate-y-0.5 transition-all min-h-12 flex items-center justify-center`}
              >
                前往注册页面
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

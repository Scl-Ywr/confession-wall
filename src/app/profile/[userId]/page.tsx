'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserSearchResult } from '@/types/chat';
import { Confession, Comment } from '@/types/confession';
import { chatService } from '@/services/chatService';
import { profileService } from '@/services/profileService';
import { confessionService } from '@/services/confessionService';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import { UserCircleIcon, MessageCircleIcon, UserPlusIcon, CheckIcon } from 'lucide-react';
import HorizontalConfessionHistory from '@/components/HorizontalConfessionHistory';
import ProfileVideoPlayer from '@/components/ProfileVideoPlayer';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import PageLoader from '@/components/PageLoader';

const OtherUserProfilePage = () => {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [requestLoading, setRequestLoading] = useState(false);
  const [userIp, setUserIp] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userProvince, setUserProvince] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(true);
  const [userConfessions, setUserConfessions] = useState<Confession[]>([]);
  const [confessionsLoading, setConfessionsLoading] = useState(false);
  const [confessionsError, setConfessionsError] = useState<string | null>(null);
  const [hasMoreConfessions, setHasMoreConfessions] = useState(true);
  const [confessionsPage, setConfessionsPage] = useState(1);
  const [selectedConfession, setSelectedConfession] = useState<Confession | null>(null);
  const [selectedConfessionComments, setSelectedConfessionComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileAndFriendship = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      const decodedUserId = decodeURIComponent(userId);
      
      if (user && user.id === decodedUserId) {
        window.location.href = '/profile';
        return;
      }

      try {
        setLoading(true);
        
        // 获取用户资料
        const profileData = await chatService.getUserProfile(decodedUserId);
        
        if (profileData) {
          setProfile(profileData);
          
          // 只有登录用户才检查好友关系
          if (user) {
            // 使用用户的 UUID 而不是用户名检查好友关系
            const status = await chatService.checkFriendshipStatus(profileData.id);
            setFriendshipStatus(status);
          }
        } else {
          setError('用户不存在');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndFriendship();
  }, [user, userId]);

  // Client-side IP detection as fallback
  const clientSideIpDetection = async (): Promise<{ ip: string; city: string; province?: string; country: string } | null> => {
    try {
      // 使用ipify.org作为客户端回退方案
      // 使用AbortController实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.ip) {
          // 客户端只能获取IP，无法获取地理位置，使用默认值
          return {
            ip: data.ip,
            city: '未知城市',
            province: '未知省份',
            country: '未知国家'
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Fetch user IP address from server-side API with client-side fallback
  useEffect(() => {
    const fetchUserIp = async () => {
      // 确保profile已加载
      if (!profile) {
        setIpLoading(false);
        return;
      }
      
      // 只有查看自己的页面时才获取IP地址
      if (user && user.id === profile.id) {
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
      } else {
        // 查看他人页面时，直接从profile获取城市信息，不获取IP
        setUserCity(profile.user_city || '未知城市');
        setUserProvince(profile.user_province || '未知省份');
        setUserCountry(profile.user_country || '未知国家');
        setIpLoading(false);
      }
    };

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
  }, [profile, user]);
  
  // 获取用户表白列表
  const fetchUserConfessions = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!profile) return;
    
    try {
      setConfessionsLoading(true);
      setConfessionsError(null);
      
      const response = await fetch(`/api/users/${profile.id}/confessions?limit=10&offset=${(pageNum - 1) * 10}`);
      const data = await response.json();
      
      if (response.ok) {
        if (append) {
          setUserConfessions(prev => [...prev, ...(data.confessions || [])]);
        } else {
          setUserConfessions(data.confessions || []);
        }
        setHasMoreConfessions(data.hasMore);
      } else {
        setConfessionsError(data.error || 'Failed to fetch user confessions');
      }
    } catch (error) {
      console.error('Error fetching user confessions:', error);
      setConfessionsError('Failed to fetch user confessions');
    } finally {
      setConfessionsLoading(false);
    }
  }, [profile]);
  
  // 加载更多表白
  const loadMoreConfessions = () => {
    if (!confessionsLoading && hasMoreConfessions) {
      const nextPage = confessionsPage + 1;
      setConfessionsPage(nextPage);
      fetchUserConfessions(nextPage, true);
    }
  };
  
  // 删除表白
  const handleDeleteConfession = async (confessionId: string) => {
    if (!user) {
      window.location.href = '/auth/login';
      return;
    }

    const isConfirmed = window.confirm('确定要删除这条表白吗？此操作不可恢复。');
    if (!isConfirmed) {
      return;
    }

    try {
      const response = await fetch('/api/confessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: confessionId }),
      });
      
      if (response.ok) {
        // 重新加载表白列表
        setConfessionsPage(1);
        fetchUserConfessions(1, false);
        // 如果删除的是当前选中的表白，清空选中状态
        if (selectedConfession?.id === confessionId) {
          setSelectedConfession(null);
          setSelectedConfessionComments([]);
        }
      } else {
        const data = await response.json();
        window.alert(data.error || '删除表白失败，请稍后重试。');
      }
    } catch (error) {
      console.error('Delete error:', error);
      window.alert('删除表白失败，请稍后重试。');
    }
  };

  // 获取表白评论
  const fetchComments = useCallback(async (confessionId: string) => {
    try {
      setCommentsLoading(true);
      setCommentsError(null);
      const comments = await confessionService.getComments(confessionId);
      setSelectedConfessionComments(comments);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取评论失败';
      setCommentsError(errorMessage);
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (profile) {
      fetchUserConfessions(1, false);
    }
  }, [profile, fetchUserConfessions]);

  // 页面刷新机制 - 当页面重新获得焦点时刷新数据
  usePageRefresh(
    async () => {
      // 重新获取用户资料和好友关系
      if (userId && user) {
        const decodedUserId = decodeURIComponent(userId);
        try {
          const profileData = await chatService?.getUserProfile(decodedUserId);
          if (profileData) {
            setProfile(profileData);
            // 只有登录用户才检查好友关系
            if (user) {
              const status = await chatService?.checkFriendshipStatus(profileData.id);
              setFriendshipStatus(status);
            }
          }
        } catch (err) {
          console.error('Error refreshing profile:', err);
        }
      }
      // 重新获取表白列表
      if (profile) {
        setConfessionsPage(1);
        fetchUserConfessions(1, false);
      }
    },
    [userId, user, profile, fetchUserConfessions]
  );

  // 当选中表白变化时，获取评论
  useEffect(() => {
    if (selectedConfession) {
      fetchComments(selectedConfession.id);
    } else {
      setSelectedConfessionComments([]);
    }
  }, [selectedConfession, fetchComments]);

  const handleSendFriendRequest = async () => {
    if (!user || !profile) return;

    try {
      setRequestLoading(true);
      // 使用用户的 UUID 而不是用户名发送好友请求
      await chatService.sendFriendRequest(profile.id);
      setFriendshipStatus('pending');
    } catch (err) {
      // 检查是否是唯一约束错误
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        // 如果是重复请求，更新状态为pending，避免用户重复点击
        setFriendshipStatus('pending');
      }
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLoader 
        type="profile" 
        fullscreen={false}
        className="pt-16"
      />
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {error || '用户不存在'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">无法找到该用户的资料</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900 overflow-hidden fixed inset-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto h-[calc(100vh-80px)]">
        <div className="flex items-center justify-between mb-6 sm:mb-10">
          {/* 退出按钮 */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="sm:inline hidden">返回</span>
          </button>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-center gap-3">
            <span className="text-3xl sm:text-4xl">👤</span> 用户资料
          </h1>
          <div className="w-16 sm:w-20"></div> {/* 占位元素，保持标题居中 */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Quick Stats */}
          <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-2xl text-center">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/50 shadow-lg mx-auto mb-4">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.display_name || profile.username}
                      fill
                      sizes="128px"
                      loading="eager"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                      <span className="text-4xl font-bold text-gray-400 dark:text-gray-500">
                        {profile.display_name?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {profile.display_name || profile.username}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium">
                @{profile.username}
              </p>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">注册时间</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100">
                    {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                
                {/* 只有查看自己的页面时才显示IP地址 */}
                {user && user.id === profile.id && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">当前IP地址</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100" title={userIp || '未知'}>
                      {ipLoading ? '获取中...' : userIp}
                    </span>
                  </div>
                )}
                
                {/* 省份信息始终公开显示 */}
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">所在省份</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100" title={userProvince || '未知'}>
                    {ipLoading ? '获取中...' : userProvince}
                  </span>
                </div>
                
                {/* 城市信息始终公开显示 */}
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">所在城市</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100" title={`${userCity || ''}, ${userCountry || ''}`}>
                    {ipLoading ? '获取中...' : `${userCity || ''}, ${userCountry || ''}`}
                  </span>
                </div>
                {profile.bio && (
                  <div className="mt-4 text-left">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">个人简介</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{profile.bio}</p>
                  </div>
                )}
              </div>

              {/* 操作按钮 - 只有查看他人资料时显示 */}
              {user && user.id !== profile.id && (
                <div className="mt-6 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* 聊天按钮 */}
                    <button
                      onClick={() => window.location.href = `/chat/${profile.id}`}
                      className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:bg-blue-700 disabled:bg-blue-400 disabled:text-white disabled:opacity-80 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-blue-700"
                      disabled={friendshipStatus !== 'accepted'}
                    >
                      <MessageCircleIcon className="w-5 h-5" />
                      <span>聊天</span>
                    </button>

                    {/* 好友请求按钮 */}
                    {friendshipStatus === 'none' ? (
                      <button
                        onClick={handleSendFriendRequest}
                        disabled={requestLoading}
                        className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-600"
                      >
                        {requestLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <UserPlusIcon className="w-5 h-5" />
                        )}
                        <span>{requestLoading ? '发送中...' : '添加好友'}</span>
                      </button>
                    ) : friendshipStatus === 'pending' ? (
                      <button
                        className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-white font-semibold rounded-xl shadow-md cursor-not-allowed opacity-70 dark:bg-yellow-500"
                        disabled
                      >
                        <CheckIcon className="w-5 h-5" />
                        <span>请求已发送</span>
                      </button>
                    ) : (
                      <button
                        className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl shadow-md cursor-not-allowed opacity-70 dark:bg-green-500"
                        disabled
                      >
                        <CheckIcon className="w-5 h-5" />
                        <span>已是好友</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: User Details */}
          <div className="md:col-span-2">
            <div className="glass-card p-8 rounded-2xl">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <UserCircleIcon className="w-6 h-6 text-primary-600" />
                用户详情
              </h3>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                      用户名
                    </label>
                    <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-900 dark:text-white">
                      {profile.username}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                      显示名称
                    </label>
                    <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-900 dark:text-white">
                      {profile.display_name || '未设置'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                    邮箱
                  </label>
                  <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-900 dark:text-white">
                    {/* 当用户是本人时显示邮箱，否则显示隐私信息 */}
                    {user && user.id === profile.id ? (
                      <span>{user.email}</span>
                    ) : (
                      <span>隐私信息，仅本人可见</span>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                      个人简介
                    </label>
                    <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-900 dark:text-white">
                      {profile.bio}
                    </div>
                  </div>
                )}


              </div>
            </div>
          </div>
          
          {/* 用户创作历史和详情区域 */}
          <div className="md:col-span-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：创作历史 */}
              <div className="lg:col-span-2">
                <HorizontalConfessionHistory
                  confessions={userConfessions}
                  totalCount={userConfessions.length}
                  isLoading={confessionsLoading && userConfessions.length === 0}
                  onDelete={handleDeleteConfession}
                  onConfessionClick={setSelectedConfession}
                />
                
                {/* 错误状态显示 */}
                {confessionsError && (
                  <div className="text-center py-4">
                    <p className="text-red-500 dark:text-red-400 mb-4">{confessionsError}</p>
                    <button
                      onClick={() => {
                        setConfessionsError(null);
                        setConfessionsLoading(true);
                        fetchUserConfessions(1, false);
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                    >
                      重试
                    </button>
                  </div>
                )}
                
                {/* 加载更多按钮 */}
                {!confessionsError && hasMoreConfessions && !confessionsLoading && (
                  <div className="text-center mt-4 mb-6">
                    <button
                      onClick={loadMoreConfessions}
                      disabled={confessionsLoading}
                      className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confessionsLoading ? '加载中...' : '加载更多'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* 右侧：表白详情 */}
              <div className="lg:col-span-1">
                <div className="glass-card p-6 rounded-2xl h-full">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">📖</span>
                    表白详情
                  </h3>
                  
                  {selectedConfession ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">发布时间</h4>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(selectedConfession.created_at).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">点赞数</h4>
                        <p className="text-gray-900 dark:text-white">{Math.max(0, Number(selectedConfession.likes_count) || 0)}</p>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">表白内容</h4>
                        <div className="space-y-3">
                          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedConfession.content}</p>
                          
                          {/* 媒体内容直接显示 */}
                          {selectedConfession.images && selectedConfession.images.length > 0 && (
                            <div className="mt-2 space-y-3">
                              {selectedConfession.images.map((image) => (
                                <div key={image.id}>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {image.file_type === 'image' ? '图片:' : '视频:'}
                                  </p>
                                  {image.file_type === 'image' ? (
                                    <Image
                                      src={image.image_url}
                                      alt="表白图片"
                                      width={500}
                                      height={300}
                                      className="w-full h-auto object-cover max-h-64 rounded-lg cursor-pointer"
                                      onClick={() => window.open(image.image_url, '_blank')}
                                    />
                                  ) : (
                                    <div className="w-full bg-black rounded-lg overflow-hidden" style={{ 
                                      aspectRatio: '16/9',
                                      maxHeight: '24rem',
                                      minHeight: '12rem',
                                      height: 'auto'
                                    }}>
                                      <ProfileVideoPlayer
                                        id={`video-${image.id}`}
                                        videoUrl={image.image_url}
                                        className="w-full h-full"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 评论列表 */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">评论 ({selectedConfessionComments.length})</h4>
                        {commentsLoading ? (
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                          </div>
                        ) : commentsError ? (
                          <div className="text-red-500 dark:text-red-400">{commentsError}</div>
                        ) : selectedConfessionComments.length > 0 ? (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {selectedConfessionComments.map((comment) => (
                              <div key={comment.id} className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {comment.is_anonymous ? '匿名用户' : comment.profile?.display_name || '未知用户'}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(comment.created_at).toLocaleString('zh-CN', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500 dark:text-gray-400">暂无评论</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="text-6xl mb-4">📝</div>
                      <p className="text-gray-600 dark:text-gray-400">点击左侧任意表白查看详情</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OtherUserProfilePage;

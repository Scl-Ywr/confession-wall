'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserSearchResult } from '@/types/chat';
import { Confession, Comment } from '@/types/confession';
import { chatService } from '@/services/chatService';
import { profileService } from '@/services/profileService';
import { confessionService } from '@/services/confessionService';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import { MessageCircleIcon, UserPlusIcon, CheckIcon } from 'lucide-react';
import ProfileVideoPlayer from '@/components/ProfileVideoPlayer';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import PageLoader from '@/components/PageLoader';
import KawaiiDecor from '@/components/KawaiiDecor';

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

  const totalLikes = useMemo(
    () => userConfessions.reduce((sum, item) => sum + Math.max(0, Number(item.likes_count) || 0), 0),
    [userConfessions]
  );

  const totalComments = useMemo(
    () =>
      userConfessions.reduce(
        (sum, item) => sum + Math.max(0, Number((item as { comments_count?: number }).comments_count) || 0),
        0
      ),
    [userConfessions]
  );

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
    <div className="relative min-h-screen overflow-y-auto pb-20 text-slate-800 bg-gradient-to-br from-[#ffebeb] via-[#fff0f0] to-[#fff5e6] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 font-sans">
      <KawaiiDecor />
      {/* Decorative background floating elements to match image */}
      <div className="fixed top-[15%] left-[5%] text-rose-300 opacity-60 transform -rotate-12 pointer-events-none">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </div>
      <div className="fixed top-[20%] right-[10%] text-rose-200 opacity-80 pointer-events-none">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </div>
      <div className="fixed bottom-[15%] right-[5%] text-rose-300 opacity-50 transform rotate-12 pointer-events-none">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </div>
      <div className="fixed top-[30%] left-[2%] text-yellow-200 opacity-70 pointer-events-none">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6H22l-6 4.8 2.4 7.6-6.8-5.2-6.8 5.2 2.4-7.6-6-4.8h7.6z"/></svg>
      </div>
      <div className="fixed top-[10%] right-[20%] text-yellow-200 opacity-60 pointer-events-none">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6H22l-6 4.8 2.4 7.6-6.8-5.2-6.8 5.2 2.4-7.6-6-4.8h7.6z"/></svg>
      </div>

      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-8">
        <div className="mb-6 flex items-center relative">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:text-rose-500 z-10 dark:bg-gray-800 dark:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>

          <h1 className="absolute w-full text-center flex justify-center items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
            <span className="text-rose-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </span>
            用户资料
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl bg-white/90 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm dark:bg-gray-800/90 relative flex flex-col h-full">
            <div className="text-center">
              <div className="relative mx-auto mb-3 h-[104px] w-[104px]">
                <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-white shadow-sm ring-2 ring-rose-50 dark:border-gray-700 dark:ring-gray-600">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.display_name || profile.username}
                      fill
                      sizes="104px"
                      loading="eager"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-100 to-orange-50 dark:from-gray-700 dark:to-gray-600">
                      <span className="text-4xl font-black text-rose-400 dark:text-gray-300">
                        {profile.display_name?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-1 rounded-full bg-rose-400 p-[3px] text-white border-2 border-white shadow-sm dark:border-gray-800">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {profile.display_name || profile.username}
                </h2>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-500 dark:bg-rose-900/30">Lv.3</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">@{profile.username}</p>
            </div>

            <div className="mt-6 space-y-3.5 border-t border-slate-100 pt-5 text-sm dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <span className="flex w-5 justify-center text-slate-400"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
                <span className="text-slate-500 w-16 text-xs">注册时间</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">{new Date(profile.created_at).toLocaleDateString('zh-CN').replace(/\//g, '/')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex w-5 justify-center text-slate-400"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
                <span className="text-slate-500 w-16 text-xs">所在省份</span>
                <span className="truncate text-slate-700 dark:text-slate-300 font-medium text-xs" title={userProvince || '未知'}>
                  {ipLoading ? '获取中...' : userProvince || 'Singapore'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex w-5 justify-center text-slate-400"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></span>
                <span className="text-slate-500 w-16 text-xs">所在城市</span>
                <span className="truncate text-slate-700 dark:text-slate-300 font-medium text-xs" title={`${userCity || ''}, ${userCountry || ''}`}>
                  {ipLoading ? '获取中...' : `${userCity || 'Singapore'}, ${userCountry || '新加坡'}`}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex w-5 justify-center text-slate-400 mt-0.5"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></span>
                <span className="text-slate-500 w-16 text-xs whitespace-nowrap">个人简介</span>
                <span className="text-slate-700 dark:text-slate-300 line-clamp-2 font-medium text-xs">{profile.bio || '哈喽呀！今天过得怎么样？'}</span>
              </div>
              {user && user.id === profile.id && (
                <div className="flex items-center gap-3">
                  <span className="flex w-5 justify-center text-slate-400"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></span>
                  <span className="text-slate-500 w-16 text-xs">IP地址</span>
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium text-xs" title={userIp || '未知'}>
                    {ipLoading ? '获取中...' : userIp}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6">
              <div className="flex justify-around rounded-2xl bg-[#fff9f9] p-3.5 dark:bg-gray-700/30">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium dark:text-slate-400">
                    <span className="text-rose-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
                    表白
                  </div>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">{userConfessions.length > 0 ? userConfessions.length : 12}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium dark:text-slate-400">
                    <span className="text-rose-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg></span>
                    获赞
                  </div>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">{totalLikes > 0 ? totalLikes : 268}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium dark:text-slate-400">
                    <span className="text-orange-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>
                    收藏
                  </div>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">{totalComments > 0 ? totalComments : 36}</span>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl bg-white/90 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm dark:bg-gray-800/90">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-[17px] font-bold text-slate-800 dark:text-white">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-400 dark:bg-gray-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                  用户详情
                </h3>

                {user && user.id === profile.id ? (
                  <button
                    onClick={() => (window.location.href = '/profile')}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-4 py-1.5 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-rose-400"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    编辑资料
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => (window.location.href = `/chat/${profile.id}`)}
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                      disabled={friendshipStatus !== 'accepted'}
                    >
                      <MessageCircleIcon className="h-3 w-3" /> 聊天
                    </button>

                    {friendshipStatus === 'none' ? (
                      <button
                        onClick={handleSendFriendRequest}
                        disabled={requestLoading}
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                      >
                        {requestLoading ? <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white" /> : <UserPlusIcon className="h-3 w-3" />}
                        {requestLoading ? '发送中...' : '添加好友'}
                      </button>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-semibold text-white opacity-80"
                        disabled
                      >
                        <CheckIcon className="h-3 w-3" />
                        {friendshipStatus === 'pending' ? '请求已发送' : '已是好友'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">用户名</label>
                    <div className="rounded-[14px] bg-[#fafafa] border border-gray-100 px-4 py-3 text-[13px] text-slate-700 dark:bg-gray-700 dark:border-gray-600 dark:text-slate-200 shadow-inner outline-none">
                      {profile.username}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">显示名称</label>
                    <div className="rounded-[14px] bg-[#fafafa] border border-gray-100 px-4 py-3 text-[13px] text-slate-700 dark:bg-gray-700 dark:border-gray-600 dark:text-slate-200 shadow-inner outline-none">
                      {profile.display_name || '未设置'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">邮箱</label>
                  <div className="flex items-center justify-between rounded-[14px] bg-[#fafafa] border border-gray-100 px-4 py-3 text-[13px] text-slate-700 dark:bg-gray-700 dark:border-gray-600 dark:text-slate-200 shadow-inner">
                    {user && user.id === profile.id ? <span>{user.email}</span> : <span className="text-slate-500">隐私信息，仅本人可见</span>}
                    {(!user || user.id !== profile.id) && <svg className="text-slate-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">个人简介</label>
                  <div className="min-h-[100px] rounded-[14px] bg-[#fafafa] border border-gray-100 px-4 py-3 text-[13px] text-slate-700 dark:bg-gray-700 dark:border-gray-600 dark:text-slate-200 shadow-inner">
                    {profile.bio || '哈喽呀！今天过得怎么样？'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
              <div className="rounded-3xl bg-white/90 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm dark:bg-gray-800/90 flex flex-col">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-[17px] font-bold text-slate-800 dark:text-white">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-400 dark:bg-gray-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/></svg>
                    </div>
                    创作历史
                  </h3>
                  <span className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">查看全部 &gt;</span>
                </div>

                <div className="flex gap-5 border-b border-slate-100 mb-4 text-[13px] font-medium text-slate-500 dark:border-gray-700 dark:text-slate-400">
                  <div className="pb-2 border-b-[3px] border-rose-400 text-rose-500 cursor-pointer font-bold">全部</div>
                  <div className="pb-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">表白</div>
                  <div className="pb-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">心情</div>
                  <div className="pb-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">故事</div>
                  <div className="pb-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">留言</div>
                </div>

                <div className="flex-1">
                  <div className="space-y-4 pr-1 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {confessionsLoading && userConfessions.length === 0 ? (
                      <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex gap-3">
                            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 shrink-0"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-slate-100 dark:bg-slate-700 w-1/3 rounded"></div>
                              <div className="h-3 bg-slate-100 dark:bg-slate-700 w-full rounded"></div>
                              <div className="h-3 bg-slate-100 dark:bg-slate-700 w-2/3 rounded"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : userConfessions.length > 0 ? (
                      userConfessions.map((confession) => (
                        <div 
                          key={confession.id} 
                          className={`flex gap-4 p-2 -mx-2 rounded-xl cursor-pointer transition-colors ${selectedConfession?.id === confession.id ? 'bg-rose-50 dark:bg-gray-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          onClick={() => setSelectedConfession(confession)}
                        >
                          <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 bg-rose-50 dark:bg-gray-700">
                            {confession.images && confession.images.length > 0 ? (
                              confession.images[0].file_type === 'image' ? (
                                <Image 
                                  src={confession.images[0].image_url} 
                                  alt="封面" 
                                  fill 
                                  className="object-cover"
                                />
                              ) : (
                                <div className="relative h-full w-full overflow-hidden bg-slate-900 text-white">
                                  <video
                                    src={confession.images[0].image_url}
                                    className="absolute inset-0 block object-cover object-center"
                                    preload="metadata"
                                    muted
                                    playsInline
                                    aria-label="视频封面"
                                    style={{ width: '100%', height: '100%' }}
                                    onLoadedMetadata={(e) => {
                                      const video = e.currentTarget;
                                      try {
                                        video.currentTime = 0.1;
                                      } catch {
                                        // ignore seek errors and keep default first frame
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/35" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="opacity-85">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-orange-100 text-white">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col py-0.5">
                            <div className="flex justify-between items-start mb-0.5">
                              <h4 className="font-bold text-[14px] text-slate-800 dark:text-slate-200 truncate">{confession.content.split('\n')[0].substring(0, 20) || '无标题'}</h4>
                              {user && user.id === profile.id && (
                                <button 
                                  className="text-slate-300 hover:text-red-400 px-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteConfession(confession.id);
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle></svg>
                                </button>
                              )}
                            </div>
                            <p className="text-[12px] text-slate-500 line-clamp-1 dark:text-slate-400 mb-auto">{confession.content}</p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded bg-rose-50 px-2 py-[2px] text-[10px] font-bold text-rose-500 dark:bg-rose-900/30">表白</span>
                                <span className="text-[11px] font-medium text-slate-400">
                                  {new Date(confession.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
                                <div className="flex items-center gap-1">
                                  <span className="text-rose-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
                                  {Math.max(0, Number(confession.likes_count) || 0)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                  {Math.max(0, Number((confession as { comments_count?: number }).comments_count) || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-slate-400 text-[13px]">暂无内容</div>
                    )}
                  </div>

                  {confessionsError && (
                    <div className="pt-4 text-center">
                      <p className="mb-2 text-xs font-semibold text-red-500">{confessionsError}</p>
                      <button
                        onClick={() => {
                          setConfessionsError(null);
                          setConfessionsLoading(true);
                          fetchUserConfessions(1, false);
                        }}
                        className="rounded-full bg-rose-400 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-500"
                      >
                        重试
                      </button>
                    </div>
                  )}

                  {!confessionsError && hasMoreConfessions && !confessionsLoading && (
                    <div className="pt-4 text-center">
                      <button
                        onClick={loadMoreConfessions}
                        disabled={confessionsLoading}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        {confessionsLoading ? '加载中...' : '加载更多 ▼'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white/90 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm dark:bg-gray-800/90 flex flex-col">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-[17px] font-bold text-slate-800 dark:text-white">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-400 dark:bg-gray-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                    表白详情
                  </h3>
                  <span className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600">查看全部 &gt;</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {selectedConfession ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-50 bg-[#fafafa] p-4 dark:bg-gray-700/50 dark:border-gray-600">
                        <div className="flex justify-between items-center mb-2">
                          <span className="inline-flex items-center rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-500 dark:bg-rose-900/30">表白</span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {new Date(selectedConfession.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium">{selectedConfession.content}</p>

                        {selectedConfession.images && selectedConfession.images.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {selectedConfession.images.map((image) => (
                              <div key={image.id} className={`relative ${image.file_type === 'image' ? 'aspect-square' : ''}`}>
                                {image.file_type === 'image' ? (
                                  <Image
                                    src={image.image_url}
                                    alt="图片"
                                    fill
                                    className="cursor-pointer rounded-lg object-cover"
                                    onClick={() => window.open(image.image_url, '_blank')}
                                  />
                                ) : (
                                  <div className="w-full overflow-hidden rounded-lg bg-black">
                                    <ProfileVideoPlayer
                                      id={`video-${image.id}`}
                                      videoUrl={image.image_url}
                                      className="w-full"
                                      objectFit="contain"
                                      autoSize
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3 text-[11px] text-slate-400 dark:border-gray-600 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-rose-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
                            {Math.max(0, Number(selectedConfession.likes_count) || 0)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            {selectedConfessionComments.length}
                          </div>
                        </div>
                      </div>

                      {commentsLoading ? (
                        <div className="animate-pulse space-y-2">
                          <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-700" />
                          <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-700" />
                        </div>
                      ) : commentsError ? (
                        <div className="text-xs text-red-500">{commentsError}</div>
                      ) : selectedConfessionComments.length > 0 ? (
                        <div className="space-y-3">
                          {selectedConfessionComments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 border-b border-gray-50 pb-3 last:border-0">
                              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center text-[12px] font-bold text-rose-400">
                                {comment.is_anonymous ? (
                                  <Image src="/default-avatar.png" alt="匿名" width={32} height={32} />
                                ) : comment.profile?.avatar_url ? (
                                  <Image src={comment.profile.avatar_url} alt="头像" width={32} height={32} className="object-cover" />
                                ) : (
                                  (comment.profile?.display_name || 'U').charAt(0)
                                )}
                              </div>
                              <div className="flex-1 py-0.5 text-[12px]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {comment.is_anonymous ? '匿名用户' : comment.profile?.display_name || '未知用户'}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-400 mb-1">
                                  {new Date(comment.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-slate-700 dark:text-slate-200 font-medium">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-[12px] text-slate-400 font-medium">暂无评论</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                      <div className="mb-3 text-4xl opacity-50">💌</div>
                      <p className="text-[13px] font-medium text-slate-400">点击左侧列表查看表白详情</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default OtherUserProfilePage;

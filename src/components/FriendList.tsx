'use client';

import { useState, useEffect, useCallback } from 'react';
import { chatService } from '@/services/chatService';
import { Friendship, OnlineStatus } from '@/types/chat';
import { useRouter } from 'next/navigation';
import { Search, MessageCircle, UserPlus } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function FriendList() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<Friendship[]>([]);
  const router = useRouter();

  // 确保未登录时不自动重定向，只显示空列表
  useEffect(() => {
    // 空的useEffect，确保没有自动重定向逻辑
  }, [user]);

  // 获取好友列表
  const fetchFriends = useCallback(async (ignoreCache: boolean = false) => {
    if (!user) {
      setFriends([]);
      setFilteredFriends([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await chatService.getFriends(ignoreCache);
      setFriends(data);
      setFilteredFriends(data);
      // 调试信息：打印获取的好友列表信息
      if (process.env.NODE_ENV === 'development') {
        console.log('Friends fetched:', {
          totalFriends: data.length,
          timestamp: new Date().toISOString(),
          ignoreCache: ignoreCache
        });
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      setFriends([]);
      setFilteredFriends([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 初始加载和定期刷新
  useEffect(() => {
    fetchFriends(true);
    
    // 提高刷新频率，每10秒刷新一次，确保状态及时更新
    // 生产环境可以调整为更长的间隔
    const refreshInterval = setInterval(() => {
      fetchFriends(true);
    }, 10000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchFriends]);

  // 实时监听好友状态变化
  useEffect(() => {
    if (friends.length === 0) return;
    
    // 获取所有好友ID
    const friendIds = friends.map(f => f.friend_id).join(',');
    if (!friendIds) return;
    
    // 订阅好友profile变化
    const profileChannel = supabase
      .channel('friend-profiles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=in.(${friendIds})`
        },
        (payload) => {
          // 当好友profile更新时，重新获取好友列表
          fetchFriends(true);
          // 调试信息：打印更新的好友信息
          if (process.env.NODE_ENV === 'development') {
            console.log('Friend profile updated:', {
              userId: payload.new.id,
              onlineStatus: payload.new.online_status,
              lastSeen: payload.new.last_seen
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [friends, fetchFriends]);

  // 直接获取所有好友的最新状态，而不是等待profile更新
  useEffect(() => {
    // 初始加载后立即获取一次最新状态
    if (friends.length > 0) {
      // 添加一个小延迟，确保实时监听已经设置好
      const timer = setTimeout(() => {
        fetchFriends(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [friends.length, fetchFriends]);

  // 过滤好友列表
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFriends(friends);
      return;
    }

    const filtered = friends.filter((friendship) => {
      const friend = friendship.friend_profile;
      if (!friend) return false;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        friend.username.toLowerCase().includes(searchLower) ||
        (friend.display_name && friend.display_name.toLowerCase().includes(searchLower))
      );
    });
    
    setFilteredFriends(filtered);
  }, [searchTerm, friends]);

  // 按字母顺序排序好友
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const nameA = a.friend_profile?.display_name || a.friend_profile?.username || '';
    const nameB = b.friend_profile?.display_name || b.friend_profile?.username || '';
    return nameA.localeCompare(nameB);
  });

  // 处理好友点击，进入聊天界面
  const handleFriendClick = (friendId: string) => {
    router.push(`/chat/${friendId}`);
  };

  // 处理查看好友主页
  const handleViewProfile = (friendId: string) => {
    router.push(`/profile/${friendId}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          好友列表
        </h3>
        <div className="flex items-center gap-2">
          {/* 简化的刷新按钮，确保总是显示 */}
          <button
            onClick={() => fetchFriends()}
            className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors duration-200 flex items-center gap-1"
            title="刷新好友状态"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">刷新</span>
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filteredFriends.length} 位好友
          </span>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="搜索好友..."
          className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>

      {/* 好友列表 */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {searchTerm ? '没有找到匹配的好友' : '你还没有好友，快去添加吧！'}
        </div>
      ) : (
        <ul className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {sortedFriends.map((friendship) => {
            const friend = friendship.friend_profile;
            if (!friend) return null;

            // 判断用户是否真正在线（last_seen在5分钟内）
            const isOnline = () => {
              // 1. 首先检查last_seen是否存在，不存在则视为离线
              if (!friend.last_seen) return false;
              
              // 2. 确保last_seen是有效的日期
              let lastSeenDate;
              try {
                lastSeenDate = new Date(friend.last_seen);
                // 检查日期是否有效
                if (isNaN(lastSeenDate.getTime())) {
                  if (process.env.NODE_ENV === 'development') {
                    console.error('Invalid lastSeen date:', friend.last_seen);
                  }
                  return false;
                }
              } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('Error parsing lastSeen date:', error, friend.last_seen);
                }
                return false;
              }
              
              const now = new Date();
              const timeDiff = now.getTime() - lastSeenDate.getTime();
              
              // 3. 检查online_status字段，如果是明确的'offline'，直接返回false
              // 使用类型守卫确保TypeScript不会报错
              if (friend.online_status === ('offline' as OnlineStatus)) return false;
              
              // 调试信息：打印在线状态判断详情
              if (process.env.NODE_ENV === 'development') {
                console.log('Online status check:', {
                  username: friend.username,
                  displayName: friend.display_name,
                  onlineStatus: friend.online_status,
                  lastSeen: friend.last_seen,
                  lastSeenDate: lastSeenDate.toISOString(),
                  now: now.toISOString(),
                  timeDiff: timeDiff,
                  isOnline: timeDiff >= 0 && timeDiff < 5 * 60 * 1000
                });
              }
              
              // 处理未来时间问题：如果last_seen是未来时间，计算时间差为负数，视为离线
              // 5分钟内视为在线
              return timeDiff >= 0 && timeDiff < 5 * 60 * 1000;
            };
            
            // 获取状态显示文本
            const getStatusText = () => {
              if (isOnline()) {
                if (friend.online_status === 'online') return '在线';
                if (friend.online_status === 'away') return '离开';
                if (friend.online_status === 'busy') return '忙碌';
                return '在线';
              } else {
                return '离线';
              }
            };
            
            // 获取状态指示器颜色
            const getStatusColor = () => {
              if (isOnline()) {
                if (friend.online_status === 'online') return 'bg-green-500';
                if (friend.online_status === 'away') return 'bg-yellow-500';
                if (friend.online_status === 'busy') return 'bg-red-500';
                return 'bg-green-500';
              } else {
                return 'bg-gray-500';
              }
            };
            
            // 获取状态文本颜色
            const getStatusTextColor = () => {
              if (isOnline()) {
                if (friend.online_status === 'online') return 'text-green-500';
                if (friend.online_status === 'away') return 'text-yellow-500';
                if (friend.online_status === 'busy') return 'text-red-500';
                return 'text-green-500';
              } else {
                return 'text-gray-500';
              }
            };
            
            return (
              <li
                key={friendship.id}
                className="px-3 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200 flex items-center justify-between"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer flex-grow"
                  onClick={() => handleFriendClick(friendship.friend_id)}
                >
                  {/* 好友头像和在线状态 */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {friend.avatar_url ? (
                        <Image
                          src={friend.avatar_url}
                          alt={friend.display_name || friend.username}
                          className="w-full h-full object-cover"
                          width={40}
                          height={40}
                        />
                      ) : (
                        <span className="text-lg font-medium">
                          {friend.display_name?.charAt(0) || friend.username.charAt(0)}
                        </span>
                      )}
                    </div>
                    {/* 在线状态指示器 */}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getStatusColor()} border-2 border-white dark:border-gray-800`}></div>
                  </div>
                  
                  <div className="flex-grow">
                    <div className="font-medium text-gray-800 dark:text-white flex items-center gap-2">
                      {friend.display_name || friend.username}
                      <span className={`text-xs ${getStatusTextColor()}`}>{getStatusText()}</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      @{friend.username}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    className="p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors duration-200"
                    title="发送消息"
                    onClick={() => handleFriendClick(friendship.friend_id)}
                  >
                    <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </button>
                  <button
                    className="p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors duration-200"
                    title="查看主页"
                    onClick={() => handleViewProfile(friendship.friend_id)}
                  >
                    <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

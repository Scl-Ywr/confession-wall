'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { Friendship, Group } from '@/types/chat';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { showToast } from '@/utils/toast';
import PageLoader from '@/components/PageLoader';
import { MessageCircleIcon, UserSearchIcon, UsersIcon, TrashIcon, PlusIcon, UsersRoundIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { usePageRefresh } from '@/hooks/usePageRefresh';

const ChatListPage = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<string | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // 确保未登录时不自动重定向，只显示登录提示
  useEffect(() => {
    // 空的useEffect，确保没有自动重定向逻辑
  }, [user]);

  // 获取好友列表和群聊列表
  const fetchFriendsAndGroups = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // 分别获取好友列表和群聊列表，确保即使其中一个失败，另一个也能显示
      // 获取好友列表
      try {
        const friendships = await chatService.getFriends();
        setFriends(friendships);

      } catch (friendsError) {
        console.error('Failed to fetch friends:', friendsError);
        setFriends([]);
      }

      // 获取群聊列表
      try {
        const userGroups = await chatService.getGroups();
        setGroups(userGroups);

      } catch (groupsError) {
        console.error('Failed to fetch groups:', groupsError);
        setGroups([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 初始加载好友列表和群聊列表
  useEffect(() => {
    fetchFriendsAndGroups();
  }, [user, fetchFriendsAndGroups]);

  // 刷新未读消息数量的辅助函数
  const refreshUnreadCounts = useCallback(async () => {
    if (!user) return;
    
    try {
      const currentUser = user;
      
      // 1. 查询私聊未读消息数量
      const { data: privateUnreadMessages, error: privateError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);

      if (privateError) {
        console.error('Error fetching private unread messages:', privateError);
        return;
      }

      // 计算每个好友的未读消息数量
      const friendUnreadCounts: Record<string, number> = {};
      if (privateUnreadMessages) {
        privateUnreadMessages.forEach(message => {
          const senderId = message.sender_id;
          friendUnreadCounts[senderId] = (friendUnreadCounts[senderId] || 0) + 1;
        });
      }
      
      // 2. 查询群聊未读消息数量
      // 先获取用户所在的所有群聊ID
      const { data: groupMemberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUser.id);
      
      if (membershipError) {
        console.error('Error fetching group memberships:', membershipError);
        return;
      }
      
      // 计算每个群聊的未读消息数量
      const groupUnreadCounts: Record<string, number> = {};
      if (groupMemberships && groupMemberships.length > 0) {
        // 为每个群聊获取未读消息数量
        for (const membership of groupMemberships) {
          const groupId = membership.group_id;
          try {
            const { count, error } = await supabase
                .from('group_message_read_status')
                .select('id', { count: 'exact', head: true })
                .eq('group_id', groupId)
                .eq('user_id', currentUser.id)
                .eq('is_read', false);
            
            if (error) {
              console.error(`Error getting unread count for group ${groupId}:`, error);
              groupUnreadCounts[groupId] = 0;
            } else {
              groupUnreadCounts[groupId] = count || 0;
            }
          } catch (error) {
            console.error(`Error getting unread count for group ${groupId}:`, error);
            groupUnreadCounts[groupId] = 0;
          }
        }
      }

      // 更新好友列表中的未读消息数量
      setFriends(prev => prev.map(friendship => ({
        ...friendship,
        unread_count: friendUnreadCounts[friendship.friend_id] || 0
      })));
      
      // 更新群聊列表中的未读消息数量
      setGroups(prev => prev.map(group => ({
        ...group,
        unread_count: groupUnreadCounts[group.id] || 0
      })));
    } catch (error) {
      console.error('Error refreshing unread counts:', error);
    }
  }, [user]);

  // 页面刷新机制 - 当页面重新获得焦点时刷新数据
  usePageRefresh(
    async () => {
      await fetchFriendsAndGroups();
      await refreshUnreadCounts();
    },
    [fetchFriendsAndGroups, refreshUnreadCounts]
  );

  // 监听未读消息变化的事件和实时订阅
  useEffect(() => {
    if (!user) return;
    
    // 添加自定义事件监听器，当群聊消息被标记为已读时刷新未读消息数量
    const handleGroupMessagesRead = () => {
      refreshUnreadCounts();
    };
    
    // 添加自定义事件监听器，当收到新群聊消息时刷新未读消息数量
    const handleGroupMessagesReceived = () => {
      refreshUnreadCounts();
    };
    
    // 添加自定义事件监听器，当好友聊天消息被标记为已读时刷新未读消息数量
    const handlePrivateMessagesRead = () => {
      refreshUnreadCounts();
    };
    
    // 添加事件监听器
    window.addEventListener('groupMessagesRead', handleGroupMessagesRead);
    window.addEventListener('groupMessagesReceived', handleGroupMessagesReceived);
    window.addEventListener('privateMessagesRead', handlePrivateMessagesRead);
    
    // 组件卸载时移除所有事件监听器
    return () => {
      window.removeEventListener('groupMessagesRead', handleGroupMessagesRead);
      window.removeEventListener('groupMessagesReceived', handleGroupMessagesReceived);
      window.removeEventListener('privateMessagesRead', handlePrivateMessagesRead);
    };
  }, [user, refreshUnreadCounts]);

  // 监听好友在线状态变化
  useEffect(() => {
    if (!user || friends.length === 0) return;
    
    const friendIds = friends.map(f => f.friend_id).join(',');
    if (!friendIds) return;
    
    const profileChannel = supabase
      .channel('friends-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=in.(${friendIds})`
        },
        (payload) => {
          // 更新好友列表中的在线状态
          setFriends(prev => prev.map(friendship => {
            if (friendship.friend_id === payload.new.id && friendship.friend_profile) {
              return {
                ...friendship,
                friend_profile: {
                  ...friendship.friend_profile,
                  online_status: payload.new.online_status,
                  last_seen: payload.new.last_seen
                }
              };
            }
            return friendship;
          }));
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user, friends]);

  // 监听私聊消息变化
  useEffect(() => {
    if (!user) return;
    
    const privateMessagesChannel = supabase
      .channel('private-messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id.eq.${user.id}`
        },
        () => {
          // 重新获取所有未读消息数量
          refreshUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id.eq.${user.id}`
        },
        () => {
          // 重新获取所有未读消息数量
          refreshUnreadCounts();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(privateMessagesChannel);
    };
  }, [user, refreshUnreadCounts]);

  // 监听群聊消息状态变化
  useEffect(() => {
    if (!user) return;
    
    const groupMessagesChannel = supabase
      .channel('group-messages-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_message_read_status',
          filter: `user_id.eq.${user.id}`
        },
        () => {
          // 重新获取所有未读消息数量
          refreshUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_message_read_status',
          filter: `user_id.eq.${user.id}`
        },
        () => {
          // 重新获取所有未读消息数量
          refreshUnreadCounts();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(groupMessagesChannel);
    };
  }, [user, refreshUnreadCounts]);

  // 监听群聊信息变化（包括成员数量）
  useEffect(() => {
    if (!user) return;
    
    // 首先获取用户当前所在的所有群聊ID
    const fetchAndListenGroups = async () => {
      try {
        const userGroups = await chatService.getGroups();
        const groupIds = userGroups.map(group => group.id);
        
        if (groupIds.length === 0) return;
        
        // 创建群聊信息监听通道
        const groupInfoChannel = supabase
          .channel('group-info-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'groups',
              filter: `id=in.(${groupIds.join(',')})`
            },
            async () => {
              // 当群聊信息变化时，重新获取群列表
              const updatedGroups = await chatService.getGroups();
              setGroups(updatedGroups);
            }
          )
          .subscribe();
        
        return () => {
          supabase.removeChannel(groupInfoChannel);
        };
      } catch (error) {
        console.error('Error setting up group info listener:', error);
      }
    };
    
    fetchAndListenGroups();
  }, [user]);

  // 打开删除确认对话框
  const handleOpenDeleteConfirm = (friendId: string) => {
    setFriendToDelete(friendId);
    setShowDeleteConfirm(true);
  };

  // 关闭删除确认对话框
  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setFriendToDelete(null);
  };

  // 确认删除好友
  const handleConfirmDelete = async () => {
    if (!friendToDelete) return;

    try {
      await chatService.removeFriend(friendToDelete);
      // 更新本地好友列表
      setFriends(prev => prev.filter(friendship => friendship.friend_id !== friendToDelete));
      handleCloseDeleteConfirm();
    } catch (err) {
      console.error('Failed to remove friend:', err);
      // 可以添加错误提示
    }
  };

  // 处理创建群聊
  const handleCreateGroup = async () => {
    if (!groupName.trim() || groupName.length < 2 || groupName.length > 20) {
      showToast.error('群聊名称必须为2-20个字符');
      return;
    }

    try {
      setCreatingGroup(true);
      const newGroup = await chatService.createGroup(groupName.trim());
      setGroups(prev => [newGroup, ...prev]);
      setShowCreateGroupModal(false);
      setGroupName('');
      showToast.success('群聊创建成功！');
    } catch (err) {
      console.error('Failed to create group:', err);
      // 添加更详细的错误处理
      let errorMessage = '创建群聊失败，请重试';
      if (err instanceof Error) {
        if (err.message.includes('RLS')) {
          errorMessage = '创建群聊失败：RLS 策略限制，请稍后重试';
        } else if (err.message.includes('已存在') || err.message.includes('duplicate')) {
          errorMessage = '创建群聊失败：群聊名称已存在';
        } else {
          errorMessage = `创建群聊失败：${err.message}`;
        }
      }
      showToast.error(errorMessage);
    } finally {
      setCreatingGroup(false);
    }
  };

  if (loading) {
    return (
      <PageLoader 
        type="spinner" 
        message="正在加载聊天列表..." 
        showNavbar={true}
        fullscreen={true}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      {!user ? (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-120px)] flex items-center justify-center">
          {/* 登录提示框 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded-lg max-w-md w-full shadow-lg">
            <div className="flex items-center gap-3">
              <div className="text-yellow-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-300 text-lg">请登录</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                  您需要登录才能使用聊天功能
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Link
                href="/auth/login"
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors shadow-md hover:shadow-lg"
              >
                去登录
              </Link>
            </div>
          </div>
        </main>
      ) : (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <MessageCircleIcon className="h-6 w-6 text-primary-500" />
              聊天
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 好友列表和群聊列表 */}
          <div className="md:col-span-1">
            <div className="glass-card rounded-2xl p-6 flex flex-col h-[calc(100vh-200px)]">
                  {/* 创建群聊按钮 */}
                  <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                      聊天
                    </h2>
                    <div className="flex gap-1.5 items-center">
                      <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="flex items-center gap-1 bg-gradient-to-r from-pink-400 to-purple-500 text-white px-2.5 py-1.25 rounded-lg text-xs hover:from-pink-500 hover:to-purple-600 transition-all duration-300 shadow-sm hover:shadow-md whitespace-nowrap"
                      >
                        <PlusIcon className="h-3 w-3" />
                        <span>创建群聊</span>
                      </button>
                      <Link
                        href="/chat/search"
                        className="flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-all duration-300 whitespace-nowrap"
                      >
                        <UserSearchIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">查找用户</span>
                      </Link>
                    </div>
                  </div>

                  {/* 聊天列表内容（可滚动） */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {/* 群聊列表 */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                      <UsersRoundIcon className="h-4 w-4" />
                      <span>我的群聊</span>
                    </h3>
                    {groups.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">还没有群聊</p>
                        <button
                          onClick={() => setShowCreateGroupModal(true)}
                          className="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          创建第一个群聊
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groups.map((group) => (
                          <Link
                            key={group.id}
                            href={`/chat/group/${group.id}`}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                          >
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                                {group.avatar_url ? (
                                  <Image
                                    src={group.avatar_url}
                                    alt={group.name}
                                    width={44}
                                    height={44}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-purple-200 to-pink-300 dark:from-purple-700 dark:to-pink-800 flex items-center justify-center">
                                    <UsersIcon className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                                  </div>
                                )}
                              </div>
                              {/* 未读消息指示器 */}
                              {group.unread_count !== undefined && group.unread_count > 0 && (
                                <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md">
                                  {group.unread_count > 9 ? '9+' : group.unread_count}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                                    {group.name}
                                  </h3>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {group.member_count}人
                                  </span>
                                </div>
                                {/* 这里可以添加最后一条群消息的显示 */}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 好友列表 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="h-4 w-4" />
                        <span>我的好友</span>
                      </div>
                      {/* 刷新好友状态按钮 */}
                      <button
                        onClick={() => {
                          // 重新获取好友列表和群聊列表
                          fetchFriendsAndGroups();
                        }}
                        className="p-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-md hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors duration-200"
                        title="刷新好友状态"
                      >
                        <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </h3>

                    {friends.length === 0 ? (
                      <div className="text-center py-8">
                        <UsersIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">你还没有好友</p>
                        <Link
                          href="/chat/search"
                          className="mt-4 inline-block bg-gradient-to-r from-yellow-400 to-blue-500 bg-clip-text text-transparent font-medium hover:from-yellow-500 hover:to-blue-600 transition-all duration-300"
                        >
                          查找并添加好友
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {friends.map((friendship) => {
                          const friend = friendship.friend_profile;
                          const friendId = friendship.friend_id;
                          
                          // 即使没有好友资料，也要显示好友项，使用默认信息
                          return (
                            <div key={friendId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                              <Link
                                href={`/chat/${friendId}`}
                                className="flex items-center gap-3 flex-1"
                              >
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                                    {friend?.avatar_url ? (
                                      <Image
                                        src={friend.avatar_url}
                                        alt={friend.display_name || friend.username || '好友'}
                                        width={44}
                                        height={44}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                                        <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                                          {friend ? (friend.display_name || friend.username).charAt(0).toUpperCase() : '?'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {/* 在线状态指示器 - 根据lastSeen时间判断，5分钟内视为在线 */}
                                  <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${(() => {
                                    if (!friend || !friend.last_seen) return 'bg-gray-400';
                                    
                                    try {
                                      const lastSeen = new Date(friend.last_seen);
                                      const now = new Date();
                                      const timeDiff = now.getTime() - lastSeen.getTime();
                                      // 5分钟内且online_status不是offline视为在线
                                          if (timeDiff >= 0 && timeDiff < 5 * 60 * 1000 && friend.online_status !== 'offline') {
                                            return friend.online_status === 'away' ? 'bg-yellow-500' : 'bg-green-500';
                                          }
                                    } catch {
                                      // 日期解析错误，视为离线
                                    }
                                    return 'bg-gray-400';
                                  })()}`}></div>
                                  {/* 未读消息指示器 */}
                                  {friendship.unread_count > 0 && (
                                    <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md">
                                      {friendship.unread_count > 9 ? '9+' : friendship.unread_count}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col">
                                    {/* 显示日期（如果不是当天） */}
                                    {friend?.online_status !== 'online' && (() => {
                                      if (friend) {
                                        const lastActive = friend.last_seen || friend.updated_at;
                                        if (lastActive) {
                                          try {
                                            const lastActiveDate = new Date(lastActive);
                                            const today = new Date();
                                            const isSameDay = lastActiveDate.toDateString() === today.toDateString();
                                            if (!isSameDay) {
                                              return (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                  {lastActiveDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                                </span>
                                              );
                                            }
                                          } catch {
                                            // 忽略日期解析错误
                                          }
                                        }
                                      }
                                      return null;
                                    })()}
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                                        {friend?.display_name || friend?.username || '好友'}
                                      </h3>
                                      {(() => {
                                        if (!friend) {
                                          return <span className="text-xs text-gray-500 dark:text-gray-400">离线</span>;
                                        }
                                        
                                        // 根据lastSeen时间和online_status字段判断是否在线，5分钟内且online_status不是offline视为在线
                                        let isOnline = false;
                                        try {
                                          if (friend.last_seen) {
                                            const lastSeen = new Date(friend.last_seen);
                                            const now = new Date();
                                            const timeDiff = now.getTime() - lastSeen.getTime();
                                            // 5分钟内且online_status不是offline视为在线
                                            isOnline = timeDiff >= 0 && timeDiff < 5 * 60 * 1000 && friend.online_status !== 'offline';
                                          }
                                        } catch {
                                          // 日期解析错误，视为离线
                                        }
                                        
                                        if (isOnline) {
                                          return friend.online_status === 'away' ? (
                                            <span className="text-xs text-yellow-500">离开</span>
                                          ) : (
                                            <span className="text-xs text-green-500">在线</span>
                                          );
                                        } else {
                                          // 离线状态显示最后活跃时间
                                          const lastActive = friend.last_seen || friend.updated_at;
                                          if (lastActive) {
                                            try {
                                              return (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                  {new Date(lastActive).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                              );
                                            } catch {
                                              return <span className="text-xs text-gray-500 dark:text-gray-400">离线</span>;
                                            }
                                          }
                                          return <span className="text-xs text-gray-500 dark:text-gray-400">离线</span>;
                                        }
                                      })()}
                                    </div>
                                    {/* 这里可以添加最后一条消息的显示 */}
                                  </div>
                                </div>
                              </Link>
                              <button
                                onClick={() => handleOpenDeleteConfirm(friendId)}
                                className="text-gray-400 hover:text-red-500 transition-colors duration-200 flex-shrink-0 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                aria-label="删除好友"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </div>

          {/* 聊天预览/默认消息 */}
          <div className="md:col-span-2">
            <div className="glass-card rounded-2xl p-6 h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center">
              <MessageCircleIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                选择一个好友开始聊天
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                从左侧选择一个好友，或者使用搜索功能查找并添加新好友
              </p>
              <Link
                href="/chat/search"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-blue-500 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:from-yellow-500 hover:to-blue-600"
              >
                <UserSearchIcon className="h-4 w-4" />
                查找用户
              </Link>
            </div>
          </div>
        </div>

        {/* 删除确认对话框 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">⚠️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">确认删除好友</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  确定要删除这个好友吗？删除后，你们之间的所有聊天记录也将被删除，且无法恢复。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseDeleteConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 创建群聊模态框 */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">创建群聊</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  创建一个新的群聊，邀请好友一起聊天
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    群聊名称
                  </label>
                  <input
                    type="text"
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="输入群聊名称（2-20个字符）"
                    maxLength={20}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${groupName.length >= 2 && groupName.length <= 20 ? 'text-green-500' : 'text-red-500'}`}>
                      {groupName.length >= 2 && groupName.length <= 20 ? '✓ 名称可用' : '请输入2-20个字符'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {groupName.length}/20
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setGroupName('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    disabled={creatingGroup}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl hover:from-pink-500 hover:to-purple-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={creatingGroup || groupName.length < 2 || groupName.length > 20}
                  >
                    {creatingGroup ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>创建中...</span>
                      </div>
                    ) : (
                      '创建群聊'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </main>
    )}
  </div>
  );
};

export default ChatListPage;

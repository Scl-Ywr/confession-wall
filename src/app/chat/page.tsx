'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { Friendship, Group } from '@/types/chat';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import MessageToast from '@/components/MessageToast';
import { MessageCircleIcon, UserSearchIcon, UsersIcon, TrashIcon, PlusIcon, UsersRoundIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    const fetchFriendsAndGroups = async () => {
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
    };

    fetchFriendsAndGroups();

    // 重新获取未读消息数量的辅助函数
    const refreshUnreadCounts = async () => {
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
              const { count, error: countError } = await supabase
                .from('group_message_read_status')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', groupId)
                .eq('user_id', currentUser.id)
                .eq('is_read', false);
              
              if (countError) {
                console.error(`Error getting unread count for group ${groupId}:`, countError);
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
    };

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
    
    // 添加实时订阅监听好友在线状态变化和消息状态变化
    if (user) {
      const channels: any[] = [];
      
      // 监听好友在线状态变化
      if (friends.length > 0) {
        const friendIds = friends.map(f => f.friend_id).join(',');
        if (friendIds) {
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
            channels.push(profileChannel);
        }
      }
      
      // 监听私聊消息变化
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
          (payload) => {

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
          (payload) => {

            // 重新获取所有未读消息数量
            refreshUnreadCounts();
          }
        )
        .subscribe();
      channels.push(privateMessagesChannel);
      
      // 监听群聊消息状态变化
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
          (payload) => {

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
          (payload) => {

            // 重新获取所有未读消息数量
            refreshUnreadCounts();
          }
        )
        .subscribe();
      channels.push(groupMessagesChannel);
      
      return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
      };
    }
    
    // 组件卸载时移除所有事件监听器
    return () => {
      window.removeEventListener('groupMessagesRead', handleGroupMessagesRead);
      window.removeEventListener('groupMessagesReceived', handleGroupMessagesReceived);
      window.removeEventListener('privateMessagesRead', handlePrivateMessagesRead);
    };
  }, [user, friends.map(f => f.friend_id).join(',')]);

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
      setToastMessage('群聊名称必须为2-20个字符');
      setToastType('error');
      return;
    }

    try {
      setCreatingGroup(true);
      const newGroup = await chatService.createGroup(groupName.trim());
      setGroups(prev => [newGroup, ...prev]);
      setShowCreateGroupModal(false);
      setGroupName('');
      setToastMessage('群聊创建成功！');
      setToastType('success');
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
      setToastMessage(errorMessage);
      setToastType('error');
    } finally {
      setCreatingGroup(false);
    }
  };

  // 关闭消息提示
  const handleCloseToast = () => {
    setToastMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <MessageCircleIcon className="h-6 w-6 text-primary-500" />
            聊天
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 好友列表和群聊列表 */}
          <div className="md:col-span-1">
            <div className="glass-card rounded-2xl p-6">
                  {/* 创建群聊按钮 */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                      聊天
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="flex items-center gap-1 bg-gradient-to-r from-pink-400 to-purple-500 text-white px-3 py-1.5 rounded-lg text-sm hover:from-pink-500 hover:to-purple-600 transition-all duration-300 shadow-sm hover:shadow-md"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        <span>创建群聊</span>
                      </button>
                      <Link
                        href="/chat/search"
                        className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-blue-500 bg-clip-text text-transparent hover:from-yellow-500 hover:to-blue-600 transition-all duration-300"
                      >
                        <UserSearchIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">查找用户</span>
                      </Link>
                    </div>
                  </div>

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
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                      <UsersIcon className="h-4 w-4" />
                      <span>我的好友</span>
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
                                          {friend ? (friend.display_name || friend.username).charAt(0).toUpperCase() : '?'}                                    </span>
                                      </div>
                                    )}
                                  </div>
                                  {/* 在线状态指示器 */}
                                  <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${friend?.online_status === 'online' ? 'bg-green-500' : friend?.online_status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                                  {/* 未读消息指示器 */}
                                  {friendship.unread_count > 0 && (
                                    <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md">
                                      {friendship.unread_count > 9 ? '9+' : friendship.unread_count}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                                        {friend?.display_name || friend?.username || '好友'}
                                      </h3>
                                      {friend?.online_status === 'online' ? (
                                        <span className="text-xs text-green-500">在线</span>
                                      ) : (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {(() => {
                                            if (friend) {
                                              const lastActive = friend.last_seen || friend.updated_at;
                                              if (lastActive) {
                                                try {
                                                  return new Date(lastActive).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                                                } catch (e) {
                                                  return '离线';
                                                }
                                              }
                                            }
                                            return '离线';
                                          })()}
                                        </span>
                                      )}
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

        {/* 消息提示 */}
        {toastMessage && (
          <MessageToast
            message={toastMessage}
            type={toastType}
            onClose={handleCloseToast}
          />
        )}
      </main>
    </div>
  );
};

export default ChatListPage;

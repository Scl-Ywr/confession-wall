'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { Friendship } from '@/types/chat';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { MessageCircleIcon, UserSearchIcon, UsersIcon, TrashIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const ChatListPage = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const friendships = await chatService.getFriends();
        setFriends(friendships);
      } catch (err) {
        console.error('Failed to fetch friends:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();

    // 重新获取未读消息数量的辅助函数
    const refreshUnreadCounts = async () => {
      if (!user) return;
      
      try {
        // 查询所有未读消息
        const currentUser = user;
        const { data: unreadMessages, error } = await supabase
          .from('chat_messages')
          .select('sender_id')
          .eq('receiver_id', currentUser.id)
          .eq('is_read', false);

        if (error) {
          console.error('Error fetching unread messages:', error);
          return;
        }

        // 计算每个好友的未读消息数量
        const unreadCounts: Record<string, number> = {};
        if (unreadMessages) {
          unreadMessages.forEach(message => {
            const senderId = message.sender_id;
            unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;
          });
        }

        // 更新好友列表中的未读消息数量
        setFriends(prev => prev.map(friendship => ({
          ...friendship,
          unread_count: unreadCounts[friendship.friend_id] || 0
        })));
      } catch (error) {
        console.error('Error refreshing unread counts:', error);
      }
    };

    // 添加实时订阅监听好友在线状态变化和消息状态变化
    if (user && friends.length > 0) {
      const friendIds = friends.map(f => f.friend_id).join(',');
      if (friendIds) {
        const channel = supabase
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
              console.log('=== FRIEND PROFILE UPDATE EVENT RECEIVED ===');
              console.log('Profile details:', JSON.stringify(payload.new, null, 2));
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
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'chat_messages',
              filter: `receiver_id=eq.${user.id}`
            },
            (payload) => {
              console.log('=== MESSAGE UPDATE EVENT RECEIVED ===');
              console.log('Message details:', JSON.stringify(payload.new, null, 2));
              // 重新获取所有未读消息数量
              refreshUnreadCounts();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `receiver_id=eq.${user.id} AND is_read=eq.false`
            },
            (payload) => {
              console.log('=== NEW MESSAGE EVENT RECEIVED ===');
              console.log('Message details:', JSON.stringify(payload.new, null, 2));
              // 重新获取所有未读消息数量
              refreshUnreadCounts();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
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
          {/* 好友列表 */}
          <div className="md:col-span-1">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  我的好友
                </h2>
                <Link
                  href="/chat/search"
                  className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-blue-500 bg-clip-text text-transparent hover:from-yellow-500 hover:to-blue-600 transition-all duration-300"
                >
                  <UserSearchIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">查找用户</span>
                </Link>
              </div>

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
                    if (!friend) return null;
                    
                    return (
                      <div key={friendship.friend_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                        <Link
                          href={`/chat/${friend.id}`}
                          className="flex items-center gap-3 flex-1"
                        >
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                              {friend.avatar_url ? (
                                <Image
                                  src={friend.avatar_url}
                                  alt={friend.display_name || friend.username}
                                  width={44}
                                  height={44}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                                  <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                                    {(friend.display_name || friend.username).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* 在线状态指示器 */}
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${friend.online_status === 'online' ? 'bg-green-500' : friend.online_status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
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
                                  {friend.display_name || friend.username}
                                </h3>
                                {friend.online_status === 'online' ? (
                                  <span className="text-xs text-green-500">在线</span>
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {(() => {
                                      const lastActive = friend.last_seen || friend.updated_at;
                                      if (lastActive) {
                                        try {
                                          return new Date(lastActive).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                                        } catch (e) {
                                          return '离线';
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
                          onClick={() => handleOpenDeleteConfirm(friend.id)}
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
      </main>
    </div>
  );
};

export default ChatListPage;

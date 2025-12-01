'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { Friendship } from '@/types/chat';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { MessageCircleIcon, UserSearchIcon, UsersIcon } from 'lucide-react';

const ChatListPage = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [user]);

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
                  className="flex items-center gap-1 text-primary-600 hover:text-primary-700 transition-colors"
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
                    className="mt-4 inline-block text-primary-600 hover:text-primary-700 font-medium"
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
                      <Link
                        key={friend.id}
                        href={`/chat/${friend.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                            {friend.avatar_url ? (
                              <Image
                                src={friend.avatar_url}
                                alt={friend.display_name || friend.username}
                                width={48}
                                height={48}
                                className="object-cover"
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
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                              {friend.display_name || friend.username}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(friendship.created_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {/* 这里可以添加最后一条消息的显示 */}
                        </div>
                      </Link>
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
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:bg-primary-700"
              >
                <UserSearchIcon className="h-4 w-4" />
                查找用户
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatListPage;

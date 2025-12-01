'use client';

import { useState, useEffect, useCallback } from 'react';
import { chatService } from '@/services/chatService';
import { Friendship } from '@/types/chat';
import { useRouter } from 'next/navigation';
import { Search, MessageCircle, UserPlus } from 'lucide-react';
import Image from 'next/image';

export function FriendList() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<Friendship[]>([]);
  const router = useRouter();

  // 获取好友列表
  const fetchFriends = useCallback(async () => {
    try {
      const data = await chatService.getFriends();
      setFriends(data);
      setFilteredFriends(data);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          好友列表
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredFriends.length} 位好友
        </span>
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
                    {/* 在线状态指示器 - 这里可以根据实际的在线状态数据来显示不同颜色 */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
                  </div>
                  
                  <div className="flex-grow">
                    <div className="font-medium text-gray-800 dark:text-white flex items-center gap-2">
                      {friend.display_name || friend.username}
                      <span className="text-xs text-green-500">在线</span>
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

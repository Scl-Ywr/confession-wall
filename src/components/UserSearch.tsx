'use client';

import React, { useState, useCallback } from 'react';
import { chatService } from '@/services/chatService';
import { UserSearchResult } from '@/types/chat';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Image from 'next/image';

interface UserSearchProps {
  currentUserId: string;
}

export function UserSearch({ currentUserId }: UserSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await chatService.searchUsers(keyword);
      // 过滤掉当前用户
      const filteredResults = data.filter(user => user.id !== currentUserId);
      setResults(filteredResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      // 设置空结果，避免显示之前的搜索结果
      setResults([]);
      setShowResults(true);
    } finally {
      setLoading(false);
    }
  }, [keyword, currentUserId]);

  const handleUserClick = (userId: string) => {
    // 查找对应的用户对象
    const selectedUser = results.find(user => user.id === userId);
    if (selectedUser) {
      // 无论是否有 onUserSelect 回调，都跳转到用户主页
      router.push(`/profile/${userId}`);
      setShowResults(false);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-grow">
          <input
              type="text"
              placeholder="搜索用户..."
              className="w-full px-4 py-2 pl-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all duration-300"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                // 当输入变化时，如果没有输入内容，收起结果
                if (!e.target.value.trim()) {
                  setShowResults(false);
                }
              }}
              onFocus={() => {
                // 重新点击搜索框时，不自动显示结果
              }}
              onClick={() => {
                // 重新点击搜索框时，收起当前已查找的用户
                setShowResults(false);
              }}
            />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors duration-300"
          disabled={loading}
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </form>

      {showResults && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-lg z-50 overflow-hidden">
          <ul className="max-h-60 overflow-y-auto">
            {results.map((user) => (
              <li
                key={user.id}
                className="px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200 flex items-center justify-between cursor-pointer"
                onClick={() => handleUserClick(user.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.display_name || user.username}
                        className="w-full h-full object-cover"
                        width={40}
                        height={40}
                      />
                    ) : (
                      <span className="text-lg font-medium">
                        {user.display_name?.charAt(0) || user.username.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">
                      {user.display_name || user.username}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 防止事件冒泡
                    handleUserClick(user.id);
                  }}
                  className="px-3 py-1 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors duration-200"
                >
                  查看主页
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showResults && results.length === 0 && !loading && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-lg z-50 p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400">未找到匹配的用户</p>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { UserSearchResult } from '@/types/chat';
import { AtSymbolIcon } from '@heroicons/react/24/outline';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onMention?: (username: string) => void;
}

export function MentionInput({ 
  value, 
  onChange, 
  placeholder = "写下你的想法...", 
  className = "",
  onMention
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 搜索用户
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (response.ok) {
        setSuggestions(data.users || []);
      } else {
        console.error('Error searching users:', data.error);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理文本变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // 检查是否有@提及
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    
    // 查找最近的@符号
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbolIndex !== -1) {
      // 检查@符号后是否有空格（如果有空格，则不是有效的提及）
      const textAfterAtSymbol = textBeforeCursor.substring(lastAtSymbolIndex + 1);
      if (!textAfterAtSymbol.includes(' ')) {
        // 提取查询字符串
        const query = textAfterAtSymbol;
        setMentionQuery(query);
        setMentionStartIndex(lastAtSymbolIndex);
        setShowSuggestions(true);
        searchUsers(query);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // 这里可以实现选择建议的功能
        break;
      case 'ArrowUp':
        e.preventDefault();
        // 这里可以实现选择建议的功能
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Enter':
        e.preventDefault();
        // 选择第一个建议
        if (suggestions.length > 0) {
          selectUser(suggestions[0]);
        }
        break;
    }
  };

  // 选择用户
  const selectUser = (user: UserSearchResult) => {
    if (mentionStartIndex === -1) return;

    // 替换@提及为完整的用户名
    const beforeMention = value.substring(0, mentionStartIndex);
    const afterMention = value.substring(mentionStartIndex + mentionQuery.length + 1);
    const newValue = `${beforeMention}@${user.username} ${afterMention}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
    
    // 通知父组件有新的提及
    if (onMention) {
      onMention(user.username);
    }
    
    // 设置光标位置
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = beforeMention.length + user.username.length + 2; // +2 for "@" and space
        textareaRef.current.selectionStart = newCursorPosition;
        textareaRef.current.selectionEnd = newCursorPosition;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // 点击外部关闭建议
  const handleClickOutside = (e: MouseEvent) => {
    if (
      suggestionsRef.current && 
      !suggestionsRef.current.contains(e.target as Node) && 
      textareaRef.current && 
      !textareaRef.current.contains(e.target as Node)
    ) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <AtSymbolIcon className="h-4 w-4 text-gray-400" />
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          rows={4}
        />
      </div>

      {/* 用户建议下拉列表 */}
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="p-3 text-center">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => selectUser(user)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.display_name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {user.display_name?.[0] || user.username[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {user.display_name || user.username}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    @{user.username}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
              没有找到匹配的用户
            </div>
          )}
        </div>
      )}
    </div>
  );
}
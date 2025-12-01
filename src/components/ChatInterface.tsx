'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/chatService';
import { ChatMessage, Profile } from '@/types/chat';
import { MessageSquare, Send, Smile, Trash2, Search } from 'lucide-react';
import Image from 'next/image';

type ChatInterfaceProps = {
  otherUserId: string;
  otherUserProfile: Profile;
};

export function ChatInterface({ otherUserId, otherUserProfile }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 获取聊天消息
  const fetchMessages = useCallback(async () => {
    try {
      const data = await chatService.getChatMessages(otherUserId);
      // 反转消息顺序，最新的消息在底部
      setMessages(data.reverse());
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    fetchMessages();
    scrollToBottom();
  }, [fetchMessages]);

  // 发送消息
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const sentMessage = await chatService.sendPrivateMessage(otherUserId, messageContent);
      setMessages(prev => [...prev, sentMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
      // 发送失败，恢复消息
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  // 选择/取消选择消息
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  // 删除选中的消息
  const handleDeleteSelectedMessages = async () => {
    try {
      await chatService.deleteMessages(selectedMessages);
      setMessages(prev => prev.filter(message => !selectedMessages.includes(message.id)));
      setSelectedMessages([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete messages:', error);
    }
  };

  // 渲染消息气泡
  const renderMessageBubble = (message: ChatMessage) => {
    const isCurrentUser = message.sender_id === message.receiver_id;
    const isSelected = selectedMessages.includes(message.id);

    return (
      <div
        key={message.id}
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className="flex items-end gap-2 max-w-[80%]">
          {!isCurrentUser && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {otherUserProfile.avatar_url ? (
                <Image
                  src={otherUserProfile.avatar_url}
                  alt={otherUserProfile.display_name || otherUserProfile.username}
                  className="w-full h-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="text-sm font-medium">
                  {otherUserProfile.display_name?.charAt(0) || otherUserProfile.username.charAt(0)}
                </span>
              )}
            </div>
          )}
          <div
            className={`relative p-3 rounded-lg ${isCurrentUser ? 'bg-primary-500 text-white rounded-tr-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none'} cursor-pointer`}
            onClick={() => toggleMessageSelection(message.id)}
          >
            {isSelected && (
              <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-primary-500 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <span className="text-xs text-white">✓</span>
              </div>
            )}
            <p>{message.content}</p>
            <div className="text-xs mt-1 opacity-70 text-right">
              {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          {isCurrentUser && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {/* 这里应该显示当前用户的头像 */}
              <span className="text-sm font-medium">我</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* 聊天头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {otherUserProfile.avatar_url ? (
              <Image
                src={otherUserProfile.avatar_url}
                alt={otherUserProfile.display_name || otherUserProfile.username}
                className="w-full h-full object-cover"
                width={40}
                height={40}
              />
            ) : (
              <span className="text-lg font-medium">
                {otherUserProfile.display_name?.charAt(0) || otherUserProfile.username.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-800 dark:text-white">
              {otherUserProfile.display_name || otherUserProfile.username}
            </div>
            <div className="text-sm text-green-500">在线</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          {selectedMessages.length > 0 && (
            <button
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors duration-200"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>还没有消息，开始聊天吧！</p>
          </div>
        ) : (
          <>
            {messages.map(renderMessageBubble)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 消息输入框 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            {/* 这里可以添加表情选择器组件 */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
                <div className="grid grid-cols-6 gap-2">
                  {/* 简单的表情示例 */}
                  {['😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😡'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="输入消息..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e as unknown as React.FormEvent)}
            />
          </div>
          <button
            type="submit"
            className="p-3 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg dark:bg-primary-500 dark:hover:bg-primary-600"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">确认删除</h3>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              您确定要删除选中的 {selectedMessages.length} 条消息吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                onClick={handleDeleteSelectedMessages}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

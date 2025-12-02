'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/chatService';
import { ChatMessage, Profile } from '@/types/chat';
import { MessageSquare, Send, Smile, Trash2, Search } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';

type ChatInterfaceProps = {
  otherUserId: string;
  otherUserProfile: Profile;
};

export function ChatInterface({ otherUserId, otherUserProfile: initialOtherUserProfile }: ChatInterfaceProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<'accepted' | 'none'>('accepted');
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showFriendDeletedAlert, setShowFriendDeletedAlert] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<Profile>(initialOtherUserProfile);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 滚动到最新消息
  const scrollToBottom = () => {

    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // 检查好友关系状态
  const checkFriendship = useCallback(async () => {
    if (!currentUserId || !otherUserId) return;
    
    try {
      const status = await chatService.checkFriendshipStatus(otherUserId);
      const newStatus = status === 'accepted' ? 'accepted' : 'none';
      setFriendshipStatus(newStatus);
      if (newStatus !== 'accepted') {
        setShowFriendDeletedAlert(true);
      }
      setInitialCheckDone(true);
    } catch (error) {
      console.error('Failed to check friendship status:', error);
      setInitialCheckDone(true);
    }
  }, [currentUserId, otherUserId]);

  // 获取聊天消息
  const fetchMessages = useCallback(async () => {
    try {
      // 优化：添加缓存和分页支持，只获取最近的消息
      const data = await chatService.getChatMessages(otherUserId, 50, 0);
      // 反转消息顺序，确保最新消息在底部
      setMessages(data.reverse());
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  // 请求通知权限
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // 显示通知
  const showNotification = (message: ChatMessage) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      // 获取发送者名称
      const senderName = otherUserProfile.display_name || otherUserProfile.username || '用户';
      
      // 显示通知
      new Notification(`${senderName}`, {
        body: message.content,
        icon: otherUserProfile.avatar_url || undefined,
        tag: `private_${otherUserId}`,
        badge: '/favicon.ico'
      });
    }
  };

  // 添加实时消息订阅
  useEffect(() => {
    if (!currentUserId || !otherUserId) {

      return;
    }

    // 请求通知权限
    requestNotificationPermission();



    // 创建实时通道，使用基于用户ID的唯一名称，避免冲突
    const channelName = `chat-messages-${currentUserId}-${otherUserId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `or(and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}))`
        },
        async (payload) => {
          // 检查是否是当前对话的消息
          const isCurrentChat = 
            (payload.new.sender_id === currentUserId && payload.new.receiver_id === otherUserId) ||
            (payload.new.sender_id === otherUserId && payload.new.receiver_id === currentUserId);
          
          if (isCurrentChat) {
            
            // 获取发送者资料
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single();
            
            // 构造完整的消息对象
            const completeMessage = {
              ...payload.new,
              sender_profile: senderProfile || null
            } as ChatMessage;
            
            // 添加到消息列表
            setMessages(prev => {
              // 检查消息是否已经存在，避免重复
              const exists = prev.some(msg => msg.id === completeMessage.id);
              if (exists) {

                return prev;
              }
              return [...prev, completeMessage];
            });
            
            // 滚动到最新消息
            scrollToBottom();
            
            // 显示消息通知
            showNotification(completeMessage);
            
            // 如果消息是发给当前用户的，标记为已读
            if (payload.new.receiver_id === currentUserId) {
              try {
                await supabase
                  .from('chat_messages')
                  .update({ is_read: true })
                  .eq('id', payload.new.id);
                
                // 触发自定义事件，通知好友列表更新未读消息数量
                window.dispatchEvent(new CustomEvent('privateMessagesRead', { detail: { friendId: otherUserId } }));
                
                // 更新本地消息状态
                setMessages(prev => prev.map(msg => 
                  msg.id === payload.new.id ? { ...msg, is_read: true } : msg
                ));
              } catch (error) {
                console.error('Error marking message as read:', error);
              }
            }
          } else {

          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'friendships',
          filter: `or(user_id=eq.${currentUserId} AND friend_id=eq.${otherUserId},user_id=eq.${otherUserId} AND friend_id=eq.${currentUserId})`
        },
        () => {

          // 立即更新好友关系状态
          setFriendshipStatus('none');
          setShowFriendDeletedAlert(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${otherUserId}`
        },
        (payload) => {

          // 更新好友在线状态
          setOtherUserProfile(prev => ({
            ...prev,
            online_status: payload.new.online_status,
            last_seen: payload.new.last_seen
          }));
        }
      )
      .subscribe((status) => {

      });

    channelRef.current = channel;
    // 组件卸载时取消订阅
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUserId, otherUserId]);

  // 初始加载消息和检查好友关系
  useEffect(() => {
    fetchMessages();
    checkFriendship();
    
    // 标记未读消息为已读
    const markMessagesAsRead = async () => {
      try {
        const { data: unreadMessages } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('sender_id', otherUserId)
          .eq('receiver_id', currentUserId)
          .eq('is_read', false);
        
        if (unreadMessages && unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg.id);
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', messageIds);
          
          // 触发自定义事件，通知好友列表更新未读消息数量
          window.dispatchEvent(new CustomEvent('privateMessagesRead', { detail: { friendId: otherUserId } }));
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };
    
    if (currentUserId && otherUserId) {
      markMessagesAsRead();
    }
  }, [fetchMessages, checkFriendship, currentUserId, otherUserId]);

  // 当消息列表变化时，滚动到最新消息
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 定期检查好友关系状态
  useEffect(() => {
    const interval = setInterval(() => {
      checkFriendship();
    }, 30000); // 每30秒检查一次

    return () => clearInterval(interval);
  }, [checkFriendship]);

  // 发送消息
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // 优化：使用乐观 UI，立即显示消息
      const tempMessage: Partial<ChatMessage> = {
        id: `temp-${Date.now()}`,
        sender_id: currentUserId || '',
        receiver_id: otherUserId,
        content: messageContent,
        type: 'text',
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 立即添加到消息列表末尾，确保最新消息在底部
      setMessages(prev => [...prev, tempMessage as ChatMessage]);
      scrollToBottom();

      // 发送实际消息
      const sentMessage = await chatService.sendPrivateMessage(otherUserId, messageContent);
      
      // 替换临时消息为实际消息
      setMessages(prev => 
        prev.map(msg => msg.id === tempMessage.id ? sentMessage : msg)
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // 发送失败，移除临时消息并恢复输入
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
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
    const isCurrentUser = message.sender_id === currentUserId;
    const isSelected = selectedMessages.includes(message.id);

    return (
      <div
        key={message.id}
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className="flex items-end gap-2">
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
            className={`relative p-2 sm:p-3 rounded-lg max-w-[95%] sm:max-w-[80%] mx-auto ${isCurrentUser ? 'bg-gradient-to-r from-blue-400 to-pink-500 text-white rounded-tr-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none'} cursor-pointer inline-block`}
            onClick={() => toggleMessageSelection(message.id)}
          >
            {isSelected && (
              <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-purple-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200">
                <span className="text-sm font-bold text-white">✓</span>
              </div>
            )}
            <div className="flex flex-col">
              <div className="flex items-end gap-1">
                <p className="flex-grow">{message.content}</p>
                <span className="text-xs opacity-70 ml-2">
                  {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
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
    <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-100px)] bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden sm:rounded-none sm:shadow-none">
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
            {friendshipStatus === 'accepted' ? (
              <div className="flex items-center gap-1 text-sm">
                <span className={`w-2 h-2 rounded-full ${otherUserProfile.online_status === 'online' ? 'bg-green-500' : otherUserProfile.online_status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'}`}></span>
                <span className={otherUserProfile.online_status === 'online' ? 'text-green-500' : otherUserProfile.online_status === 'away' ? 'text-yellow-500' : 'text-gray-500'}>
                  {otherUserProfile.online_status === 'online' ? '在线' : otherUserProfile.online_status === 'away' ? '离开' : (() => {
                    const lastActive = otherUserProfile.last_seen || otherUserProfile.updated_at;
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
              </div>
            ) : (
              <div className="text-sm text-red-500">已删除好友</div>
            )}
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

      {/* 好友已删除提示 */}
      {showFriendDeletedAlert && friendshipStatus === 'none' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <span className="text-sm text-red-700 dark:text-red-300">
                对方已将你删除，你只能查看历史消息，无法发送新消息
              </span>
            </div>
            <button
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
              onClick={() => setShowFriendDeletedAlert(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {(loading || !initialCheckDone) ? (
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
        {friendshipStatus === 'accepted' ? (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="relative">
              <button
              type="button"
              className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 min-w-12 min-h-12 flex items-center justify-center"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
              {/* 这里可以添加表情选择器组件 */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 w-64 md:w-80 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-8 md:grid-cols-10 gap-2">
                    {/* 简单的表情示例 */}
                    {['😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😡', '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '🥲', '☺️', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😭', '😤', '😠', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑'].map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-xl"
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
              className="p-3 sm:p-3.5 rounded-full bg-gradient-to-r from-pink-400 to-blue-500 text-white hover:from-pink-500 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg dark:from-pink-500 dark:to-blue-600 dark:hover:from-pink-600 dark:hover:to-blue-700 min-w-12 min-h-12 flex items-center justify-center"
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              你已不是对方好友，无法发送消息
            </div>
          </div>
        )}
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

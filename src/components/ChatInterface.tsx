'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/chatService';
import { ChatMessage, Profile } from '@/types/chat';
import { MessageSquare, Send, Smile, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import MultimediaMessage from './MultimediaMessage';
import LoadingSpinner from './LoadingSpinner';
import { getOnlineStatusInfo } from '@/utils/onlineStatus';
import VoiceRecorder from './VoiceRecorder';

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<'accepted' | 'none'>('accepted');
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showFriendDeletedAlert, setShowFriendDeletedAlert] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<Profile>(initialOtherUserProfile);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

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
    } catch {
      setInitialCheckDone(true);
    }
  }, [currentUserId, otherUserId]);

  // 获取本地已删除消息信息
  const getDeletedMessages = useCallback((): Record<string, { deletedAt: number; deletedByAdmin: boolean }> => {
    if (!currentUserId || !otherUserId) return {};
    const key = `deleted_messages_${currentUserId}_${otherUserId}`;
    const deletedMessagesStr = localStorage.getItem(key);
    return deletedMessagesStr ? JSON.parse(deletedMessagesStr) : {};
  }, [currentUserId, otherUserId]);

  // 获取聊天消息
  const fetchMessages = useCallback(async (isLoadMore: boolean = false) => {
    try {
      const currentOffset = isLoadMore ? offset + 50 : 0;
      const data = await chatService.getChatMessages(otherUserId, 50, currentOffset);
      const deletedMessages = getDeletedMessages();
      
      // 过滤掉本地已删除的消息
      const filteredMessages = data.filter(msg => !Object.keys(deletedMessages).includes(msg.id));
      
      if (isLoadMore) {
        // 加载更多历史消息，添加到消息列表顶部
        setMessages(prev => [...filteredMessages.reverse(), ...prev]);
        setOffset(prev => prev + 50);
        setLoadingMore(false);
        // 如果返回的消息少于50条，说明没有更多历史消息了
        if (filteredMessages.length < 50) {
          setHasMore(false);
        }
      } else {
        // 初始加载或刷新，重置消息列表
        setMessages(filteredMessages.reverse());
        setOffset(50);
        setHasMore(filteredMessages.length >= 50);
        setLoading(false);
      }
    } catch {
      // ignore error
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [otherUserId, offset, getDeletedMessages]);

  // 请求通知权限
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // 添加实时消息订阅和在线状态监听
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      return;
    }

    // 请求通知权限
    requestNotificationPermission();

    // 使用唯一的通道名称，包含当前用户和对方用户的ID
    const channelName = `private_chat_${currentUserId}_${otherUserId}`;

    console.log(`[ChatInterface] Setting up real-time chat for users ${currentUserId} and ${otherUserId}`);
    
    // 使用更精确的服务器端过滤条件，减少网络流量
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: {
            self: true
          }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          // 使用精确的服务器端过滤条件
          filter: `(sender_id.eq.${currentUserId}.and.receiver_id.eq.${otherUserId}).or(sender_id.eq.${otherUserId}.and.receiver_id.eq.${currentUserId})`
        },
        async (payload) => {
          console.log(`[ChatInterface] New message received:`, payload.new);
          
          try {
            // 过滤掉自己发送的消息，因为乐观UI已经添加了
            if (payload.new.sender_id === currentUserId) {
              console.log(`[ChatInterface] Ignoring self-sent message`);
              return;
            }
            
            // 构造完整的消息对象
            const completeMessage = {
              ...payload.new,
              sender_profile: payload.new.sender_id === currentUserId ? 
                { id: currentUserId, username: user?.email || '', display_name: user?.email || '', avatar_url: null } : 
                otherUserProfile
            } as ChatMessage;
            
            // 更新消息列表，确保消息唯一
            setMessages(prev => {
              // 检查消息是否已存在
              if (prev.some(msg => msg.id === payload.new.id)) {
                console.log(`[ChatInterface] Message already exists in state, skipping`);
                return prev;
              }
              
              const updatedMessages = [...prev, completeMessage];
              // 确保消息按时间排序
              updatedMessages.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              // 移除重复消息
              const uniqueMessages = Array.from(new Map(updatedMessages.map(msg => [msg.id, msg])).values());
              return uniqueMessages;
            });
            
            // 滚动到最新消息
            scrollToBottom();
            
            // 标记为已读，因为消息是发给当前用户的
            try {
              await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('id', payload.new.id);
              
              console.log(`[ChatInterface] Marked message ${payload.new.id} as read`);
              
              // 触发自定义事件，通知好友列表更新未读消息数量
              window.dispatchEvent(new CustomEvent('privateMessagesRead', { detail: { friendId: otherUserId } }));
            } catch (error) {
              console.error('[ChatInterface] Error marking message as read:', error);
            }
          } catch (error) {
            console.error('[ChatInterface] Error processing new message:', error);
          }
        }
      )
      // 添加对对方用户在线状态变化的实时监听
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id.eq.${otherUserId}`
        },
        async (payload) => {
          console.log(`[ChatInterface] Profile update received for ${otherUserId}:`, payload.new);
          
          // 只更新在线状态和最后活跃时间相关字段
          if (payload.new.online_status !== undefined || payload.new.last_seen !== undefined) {
            try {
              const updatedProfile = await chatService.getUserProfile(otherUserId);
              if (updatedProfile) {
                console.log(`[ChatInterface] Updated profile for ${otherUserId}:`, updatedProfile);
                setOtherUserProfile(updatedProfile);
              }
            } catch (error) {
              console.error('[ChatInterface] Error fetching updated profile:', error);
              // 直接使用payload.new中的字段更新，避免再次请求
              setOtherUserProfile(prev => ({
                ...prev,
                online_status: payload.new.online_status,
                last_seen: payload.new.last_seen
              }));
              console.log(`[ChatInterface] Updated profile fields directly from payload`);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[ChatInterface] Channel status changed to: ${status}`);
        switch (status) {
          case 'SUBSCRIBED':
            console.log(`[ChatInterface] Successfully subscribed to channel: ${channelName}`);
            setConnectionStatus('connected');
            break;
          case 'CHANNEL_ERROR':
            console.error(`[ChatInterface] Channel error for ${channelName}`);
            setConnectionStatus('connecting');
            break;
          case 'TIMED_OUT':
            console.warn(`[ChatInterface] Channel timed out for ${channelName}`);
            setConnectionStatus('connecting');
            break;
          case 'CLOSED':
            console.log(`[ChatInterface] Channel closed: ${channelName}`);
            setConnectionStatus('disconnected');
            break;
          default:
            console.log(`[ChatInterface] Unknown channel status: ${status} for ${channelName}`);
            setConnectionStatus('connecting');
        }
      });

    channelRef.current = channel;
    
    // 组件卸载时安全取消订阅，避免内存泄漏
    return () => {
      console.log(`[ChatInterface] Removing channel: ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUserId, otherUserId, user, otherUserProfile]);

  // 初始加载消息和检查好友关系
  useEffect(() => {
    // 并行执行多个异步操作，减少初始化时间
    Promise.all([
      fetchMessages(),
      checkFriendship(),
      (async () => {
        // 标记未读消息为已读
        if (!currentUserId || !otherUserId) return;
        
        try {
          // 获取未读消息，添加超时保护
          interface UnreadMessage {
            id: string;
          }
          let unreadMessages: UnreadMessage[] = [];
          try {
            const getUnreadMessagesPromise = supabase
              .from('chat_messages')
              .select('id')
              .eq('sender_id', otherUserId)
              .eq('receiver_id', currentUserId)
              .eq('is_read', false);
            const getUnreadMessagesTimeoutPromise = new Promise<UnreadMessage[]>((_, reject) => {
              setTimeout(() => reject(new Error('Supabase get unread messages timed out')), 5000);
            });
            const result = await Promise.race([getUnreadMessagesPromise, getUnreadMessagesTimeoutPromise]) as { data: UnreadMessage[] | null; error: { message: string } | null } | UnreadMessage[];
            unreadMessages = 'data' in result ? (result.data || []) : result;
          } catch (error) {
            console.error('Error getting unread messages:', error);
            return;
          }
          
          if (unreadMessages && unreadMessages.length > 0) {
            const messageIds = unreadMessages.map(msg => msg.id);
            
            // 更新未读消息为已读，添加超时保护
            try {
              const updateMessagesPromise = supabase
                .from('chat_messages')
                .update({ is_read: true })
                .in('id', messageIds);
              const updateMessagesTimeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Supabase update messages timed out')), 5000);
              });
              await Promise.race([updateMessagesPromise, updateMessagesTimeoutPromise]);
            } catch (updateError) {
              console.error('Error updating messages:', updateError);
              return;
            }
            
            // 触发自定义事件，通知好友列表更新未读消息数量
            window.dispatchEvent(new CustomEvent('privateMessagesRead', { detail: { friendId: otherUserId } }));
          }
        } catch {
          // ignore error
        }
      })()
    ]);
  }, [fetchMessages, checkFriendship, currentUserId, otherUserId]);

  // 当消息列表变化时，滚动到最新消息（仅在初始加载时）
  useEffect(() => {
    if (loading || loadingMore) {
      scrollToBottom();
    }
  }, [messages, loading, loadingMore]);

  // 定期检查好友关系状态和对方用户资料 - 降低检查频率，减少网络请求
  useEffect(() => {
    const interval = setInterval(async () => {
      checkFriendship();
      // 定期更新对方用户资料
      try {
        const updatedProfile = await chatService.getUserProfile(otherUserId);
        if (updatedProfile) {
          setOtherUserProfile(updatedProfile);
        }
      } catch {
        // ignore error
      }
    }, 60000); // 每60秒检查一次，降低网络请求频率

    return () => clearInterval(interval);
  }, [checkFriendship, otherUserId]);

  // 监听消息列表顶部，实现滚动加载更多
  useEffect(() => {
    const currentRef = messagesStartRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          fetchMessages(true);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [hasMore, loadingMore, loading, fetchMessages]);

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;

    setSending(true);
    
    try {
      let fileType: 'image' | 'video' | 'file' = 'file';
      let fileUrl: string;
      
      // 检查文件类型和大小
      if (file.type.startsWith('image/')) {
        // 图片文件，最大5MB
        if (file.size > 5 * 1024 * 1024) {
          // 压缩图片
          const compressedFile = await chatService.compressImage(file, 5);
          fileUrl = await chatService.uploadFile(compressedFile, 'chat_images');
        } else {
          fileUrl = await chatService.uploadFile(file, 'chat_images');
        }
        fileType = 'image';
      } else if (file.type.startsWith('video/')) {
        // 视频文件，最大50MB
        if (file.size > 50 * 1024 * 1024) {
          alert('视频文件大小不能超过50MB');
          setSending(false);
          return;
        }
        fileUrl = await chatService.uploadFile(file, 'chat_videos');
        fileType = 'video';
      } else {
        // 其他文件，暂时不支持
        alert('暂不支持该文件类型');
        setSending(false);
        return;
      }
      
      // 发送消息
      const sentMessage = await chatService.sendPrivateMessage(otherUserId, fileUrl, fileType);
      
      // 直接添加到消息列表末尾
      setMessages(prev => {
        // 检查消息是否已存在
        if (prev.some(msg => msg.id === sentMessage.id)) {
          console.log('Private message already exists, skipping:', sentMessage.id);
          return prev;
        }
        // 添加到末尾
        const updatedMessages = [...prev, sentMessage];
        // 确保消息按时间排序
        updatedMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updatedMessages;
      });
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending file message:', error);
      alert('发送文件失败，请重试');
    } finally {
      setSending(false);
      // 重置文件输入
      e.target.value = '';
    }
  };

  // 发送消息 - 支持多种类型
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // 发送文本消息
      const sentMessage = await chatService.sendPrivateMessage(otherUserId, messageContent, 'text');
      
      // 直接添加到消息列表末尾
      setMessages(prev => {
        // 检查消息是否已存在
        if (prev.some(msg => msg.id === sentMessage.id)) {
          console.log('Private message already exists, skipping:', sentMessage.id);
          return prev;
        }
        // 添加到末尾
        const updatedMessages = [...prev, sentMessage];
        // 确保消息按时间排序
        updatedMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updatedMessages;
      });
      
      scrollToBottom();
    } catch {
      // 发送失败，恢复输入
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  // 发送语音消息
  const handleSendVoiceMessage = async (audioBlob: Blob) => {
    setSending(true);
    
    try {
      // 从Blob中获取实际的MIME类型和文件扩展名
      const mimeType = audioBlob.type;
      const fileExtension = mimeType.split('/')[1] || 'webm';
      
      // 将Blob转换为File对象，使用实际的MIME类型
      const audioFile = new File([audioBlob], `voice_${Date.now()}.${fileExtension}`, { type: mimeType });
      
      // 上传语音文件
      const audioUrl = await chatService.uploadFile(audioFile, 'chat_voices');
      
      // 发送语音消息
      const sentMessage = await chatService.sendPrivateMessage(otherUserId, audioUrl, 'voice');
      
      // 直接添加到消息列表末尾
      setMessages(prev => {
        // 检查消息是否已存在
        if (prev.some(msg => msg.id === sentMessage.id)) {
          console.log('Private voice message already exists, skipping:', sentMessage.id);
          return prev;
        }
        // 添加到末尾
        const updatedMessages = [...prev, sentMessage];
        // 确保消息按时间排序
        updatedMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updatedMessages;
      });
      
      scrollToBottom();
    } catch (error) {
      // 更详细的错误处理和日志记录
      console.error('Error sending voice message:', error);
      // 使用showToast替代alert，提供更好的用户体验
      const errorMessage = error instanceof Error ? error.message : '发送语音消息失败，请重试';
      alert(errorMessage);
    } finally {
      setSending(false);
    }
  };

  // 打开删除确认对话框
  const handleOpenDeleteConfirm = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || message.sender_id !== currentUserId) {
      return;
    }
    setSelectedMessages([messageId]);
    setShowDeleteConfirm(true);
  };

  // 删除选中的消息
  const handleDeleteSelectedMessages = async () => {
    try {
      // 获取选中的消息
      const selectedMessage = messages.find(msg => msg.id === selectedMessages[0]);
      if (!selectedMessage) return;
      
      // 检查消息是否在两分钟内
      const messageTime = new Date(selectedMessage.created_at).getTime();
      const now = Date.now();
      const twoMinutes = 2 * 60 * 1000;
      const isWithinTwoMinutes = now - messageTime <= twoMinutes;
      
      if (isWithinTwoMinutes) {
        // 两分钟内的消息：撤回
        await chatService.deleteMessages(selectedMessages, false, otherUserId);
        // 从消息列表中移除
        setMessages(prev => prev.filter(message => !selectedMessages.includes(message.id)));
      } else {
        // 超过两分钟的消息：只删除本地
        // 只添加到本地已删除消息列表
        const key = `deleted_messages_${currentUserId}_${otherUserId}`;
        let deletedMessages: Record<string, { deletedAt: number; deletedByAdmin: boolean }> = {};
        const existingData = localStorage.getItem(key);
        if (existingData) {
          try {
            deletedMessages = JSON.parse(existingData);
          } catch {
            deletedMessages = {};
          }
        }
        
        deletedMessages[selectedMessage.id] = {
          deletedAt: Date.now(),
          deletedByAdmin: false
        };
        
        localStorage.setItem(key, JSON.stringify(deletedMessages));
        // 从消息列表中移除
        setMessages(prev => prev.filter(message => message.id !== selectedMessage.id));
      }
      
      setSelectedMessages([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // 渲染消息气泡 - 使用React.memo优化渲染
  const MessageBubble = React.memo(({ message, isCurrentUser }: {
    message: ChatMessage;
    isCurrentUser: boolean;
  }) => {
    // 获取本地已删除消息信息
    const deletedMessages = getDeletedMessages();
    // 检查消息是否已删除
    const isDeleted = Object.keys(deletedMessages).includes(message.id) || message.deleted;
    // 获取删除信息
    const deletionInfo = deletedMessages[message.id];
    
    return (
      <div
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className="flex items-end gap-2">
          {!isCurrentUser && (
            <div className="w-8 h-8 aspect-square rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
              {otherUserProfile.avatar_url ? (
                <Image
                  src={otherUserProfile.avatar_url}
                  alt={otherUserProfile.display_name || otherUserProfile.username}
                  className="w-full h-full object-cover"
                  width={32}
                  height={32}
                  objectFit="cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm font-medium">
                  {otherUserProfile.display_name?.charAt(0) || otherUserProfile.username?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          )}
          <div
            className={`relative p-2 sm:p-3 rounded-lg max-w-[95%] sm:max-w-[80%] mx-auto ${isCurrentUser ? 'bg-gradient-to-r from-blue-400 to-pink-500 text-white rounded-tr-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none'} inline-block`}
          >
            {/* 显示已删除消息占位符 */}
            {isDeleted ? (
              <div className="flex items-center justify-center py-2 text-center">
                <span className="text-sm italic text-gray-500 dark:text-gray-400">
                  {/* 根据删除类型显示不同提示 */}
                  {deletionInfo?.deletedByAdmin ? 
                   message.sender_id === currentUserId ? '你的消息被群管理员删除' : '此消息已被管理员删除' : 
                   message.sender_id === currentUserId ? '此消息已被撤回' : '此消息已被删除'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* 非文本消息单独一行显示 */}
                {message.type !== 'text' && (
                  <div className="w-full">
                    <MultimediaMessage message={message} />
                  </div>
                )}
                
                {/* 文本消息与时间戳在同一行 */}
                <div className="flex items-end gap-1">
                  {message.type === 'text' && (
                    <p className="flex-grow">{message.content}</p>
                  )}
                  <div className="flex flex-col items-end">
                    <span className="text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 删除按钮 - 仅对当前用户的未删除消息显示 */}
            {isCurrentUser && !isDeleted && (
              <button
                className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 p-1 rounded-full text-red-500 opacity-0 hover:opacity-100 transition-opacity duration-200 shadow-md"
                onClick={() => handleOpenDeleteConfirm(message.id)}
                aria-label="删除消息"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          {isCurrentUser && (
            <div className="w-8 h-8 aspect-square rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
              {/* 这里应该显示当前用户的头像 */}
              <span className="text-sm font-medium">我</span>
            </div>
          )}
        </div>
      </div>
    );
  });

  // 添加displayName以通过lint检查
  MessageBubble.displayName = 'MessageBubble';

  // 渲染消息气泡的包装函数
  const renderMessageBubble = (message: ChatMessage) => {
    const isCurrentUser = message.sender_id === currentUserId;

    return (
      <MessageBubble
        key={message.id}
        message={message}
        isCurrentUser={isCurrentUser}
      />
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
                style={{ objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <span className="text-lg font-medium">
                {otherUserProfile.display_name?.charAt(0) || otherUserProfile.username?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-800 dark:text-white">
              {otherUserProfile.display_name || otherUserProfile.username}
            </div>
            {friendshipStatus === 'accepted' ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-sm">
                  {/* 在线状态判断逻辑，使用统一的在线状态函数 */}
                {(() => {
                  const onlineStatusInfo = getOnlineStatusInfo(otherUserProfile.online_status, otherUserProfile.last_seen);
                  return (
                    <>
                      <span className={`w-2 h-2 rounded-full ${onlineStatusInfo.color}`}></span>
                      <span className={onlineStatusInfo.textColor}>
                        {onlineStatusInfo.text}
                      </span>
                    </>
                  );
                })()}
                </div>
                <div className="flex items-center gap-1 text-xs mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                  <span className={connectionStatus === 'connected' ? 'text-green-500' : connectionStatus === 'connecting' ? 'text-yellow-500' : 'text-red-500'}>
                    {connectionStatus === 'connected' ? '实时连接' : connectionStatus === 'connecting' ? '连接中...' : '连接断开'}
                  </span>
                </div>
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
          <div className="flex justify-center items-center py-16">
            <LoadingSpinner 
              type="moon" 
              size={40} 
              color="#f97316" 
              message="加载消息中..."
              showMessage={true}
              gradient={true}
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>还没有消息，开始聊天吧！</p>
          </div>
        ) : (
          <>
            {/* 顶部加载更多指示器 */}
            <div ref={messagesStartRef} className="flex justify-center py-4">
              {loadingMore && (
                <LoadingSpinner 
                  type="bar" 
                  size={30} 
                  color="#f97316" 
                  message="加载更多消息..."
                  showMessage={false}
                  gradient={true}
                  className="h-6"
                />
              )}
              {!hasMore && messages.length > 50 && (
                <div className="text-xs text-gray-400">没有更多历史消息了</div>
              )}
            </div>
            
            {/* 消息列表 */}
            {messages.map((message, index) => {
              // 优化日期分隔逻辑，避免频繁创建Date对象
              const currentDate = message.created_at.split('T')[0];
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const prevDate = prevMessage ? prevMessage.created_at.split('T')[0] : null;
              const showDateSeparator = index === 0 || prevDate !== currentDate;
              
              return (
                <div key={message.id}>
                  {/* 日期分隔栏 */}
                  {showDateSeparator && (
                    <div className="flex justify-center my-4">
                      <div className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-4 py-1 rounded-full">
                        {currentDate}
                      </div>
                    </div>
                  )}
                  {renderMessageBubble(message)}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 消息输入框 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {friendshipStatus === 'accepted' ? (
          <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                {/* 隐藏的文件输入 */}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  disabled={sending}
                  className="hidden"
                  id="file-upload"
                />
                
                {/* 图片上传按钮 */}
                <button
                  type="button"
                  className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 min-w-12 min-h-12 flex items-center justify-center"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={sending}
                >
                  <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              
              {/* 语音录制按钮 */}
              <button
                type="button"
                className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 min-w-12 min-h-12 flex items-center justify-center"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                disabled={sending}
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              
              <div className="relative">
                <button
                  type="button"
                  className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 min-w-12 min-h-12 flex items-center justify-center"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                <Smile className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
                {/* 表情选择器组件 */}
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
            </div>
            
            {/* 聊天输入框和发送按钮 */}
            <div className="flex items-center gap-2">
              <div className="flex-grow relative">
                <input
                  type="text"
                  placeholder="输入消息..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
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
            </div>
            
            {/* 语音录制组件 */}
            {showVoiceRecorder && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <VoiceRecorder 
                  onSendVoiceMessage={handleSendVoiceMessage}
                  isSending={sending}
                />
              </div>
            )}
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
      {showDeleteConfirm && selectedMessages.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full">
            {/* 获取选中的消息 */}
            {(() => {
              const selectedMessage = messages.find(msg => msg.id === selectedMessages[0]);
              if (!selectedMessage) return null;
              
              // 检查消息是否在两分钟内
              const messageTime = new Date(selectedMessage.created_at).getTime();
              const now = Date.now();
              const twoMinutes = 2 * 60 * 1000;
              const isWithinTwoMinutes = now - messageTime <= twoMinutes;
              
              return (
                <>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                    {isWithinTwoMinutes ? '确认撤回消息' : '确认删除消息'}
                  </h3>
                  <p className="mb-6 text-gray-600 dark:text-gray-300">
                    {isWithinTwoMinutes ? 
                      '您确定要撤回这条消息吗？此操作不可恢复。' : 
                      '超过两分钟的消息无法撤回，只能删除本地记录。您确定要删除本地记录吗？'}
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
                      {isWithinTwoMinutes ? '确认撤回' : '删除本地'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

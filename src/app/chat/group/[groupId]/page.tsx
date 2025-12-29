'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { ChatMessage, Group, GroupMember, UserSearchResult, Profile } from '@/types/chat';
import { getOnlineStatusInfo, isUserOnline } from '@/utils/onlineStatus';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import MultimediaMessage from '@/components/MultimediaMessage';
import { showToast } from '@/utils/toast';
import PageLoader from '@/components/PageLoader';
import { MessageCircleIcon, UsersIcon, PlusIcon, XIcon, TrashIcon, SendIcon, Image as ImageIcon, Smile } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import VoiceRecorder from '@/components/VoiceRecorder';

const GroupChatPage = ({ params }: { params: Promise<{ groupId: string }> }) => {
  const { user, loading: authLoading } = useAuth();
  const resolvedParams = React.use(params);
  const { groupId } = resolvedParams;
  
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  // 用户信息弹窗状态
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  // 群内个人信息设置
  const [showGroupProfileModal, setShowGroupProfileModal] = useState(false);
  const [groupNickname, setGroupNickname] = useState<string>('');
  const [groupAvatar, setGroupAvatar] = useState<string | undefined>('');
  // 群设置相关
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | undefined>(undefined);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  // 头像上传相关
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 群成员列表
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  // 删除成员确认
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  // 连接状态 - 暂时注释，因为目前未使用
  // const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  // 多媒体消息相关
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  // 用户不是群成员时的状态
  const [isMember, setIsMember] = useState<boolean>(true);
  const [showNotMemberPrompt, setShowNotMemberPrompt] = useState<boolean>(false);
  const [keepChatHistory, setKeepChatHistory] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 实时通道引用，与私聊实现一致
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // 确保未登录时不自动重定向，只显示登录提示
  useEffect(() => {
    // 空的useEffect，确保没有自动重定向逻辑
  }, [user]);
  
  // 获取本地已删除消息信息
  const getDeletedMessages = useCallback((): Record<string, { deletedAt: number; deletedByAdmin: boolean }> => {
    if (!user?.id) return {};
    const key = `deleted_messages_${user.id}_${groupId}`;
    const deletedMessagesStr = localStorage.getItem(key);
    return deletedMessagesStr ? JSON.parse(deletedMessagesStr) : {};
  }, [user?.id, groupId]);

  // 处理头像点击，显示用户信息
  const handleAvatarClick = (senderProfile: Profile) => {
    if (senderProfile) {
      setSelectedUser({
        id: senderProfile.id,
        username: senderProfile.username || '',
        display_name: senderProfile.display_name || '',
        email: senderProfile.email || '',
        avatar_url: senderProfile.avatar_url,
        created_at: senderProfile.created_at || new Date().toISOString()
      });
      setShowUserProfileModal(true);
    }
  };
  
  // 添加本地已删除消息
  const addDeletedMessage = useCallback((message: ChatMessage, deletedByAdmin: boolean) => {
    if (!user?.id) return;
    const key = `deleted_messages_${user.id}_${groupId}`;
    const deletedMessages = getDeletedMessages();
    
    deletedMessages[message.id] = {
      deletedAt: Date.now(),
      deletedByAdmin
    };
    
    localStorage.setItem(key, JSON.stringify(deletedMessages));
  }, [user?.id, groupId, getDeletedMessages]);
  
  // 删除本地已删除消息ID（暂时未使用）
  // const removeDeletedMessageId = (messageId: string) => {
  //   if (!user) return;
  //   const key = `deleted_messages_${user.id}_${groupId}`;
  //   const deletedIds = getDeletedMessageIds();
  //   const newDeletedIds = deletedIds.filter(id => id !== messageId);
  //   localStorage.setItem(key, JSON.stringify(newDeletedIds));
  // };

  // 获取群信息
  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (!user?.id || !groupId) return;

      try {
        // 使用新添加的 getGroup 方法获取群信息，而不是从群列表中查找
        const groupData = await chatService.getGroup(groupId);
        const membersData = await chatService.getGroupMembers(groupId);
        
        setGroup(groupData);
        setGroupMembers(membersData);
        
        // 获取当前用户在群聊中的角色和群内个人信息
        const currentMember = membersData.find(member => member.user_id === user.id);
        if (currentMember) {
          setCurrentUserRole(currentMember.role as 'owner' | 'admin' | 'member');
          // 设置群内昵称和头像
          setGroupNickname(currentMember.group_nickname || '');
          setGroupAvatar(currentMember.group_avatar_url);
          setIsMember(true);
        } else {
          setCurrentUserRole(null);
          setIsMember(false);
          // 显示非成员提示
          setShowNotMemberPrompt(true);
        }
      } catch {
        // 即使获取失败，也要创建一个模拟的群对象，避免页面崩溃
        setGroup({
          id: groupId,
          name: '群聊',
          description: '',
          avatar_url: undefined,
          creator_id: user.id,
          member_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setGroupMembers([]);
        setCurrentUserRole('owner');
        setIsMember(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupInfo();

    // 创建统一的群相关通道，合并所有群相关事件监听
    const groupChannel = supabase.channel(`group_${groupId}`);

    // 监听群成员变化（包括插入、更新、删除）
    groupChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_members',
        filter: `group_id.eq.${groupId}`
      },
      async () => {
        try {
          const membersData = await chatService.getGroupMembers(groupId);
          setGroupMembers(membersData);
          
          // 更新当前用户在群聊中的角色和群内个人信息
          if (user) {
            const currentMember = membersData.find(member => member.user_id === user.id);
            if (currentMember) {
              setCurrentUserRole(currentMember.role as 'owner' | 'admin' | 'member');
              // 更新群内昵称和头像
              setGroupNickname(currentMember.group_nickname || '');
              setGroupAvatar(currentMember.group_avatar_url);
            } else {
              setCurrentUserRole(null);
            }
          }
        } catch {
          // ignore error
        }
      }
    );

    // 监听群成员在线状态变化 - 同时监听online_status和last_seen字段
    groupChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `online_status=in.('online','offline','away')` // 监听在线状态变化
      },
      async (payload) => {
        try {
          // 直接更新本地状态，避免重新获取整个成员列表
          setGroupMembers(prevMembers => {
            // 检查更新的用户是否是群成员
            const isGroupMember = prevMembers.some(member => member.user_id === payload.new.id);
            
            if (isGroupMember) {
              // 只更新变化的成员信息
              return prevMembers.map(member => {
                if (member.user_id === payload.new.id) {
                  // 确保user_profile存在，不存在则创建一个新对象，严格匹配Profile接口
                  const updatedProfile: Profile = member.user_profile ? {
                    ...member.user_profile,
                    email: member.user_profile.email || '',
                    online_status: payload.new.online_status,
                    last_seen: payload.new.last_seen
                  } : {
                    id: payload.new.id,
                    username: payload.new.username || '',
                    display_name: payload.new.display_name || '',
                    email: payload.new.email || '',
                    avatar_url: payload.new.avatar_url,
                    online_status: payload.new.online_status,
                    last_seen: payload.new.last_seen,
                    bio: payload.new.bio,
                    created_at: payload.new.created_at,
                    updated_at: payload.new.updated_at,
                    is_admin: payload.new.is_admin || false
                  };
                  
                  return {
                    ...member,
                    user_profile: updatedProfile
                  };
                }
                return member;
              });
            }
            return prevMembers;
          });
          
          // 同时更新消息列表中的发送者在线状态
          setMessages(prevMessages => {
            // 检查是否有消息的发送者是更新的用户
            const hasMessagesFromUser = prevMessages.some(msg => msg.sender_id === payload.new.id);
            
            if (hasMessagesFromUser) {
              // 更新所有发送者是该用户的消息中的sender_profile
              return prevMessages.map(msg => {
                if (msg.sender_id === payload.new.id && msg.sender_profile) {
                  // 更新发送者的在线状态和最后活跃时间
                  return {
                    ...msg,
                    sender_profile: {
                      ...msg.sender_profile,
                      online_status: payload.new.online_status,
                      last_seen: payload.new.last_seen
                    }
                  };
                }
                return msg;
              });
            }
            return prevMessages;
          });
        } catch (error) {
          console.error('Error updating member online status:', error);
        }
      }
    );
    
    // 额外监听last_seen字段变化，确保在线状态基于最近活跃时间正确更新
    groupChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `last_seen=not.is.null` // 监听last_seen字段变化
      },
      async (payload) => {
        try {
          // 直接更新本地状态，避免重新获取整个成员列表
          setGroupMembers(prevMembers => {
            // 检查更新的用户是否是群成员
            const isGroupMember = prevMembers.some(member => member.user_id === payload.new.id);
            
            if (isGroupMember) {
              // 只更新变化的成员信息
              return prevMembers.map(member => {
                if (member.user_id === payload.new.id) {
                  // 确保user_profile存在，不存在则创建一个新对象，严格匹配Profile接口
                  const updatedProfile: Profile = member.user_profile ? {
                    ...member.user_profile,
                    email: member.user_profile.email || '',
                    last_seen: payload.new.last_seen,
                    // 优先使用payload中的online_status，如果不存在则使用原有值，确保状态同步
                    online_status: payload.new.online_status || member.user_profile.online_status || 'away'
                  } : {
                    id: payload.new.id,
                    username: payload.new.username || '',
                    display_name: payload.new.display_name || '',
                    email: payload.new.email || '',
                    avatar_url: payload.new.avatar_url,
                    online_status: 'away', // 默认状态
                    last_seen: payload.new.last_seen,
                    bio: payload.new.bio,
                    created_at: payload.new.created_at,
                    updated_at: payload.new.updated_at,
                    is_admin: payload.new.is_admin || false
                  };
                  
                  return {
                    ...member,
                    user_profile: updatedProfile
                  };
                }
                return member;
              });
            }
            return prevMembers;
          });
          
          // 同时更新消息列表中的发送者在线状态
          setMessages(prevMessages => {
            // 检查是否有消息的发送者是更新的用户
            const hasMessagesFromUser = prevMessages.some(msg => msg.sender_id === payload.new.id);
            
            if (hasMessagesFromUser) {
              // 更新所有发送者是该用户的消息中的sender_profile
              return prevMessages.map(msg => {
                if (msg.sender_id === payload.new.id && msg.sender_profile) {
                  // 更新发送者的最后活跃时间和在线状态（如果online_status字段也更新了）
                  return {
                    ...msg,
                    sender_profile: {
                      ...msg.sender_profile,
                      last_seen: payload.new.last_seen,
                      // 只有当payload.new.online_status存在时才更新，否则保持原有状态
                      online_status: payload.new.online_status || msg.sender_profile.online_status
                    }
                  };
                }
                return msg;
              });
            }
            return prevMessages;
          });
        } catch (error) {
          console.error('Error updating member last seen:', error);
        }
      }
    );

    // 启动订阅
    groupChannel.subscribe();

    return () => {
      // 移除所有群相关监听器
      supabase.removeChannel(groupChannel);
    };
  }, [user, groupId, getDeletedMessages]);

  // 自动标记消息为已读
  const markMessagesAsRead = useCallback(async () => {
    if (!user?.id || !groupId || !isMember) return;

    try {
      await chatService.markGroupMessagesAsRead(groupId);
      
      // 触发群聊列表页面更新未读消息数量
      // 通过发送自定义事件来通知其他组件
      window.dispatchEvent(new CustomEvent('groupMessagesRead', { detail: { groupId } }));
    } catch {
      // ignore error
    }
  }, [user?.id, groupId, isMember]);

  // 获取群消息
  useEffect(() => {
    if (!user?.id || !groupId) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const groupMessages = await chatService.getGroupMessages(groupId, 50, 0);
        const deletedMessages = getDeletedMessages();
        // 过滤掉本地已删除的消息
        const filteredMessages = groupMessages.filter(msg => !Object.keys(deletedMessages).includes(msg.id));
        // 与私聊完全一致：服务返回倒序消息，组件调用reverse()显示正序
        const sortedMessages = filteredMessages.reverse();
        setMessages(sortedMessages);
        
        // 标记所有消息为已读
        await markMessagesAsRead();
        
        // 初始加载完成后滚动到底部
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch {
        // 即使获取失败，也要设置 loadingMessages 为 false，避免页面一直加载
        setLoadingMessages(false);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // 请求通知权限
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    };

    // 请求通知权限
    requestNotificationPermission();
  }, [user?.id, groupId, getDeletedMessages, markMessagesAsRead]);

  // 实时消息订阅 - 完全复制私聊实现，仅修改过滤条件
  useEffect(() => {
    if (!user?.id || !groupId) {
      return;
    }

    // 使用唯一的通道名称
    const channelName = `group_chat_${groupId}_${user.id}`;

    // 完全复制私聊的通道创建方式
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          // 只处理当前群组的消息
          if (payload.new.group_id === groupId) {
            try {
              // 从数据库获取发送者完整资料
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url')
                .eq('id', payload.new.sender_id)
                .single();
              
              // 构造完整的消息对象
              const completeMessage = {
                ...payload.new,
                sender_profile: senderProfile || {
                  id: payload.new.sender_id,
                  username: '未知用户',
                  display_name: '未知用户',
                  avatar_url: undefined
                }
              } as ChatMessage;
              
              // 过滤掉自己发送的消息，因为乐观UI已经添加了
              if (payload.new.sender_id === user.id) {
                return;
              }
              
              // 直接添加到消息列表末尾，不重新排序（与私聊一致）
              setMessages(prev => {
                // 检查消息是否已存在
                if (prev.some(msg => msg.id === completeMessage.id)) {
                  return prev;
                }
                // 直接添加到末尾，不重新排序
                return [...prev, completeMessage];
              });
              
              // 立即滚动到最新消息
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              
              // 标记为已读
              try {
                await chatService.markGroupMessagesAsRead(groupId, [payload.new.id]);
                // 触发群聊列表页面更新未读消息数量
                window.dispatchEvent(new CustomEvent('groupMessagesRead', { detail: { groupId } }));
              } catch (error) {
                console.error('Error marking message as read:', error);
              }
            } catch (error) {
              console.error('Error processing group message:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Group channel', channelName, 'status:', status);
      });

    channelRef.current = channel;
    
    // 组件卸载时取消订阅
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, groupId]);

  // 当组件挂载或消息列表更新时，标记消息为已读
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages, markMessagesAsRead]);

  // 当用户滚动到消息列表时，标记可见消息为已读
  const handleScroll = () => {
    // 简单实现：只要用户查看消息列表，就标记所有消息为已读
    markMessagesAsRead();
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 监听新消息通知，确保滚动到底部
  useEffect(() => {
    const handleGroupMessagesReceived = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    window.addEventListener('groupMessagesReceived', handleGroupMessagesReceived);
    return () => {
      window.removeEventListener('groupMessagesReceived', handleGroupMessagesReceived);
    };
  }, []);

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
          showToast.error('视频文件大小不能超过50MB');
          setSending(false);
          return;
        }
        fileUrl = await chatService.uploadFile(file, 'chat_videos');
        fileType = 'video';
      } else {
        // 其他文件，暂时不支持
        showToast.error('暂不支持该文件类型');
        setSending(false);
        return;
      }
      
      // 发送消息
      const sentMessage = await chatService.sendGroupMessage(groupId, fileUrl, fileType);
      
      // 直接添加到消息列表末尾
      setMessages(prev => {
        // 检查消息是否已存在
        if (prev.some(msg => msg.id === sentMessage.id)) {
          return prev;
        }
        return [...prev, sentMessage];
      });
      
      // 滚动到最新消息
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error sending file message:', error);
      showToast.error('发送文件失败，请重试');
    } finally {
      setSending(false);
      // 重置文件输入
      e.target.value = '';
    }
  };

  // 发送群消息 - 支持多种类型
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !group || !newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // 发送文本消息
      const sentMessage = await chatService.sendGroupMessage(groupId, messageContent, 'text');
      
      // 直接添加到消息列表末尾
      setMessages(prev => {
        // 检查消息是否已存在
        if (prev.some(msg => msg.id === sentMessage.id)) {
          return prev;
        }
        return [...prev, sentMessage];
      });
      
      // 滚动到最新消息
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      setNewMessage(messageContent);
      showToast.error('发送消息失败，请重试');
    } finally {
      setSending(false);
    }
  };

  // 发送语音消息
  const handleSendVoiceMessage = async (audioBlob: Blob) => {
    if (!user || !group || sending) return;

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
      const sentMessage = await chatService.sendGroupMessage(groupId, audioUrl, 'voice');
      
      // 直接添加到消息列表末尾
      setMessages(prev => {
        // 检查消息是否已存在
        if (prev.some(msg => msg.id === sentMessage.id)) {
          return prev;
        }
        return [...prev, sentMessage];
      });
      
      // 滚动到最新消息
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      // 更详细的错误处理和日志记录
      console.error('Error sending voice message:', error);
      // 显示具体的错误信息
      const errorMessage = error instanceof Error ? error.message : '发送语音消息失败，请重试';
      showToast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      const results = await chatService.searchUsers(searchQuery);
      // 过滤掉已在群里的成员
      const filteredResults = results.filter(user => 
        !groupMembers.some(member => member.user_id === user.id)
      );
      setSearchResults(filteredResults);
    } catch {
      // ignore error
    } finally {
      setSearching(false);
    }
  };

  // 切换成员选择
  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // 邀请成员加入群
  const handleInviteMembers = async () => {
    if (!selectedMembers.length) return;
    
    try {
      await chatService.inviteToGroup(groupId, selectedMembers);
      setShowAddMembersModal(false);
      setSelectedMembers([]);
      setSearchQuery('');
      setSearchResults([]);
      
      // 刷新群成员列表
      const updatedMembers = await chatService.getGroupMembers(groupId);
      setGroupMembers(updatedMembers);
      
      showToast.success('邀请发送成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '邀请失败，请重试';
      showToast.error(errorMessage);
    }
  };



  // 退出群聊
  const handleLeaveGroup = async () => {
    try {
      await chatService.leaveGroup(groupId);
      setShowLeaveConfirm(false);
      // 跳转到聊天列表页
      showToast.success('退出群聊成功！');
      setTimeout(() => {
        window.location.href = '/chat';
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '退出群聊失败，请重试';
      showToast.error(errorMessage);
    }
  };

  // 处理用户不是群成员时的操作
  const handleNotMemberAction = async (action: 'keep' | 'delete') => {
    if (action === 'keep') {
      // 用户选择保留聊天记录
      setKeepChatHistory(true);
      setShowNotMemberPrompt(false);
    } else {
      // 用户选择删除聊天记录
      // 跳转到聊天列表页，群聊将从列表中移除
      window.location.href = '/chat';
    }
  };

  // 从聊天页面删除群聊
  const handleDeleteChat = () => {
    // 跳转到聊天列表页，群聊将从列表中移除
    window.location.href = '/chat';
  };

  // 删除群聊
  const handleDeleteGroup = async () => {
    try {
      await chatService.deleteGroup(groupId);
      setShowDeleteGroupConfirm(false);
      // 跳转到聊天列表页
      showToast.success('群聊已删除！');
      setTimeout(() => {
        window.location.href = '/chat';
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除群聊失败，请重试';
      showToast.error(errorMessage);
    }
  };
  
  // 打开删除消息确认对话框
  const handleOpenDeleteMessageConfirm = (messageId: string) => {
    // 检查是否是群管理员或消息发送者
    const messageToDelete = messages.find(msg => msg.id === messageId);
    if (!messageToDelete) {
      return;
    }
    
    // 群管理员可以删除任何消息，不需要时间限制
    if (currentUserRole === 'owner' || currentUserRole === 'admin') {
      setSelectedMessageId(messageId);
      setShowDeleteMessageConfirm(true);
      return;
    }
    
    // 普通用户只能删除自己发送的消息，且需要时间限制
    if (messageToDelete.sender_id !== user?.id) {
      showToast.error('你只能删除自己发送的消息');
      return;
    }
    
    // 检查消息发送时间是否超过两分钟
    const messageTime = new Date(messageToDelete.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - messageTime.getTime();
    const twoMinutes = 2 * 60 * 1000;
    
    if (timeDiff > twoMinutes) {
      // 超过两分钟，不允许删除
      showToast.error('消息发送超过两分钟，无法删除');
      return;
    }
    
    setSelectedMessageId(messageId);
    setShowDeleteMessageConfirm(true);
  };
  
  // 关闭删除消息确认对话框
  const handleCloseDeleteMessageConfirm = () => {
    setShowDeleteMessageConfirm(false);
    setSelectedMessageId(null);
  };
  
  // 删除聊天记录
  const handleDeleteMessage = async () => {
    if (!selectedMessageId) return;
    
    try {
      // 获取要删除的消息
      const messageToDelete = messages.find(msg => msg.id === selectedMessageId);
      if (!messageToDelete) {
        throw new Error('消息不存在');
      }
      
      // 检查权限：群管理员可以删除任何消息，普通用户只能删除自己发送的消息
      if (currentUserRole !== 'owner' && currentUserRole !== 'admin' && messageToDelete.sender_id !== user?.id) {
        throw new Error('你没有权限删除该消息');
      }
      
      // 判断是否是管理员删除其他人的消息
      const deletedByAdmin = (currentUserRole === 'owner' || currentUserRole === 'admin') && messageToDelete.sender_id !== user?.id;
      
      // 调用服务端删除方法，传递群聊标记
      await chatService.deleteMessages([selectedMessageId], true, groupId);
      
      // 添加到本地已删除消息列表
      addDeletedMessage(messageToDelete, deletedByAdmin);
      
      // 从当前消息列表中移除
      setMessages(prev => prev.filter(msg => msg.id !== selectedMessageId));
      
      // 关闭确认对话框
      handleCloseDeleteMessageConfirm();
      
      // 显示成功提示
      showToast.success(deletedByAdmin ? '已删除该消息' : '消息已撤回');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除消息失败，请重试';
      showToast.error(errorMessage);
    }
  };

  // 打开删除成员确认对话框
  const handleOpenRemoveMemberConfirm = (memberId: string) => {
    setMemberToRemove(memberId);
    setShowRemoveMemberConfirm(true);
  };

  // 关闭删除成员确认对话框
  const handleCloseRemoveMemberConfirm = () => {
    setShowRemoveMemberConfirm(false);
    setMemberToRemove(null);
  };

  // 删除群成员
  const handleRemoveMember = async () => {
    if (!memberToRemove || !groupId) return;
    
    try {
      await chatService.removeGroupMember(groupId, memberToRemove);
      
      // 关闭确认对话框
      handleCloseRemoveMemberConfirm();
      
      // 刷新群成员列表
      const updatedMembers = await chatService.getGroupMembers(groupId);
      setGroupMembers(updatedMembers);
      
      // 更新群信息
      const updatedGroup = await chatService.getGroup(groupId);
      setGroup(updatedGroup);
      
      // 显示成功提示
      showToast.success('成员已删除');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除成员失败，请重试';
      showToast.error(errorMessage);
    }
  };

  // 更新群内个人信息
  const handleUpdateGroupProfile = async () => {
    if (!user || !groupId) return;
    
    try {
      let newAvatarUrl = groupAvatar;
      
      // 如果有新选择的头像文件，先上传
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar(avatarFile);
      }
      
      await chatService.updateGroupMemberInfo(groupId, groupNickname, newAvatarUrl);
      
      // 更新本地状态
      setGroupAvatar(newAvatarUrl);
      setAvatarFile(null);
      setAvatarPreview(undefined);
      setShowGroupProfileModal(false);
      
      showToast.success('群内个人信息已更新');
    } catch (err) {
      console.error('Failed to update group profile:', err);
      showToast.error('更新群内个人信息失败，请重试');
    }
  };

  // 处理当前用户头像点击
  const handleCurrentUserAvatarClick = () => {
    setShowGroupProfileModal(true);
  };

  // 处理更换头像按钮点击
  const handleChangeAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // 处理头像文件选择
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        showToast.error('请选择图片文件');
        return;
      }
      // 检查文件大小（最大5MB）
      if (file.size > 5 * 1024 * 1024) {
        showToast.error('图片大小不能超过5MB');
        return;
      }
      
      setAvatarFile(file);
      // 创建预览URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 上传头像到Supabase存储
  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('用户未登录');
    
    try {
      // 生成安全的文件名（移除特殊字符）
      const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = `avatars/${user.id}/${safeFileName}`;
      
      // 上传文件
      const { error: uploadError } = await supabase
        .storage
        .from('confession_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // 允许覆盖同名文件
        });
      
      if (uploadError) {
        console.error('上传头像失败:', uploadError);
        throw new Error('上传头像失败');
      }
      
      // 获取公共URL
      const { data: urlData } = supabase
        .storage
        .from('confession_images')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('上传头像异常:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <PageLoader 
        type="spinner" 
        message="正在加载群聊信息..." 
        showNavbar={true}
        fullscreen={true}
      />
    );
  }

  // 等待authLoading完成
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // 未登录用户显示登录提示
  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
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
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="glass-card rounded-2xl p-6 text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              群聊不存在
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              该群聊可能已被解散或你已被移出群聊
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-blue-500 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:from-yellow-500 hover:to-blue-600"
            >
              返回聊天列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* 群聊头部 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/chat" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <XIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </Link>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                    {group.avatar_url ? (
                      <Image
                        src={group.avatar_url}
                        alt={group.name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-200 to-pink-300 dark:from-purple-700 dark:to-pink-800 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      {group.name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm">
                      <p className="text-gray-500 dark:text-gray-400">
                        {groupMembers.length} 位成员
                      </p>
                      {/* 在线成员数量 */}
                      <p className="flex items-center gap-1 text-green-500 dark:text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        {groupMembers.filter(member => {
                          if (!member.user_profile) return false;
                          
                          const { online_status, last_seen } = member.user_profile;
                          // 直接使用isUserOnline函数判断是否在线，简化逻辑
                          return isUserOnline(online_status, last_seen);
                        }).length} 人在线
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {/* 查看群成员按钮 */}
                <button
                  onClick={() => setShowGroupMembersModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="查看群成员"
                >
                  <UsersIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
                {/* 管理员设置按钮 */}
                {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                  <button
                    onClick={() => {
                      setNewGroupName(group?.name || '');
                      setGroupAvatarPreview(group?.avatar_url);
                      setShowGroupSettingsModal(true);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="群设置"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                {/* 非成员状态下的删除按钮 */}
                {!isMember && keepChatHistory && (
                  <button
                    onClick={handleDeleteChat}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="删除聊天记录"
                  >
                    <TrashIcon className="h-5 w-5 text-red-500" />
                  </button>
                )}
                
                {/* 普通成员状态下的按钮 */}
                {isMember && (
                  <>
                    {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                      <button
                        onClick={() => setShowAddMembersModal(true)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="邀请成员"
                      >
                        <PlusIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </button>
                    )}
                    
                    {currentUserRole === 'owner' ? (
                      <button
                        onClick={() => setShowDeleteGroupConfirm(true)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="删除群聊"
                      >
                        <TrashIcon className="h-5 w-5 text-red-500" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowLeaveConfirm(true)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="退出群聊"
                      >
                        <TrashIcon className="h-5 w-5 text-red-500" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="h-[calc(100vh-280px)] sm:h-[calc(100vh-250px)] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900" onScroll={handleScroll}>
            {loadingMessages ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircleIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  还没有消息，开始聊天吧！
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isCurrentUser = message.sender_id === user?.id;
                  // 获取本地已删除消息信息
                  const deletedMessages = getDeletedMessages();
                  // 检查消息是否已删除：
                  // 1. 本地标记删除
                  // 2. 数据库标记删除（deleted=true）
                  // 3. 内容被修改为删除提示
                  const isLocallyDeleted = Object.keys(deletedMessages).includes(message.id);
                  const isDbDeleted = message.deleted || message.content === '[你的消息被群管理员删除]';
                  const isDeleted = isLocallyDeleted || isDbDeleted;
                  
                  // 获取删除信息
                  const deletionInfo = deletedMessages[message.id];
                  // 获取发送者信息
                  const senderInfo = message.sender_profile;
                  // 查找发送者在群内的信息
                  const senderMember = groupMembers.find(member => member.user_id === message.sender_id);
                  
                  // 获取用户原本的头像和昵称
                  const originalAvatar = senderMember?.user_profile?.avatar_url;
                  const originalName = senderMember?.user_profile?.display_name || senderMember?.user_profile?.username || senderInfo?.display_name || senderInfo?.username || '用户';
                  
                  // 获取发送者名称（优先使用群内昵称）
                  const senderName = senderMember?.group_nickname || originalName;
                  // 获取发送者头像（优先使用群内头像）
                  const senderAvatar = senderMember?.group_avatar_url || originalAvatar || senderInfo?.avatar_url;
                  
                  const senderInitial = (senderName.charAt(0) || message.sender_id.charAt(0)).toUpperCase();
                  
                  // 日期分隔逻辑
                  const currentDate = new Date(message.created_at).toISOString().split('T')[0];
                  const showDateSeparator = index === 0 || new Date(messages[index - 1].created_at).toISOString().split('T')[0] !== currentDate;
                  
                  // 检查是否有删除权限：群管理员可以删除任何消息，普通用户只能删除自己发送的消息
                  const canDelete = (currentUserRole === 'owner' || currentUserRole === 'admin') || (isCurrentUser && new Date().getTime() - new Date(message.created_at).getTime() <= 2 * 60 * 1000);
                  
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
                      <div
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
                      >
                      {/* 非当前用户消息 */}
                      {!isCurrentUser && (
                        <div className="flex items-start gap-2 max-w-[90%] sm:max-w-[80%]">
                          {/* 头像 */}
                          <div 
                            className="w-8 h-8 aspect-square rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer mt-1 flex-shrink-0"
                            onClick={() => handleAvatarClick(senderInfo!)}
                          >
                            {senderAvatar ? (
                              <Image
                                src={senderAvatar}
                                alt="用户头像"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                                objectFit="cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {senderInitial}
                              </span>
                            )}
                          </div>
                          
                          {/* 消息内容 */}
                          <div className="flex flex-col">
                            {/* 用户名和在线状态 */}
                            {!isDeleted && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {senderName}
                                </span>
                                {/* 在线状态显示 - 从群成员列表获取实时状态 */}
                                {senderMember?.user_profile && (
                                  <span className="flex items-center gap-1 text-xs">
                                    {(() => {
                                      // 直接从senderMember.user_profile获取实时在线状态
                                      // 而不是使用message.sender_profile中的旧快照
                                      const { online_status, last_seen } = senderMember.user_profile;
                                      const onlineStatusInfo = getOnlineStatusInfo(online_status, last_seen);
                                      return (
                                        <>
                                          <span className={`w-1.5 h-1.5 rounded-full ${onlineStatusInfo.color} ${onlineStatusInfo.isOnline ? 'animate-pulse' : ''}`}></span>
                                          <span className={onlineStatusInfo.textColor}>
                                            {onlineStatusInfo.text}
                                          </span>
                                        </>
                                      );
                                    })()}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* 消息气泡 */}
                            <div className="relative inline-block bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg p-3 rounded-tl-none">
                              {/* 显示已删除消息占位符 */}
                              {isDeleted ? (
                                <div className="flex items-center justify-center py-2 text-center">
                                  <span className="text-sm italic text-gray-500 dark:text-gray-400">
                                    {/* 根据删除类型显示不同提示 */}
                                    {message.content === '[你的消息被群管理员删除]' ? 
                                      message.sender_id === user?.id ? '你的消息被群管理员删除' : '此消息已被管理员删除' :
                                      deletionInfo?.deletedByAdmin ? 
                                        message.sender_id === user?.id ? '你的消息被群管理员删除' : '此消息已被管理员删除' : 
                                        message.sender_id === user?.id ? '此消息已被撤回' : '此消息已被删除'}
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
                                      <p className="text-sm">
                                        {message.content}
                                      </p>
                                    )}
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs opacity-70">
                                        {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 删除消息按钮 - 管理员或消息发送者可以删除 */}
                              {!isDeleted && canDelete && (
                                <button
                                  onClick={() => handleOpenDeleteMessageConfirm(message.id)}
                                  className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 p-1 rounded-full text-red-500 opacity-0 hover:opacity-100 transition-opacity duration-200 shadow-md"
                                  aria-label="删除消息"
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 当前用户消息 */}
                      {isCurrentUser && (
                        <div className="flex items-start gap-2 max-w-[90%] sm:max-w-[80%] justify-end">
                          {/* 消息内容 */}
                          <div className="flex flex-col items-end">
                            {/* 消息气泡 */}
                            <div className="relative inline-block bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-lg p-3 rounded-tr-none group">
                              {/* 显示已删除消息占位符 */}
                              {isDeleted ? (
                                <div className="flex items-center justify-center py-2 text-center">
                                  <span className="text-sm italic text-gray-300">
                                    {/* 根据删除类型显示不同提示 */}
                                    {message.content === '[你的消息被群管理员删除]' ? '你的消息被群管理员删除' :
                                     deletionInfo?.deletedByAdmin ? '你的消息被群管理员删除' : '此消息已被撤回'}
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
                                      <p className="text-sm">
                                        {message.content}
                                      </p>
                                    )}
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs opacity-70">
                                        {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                                
                              {/* 删除消息按钮 - 管理员或消息发送者可以删除 */}
                              {!isDeleted && canDelete && (
                                <button
                                  onClick={() => handleOpenDeleteMessageConfirm(message.id)}
                                  className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                                  aria-label="删除消息"
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* 当前用户头像 */}
                          <div 
                            className="w-8 h-8 aspect-square rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mt-1 cursor-pointer flex-shrink-0"
                            onClick={handleCurrentUserAvatarClick}
                          >
                            {/* 从message.sender_profile中获取当前用户的头像和用户名，优先使用群内头像 */}
                            {senderAvatar ? (
                              <Image
                                src={senderAvatar}
                                alt="你的头像"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                                objectFit="cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {senderInitial}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 消息输入框 */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative">
                  {/* 隐藏的文件输入 */}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    disabled={sending}
                    className="hidden"
                    id="group-file-upload"
                  />
                  
                  {/* 图片上传按钮 */}
                  <button
                    type="button"
                    className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 min-w-12 min-h-12 flex items-center justify-center"
                    onClick={() => document.getElementById('group-file-upload')?.click()}
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
                  {/* 表情选择器按钮 */}
                  <button
                    type="button"
                    className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 min-w-12 min-h-12 flex items-center justify-center"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={sending}
                  >
                    <Smile className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  
                  {/* 表情选择器 */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 w-64 md:w-80 max-h-48 overflow-y-auto z-50">
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
              <div className="flex gap-2">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    placeholder="输入消息..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm sm:text-base"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                </div>
                <button
                  type="submit"
                  className="p-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:from-pink-500 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg min-w-12 min-h-12 flex items-center justify-center"
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <SendIcon className="h-5 w-5 sm:h-6 sm:w-6" />
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
            </div>
          </form>
        </div>
      </main>

      {/* 邀请成员模态框 */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-100 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                邀请成员
              </h3>
              <button
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedMembers([]);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭"
              >
                <XIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            
            {/* 搜索框 */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="搜索用户..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-lg hover:from-pink-500 hover:to-purple-600 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={!searchQuery.trim() || searching}
                >
                  {searching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    '搜索'
                  )}
                </button>
              </div>
            </div>
            
            {/* 搜索结果 */}
            <div className="mb-4 max-h-60 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${selectedMembers.includes(result.id) ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' : ''}`}
                      onClick={() => toggleMemberSelection(result.id)}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                        {result.avatar_url ? (
                          <Image
                            src={result.avatar_url}
                            alt={result.display_name || result.username}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                            <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                              {(result.display_name || result.username).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 dark:text-white">
                          {result.display_name || result.username}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {result.username}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedMembers.includes(result.id) ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        {selectedMembers.includes(result.id) && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    未找到匹配的用户
                  </p>
                </div>
              ) : null}
            </div>
            
            {/* 已选成员 */}
            {selectedMembers.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  已选择 {selectedMembers.length} 位成员
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((userId) => {
                    const member = searchResults.find(r => r.id === userId);
                    if (!member) return null;
                    
                    return (
                      <div key={userId} className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-full text-sm">
                        <span>{member.display_name || member.username}</span>
                        <button
                          onClick={() => toggleMemberSelection(userId)}
                          className="p-1 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                        >
                          <XIcon className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedMembers([]);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleInviteMembers}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl hover:from-pink-500 hover:to-purple-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={selectedMembers.length === 0}
              >
                邀请成员
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 退出群聊确认 */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                确认退出群聊
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                确定要退出 {group.name} 吗？
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleLeaveGroup}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除群聊确认 */}
      {showDeleteGroupConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                确认删除群聊
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                确定要删除 {group.name} 吗？此操作不可恢复，群聊内的所有消息和成员记录都会被删除。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteGroupConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleDeleteGroup}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 删除消息确认 */}
      {showDeleteMessageConfirm && selectedMessageId && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🗑️</div>
              {(() => {
                const messageToDelete = messages.find(msg => msg.id === selectedMessageId);
                const isAdminDeletingOther = messageToDelete && (currentUserRole === 'owner' || currentUserRole === 'admin') && messageToDelete.sender_id !== user?.id;
                
                if (isAdminDeletingOther) {
                  return (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        确认删除他人消息
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                        作为群管理员，你正在删除其他用户的消息。
                      </p>
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        该操作将从数据库中永久删除此消息，所有成员都将无法看到。
                      </p>
                    </>
                  );
                } else {
                  return (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        确认删除消息
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        确定要删除这条消息吗？
                      </p>
                    </>
                  );
                }
              })()}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCloseDeleteMessageConfirm}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleDeleteMessage}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}


      
      {/* 用户信息弹窗 */}
      {showUserProfileModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-100 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">用户信息</h3>
                <button
                  onClick={() => setShowUserProfileModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mb-4">
                  {selectedUser?.avatar_url ? (
                    <Image
                      src={selectedUser.avatar_url}
                      alt="用户头像"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-medium text-gray-600 dark:text-gray-300">
                      {(selectedUser?.display_name?.charAt(0) || selectedUser?.username?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
                
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  {selectedUser?.display_name || selectedUser?.username || '未知用户'}
                </h4>
                
                {selectedUser?.username && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    @{selectedUser.username}
                  </p>
                )}
                
                {/* 在线状态显示 */}
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    // 在用户信息弹窗中，我们需要获取用户的在线状态和最后活跃时间
                    // 由于selectedUser可能没有这些信息，我们需要从groupMembers中查找
                    const groupMember = groupMembers.find(member => member.user_id === selectedUser?.id);
                    if (groupMember?.user_profile) {
                      const { online_status, last_seen } = groupMember.user_profile;
                      const onlineStatusInfo = getOnlineStatusInfo(online_status, last_seen);
                      return (
                        <span className="flex items-center gap-1 text-sm">
                          <span className={`w-2 h-2 rounded-full ${onlineStatusInfo.color} ${onlineStatusInfo.isOnline ? 'animate-pulse' : ''}`}></span>
                          <span className={onlineStatusInfo.textColor}>
                            {onlineStatusInfo.text}
                          </span>
                        </span>
                      );
                    }
                    return (
                      <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        离线
                      </span>
                    );
                  })()}
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  加入于 {new Date(selectedUser?.created_at || '').toLocaleDateString('zh-CN')}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">用户ID</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedUser?.id}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowUserProfileModal(false)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 群内个人信息设置弹窗 */}
      {showGroupProfileModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-100 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">群内个人信息</h3>
                <button
                  onClick={() => {
                  setShowGroupProfileModal(false);
                }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mb-4">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="群内头像预览"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : groupAvatar ? (
                    <Image
                      src={groupAvatar}
                      alt="群内头像"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : user?.display_name ? (
                    <span className="text-xl font-medium text-gray-600 dark:text-gray-300">
                      {user.display_name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-xl font-medium text-gray-600 dark:text-gray-300">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={handleChangeAvatarClick}
                  className="mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  更换头像
                </button>
                
                {/* 隐藏的文件输入框 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                
                <div className="w-full mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    群内昵称
                  </label>
                  <input
                    type="text"
                    value={groupNickname}
                    onChange={(e) => setGroupNickname(e.target.value)}
                    placeholder="输入你在本群的昵称"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                  setShowGroupProfileModal(false);
                }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateGroupProfile}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 群设置弹窗 */}
      {showGroupSettingsModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-100 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">群设置</h3>
                <button
                  onClick={() => {
                    setShowGroupSettingsModal(false);
                    // 重置表单
                    setGroupAvatarFile(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mb-4">
                  {groupAvatarPreview ? (
                    <Image
                      src={groupAvatarPreview}
                      alt="群头像预览"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : group?.avatar_url ? (
                    <Image
                      src={group.avatar_url}
                      alt="群头像"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-200 to-pink-300 dark:from-purple-700 dark:to-pink-800 flex items-center justify-center">
                      <UsersIcon className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => groupAvatarInputRef.current?.click()}
                  className="mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  更换群头像
                </button>
                
                {/* 隐藏的文件输入框 */}
                <input
                  ref={groupAvatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // 检查文件类型
                      if (!file.type.startsWith('image/')) {
                        showToast.error('请选择图片文件');
                        return;
                      }
                      // 检查文件大小（最大5MB）
                      if (file.size > 5 * 1024 * 1024) {
                        showToast.error('图片大小不能超过5MB');
                        return;
                      }
                      
                      setGroupAvatarFile(file);
                      // 创建预览URL
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setGroupAvatarPreview(e.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                
                <div className="w-full mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    群名称
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="输入群名称"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    maxLength={20}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowGroupSettingsModal(false);
                    // 重置表单
                    setGroupAvatarFile(null);
                    setGroupAvatarPreview(group?.avatar_url);
                    setNewGroupName(group?.name || '');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    try {
                      let newAvatarUrl = group?.avatar_url;
                       
                      // 如果有新选择的群头像文件，先上传
                      if (groupAvatarFile) {
                        // 生成安全的文件名
                        const safeFileName = `${Date.now()}_${groupAvatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                        const filePath = `group_avatars/${groupId}/${safeFileName}`;
                        
                        // 上传文件
                        const { error: uploadError } = await supabase
                          .storage
                          .from('confession_images')
                          .upload(filePath, groupAvatarFile, {
                            cacheControl: '3600',
                            upsert: true
                          });
                        
                        if (uploadError) {
                          throw new Error('上传群头像失败');
                        }
                        
                        // 获取公共URL
                        const { data: urlData } = supabase
                          .storage
                          .from('confession_images')
                          .getPublicUrl(filePath);
                        
                        newAvatarUrl = urlData.publicUrl;
                      }
                      
                      // 使用chatService.updateGroup方法更新群信息
                      await chatService.updateGroup(groupId, newGroupName.trim(), newAvatarUrl);
                      
                      // 更新本地状态
                      setGroup(prev => prev ? {
                        ...prev,
                        name: newGroupName.trim(),
                        avatar_url: newAvatarUrl
                      } : prev);
                      
                      setShowGroupSettingsModal(false);
                      showToast.success('群设置更新成功');
                    } catch (err) {
                      console.error('Failed to update group settings:', err);
                      const errorMessage = err instanceof Error ? err.message : '更新群设置失败，请重试';
                      showToast.error(errorMessage);
                    } finally {
                      // 重置表单
                      setGroupAvatarFile(null);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 群成员列表弹窗 */}
      {showGroupMembersModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-100 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">群成员列表</h3>
                <button
                  onClick={() => setShowGroupMembersModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  共 {groupMembers.length} 位成员
                </p>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                <div className="space-y-3">
                  {groupMembers.map((member) => {
                    // 获取用户原本的头像和昵称
                    const originalAvatar = member.user_profile?.avatar_url;
                    const originalName = member.user_profile?.display_name || member.user_profile?.username || '未设置昵称';
                    
                    // 判断当前用户是否可以删除该成员
                    const canRemove = (currentUserRole === 'owner' || currentUserRole === 'admin') && 
                                      member.role !== 'owner' && 
                                      member.user_id !== user?.id;
                    
                    return (
                      <div key={member.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            {member.group_avatar_url ? (
                              <Image
                                src={member.group_avatar_url}
                                alt="群内头像"
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : originalAvatar ? (
                              <Image
                                src={originalAvatar}
                                alt="用户头像"
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-200 to-pink-300 dark:from-purple-700 dark:to-pink-800 flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-500 dark:text-purple-400">
                                  {(member.group_nickname || originalName || member.user_id).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {member.group_nickname || originalName}
                              </h4>
                              {member.role === 'owner' && (
                                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
                                  群主
                                </span>
                              )}
                              {member.role === 'admin' && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                  管理员
                                </span>
                              )}
                              {/* 在线状态 - 使用统一的在线状态信息函数，与好友列表保持一致 */}
                              {(() => {
                                const profile = member.user_profile;
                                if (!profile) {
                                  return (
                                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                                      <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                      离线
                                    </span>
                                  );
                                }
                                
                                const { online_status, last_seen } = profile;
                                // 使用与好友列表相同的getOnlineStatusInfo函数，确保一致性
                                const onlineStatusInfo = getOnlineStatusInfo(online_status, last_seen);
                                
                                return (
                                  <span className={`flex items-center gap-1 ${onlineStatusInfo.textColor} text-xs`}>
                                    <span className={`w-2 h-2 rounded-full ${onlineStatusInfo.color} ${onlineStatusInfo.isOnline ? 'animate-pulse' : ''}`}></span>
                                    {onlineStatusInfo.text}
                                  </span>
                                );
                              })()}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {member.user_id}
                            </p>
                          </div>
                        </div>
                        
                        {/* 删除成员按钮 */}
                        {canRemove && (
                          <button
                            onClick={() => handleOpenRemoveMemberConfirm(member.user_id)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                            aria-label="删除成员"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowGroupMembersModal(false)}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 非成员提示弹窗 */}
      {showNotMemberPrompt && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-100 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">📢</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  你已不是群成员
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  你已被移出群聊或群聊已被删除，是否保留聊天记录？
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleNotMemberAction('keep')}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  保留
                </button>
                <button
                  onClick={() => handleNotMemberAction('delete')}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除成员确认弹窗 */}
      {showRemoveMemberConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-100 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">⚠️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  确认删除成员
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  确定要删除该成员吗？此操作不可恢复。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseRemoveMemberConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleRemoveMember}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatPage;
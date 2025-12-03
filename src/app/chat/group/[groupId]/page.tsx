'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { ChatMessage, Group, GroupMember, UserSearchResult, Profile } from '@/types/chat';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import MessageToast from '@/components/MessageToast';
import MultimediaMessage from '@/components/MultimediaMessage';
import { MessageCircleIcon, UsersIcon, PlusIcon, XIcon, TrashIcon, SendIcon, Image as ImageIcon, Smile } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const GroupChatPage = ({ params }: { params: Promise<{ groupId: string }> }) => {
  const { user } = useAuth();
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
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
  const [newGroupName, setNewGroupName] = useState<string>(group?.name || '');
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | undefined>(group?.avatar_url);
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 实时通道引用，与私聊实现一致
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // 获取本地已删除消息ID
  const getDeletedMessageIds = useCallback((): string[] => {
    if (!user?.id) return [];
    const key = `deleted_messages_${user.id}_${groupId}`;
    const deletedIds = localStorage.getItem(key);
    return deletedIds ? JSON.parse(deletedIds) : [];
  }, [user?.id, groupId]);

  // 处理头像点击，显示用户信息
  const handleAvatarClick = (senderProfile: Profile) => {
    if (senderProfile) {
      setSelectedUser({
        id: senderProfile.id,
        username: senderProfile.username || '',
        display_name: senderProfile.display_name || '',
        avatar_url: senderProfile.avatar_url,
        created_at: senderProfile.created_at || new Date().toISOString()
      });
      setShowUserProfileModal(true);
    }
  };
  
  // 添加本地已删除消息ID
  const addDeletedMessageId = useCallback((messageId: string) => {
    if (!user?.id) return;
    const key = `deleted_messages_${user.id}_${groupId}`;
    const deletedIds = getDeletedMessageIds();
    if (!deletedIds.includes(messageId)) {
      deletedIds.push(messageId);
      localStorage.setItem(key, JSON.stringify(deletedIds));
    }
  }, [user?.id, groupId, getDeletedMessageIds]);
  
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
          setCurrentUserRole(currentMember.role as 'owner' | 'member');
          // 设置群内昵称和头像
          setGroupNickname(currentMember.group_nickname || '');
          setGroupAvatar(currentMember.group_avatar_url);
        } else {
          setCurrentUserRole(null);
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

    // 监听群成员在线状态变化 - 不使用groupMembers变量，避免stale closure
    groupChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      },
      async (payload) => {
        try {
          // 检查更新的用户是否是群成员
          const membersData = await chatService.getGroupMembers(groupId);
          const isGroupMember = membersData.some(member => member.user_id === payload.new.id);
          
          if (isGroupMember) {
            // 刷新群成员列表，获取最新的在线状态
            setGroupMembers(membersData);
          }
        } catch {
          // ignore error
        }
      }
    );

    // 启动订阅
    groupChannel.subscribe();

    return () => {
      // 移除所有群相关监听器
      supabase.removeChannel(groupChannel);
    };
  }, [user, groupId, getDeletedMessageIds]);

  // 自动标记消息为已读
  const markMessagesAsRead = useCallback(async () => {
    if (!user?.id || !groupId) return;

    try {
      await chatService.markGroupMessagesAsRead(groupId);
      
      // 触发群聊列表页面更新未读消息数量
      // 通过发送自定义事件来通知其他组件
      window.dispatchEvent(new CustomEvent('groupMessagesRead', { detail: { groupId } }));
    } catch {
      // ignore error
    }
  }, [user?.id, groupId]);

  // 获取群消息
  useEffect(() => {
    if (!user?.id || !groupId) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const groupMessages = await chatService.getGroupMessages(groupId, 50, 0);
        const deletedIds = getDeletedMessageIds();
        // 过滤掉本地已删除的消息
        const filteredMessages = groupMessages.filter(msg => !deletedIds.includes(msg.id));
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
  }, [user?.id, groupId, getDeletedMessageIds, markMessagesAsRead]);

  // 实时消息订阅 - 完全复制私聊实现，仅修改过滤条件
  useEffect(() => {
    if (!user?.id || !groupId) {
      return;
    }

    // 使用唯一的通道名称
    const channelName = `group_chat_${groupId}_${user.id}`;
    console.log('Creating group chat channel:', channelName);

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
          console.log('New group message received in channel', channelName, ':', payload);
          
          // 只处理当前群组的消息
          if (payload.new.group_id === groupId) {
            console.log('Filtered message is for current group:', payload.new);
            
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
                console.log('Skipping own message from realtime, already added via optimistic UI:', payload.new.id);
                return;
              }
              
              // 直接添加到消息列表末尾，不重新排序（与私聊一致）
              setMessages(prev => {
                // 检查消息是否已存在
                if (prev.some(msg => msg.id === completeMessage.id)) {
                  console.log('Group message already exists, skipping:', completeMessage.id);
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
      console.log('Removing group channel:', channelName);
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
    console.log('Messages updated, scrolling to bottom');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 监听新消息通知，确保滚动到底部
  useEffect(() => {
    const handleGroupMessagesReceived = () => {
      console.log('Group messages received event, scrolling to bottom');
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
          setToastMessage('视频文件大小不能超过50MB');
          setToastType('error');
          setSending(false);
          return;
        }
        fileUrl = await chatService.uploadFile(file, 'chat_videos');
        fileType = 'video';
      } else {
        // 其他文件，暂时不支持
        setToastMessage('暂不支持该文件类型');
        setToastType('error');
        setSending(false);
        return;
      }
      
      // 发送消息
      const sentMessage = await chatService.sendGroupMessage(groupId, fileUrl, fileType);
      
      // 直接添加到消息列表末尾
      setMessages(prev => {
        // 检查消息是否已存在
        if (prev.some(msg => msg.id === sentMessage.id)) {
          console.log('Group message already exists, skipping:', sentMessage.id);
          return prev;
        }
        return [...prev, sentMessage];
      });
      
      // 滚动到最新消息
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error sending file message:', error);
      setToastMessage('发送文件失败，请重试');
      setToastType('error');
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
          console.log('Group message already exists, skipping:', sentMessage.id);
          return prev;
        }
        return [...prev, sentMessage];
      });
      
      // 滚动到最新消息
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      setNewMessage(messageContent);
      setToastMessage('发送消息失败，请重试');
      setToastType('error');
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
      
      setToastMessage('邀请发送成功！');
      setToastType('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '邀请失败，请重试';
      setToastMessage(errorMessage);
      setToastType('error');
    }
  };

  // 关闭消息提示
  const handleCloseToast = () => {
    setToastMessage(null);
  };

  // 退出群聊
  const handleLeaveGroup = async () => {
    try {
      await chatService.leaveGroup(groupId);
      setShowLeaveConfirm(false);
      // 跳转到聊天列表页
      setToastMessage('退出群聊成功！');
      setToastType('success');
      setTimeout(() => {
        window.location.href = '/chat';
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '退出群聊失败，请重试';
      setToastMessage(errorMessage);
      setToastType('error');
    }
  };

  // 删除群聊
  const handleDeleteGroup = async () => {
    try {
      await chatService.deleteGroup(groupId);
      setShowDeleteGroupConfirm(false);
      // 跳转到聊天列表页
      setToastMessage('群聊已删除！');
      setToastType('success');
      setTimeout(() => {
        window.location.href = '/chat';
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除群聊失败，请重试';
      setToastMessage(errorMessage);
      setToastType('error');
    }
  };
  
  // 打开删除消息确认对话框
  const handleOpenDeleteMessageConfirm = (messageId: string) => {
    // 检查消息发送时间是否超过两分钟
    const messageToDelete = messages.find(msg => msg.id === messageId);
    if (messageToDelete) {
      const messageTime = new Date(messageToDelete.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - messageTime.getTime();
      const twoMinutes = 2 * 60 * 1000;
      
      if (timeDiff > twoMinutes) {
        // 超过两分钟，不允许删除
        setToastMessage('消息发送超过两分钟，无法删除');
        setToastType('error');
        return;
      }
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
      // 获取要删除的消息，确保是自己发送的
      const messageToDelete = messages.find(msg => msg.id === selectedMessageId);
      if (!messageToDelete || messageToDelete.sender_id !== user?.id) {
        throw new Error('你只能删除自己发送的消息');
      }
      
      // 调用服务端删除方法
      await chatService.deleteMessages([selectedMessageId]);
      
      // 添加到本地已删除消息列表
      addDeletedMessageId(selectedMessageId);
      
      // 从当前消息列表中移除
      setMessages(prev => prev.filter(msg => msg.id !== selectedMessageId));
      
      // 关闭确认对话框
      handleCloseDeleteMessageConfirm();
      
      // 显示成功提示
      setToastMessage('消息已删除');
      setToastType('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除消息失败，请重试';
      setToastMessage(errorMessage);
      setToastType('error');
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
      setToastMessage('成员已删除');
      setToastType('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除成员失败，请重试';
      setToastMessage(errorMessage);
      setToastType('error');
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
      
      setToastMessage('群内个人信息已更新');
      setToastType('success');
    } catch (err) {
      console.error('Failed to update group profile:', err);
      setToastMessage('更新群内个人信息失败，请重试');
      setToastType('error');
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
        setToastMessage('请选择图片文件');
        setToastType('error');
        return;
      }
      // 检查文件大小（最大5MB）
      if (file.size > 5 * 1024 * 1024) {
        setToastMessage('图片大小不能超过5MB');
        setToastType('error');
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
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
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
                        {groupMembers.filter(member => 
                          member.user_profile?.online_status === 'online'
                        ).length} 人在线
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
                <button
                  onClick={() => setShowAddMembersModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="邀请成员"
                >
                  <PlusIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
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
                {messages.map((message) => {
                  const isCurrentUser = message.sender_id === user?.id;
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
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      {/* 非当前用户消息 */}
                      {!isCurrentUser && (
                        <div className="flex items-start gap-2 max-w-[90%] sm:max-w-[80%]">
                          {/* 头像 */}
                          <div 
                            className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer mt-1"
                            onClick={() => handleAvatarClick(senderInfo!)}
                          >
                            {senderAvatar ? (
                              <Image
                                src={senderAvatar}
                                alt="用户头像"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {senderInitial}
                              </span>
                            )}
                          </div>
                          
                          {/* 消息内容 */}
                          <div className="flex flex-col">
                            {/* 用户名 */}
                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {senderName}
                            </span>
                            
                            {/* 消息气泡 */}
                            <div className="relative inline-block bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg p-3 rounded-tl-none">
                              {/* 消息内容 */}
                              <div className="flex flex-col gap-2">
                                {/* 非文本消息单独一行显示 */}
                                {message.type !== 'text' && (
                                  <div className="w-full">
                                    <MultimediaMessage message={message} isCurrentUser={isCurrentUser} />
                                  </div>
                                )}
                                
                                {/* 文本消息与时间戳在同一行 */}
                                <div className="flex items-end gap-1">
                                  {message.type === 'text' && (
                                    <p className="text-sm">
                                      {message.content}
                                    </p>
                                  )}
                                  <span className="text-xs opacity-70">
                                    {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
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
                              {/* 消息内容 */}
                              <div className="flex flex-col gap-2">
                                {/* 非文本消息单独一行显示 */}
                                {message.type !== 'text' && (
                                  <div className="w-full">
                                    <MultimediaMessage message={message} isCurrentUser={isCurrentUser} />
                                  </div>
                                )}
                                
                                {/* 文本消息与时间戳在同一行 */}
                                <div className="flex items-end gap-1">
                                  {message.type === 'text' && (
                                    <p className="text-sm">
                                      {message.content}
                                    </p>
                                  )}
                                  <span className="text-xs opacity-70">
                                    {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                                
                              {/* 删除消息按钮 - 只有当前用户发送的消息才显示 */}
                              <button
                                onClick={() => handleOpenDeleteMessageConfirm(message.id)}
                                className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                                aria-label="删除消息"
                              >
                                <TrashIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          
                          {/* 当前用户头像 */}
                          <div 
                            className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mt-1 cursor-pointer"
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
                  );
                })}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 消息输入框 */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
          </form>
        </div>
      </main>

      {/* 邀请成员模态框 */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
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
      {showDeleteMessageConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🗑️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                确认删除消息
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                确定要删除这条消息吗？此操作只会删除你设备上的记录，不会影响其他成员。
              </p>
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

      {/* 消息提示 */}
      {toastMessage && (
        <MessageToast
          message={toastMessage}
          type={toastType}
          onClose={handleCloseToast}
        />
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
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    @{selectedUser.username}
                  </p>
                )}
                
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
                        setToastMessage('请选择图片文件');
                        setToastType('error');
                        return;
                      }
                      // 检查文件大小（最大5MB）
                      if (file.size > 5 * 1024 * 1024) {
                        setToastMessage('图片大小不能超过5MB');
                        setToastType('error');
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
                      setToastMessage('群设置更新成功');
                      setToastType('success');
                    } catch (err) {
                      console.error('Failed to update group settings:', err);
                      const errorMessage = err instanceof Error ? err.message : '更新群设置失败，请重试';
                      setToastMessage(errorMessage);
                      setToastType('error');
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
                              {/* 在线状态 */}
                              {(() => {
                                const profile = member.user_profile;
                                const status = profile?.online_status;
                                if (status === 'online') {
                                  return (
                                    <span className="flex items-center gap-1 text-green-500 dark:text-green-400 text-xs">
                                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                      在线
                                    </span>
                                  );
                                } else if (status === 'away') {
                                  return (
                                    <span className="flex items-center gap-1 text-yellow-500 dark:text-yellow-400 text-xs">
                                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                      离开
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                                      <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                      离线
                                    </span>
                                  );
                                }
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
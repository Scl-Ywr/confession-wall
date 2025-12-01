import { supabase } from '@/lib/supabase/client';
import { 
  FriendRequest, 
  Friendship, 
  ChatMessage, 
  ChatSession, 
  Group, 
  GroupMember, 
  GroupAnnouncement, 
  UserSearchResult,
  Notification,
  NotificationType
} from '@/types/chat';

// 创建通知的辅助函数
const createNotification = async (
  recipientId: string,
  content: string,
  type: NotificationType,
  friendRequestId?: string
): Promise<Notification> => {
  console.log('Creating notification:', {
    recipientId,
    content,
    type,
    friendRequestId
  });
  
  // 获取当前认证用户
  let user = await supabase.auth.getUser();
  
  // 检查是否有错误获取用户信息，尝试刷新会话
  if (user.error || !user.data.user?.id) {
    console.log('Refreshing session...');
    // 尝试刷新会话
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('Failed to refresh session:', refreshError);
      throw new Error('User not authenticated');
    }
    
    // 重新获取用户信息
    user = await supabase.auth.getUser();
    
    if (user.error || !user.data.user?.id) {
      console.error('Auth error in createNotification after refresh:', user.error);
      throw new Error('User not authenticated');
    }
  }
  
  const senderId = user.data.user.id;

  console.log('Sender ID for notification:', senderId);
  
  // 尝试插入通知，移除.select('*').single()，因为发送者不是接收者，不能查询通知
  const { error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: recipientId,
      sender_id: senderId, // 始终使用当前认证用户的ID作为发送者ID
      content,
      type,
      friend_request_id: friendRequestId
    });

  if (error) {
    console.error('Error inserting notification:', error);
    // 检查是否是认证错误，如果是，尝试刷新会话并重试
    if (error.code === '42501' || error.code === '401' || error.code === '403') {
      console.log('Authentication error, refreshing session and retrying...');
      // 刷新会话
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError) {
        // 重试插入，同样移除.select('*').single()
        const { error: retryError } = await supabase
          .from('notifications')
          .insert({
            recipient_id: recipientId,
            sender_id: senderId,
            content,
            type,
            friend_request_id: friendRequestId
          });
        
        if (!retryError) {
          console.log('Successfully created notification on retry');
          // 返回一个模拟的通知对象，因为我们不需要实际的数据库ID
          return {
            id: 'temp-notification-id',
            recipient_id: recipientId,
            sender_id: senderId,
            content,
            type,
            read_status: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            friend_request_id: friendRequestId
          } as Notification;
        }
        console.error('Retry failed:', retryError);
      }
    }
    throw error;
  }

  console.log('Successfully created notification');
  // 返回一个模拟的通知对象，因为我们不需要实际的数据库ID
  return {
    id: 'temp-notification-id',
    recipient_id: recipientId,
    sender_id: senderId,
    content,
    type,
    read_status: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    friend_request_id: friendRequestId
  } as Notification;
};

export const chatService = {
  // 用户搜索功能
  searchUsers: async (keyword: string): Promise<UserSearchResult[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, created_at')
      .or(`username.ilike.%${keyword}%,display_name.ilike.%${keyword}%`)
      .limit(20);

    if (error) {
      throw error;
    }

    return data as UserSearchResult[];
  },

  // 发送好友申请
  sendFriendRequest: async (receiverId: string, message?: string): Promise<FriendRequest> => {
    console.log('Starting sendFriendRequest for receiver:', receiverId);
    
    const user = await supabase.auth.getUser();
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      console.error('Auth error in sendFriendRequest:', user.error);
      throw new Error('User not authenticated');
    }
    
    const senderId = user.data?.user?.id;

    if (!senderId) {
      console.error('No sender ID in sendFriendRequest');
      throw new Error('User not authenticated');
    }

    console.log('Sender ID:', senderId);
    
    // 简单验证 receiverId 格式，避免无效请求
    if (!receiverId || receiverId.length !== 36) {
      throw new Error('Invalid receiver ID format');
    }

    // 开始事务
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting friend request:', error);
      throw error;
    }

    console.log('Successfully created friend request:', data);
    
    // 获取发送者的资料，用于通知内容
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', senderId)
      .single();

    console.log('Sender profile:', senderProfile);
    
    try {
      // 创建通知
      console.log('Calling createNotification...');
      await createNotification(
        receiverId,
        `${senderProfile?.display_name || '用户'} 发送了好友请求`,
        'friend_request',
        data.id
      );
      console.log('Notification created successfully');
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // 继续执行，不中断好友请求流程
    }

    return data as FriendRequest;
  },

  // 获取好友申请列表
  getFriendRequests: async (): Promise<FriendRequest[]> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // 获取收到的好友申请
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*, sender_profile:profiles!sender_id(*), receiver_profile:profiles!receiver_id(*)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data as FriendRequest[];
  },

  // 处理好友申请
  handleFriendRequest: async (requestId: string, status: 'accepted' | 'rejected'): Promise<FriendRequest> => {
    const user = await supabase.auth.getUser();
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      throw new Error('User not authenticated');
    }
    
    const userId = user.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // 更新好友申请状态
    const { data: updatedRequest, error: updateError } = await supabase
      .from('friend_requests')
      .update({ status })
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    // 获取接收者的资料，用于通知内容
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    // 创建通知给发送者
    if (updatedRequest) {
      const notificationContent = status === 'accepted' 
        ? `${receiverProfile?.display_name || '用户'} 接受了你的好友请求`
        : `${receiverProfile?.display_name || '用户'} 拒绝了你的好友请求`;
      
      await createNotification(
        updatedRequest.sender_id,
        notificationContent,
        status === 'accepted' ? 'friend_accepted' : 'friend_rejected',
        updatedRequest.id
      );

      // 如果是接受请求，创建好友关系
      if (status === 'accepted') {
        const { error: friendshipError } = await supabase
          .from('friendships')
          .insert([
            {
              user_id: updatedRequest.sender_id,
              friend_id: updatedRequest.receiver_id
            },
            {
              user_id: updatedRequest.receiver_id,
              friend_id: updatedRequest.sender_id
            }
          ]);

        if (friendshipError) {
          throw friendshipError;
        }
      }
    }

    return updatedRequest as FriendRequest;
  },

  // 获取好友列表
  getFriends: async (): Promise<Friendship[]> => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('friendships')
        .select('*, friend_profile:profiles!friend_id(*)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to fetch friends: ${error.message || 'Unknown error'}`);
      }

      return data as Friendship[];
    } catch (error) {
      console.error('Error in getFriends:', error);
      throw error;
    }
  },

  // 发送一对一消息
  sendPrivateMessage: async (receiverId: string, content: string): Promise<ChatMessage> => {
    const user = await supabase.auth.getUser();
    const senderId = user.data.user?.id;

    if (!senderId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        type: 'text',
        is_read: false
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as ChatMessage;
  },

  // 获取聊天消息
  getChatMessages: async (otherUserId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, sender_profile:profiles!sender_id(*)')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data as ChatMessage[];
  },

  // 创建交流群
  createGroup: async (name: string, description?: string, avatarUrl?: string): Promise<Group> => {
    const user = await supabase.auth.getUser();
    const creatorId = user.data.user?.id;

    if (!creatorId) {
      throw new Error('User not authenticated');
    }

    // 创建群
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        avatar_url: avatarUrl,
        creator_id: creatorId,
        member_count: 1
      })
      .select('*')
      .single();

    if (groupError) {
      throw groupError;
    }

    // 添加创建者为群成员
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: creatorId,
        role: 'owner'
      });

    if (memberError) {
      throw memberError;
    }

    return group as Group;
  },

  // 邀请好友加入群
  inviteToGroup: async (groupId: string, friendIds: string[]): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // 检查当前用户是否是群管理员或群主
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('You do not have permission to invite members to this group');
    }

    // 批量添加群成员
    const memberInserts = friendIds.map(friendId => ({
      group_id: groupId,
      user_id: friendId,
      role: 'member'
    }));

    const { error: insertError } = await supabase
      .from('group_members')
      .insert(memberInserts);

    if (insertError) {
      throw insertError;
    }

    // 更新群成员数量
    const { data: countData } = await supabase
      .from('group_members')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId);

    const memberCount = countData?.length || 0;

    await supabase
      .from('groups')
      .update({ member_count: memberCount })
      .eq('group_id', groupId);
  },

  // 获取群列表
  getGroups: async (): Promise<Group[]> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('group_members')
      .select('group:groups(*)')
      .eq('user_id', userId)
      .order('group.created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // 正确处理返回的数据结构
    if (!data || data.length === 0) {
      return [];
    }

    return data
      .filter(item => item.group && typeof item.group === 'object')
      .map(item => item.group as unknown as Group);
  },

  // 获取群成员列表
  getGroupMembers: async (groupId: string): Promise<GroupMember[]> => {
    const { data, error } = await supabase
      .from('group_members')
      .select('*, user_profile:profiles!user_id(*)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data as GroupMember[];
  },

  // 发送群消息
  sendGroupMessage: async (groupId: string, content: string): Promise<ChatMessage> => {
    const user = await supabase.auth.getUser();
    const senderId = user.data.user?.id;

    if (!senderId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        group_id: groupId,
        content,
        type: 'text',
        is_read: false
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as ChatMessage;
  },

  // 获取群消息
  getGroupMessages: async (groupId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, sender_profile:profiles!sender_id(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data as ChatMessage[];
  },

  // 更新消息已读状态
  markMessagesAsRead: async (messageIds: string[]): Promise<void> => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .in('id', messageIds);

    if (error) {
      throw error;
    }
  },

  // 删除聊天消息
  deleteMessages: async (messageIds: string[]): Promise<void> => {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .in('id', messageIds);

    if (error) {
      throw error;
    }
  },

  // 创建群公告
  createGroupAnnouncement: async (groupId: string, content: string): Promise<GroupAnnouncement> => {
    const user = await supabase.auth.getUser();
    const creatorId = user.data.user?.id;

    if (!creatorId) {
      throw new Error('User not authenticated');
    }

    // 检查当前用户是否是群管理员或群主
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', creatorId)
      .single();

    if (memberError || !member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('You do not have permission to create announcements for this group');
    }

    const { data, error } = await supabase
      .from('group_announcements')
      .insert({
        group_id: groupId,
        content,
        created_by: creatorId
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as GroupAnnouncement;
  },

  // 获取群公告
  getGroupAnnouncements: async (groupId: string): Promise<GroupAnnouncement[]> => {
    const { data, error } = await supabase
      .from('group_announcements')
      .select('*, creator_profile:profiles!created_by(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return data as GroupAnnouncement[];
  },

  // 获取聊天会话列表
  getChatSessions: async (): Promise<ChatSession[]> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // 这里需要实现复杂的查询逻辑，获取所有聊天会话
    // 包括一对一聊天和群聊
    // 并按最后消息时间排序
    // 由于Supabase的查询限制，可能需要分两次查询然后合并
    
    // 1. 获取一对一聊天会话
    await supabase
      .from('chat_messages')
      .select('receiver_id, sender_id, created_at, content, type, is_read')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    // 2. 获取群聊会话
    await supabase
      .from('chat_messages')
      .select('group_id, created_at, content, type, is_read')
      .not('group_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    // 3. 合并并处理会话数据
    // 这里需要实现复杂的逻辑来合并会话
    // 由于时间关系，这里简化处理
    
    return [] as ChatSession[];
  },

  // 获取用户资料
  getUserProfile: async (identifier: string): Promise<UserSearchResult | null> => {
    // 简单验证 identifier 格式
    if (!identifier) {
      return null;
    }

    let query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, created_at, bio');

    // 根据格式判断是 UUID 还是用户名
    if (identifier.length === 36 && identifier.includes('-')) {
      // 是 UUID 格式
      query = query.eq('id', identifier);
    } else {
      // 是用户名格式
      query = query.eq('username', identifier);
    }

    const { data, error } = await query.single();

    if (error) {
      // 如果是 Supabase 相关错误，返回 null
      if (error.code && error.code.startsWith('PGRST')) {
        return null;
      }
      throw error;
    }

    return data as UserSearchResult;
  },

  // 检查好友关系状态
  checkFriendshipStatus: async (otherUserId: string): Promise<'none' | 'pending' | 'accepted'> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      return 'none'; // 未登录用户，默认返回 none
    }

    // 简单验证 otherUserId 格式，避免无效请求
    if (!otherUserId || otherUserId.length !== 36) {
      return 'none';
    }

    try {
      // 检查是否已经是好友
      const { data: friendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', userId)
        .eq('friend_id', otherUserId)
        .single();

      if (!friendshipError && friendship) {
        return 'accepted';
      }

      // 检查是否有未处理的好友请求
      const { data: sentRequest, error: sentError } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', userId)
        .eq('receiver_id', otherUserId)
        .eq('status', 'pending')
        .single();

      if (!sentError && sentRequest) {
        return 'pending';
      }

      const { data: receivedRequest, error: receivedError } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', otherUserId)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .single();

      if (!receivedError && receivedRequest) {
        return 'pending';
      }
    } catch (error) {
      // 如果发生任何错误，返回默认状态
      console.error('Error checking friendship status:', error);
    }

    return 'none';
  },

  // 获取用户的通知列表
  getNotifications: async (): Promise<Notification[]> => {
    try {
      const user = await supabase.auth.getUser();
      
      // 检查是否有错误获取用户信息
      if (user.error) {
        console.error('Error getting user for notifications:', user.error.message || 'Unknown error');
        return [];
      }
      
      const userId = user.data?.user?.id;

      if (!userId) {
        console.error('No user ID found for notifications');
        return [];
      }

      console.log('Fetching notifications for user:', userId);
      
      // 尝试获取通知列表
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error.message || 'Unknown error');
        return [];
      }

      console.log('Found notifications:', data?.length || 0);
      return data as Notification[];
    } catch (error) {
      console.error('Unexpected error in getNotifications:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  },

  // 获取未读通知数量
  getUnreadNotificationsCount: async (): Promise<number> => {
    try {
      const user = await supabase.auth.getUser();
      
      // 检查是否有错误获取用户信息
      if (user.error) {
        console.error('Error getting user for unread notifications count:', user.error.message || 'Unknown error');
        return 0;
      }
      
      const userId = user.data?.user?.id;

      if (!userId) {
        return 0;
      }

      // 尝试获取未读通知数量
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read_status', false);

      if (error) {
        console.error('Error getting unread notifications count:', error.message || 'Unknown error');
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Unexpected error in getUnreadNotificationsCount:', error instanceof Error ? error.message : 'Unknown error');
      return 0;
    }
  },

  // 标记通知为已读
  markNotificationAsRead: async (notificationId: string): Promise<Notification> => {
    const user = await supabase.auth.getUser();
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      throw new Error('User not authenticated');
    }
    
    const userId = user.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_status: true })
      .eq('id', notificationId)
      .eq('recipient_id', userId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as Notification;
  },

  // 标记所有通知为已读
  markAllNotificationsAsRead: async (): Promise<void> => {
    const user = await supabase.auth.getUser();
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      throw new Error('User not authenticated');
    }
    
    const userId = user.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_status: true })
      .eq('recipient_id', userId)
      .eq('read_status', false);

    if (error) {
      throw error;
    }
  },

  // 删除通知
  deleteNotification: async (notificationId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      throw new Error('User not authenticated');
    }
    
    const userId = user.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', userId);

    if (error) {
      throw error;
    }
  },

  // 订阅通知实时更新
  subscribeToNotifications: (userId: string, callback: (notification: Notification) => void) => {
    if (!userId) {
      // 用户未登录，返回一个空的订阅对象，避免抛出错误
      return {
        unsubscribe: () => {}
      };
    }

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return subscription;
  }
};

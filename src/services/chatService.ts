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
  NotificationType,
  Profile
} from '@/types/chat';

// 创建通知的辅助函数
const createNotification = async (
  recipientId: string,
  content: string,
  type: NotificationType,
  friendRequestId?: string,
  groupId?: string
): Promise<Notification> => {
  // 获取当前认证用户
  let user = await supabase.auth.getUser();
  
  // 检查是否有错误获取用户信息，尝试刷新会话
  if (user.error || !user.data.user?.id) {
    // 尝试刷新会话
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('Failed to refresh session:', refreshError.message || JSON.stringify(refreshError));
      throw new Error('User not authenticated');
    }
    
    // 重新获取用户信息
    user = await supabase.auth.getUser();
    
    if (user.error || !user.data.user?.id) {
      console.error('Auth error in createNotification after refresh:', user.error?.message || JSON.stringify(user.error));
      throw new Error('User not authenticated');
    }
  }
  
  const senderId = user.data.user.id;

  // 尝试插入通知，移除.select('*').single()，因为发送者不是接收者，不能查询通知
  // 注意：notifications 表没有 group_id 列，所以不插入该字段
  const { error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: recipientId,
      sender_id: senderId, // 始终使用当前认证用户的ID作为发送者ID
      content,
      type,
      friend_request_id: friendRequestId
      // 移除 group_id 字段，因为表中没有这个列
    });

  if (error) {
    console.error('Error inserting notification:', error.message || JSON.stringify(error));
    // 检查是否是认证错误，如果是，尝试刷新会话并重试
    if (error.code === '42501' || error.code === '401' || error.code === '403') {
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
            // 移除 group_id 字段，因为表中没有这个列
          });
        
        if (!retryError) {
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
            friend_request_id: friendRequestId,
            group_id: groupId
          } as Notification;
        }
        console.error('Retry failed:', retryError.message || JSON.stringify(retryError));
      }
    }
    throw error;
  }

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
    friend_request_id: friendRequestId,
    group_id: groupId
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
    const user = await supabase.auth.getUser();
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      console.error('Auth error in sendFriendRequest:', user.error.message || JSON.stringify(user.error));
      throw new Error('User not authenticated');
    }
    
    const senderId = user.data?.user?.id;

    if (!senderId) {
      console.error('No sender ID in sendFriendRequest');
      throw new Error('User not authenticated');
    }
    
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
      console.error('Error inserting friend request:', error.message || JSON.stringify(error));
      throw error;
    }
    
    // 获取发送者的资料，用于通知内容
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', senderId)
      .single();
    
    // 获取接收者的资料，用于通知内容
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', receiverId)
      .single();
    
    try {
      // 创建通知给接收者
      await createNotification(
        receiverId,
        `${senderProfile?.display_name || '用户'} 发送了好友请求`,
        'friend_request',
        data.id
      );
      
      // 创建通知给发起者
      await createNotification(
        senderId,
        `你已向 ${receiverProfile?.display_name || '用户'} 发送了好友请求，等待对方同意`,
        'friend_request_sent',
        data.id
      );
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError instanceof Error ? notificationError.message : JSON.stringify(notificationError));
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
      
      try {
        await createNotification(
          updatedRequest.sender_id,
          notificationContent,
          status === 'accepted' ? 'friend_accepted' : 'friend_rejected',
          updatedRequest.id
        );
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError instanceof Error ? notificationError.message : JSON.stringify(notificationError));
        // 继续执行，不中断好友请求处理流程
      }

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
      // 获取当前认证用户
      const user = await supabase.auth.getUser();
      
      if (user.error || !user.data.user?.id) {
        throw new Error('User not authenticated');
      }
      
      const userId = user.data.user.id;


      // 查询好友关系
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (friendshipsError) {
        console.error('Supabase error in friendships query:', friendshipsError);
        throw new Error(`Failed to fetch friends: ${friendshipsError.message || 'Unknown error'}`);
      }



      // 如果没有好友关系，直接返回空数组
      if (!friendships || friendships.length === 0) {
        return [] as Friendship[];
      }

      // 获取所有好友的 ID，确保没有重复
      const friendIds = [...new Set(friendships.map(friendship => friendship.friend_id))];


      // 初始化好友资料对象
      const friendsProfiles: Record<string, Profile> = {};

      // 逐个查询好友资料，避免 in 查询可能出现的问题
      for (const friendId of friendIds) {
        try {

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, online_status, last_seen')
            .eq('id', friendId)
            .single();
          
          if (profileError) {
            console.error(`Error fetching profile for friend ${friendId}:`, profileError);
          } else if (profile) {
            friendsProfiles[friendId] = profile;
          }
        } catch (singleProfileError) {
          console.error(`Exception fetching profile for friend ${friendId}:`, singleProfileError);
        }
      }



      // 查询每个好友的未读消息数量
      const { data: chatMessages } = await supabase
        .from('chat_messages')
        .select('sender_id, receiver_id, is_read')
        .in('sender_id', friendIds)
        .eq('receiver_id', userId)
        .eq('is_read', false);



      // 计算每个好友的未读消息数量
      const unreadCounts: Record<string, number> = {};
      if (chatMessages) {
        chatMessages.forEach(message => {
          unreadCounts[message.sender_id] = (unreadCounts[message.sender_id] || 0) + 1;
        });
      }

      // 将好友资料和未读消息数量合并到好友关系中
      const friendsWithProfiles = friendships.map(friendship => ({
        ...friendship,
        friend_profile: friendsProfiles[friendship.friend_id],
        unread_count: unreadCounts[friendship.friend_id] || 0
      }));


      return friendsWithProfiles as Friendship[];
    } catch (error) {
      console.error('Error in getFriends:', error);
      // 发生错误时返回空数组，避免整个聊天页面崩溃
      return [] as Friendship[];
    }
  },

  // 发送一对一消息
  sendPrivateMessage: async (receiverId: string, content: string): Promise<ChatMessage> => {
    try {
      // 获取当前认证用户，检查是否有错误
      const user = await supabase.auth.getUser();
      
      // 检查认证错误
      if (user.error) {
        console.error('Auth error in sendPrivateMessage:', user.error);
        throw new Error('User not authenticated');
      }
      
      const senderId = user.data.user?.id;

      if (!senderId) {
        throw new Error('User not authenticated');
      }


      
      // 检查好友关系状态
      const friendshipStatus = await chatService.checkFriendshipStatus(receiverId);
      if (friendshipStatus !== 'accepted') {
        throw new Error('You are not friends with this user, cannot send message');
      }
      
      // 先获取发送者的资料
      const { data: senderProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', senderId)
        .single();

      if (profileError) {
        console.error('Error fetching sender profile:', profileError);
      }

      // 发送消息
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
        console.error('Error inserting message:', error);
        throw error;
      }


      
      // 返回包含发送者资料的消息
      return {
        ...data,
        sender_profile: senderProfile
      } as ChatMessage;
    } catch (error) {
      console.error('Unexpected error in sendPrivateMessage:', error);
      throw error;
    }
  },

  // 获取聊天消息
  getChatMessages: async (otherUserId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> => {
    try {

      
      // 获取当前认证用户
      const user = await supabase.auth.getUser();
      
      // 检查认证错误
      if (user.error || !user.data.user?.id) {
        console.error('Auth error in getChatMessages:', user.error);
        return [];
      }
      
      const userId = user.data.user.id;


      // 在数据库查询时就过滤出当前对话的消息，使用and和or组合条件
      // 确保只返回当前用户和指定用户之间的消息
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        console.error('Error details:', JSON.stringify(messagesError, null, 2));
        // 尝试直接返回空数组，不中断聊天功能
        return [];
      }



      // 确保 messages 是数组
      const chatMessages = messages || [];

      // 客户端再次过滤，确保只返回当前用户和对方之间的消息
      // 这是一个额外的安全检查，确保不会返回其他对话的消息
      const filteredMessages = chatMessages.filter(message => 
        (message.sender_id === userId && message.receiver_id === otherUserId) ||
        (message.sender_id === otherUserId && message.receiver_id === userId)
      );



      // 如果没有消息，直接返回空数组
      if (filteredMessages.length === 0) {
        return [] as ChatMessage[];
      }

      // 获取所有发送者的 ID
      const senderIds = [...new Set(filteredMessages.map(message => message.sender_id))];


      // 查询所有发送者的资料，包含在线状态
      const { data: sendersProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, online_status, last_seen')
        .in('id', senderIds);

      if (profilesError) {
        console.error('Error fetching senders profiles:', profilesError);
        console.error('Profiles error details:', JSON.stringify(profilesError, null, 2));
        // 即使获取资料失败，也返回消息数据
        return filteredMessages as ChatMessage[];
      }



      // 将发送者资料合并到消息中
      const messagesWithProfiles = filteredMessages.map(message => {
        const senderProfile = sendersProfiles?.find(profile => profile.id === message.sender_id);
        return {
          ...message,
          sender_profile: senderProfile
        };
      });


      return messagesWithProfiles as ChatMessage[];
    } catch (error) {
      console.error('Unexpected error in getChatMessages:', error);
      // 返回空数组而不是抛出错误，避免影响用户体验
      return [] as ChatMessage[];
    }
  },

  // 创建交流群
  createGroup: async (name: string, description?: string, avatarUrl?: string): Promise<Group> => {
    const user = await supabase.auth.getUser();
    const creatorId = user.data.user?.id;

    if (!creatorId) {
      throw new Error('User not authenticated');
    }

    // 验证群聊名称长度
    if (!name || name.trim().length < 2 || name.trim().length > 20) {
      throw new Error('群聊名称必须为2-20个字符');
    }

    // 验证群聊名称是否已存在
    const trimmedName = name.trim();
    const { data: existingGroups, error: existingGroupsError } = await supabase
      .from('groups')
      .select('id')
      .eq('name', trimmedName)
      .limit(1);

    if (!existingGroupsError && existingGroups && existingGroups.length > 0) {
      throw new Error('群聊名称已存在，请使用其他名称');
      }

    // 创建群，不使用 .select()，因为由于 RLS 策略，SELECT 可能会失败
    // 我们将使用生成的群 ID 来构建返回的群对象
    const now = new Date().toISOString();
    
    // 使用 UUID 生成群 ID
    const groupId = crypto.randomUUID();
    
    // 创建群对象
    const newGroup: Group = {
      id: groupId,
      name: name.trim(),
      description,
      avatar_url: avatarUrl,
      creator_id: creatorId,
      member_count: 1,
      created_at: now,
      updated_at: now
    };

    try {
      // 尝试创建群，不使用 .select()，因为由于 RLS 策略，SELECT 可能会失败
      const { error: groupError } = await supabase
        .from('groups')
        .insert({
          id: groupId,
          name: name.trim(),
          description,
          avatar_url: avatarUrl,
          creator_id: creatorId,
          member_count: 1
        });

      if (groupError) {
        console.error('Error creating group:', groupError);
        // 检查是否是唯一性约束违反错误
        if (groupError.code === '23505' || groupError.message?.includes('unique constraint')) {
          throw new Error('群聊名称已存在，请使用其他名称');
        }
        throw groupError;
      }

      // 添加创建者为群成员
      // 由于我们已经修复了 RLS 策略，现在可以添加群成员了
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: creatorId,
          role: 'owner'
        });

      if (memberError) {
        console.error('Error adding creator as group member:', memberError);
        // 即使添加群成员失败，我们也返回群对象，因为群已经创建成功
      }

      // 返回生成的群对象，而不是从数据库中查询的对象
      return newGroup;
    } catch (error) {
      console.error('Error in createGroup:', error);
      throw error;
    }
  },

  // 邀请好友加入群
  inviteToGroup: async (groupId: string, friendIds: string[]): Promise<void> => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

    // 检查当前用户是否是群管理员、群主或创建者
    let hasPermission = false;

    // 先检查是否是群成员
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!memberError && member && (member.role === 'owner' || member.role === 'admin')) {
      // 是群管理员或群主，有邀请权限
      hasPermission = true;
    } else {
      // 不是群管理员或群主，检查是否是群创建者
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('creator_id')
        .eq('id', groupId)
        .single();

      if (!groupError && group && group.creator_id === userId) {
        // 是群创建者，有邀请权限
        hasPermission = true;
        
        // 将创建者添加到群成员表中
        try {
          await supabase
            .from('group_members')
            .insert({
              group_id: groupId,
              user_id: userId,
              role: 'owner'
            });
        } catch (err) {
          console.error('Error adding creator to group_members:', err);
        }
      }
    }

    if (!hasPermission) {
      throw new Error('You do not have permission to invite members to this group');
    }

    // 获取当前用户的资料
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    // 获取群聊信息
    const { data: groupInfo } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    // 批量添加群成员
    const memberInserts = friendIds.map(friendId => ({
      group_id: groupId,
      user_id: friendId,
      role: 'member'
    }));

    // 尝试添加群成员，忽略可能的错误（如重复添加）
    try {
      await supabase
        .from('group_members')
        .insert(memberInserts);
    } catch (insertError) {
      console.error('Insert error:', insertError);
    }

    // 更新群成员数量
    try {
      const { data: countData } = await supabase
        .from('group_members')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId);

      const memberCount = countData?.length || 0;

      await supabase
        .from('groups')
        .update({ member_count: memberCount })
        .eq('id', groupId);
    } catch (countError) {
      console.error('Count error:', countError);
    }

    // 为每个被邀请的用户创建通知
    const inviterName = inviterProfile?.display_name || '用户';
    const groupName = groupInfo?.name || '群聊';

    for (const friendId of friendIds) {
      try {
        await createNotification(
          friendId,
          `${inviterName} 邀请你加入群聊 "${groupName}"`,
          'group_invite',
          undefined,
          groupId
        );
      } catch (notificationError) {
        console.error(`Failed to create notification for user ${friendId}:`, notificationError);
        // 继续执行，不中断整个邀请流程
      }
    }
  } catch (error) {
    console.error('Error in inviteToGroup:', error);
    // 重新抛出错误，让调用者知道发生了错误
    throw error;
  }
},

  // 获取群列表
  getGroups: async (): Promise<Group[]> => {
    try {

      
      // 获取当前认证用户
      const user = await supabase.auth.getUser();
      
      if (user.error || !user.data.user?.id) {
        throw new Error('User not authenticated');
      }
      
      const userId = user.data.user.id;
      
      // 查询用户所在的群聊成员关系
      const { data: groupMemberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      
      if (membershipError) {
        console.error('Error getting group memberships:', membershipError);
        return [];
      }
      
      if (!groupMemberships || groupMemberships.length === 0) {
        return [];
      }
      
      // 获取用户所属的所有群ID
      const groupIds = groupMemberships.map(membership => membership.group_id);
      
      // 查询这些群的详细信息
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });
      
      if (groupsError) {
        console.error('Error getting groups:', groupsError);
        return [];
      }
      
      // 查询所有群聊的未读消息数量
      // 使用计数查询获取每个群聊的未读消息数量
      const unreadCountsMap: Record<string, number> = {};
      
      // 为每个群聊获取未读消息数量
      for (const groupId of groupIds) {
        try {
          const { count } = await supabase
            .from('group_message_read_status')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .eq('is_read', false);
          
          unreadCountsMap[groupId] = count || 0;
        } catch (error) {
          console.error(`Error getting unread count for group ${groupId}:`, error);
          unreadCountsMap[groupId] = 0;
        }
      }
      
      // 将未读消息数量映射到群聊对象中
      const groupsWithUnreadCounts = groups?.map(group => ({
        ...group,
        unread_count: unreadCountsMap[group.id] || 0
      })) || [];
      


      
      return groupsWithUnreadCounts as Group[];
    } catch (error) {
      console.error('Error in getGroups:', error);
      return [];
    }
  },

  // 获取单个群信息
  getGroup: async (groupId: string): Promise<Group | null> => {
    try {
      // 从数据库中获取实际的群聊信息
      const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Error getting group:', error);
        // 如果获取失败，返回一个包含 groupId 的默认群对象
        return {
          id: groupId,
          name: `群聊 ${groupId.substring(0, 8)}`, // 使用 groupId 的前 8 个字符作为默认名称
          description: '',
          avatar_url: undefined,
          creator_id: 'unknown',
          member_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Group;
      }

      return group as Group;
    } catch (error) {
      console.error('Error in getGroup:', error);
      // 返回一个包含 groupId 的默认群对象，避免页面崩溃
      return {
        id: groupId,
        name: `群聊 ${groupId.substring(0, 8)}`, // 使用 groupId 的前 8 个字符作为默认名称
        description: '',
        avatar_url: undefined,
        creator_id: 'unknown',
        member_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Group;
    }
  },

  // 获取群成员列表
  getGroupMembers: async (groupId: string): Promise<GroupMember[]> => {
    try {
      // 先获取群成员基本信息
      const { data: members, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error getting group members:', error);
        return [];
      }

      if (!members || members.length === 0) {
        return members as GroupMember[];
      }

      // 获取所有成员的用户ID
      const userIds = members.map(member => member.user_id);
      
      // 单独获取所有用户的资料，包含在线状态
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, online_status, last_seen')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error getting profiles for group members:', profilesError);
        // 即使获取用户资料失败，也返回群成员基本信息
        return members as GroupMember[];
      }

      // 将用户资料映射到群成员信息中
      const membersWithProfiles = members.map(member => {
        // 查找对应的用户资料
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          ...member,
          user_profile: profile // 将用户资料添加到群成员对象中
        };
      });

      return membersWithProfiles as GroupMember[];
    } catch (error) {
      console.error('Error in getGroupMembers:', error);
      return [];
    }
  },

  // 更新群成员信息（群内昵称和头像）
  updateGroupMemberInfo: async (groupId: string, groupNickname?: string, groupAvatarUrl?: string): Promise<void> => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // 更新群成员信息
      const { error } = await supabase
        .from('group_members')
        .update({
          group_nickname: groupNickname,
          group_avatar_url: groupAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating group member info:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateGroupMemberInfo:', error);
      throw error;
    }
  },

  // 发送群消息
  sendGroupMessage: async (groupId: string, content: string): Promise<ChatMessage> => {
    const user = await supabase.auth.getUser();
    const senderId = user.data.user?.id;

    if (!senderId) {
      throw new Error('User not authenticated');
    }

    // 开始事务
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

    // 获取所有群成员（除了发送者自己）
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .neq('user_id', senderId);

    // 为每个群成员创建一条未读消息记录
      if (groupMembers && groupMembers.length > 0) {
        const unreadStatusInserts = groupMembers.map(member => ({
          group_id: groupId,
          user_id: member.user_id,
          message_id: data.id,
          is_read: false
          // 不设置 read_at 字段，让它使用默认值
        }));

        // 批量插入未读状态记录
        try {
          await supabase
            .from('group_message_read_status')
            .insert(unreadStatusInserts);
        } catch (insertError) {
          console.error('Error inserting group message read status:', insertError);
          // 继续执行，不中断发送消息流程
        }
      }

    // 获取发送者资料
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', senderId)
      .single();

    // 返回包含发送者资料的消息
    return {
      ...data,
      sender_profile: senderProfile || null
    } as ChatMessage;
  },

  // 获取群消息
  getGroupMessages: async (groupId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> => {
    try {
      // 简化查询，先获取消息基本信息
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, sender_id, group_id, content, created_at, updated_at, is_read, type')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting group messages:', error.message || JSON.stringify(error));
        return [];
      }

      // 如果没有消息，直接返回空数组
      if (!messages || messages.length === 0) {
        return [];
      }

      // 获取所有发送者的ID
      const senderIds = [...new Set(messages.map(msg => msg.sender_id))];

      // 单独获取发送者的资料，包含在线状态
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, online_status, last_seen')
        .in('id', senderIds);

      if (profilesError) {
        console.error('Error getting sender profiles:', profilesError.message || JSON.stringify(profilesError));
        // 即使获取不到资料，也返回消息
        return messages as ChatMessage[];
      }

      // 将发送者资料合并到消息中
      const messagesWithProfiles = messages.map(msg => {
        const senderProfile = profiles?.find(profile => profile.id === msg.sender_id);
        return {
          ...msg,
          sender_profile: senderProfile || null
        };
      });

      return messagesWithProfiles as ChatMessage[];
    } catch (error) {
      console.error('Error in getGroupMessages:', error instanceof Error ? error.message : JSON.stringify(error));
      return [];
    }
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
      .select('id, username, display_name, avatar_url, created_at, bio, online_status, last_seen');

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
      // 检查是否已经是好友（只需要检查当前用户的好友关系记录）
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

  // 删除好友
  removeFriend: async (friendId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // 简单验证 friendId 格式，避免无效请求
    if (!friendId || friendId.length !== 36) {
      throw new Error('Invalid friend ID format');
    }

    const errors: string[] = [];

    try {
      // 1. 删除当前用户的好友关系
      const { error: friendshipError1 } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', friendId);

      if (friendshipError1) {
        console.error('Error deleting current user\'s friendship:', friendshipError1);
        errors.push(`Failed to delete your friendship: ${friendshipError1.message}`);
      }

      // 2. 删除对方的好友关系
      const { error: friendshipError2 } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', userId);

      if (friendshipError2) {
        console.error('Error deleting friend\'s friendship:', friendshipError2);
        errors.push(`Failed to delete friend\'s friendship: ${friendshipError2.message}`);
      }

      // 3. 删除双方之间的所有聊天记录
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`);

      if (messagesError) {
        console.error('Error deleting chat messages:', messagesError);
        errors.push(`Failed to delete chat messages: ${messagesError.message}`);
      }

      // 如果所有操作都失败，抛出错误
      if (errors.length === 3) {
        throw new Error('Failed to remove friend: All operations failed');
      }


    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
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

  // 用户退出群聊
  leaveGroup: async (groupId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // 开始事务
    try {
      // 1. 删除用户的群成员记录
      const { error: removeMemberError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (removeMemberError) {
        throw removeMemberError;
      }

      // 2. 更新群成员数量
      const { data: memberCountData } = await supabase
        .from('group_members')
        .select('id', { count: 'exact' })
        .eq('group_id', groupId);

      const newMemberCount = memberCountData?.length || 0;

      await supabase
        .from('groups')
        .update({ member_count: newMemberCount })
        .eq('id', groupId);

    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  },

  // 管理员删除群成员
  removeGroupMember: async (groupId: string, memberId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 1. 检查当前用户是否是群管理员或群主
      const { data: currentMember, error: currentMemberError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (currentMemberError) {
        throw new Error('You are not a member of this group');
      }

      if (currentMember.role !== 'owner' && currentMember.role !== 'admin') {
        throw new Error('Only group owners and admins can remove members');
      }

      // 2. 检查被删除的成员是否是群主
      const { data: targetMember, error: targetMemberError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', memberId)
        .single();

      if (targetMemberError) {
        throw new Error('Member not found in group');
      }

      if (targetMember.role === 'owner') {
        throw new Error('Cannot remove group owner');
      }

      // 3. 删除群成员记录
      const { error: removeMemberError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberId);

      if (removeMemberError) {
        throw removeMemberError;
      }

      // 4. 更新群成员数量
      const { data: memberCountData } = await supabase
        .from('group_members')
        .select('id', { count: 'exact' })
        .eq('group_id', groupId);

      const newMemberCount = memberCountData?.length || 0;

      await supabase
        .from('groups')
        .update({ member_count: newMemberCount })
        .eq('id', groupId);

    } catch (error) {
      console.error('Error removing group member:', error);
      throw error;
    }
  },

  // 获取群聊未读消息数量
  getGroupUnreadMessageCount: async (groupId: string): Promise<number> => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        console.error('User not authenticated in getGroupUnreadMessageCount');
        return 0;
      }

      // 查询用户在指定群聊中的未读消息数量
      console.log('Attempting to get group unread message count:', { groupId, userId });
      const { count, error } = await supabase
        .from('group_message_read_status')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting group unread message count:', { 
          error, 
          message: error.message, 
          code: error.code, 
          details: error.details, 
          hint: error.hint, 
          groupId, 
          userId 
        });
        return 0;
      }

      console.log('Got group unread message count:', { count, groupId, userId });
      return count || 0;
    } catch (error) {
      console.error('Unexpected error in getGroupUnreadMessageCount:', { 
        error, 
        message: (error as Error).message, 
        stack: (error as Error).stack 
      });
      return 0;
    }
  },

  // 标记群聊消息为已读
  markGroupMessagesAsRead: async (groupId: string, messageIds?: string[]): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      let query = supabase
        .from('group_message_read_status')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('is_read', false);

      // 如果提供了消息ID列表，只标记这些消息为已读
      if (messageIds && messageIds.length > 0) {
        query = query.in('message_id', messageIds);
      }

      const { error } = await query;

      if (error) {
        console.error('Error marking group messages as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markGroupMessagesAsRead:', error);
      throw error;
    }
  },

  // 更新群信息
  updateGroup: async (groupId: string, name?: string, avatarUrl?: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 检查用户是否是群管理员或群主
      const { data: groupMember, error: memberError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (memberError) {
        throw new Error('You are not a member of this group');
      }

      if (groupMember.role !== 'owner' && groupMember.role !== 'admin') {
        throw new Error('Only group owners and admins can update group settings');
      }

      // 更新群信息
    const updateData: { updated_at: string; name?: string; avatar_url?: string } = {
      updated_at: new Date().toISOString()
    };

      if (name !== undefined) {
        updateData.name = name;
      }

      if (avatarUrl !== undefined) {
        updateData.avatar_url = avatarUrl;
      }

      const { error: updateError } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', groupId);

      if (updateError) {
        console.error('Error updating group:', updateError);
        throw updateError;
      }

    } catch (error) {
      console.error('Error in updateGroup:', error);
      throw error;
    }
  },

  // 删除群聊
  deleteGroup: async (groupId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 检查用户是否是群聊的创建者
      const { data: groupMember, error: memberError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (memberError) {
        throw new Error('You are not a member of this group');
      }

      if (groupMember.role !== 'owner') {
        throw new Error('Only group owners can delete groups');
      }

      // 开始事务
      // 1. 删除群聊的所有消息
      await supabase
        .from('chat_messages')
        .delete()
        .eq('group_id', groupId);

      // 2. 删除群聊的所有成员
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      // 3. 删除群聊本身
      await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

    } catch (error) {
      console.error('Error deleting group:', error);
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

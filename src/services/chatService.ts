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
import { getCache, setCache, removeCache } from '@/utils/cache';
import { getUserProfileCacheKey, EXPIRY } from '@/lib/redis/cache';
import { queueService, MessagePriority } from '@/lib/redis/queue-service';
import { 
  getCachedUnreadNotificationsCount, 
  setCachedUnreadNotificationsCount, 
  clearUnreadNotificationsCountCache,
  getCachedNotificationsList,
  setCachedNotificationsList,
  clearNotificationsListCache
} from '@/services/notificationCacheService';

// 创建通知的辅助函数
const createNotification = async (
  recipientId: string,
  content: string,
  type: NotificationType,
  friendRequestId?: string,
  groupId?: string
): Promise<Notification> => {
  // 获取当前认证用户和会话
  const user = await supabase.auth.getUser();
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token || '';
  
  if (user.error || !user.data.user?.id) {
    throw new Error('User not authenticated');
  }
  
  const senderId = user.data.user.id;

  try {
    // 使用直接的 fetch 调用来插入通知，添加.select()以获取返回的通知数据
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/notifications?select=*`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          sender_id: senderId,
          content,
          type,
          friend_request_id: friendRequestId,
          group_id: groupId
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error inserting notification:', errorText);
      throw new Error(`Failed to create notification: ${errorText}`);
    }

    // 获取实际的通知对象，添加健壮的JSON解析处理
    let notification: Notification;
    try {
      // 先检查响应体是否为空
      const responseText = await response.text();
      if (!responseText.trim()) {
        // 如果响应体为空，构造一个基本的通知对象
        notification = {
          id: crypto.randomUUID(), // 生成临时ID
          recipient_id: recipientId,
          sender_id: senderId,
          content,
          type,
          friend_request_id: friendRequestId,
          group_id: groupId,
          read_status: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Notification;
        console.warn('Notification created but API returned empty response, using constructed notification object');
      } else {
        // 正常解析JSON
        const responseData = JSON.parse(responseText);
        // 处理可能的数组响应（Supabase API可能返回数组）
        notification = Array.isArray(responseData) ? responseData[0] : responseData;
      }
    } catch (jsonError) {
      console.error('Error parsing notification JSON:', jsonError);
      console.error('Response text:', await response.clone().text());
      // 解析失败时构造一个基本的通知对象
      notification = {
        id: crypto.randomUUID(),
        recipient_id: recipientId,
        sender_id: senderId,
        content,
        type,
        friend_request_id: friendRequestId,
        group_id: groupId,
        read_status: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Notification;
    }
    
    // 使用Redis消息队列发布通知
    try {
      await queueService.publishNotification(
        recipientId,
        {
          notification,
          type: 'new_notification'
        },
        MessagePriority.MEDIUM
      );
    } catch (redisError) {
      // 只记录错误，不影响主要流程
      console.error('Failed to publish notification to Redis:', redisError);
    }
    
    return notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    throw error;
  }
};

export const chatService = {
  // 上传文件到Supabase Storage
  uploadFile: async (file: File, folder: string = 'chat_files'): Promise<string> => {
    try {
      const user = await supabase.auth.getUser();
      if (user.error || !user.data.user?.id) {
        throw new Error('User not authenticated');
      }

      const userId = user.data.user.id;
      const timestamp = Date.now();
      
      // 更可靠的文件扩展名获取方式
      let fileExtension = file.name.split('.').pop();
      // 如果没有扩展名，从MIME类型获取
      if (!fileExtension) {
        fileExtension = file.type.split('/')[1] || 'bin';
      }
      const fileName = `${userId}_${timestamp}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      // 根据文件夹类型选择不同的存储桶
      const bucketName = folder === 'chat_voices' ? 'chat_voices' : 'confession_images';

      // 上传文件
      const { error: uploadError } = await supabase
        .storage
        .from(bucketName)
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // 获取公共URL
      const { data: urlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // 压缩图片
  compressImage: async (file: File, maxSizeMB: number = 5): Promise<File> => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // 如果文件已经小于最大尺寸，直接返回
    if (file.size <= maxSizeBytes) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // 创建Canvas并设置压缩参数
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 计算缩放比例以保持宽高比
          const aspectRatio = width / height;
          if (width > height && width > 1920) {
            width = 1920;
            height = width / aspectRatio;
          } else if (height > 1920) {
            height = 1920;
            width = height * aspectRatio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 绘制图像到Canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          // 压缩图像
          let quality = 0.9;
          let compressedDataUrl = canvas.toDataURL(file.type, quality);
          
          // 调整质量直到文件大小符合要求
          while (compressedDataUrl.length > maxSizeBytes && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL(file.type, quality);
          }
          
          // 将DataURL转换为File对象
          const byteString = atob(compressedDataUrl.split(',')[1]);
          const mimeString = compressedDataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          const compressedFile = new File([blob], file.name, { type: mimeString });
          
          resolve(compressedFile);
        };
        img.onerror = () => {
          reject(new Error('Could not load image'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Could not read file'));
      };
    });
  },
  // 用户搜索功能
  searchUsers: async (keyword: string): Promise<UserSearchResult[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, email, avatar_url, created_at')
      .or(`ilike(username, '%${keyword}%'),ilike(display_name, '%${keyword}%')`)
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
      throw new Error('User not authenticated');
    }
    
    const senderId = user.data?.user?.id;
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token || '';

    if (!senderId) {
      throw new Error('User not authenticated');
    }
    
    try {
      // 先根据 receiverId 获取用户的实际 UUID
      let targetReceiverId = receiverId;
      
      // 如果 receiverId 不是 UUID 格式，尝试根据用户名获取用户信息
      if (receiverId.length !== 36 || !receiverId.includes('-')) {
        const profileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id&username=eq.${receiverId}&limit=1`,
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        const profileData = await profileResponse.json();
        
        if (Array.isArray(profileData) && profileData.length > 0) {
          targetReceiverId = profileData[0].id;
        } else {
          // 如果不是 UUID 且不是有效的用户名，返回错误
          throw new Error('Invalid receiver ID format');
        }
      }
      
      // 获取发送者和接收者的资料，用于通知内容
      const senderProfileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=display_name&id=eq.${senderId}&limit=1`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const senderProfileData = await senderProfileResponse.json();
      const senderProfile = Array.isArray(senderProfileData) && senderProfileData.length > 0 ? senderProfileData[0] : null;
      
      const receiverProfileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=display_name&id=eq.${targetReceiverId}&limit=1`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const receiverProfileData = await receiverProfileResponse.json();
      const receiverProfile = Array.isArray(receiverProfileData) && receiverProfileData.length > 0 ? receiverProfileData[0] : null;
      
      // 先检查是否已经存在相同的好友请求（检查所有状态，不仅仅是pending）
      const existingRequestResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?select=*&sender_id=eq.${senderId}&receiver_id=eq.${targetReceiverId}&limit=1`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const existingRequestData = await existingRequestResponse.json();
      
      if (Array.isArray(existingRequestData) && existingRequestData.length > 0) {
        // 如果已经存在相同的请求，直接返回该请求，不抛出错误
        const existingRequest = existingRequestData[0];
        
        // 为接收者创建通知，即使是重复请求
        try {
          await createNotification(
            targetReceiverId,
            `${senderProfile?.display_name || '用户'} 发送了好友请求`,
            'friend_request',
            existingRequest.id
          );
        } catch (notificationError) {
          console.error('Error creating notification for existing request:', notificationError);
        }
        
        return existingRequest as FriendRequest;
      }
      
      // 构建请求体
      const requestBody = {
        sender_id: senderId,
        receiver_id: targetReceiverId,
        message
      };

      // 开始事务
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?select=*`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!response.ok) {
        // 如果是重复请求错误（409 Conflict），尝试获取已存在的请求并返回
        if (response.status === 409) {
          const conflictRequestResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?select=*&sender_id=eq.${senderId}&receiver_id=eq.${targetReceiverId}&limit=1`,
            {
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );
          
          const conflictRequestData = await conflictRequestResponse.json();
          
          if (Array.isArray(conflictRequestData) && conflictRequestData.length > 0) {
            const conflictRequest = conflictRequestData[0];
            
            // 为接收者创建通知，即使是重复请求
            try {
              await createNotification(
                targetReceiverId,
                `${senderProfile?.display_name || '用户'} 发送了好友请求`,
                'friend_request',
                conflictRequest.id
              );
            } catch (notificationError) {
              console.error('Error creating notification for conflict request:', notificationError);
            }
            
            return conflictRequest as FriendRequest;
          }
        }
        // 其他错误，抛出异常
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send friend request');
      }
      
      const data = await response.json();
      
      try {
        // 创建通知给接收者
        await createNotification(
          targetReceiverId,
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
        console.error('Error creating notification:', notificationError);
        // 继续执行，不中断好友请求流程
      }

      return data as FriendRequest;
    } catch (error) {
      // 更详细的错误处理
      console.error('Error in sendFriendRequest:', error);
      throw error;
    }
  },

  // 获取好友申请列表
  getFriendRequests: async (): Promise<FriendRequest[]> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token || '';

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 使用直接的 fetch 调用来获取好友申请列表
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?select=*, sender_profile:profiles!sender_id(*), receiver_profile:profiles!receiver_id(*)&receiver_id=eq.${userId}&status=eq.pending&order=created_at.desc`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get friend requests: ${await response.text()}`);
      }

      const data = await response.json();
      return data as FriendRequest[];
    } catch (error) {
      console.error('Error in getFriendRequests:', error);
      throw error;
    }
  },

  // 处理好友申请
  handleFriendRequest: async (requestId: string, status: 'accepted' | 'rejected'): Promise<FriendRequest> => {
    const user = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token || '';
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      throw new Error('User not authenticated');
    }
    
    const userId = user.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 使用直接的 fetch 调用来更新好友申请状态
      const updateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?id=eq.${requestId}&receiver_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ status })
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update friend request: ${await updateResponse.text()}`);
      }

      // 获取更新后的好友申请
      const updatedRequestResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?id=eq.${requestId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!updatedRequestResponse.ok) {
        throw new Error(`Failed to get updated friend request: ${await updatedRequestResponse.text()}`);
      }

      const updatedRequestData = await updatedRequestResponse.json();
      const updatedRequest = updatedRequestData[0];

      // 获取接收者的资料，用于通知内容
      const receiverProfileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=display_name&id=eq.${userId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!receiverProfileResponse.ok) {
        throw new Error(`Failed to get receiver profile: ${await receiverProfileResponse.text()}`);
      }

      const receiverProfileData = await receiverProfileResponse.json();
      const receiverProfile = receiverProfileData[0];

      // 创建通知给发送者
      if (updatedRequest) {
        // 获取发送者的资料，用于通知内容
        const senderProfileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=display_name&id=eq.${updatedRequest.sender_id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        const senderProfileData = await senderProfileResponse.json();
        const senderProfile = senderProfileData[0];
        
        // 给发送者的通知
        const senderNotificationContent = status === 'accepted' 
          ? `${receiverProfile?.display_name || '用户'} 接受了你的好友请求`
          : `${receiverProfile?.display_name || '用户'} 拒绝了你的好友请求`;
        
        try {
          await createNotification(
            updatedRequest.sender_id,
            senderNotificationContent,
            status === 'accepted' ? 'friend_accepted' : 'friend_rejected',
            updatedRequest.id
          );
        } catch {
          // 继续执行，不中断好友请求处理流程
        }
        
        // 给接收者（当前用户）的通知
        const receiverNotificationContent = status === 'accepted' 
          ? `你已接受了 ${senderProfile?.display_name || '用户'} 的好友请求`
          : `你已拒绝了 ${senderProfile?.display_name || '用户'} 的好友请求`;
        
        try {
          await createNotification(
            updatedRequest.receiver_id,
            receiverNotificationContent,
            status === 'accepted' ? 'friend_accepted' : 'friend_rejected',
            updatedRequest.id
          );
        } catch {
          // 继续执行，不中断好友请求处理流程
        }

        // 如果是接受请求，创建好友关系
        if (status === 'accepted') {
          // 创建双向好友关系
          const friendshipResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friendships`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify([
                {
                  user_id: updatedRequest.sender_id,
                  friend_id: updatedRequest.receiver_id
                },
                {
                  user_id: updatedRequest.receiver_id,
                  friend_id: updatedRequest.sender_id
                }
              ])
            }
          );

          if (!friendshipResponse.ok) {
            throw new Error(`Failed to create friendship: ${await friendshipResponse.text()}`);
          }
        }
      }

      return updatedRequest as FriendRequest;
    } catch (error) {
      console.error('Error in handleFriendRequest:', error);
      throw error;
    }
  },

  // 获取好友列表
  getFriends: async (ignoreCache: boolean = false): Promise<Friendship[]> => {
    try {
      // 获取当前认证用户
      const user = await supabase.auth.getUser();
      
      if (user.error || !user.data.user?.id) {
        throw new Error('User not authenticated');
      }
      
      const userId = user.data.user.id;
      
      // 生成缓存键
      const cacheKey = `chat:friends:${userId}`;
      
      // 尝试从缓存获取，但如果ignoreCache为true则跳过
      if (!ignoreCache) {
        const cachedFriends = await getCache<Friendship[]>(cacheKey);
        if (cachedFriends) {
          return cachedFriends;
        }
      }

      // 查询好友关系
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (friendshipsError) {
        throw new Error(`Failed to fetch friends: ${friendshipsError.message || 'Unknown error'}`);
      }

      // 如果没有好友关系，缓存空数组并返回
      if (!friendships || friendships.length === 0) {
        await setCache(cacheKey, [], EXPIRY.SHORT);
        return [] as Friendship[];
      }

      // 获取所有好友的 ID，确保没有重复
      const friendIds = [...new Set(friendships.map(friendship => friendship.friend_id))];

      // 初始化好友资料对象
      const friendsProfiles: Record<string, Profile> = {};

      // 逐个查询好友资料，避免 in 查询可能出现的问题
      for (const friendId of friendIds) {
        try {
          // 在线状态需要实时更新，所以不使用缓存，直接从数据库获取
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, display_name, email, avatar_url, online_status, last_seen')
            .eq('id', friendId)
            .single();
          
          if (!profileError && profile) {
            friendsProfiles[friendId] = profile;
            // 仍然缓存好友资料，但在线状态会在下一次调用时重新获取
            const profileCacheKey = getUserProfileCacheKey(friendId);
            await setCache(profileCacheKey, profile, EXPIRY.MEDIUM);
          }
        } catch {
          // ignore error
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

      // 缓存好友列表，设置较短的过期时间（5分钟）
      await setCache(cacheKey, friendsWithProfiles, EXPIRY.SHORT);

      return friendsWithProfiles as Friendship[];
    } catch {
      // 发生错误时返回空数组，避免整个聊天页面崩溃
      return [] as Friendship[];
    }
  },

  // 发送一对一消息
  sendPrivateMessage: async (receiverId: string, content: string, type: 'text' | 'image' | 'video' | 'file' | 'voice' = 'text'): Promise<ChatMessage> => {
    try {
      // 获取当前认证用户，检查是否有错误
      const user = await supabase.auth.getUser();
      
      // 检查认证错误
      if (user.error) {
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
        // ignore error
      }

      // 发送消息
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          type,
          is_read: false
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // 构造完整的消息对象
      const completeMessage = {
        ...data,
        sender_profile: senderProfile
      } as ChatMessage;

      // 导入缓存工具函数（动态导入避免循环依赖）
      const { updateCache, getChatCacheKey } = await import('../utils/cache');
      
      // 更新缓存，将新消息添加到缓存中
      const cacheKey = getChatCacheKey(senderId, receiverId, false);
      updateCache<ChatMessage[]>(cacheKey, (cachedMessages) => {
        // 确保缓存中没有重复消息
        if (!cachedMessages.some(msg => msg.id === completeMessage.id)) {
          return [...cachedMessages, completeMessage];
        }
        return cachedMessages;
      });

      // 清除好友列表缓存，确保未读消息数量更新
      const friendListCacheKey = `chat:friends:${senderId}`;
      const receiverFriendListCacheKey = `chat:friends:${receiverId}`;
      await removeCache(friendListCacheKey);
      await removeCache(receiverFriendListCacheKey);

      // 返回包含发送者资料的消息
      return completeMessage;
    } catch (error) {
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
        return [];
      }
      
      const userId = user.data.user.id;
      
      // 导入缓存工具函数（动态导入避免循环依赖）
      const { getCache, setCache, getChatCacheKey } = await import('../utils/cache');
      
      // 如果是初始加载（offset为0），尝试从缓存获取消息
      let cachedMessages: ChatMessage[] = [];
      if (offset === 0) {
        const cacheKey = getChatCacheKey(userId, otherUserId, false);
        const cachedData = await getCache<ChatMessage[]>(cacheKey);
        if (cachedData) {
          cachedMessages = cachedData;
        }
      }

      // 在数据库查询时就过滤出当前对话的消息，使用and和or组合条件
      // 确保只返回当前用户和指定用户之间的消息
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        // 如果从服务器获取失败，返回缓存消息（如果有）
        return cachedMessages;
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
        return cachedMessages;
      }

      // 获取所有发送者的 ID
      const senderIds = [...new Set(filteredMessages.map(message => message.sender_id))];

      // 查询所有发送者的资料，包含在线状态
      const { data: sendersProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, email, avatar_url, online_status, last_seen')
        .in('id', senderIds);

      if (profilesError) {
        // 即使获取资料失败，也返回消息数据
        const result = filteredMessages as ChatMessage[];
        // 如果是初始加载，缓存结果
        if (offset === 0) {
          const cacheKey = getChatCacheKey(userId, otherUserId, false);
          setCache(cacheKey, result);
        }
        return result;
      }

      // 将发送者资料合并到消息中
      const messagesWithProfiles = filteredMessages.map(message => {
        const senderProfile = sendersProfiles?.find(profile => profile.id === message.sender_id);
        return {
          ...message,
          sender_profile: senderProfile
        };
      });

      // 如果是初始加载，缓存结果
      if (offset === 0) {
        const cacheKey = getChatCacheKey(userId, otherUserId, false);
        setCache(cacheKey, messagesWithProfiles);
      }

      return messagesWithProfiles as ChatMessage[];
    } catch {
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
        // 即使添加群成员失败，我们也返回群对象，因为群已经创建成功
      }

      // 返回生成的群对象，而不是从数据库中查询的对象
      return newGroup;
    } catch (error) {
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
        } catch {
          // ignore error
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
    } catch {
      // ignore error
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
    } catch {
      // ignore error
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
      } catch {
        // 继续执行，不中断整个邀请流程
      }
    }
  } catch (error) {
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
      
      // 生成缓存键
      const cacheKey = `chat:groups:${userId}`;
      
      // 尝试从缓存获取群列表
      const cachedGroups = await getCache<Group[]>(cacheKey);
      if (cachedGroups) {
        return cachedGroups;
      }
      
      // 查询用户所在的群聊成员关系
      const { data: groupMemberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      
      if (membershipError) {
        throw membershipError;
      }
      
      if (!groupMemberships || groupMemberships.length === 0) {
        await setCache(cacheKey, [], EXPIRY.SHORT);
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
        await setCache(cacheKey, [], EXPIRY.SHORT);
        return [];
      }
      
      // 查询所有群聊的未读消息数量
      // 使用计数查询获取每个群聊的未读消息数量
      const unreadCountsMap: Record<string, number> = {};
      
      // 为每个群聊获取未读消息数量
      for (const groupId of groupIds) {
        try {
          // 先检查用户是否是群成员
          const { data: isMember, error: memberError } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .maybeSingle();
          
          if (memberError || !isMember) {
            console.error(`User is not a member of group ${groupId}`);
            unreadCountsMap[groupId] = 0;
            continue;
          }
          
          // 从group_message_read_status表获取未读消息数量
          const { count, error } = await supabase
            .from('group_message_read_status')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .eq('is_read', false);
          
          if (error) {
            console.error(`Error getting group unread message count from status table:`, error);
            // 如果出错，尝试从chat_messages表直接计算未读消息数量
            try {
              const { data: unreadMessages, error: messagesError } = await supabase
                .from('chat_messages')
                .select('id')
                .eq('group_id', groupId)
                .not('sender_id', 'eq', userId)
                .eq('is_read', false);
              
              if (!messagesError && unreadMessages) {
                unreadCountsMap[groupId] = unreadMessages.length;
              } else {
                unreadCountsMap[groupId] = 0;
              }
            } catch (fallbackError) {
              console.error(`Fallback error getting unread messages for group ${groupId}:`, fallbackError);
              unreadCountsMap[groupId] = 0;
            }
          } else {
            unreadCountsMap[groupId] = count || 0;
          }
        } catch (error) {
          console.error(`Error getting unread count for group ${groupId}:`, error);
          unreadCountsMap[groupId] = 0;
        }
      }
      
      // 将未读消息数量映射到群聊对象中，并确保member_count准确
      const groupsWithUnreadCounts = groups?.map(async (group) => {
        // 为每个群聊获取准确的成员数量
        try {
          const { count } = await supabase
            .from('group_members')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          return {
            ...group,
            // 使用计算出的准确成员数量，确保与群聊页面显示一致
            member_count: count || group.member_count,
            unread_count: unreadCountsMap[group.id] || 0
          };
        } catch (error) {
          console.error(`Error getting member count for group ${group.id}:`, error);
          return {
            ...group,
            unread_count: unreadCountsMap[group.id] || 0
          };
        }
      }) || [];
      
      // 等待所有成员数量查询完成
      const resolvedGroups = await Promise.all(groupsWithUnreadCounts);
      
      // 缓存群列表，设置较短的过期时间（5分钟）
      await setCache(cacheKey, resolvedGroups, EXPIRY.SHORT);

      return resolvedGroups as Group[];
    } catch (error) {
      console.error('Error in getGroups:', error);
      return [];
    }
  },

  // 获取单个群信息
  getGroup: async (groupId: string): Promise<Group | null> => {
    try {
      // 生成缓存键
      const cacheKey = `chat:group:${groupId}`;
      
      // 尝试从缓存获取群信息
      const cachedGroup = await getCache<Group>(cacheKey);
      if (cachedGroup) {
        return cachedGroup;
      }
      
      // 从数据库中获取实际的群聊信息
      const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Error getting group:', error);
        // 如果获取失败，返回一个包含 groupId 的默认群对象
        const defaultGroup = {
          id: groupId,
          name: `群聊 ${groupId.substring(0, 8)}`, // 使用 groupId 的前 8 个字符作为默认名称
          description: '',
          avatar_url: undefined,
          creator_id: 'unknown',
          member_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Group;
        
        // 缓存默认群对象，避免频繁查询
        await setCache(cacheKey, defaultGroup, EXPIRY.MEDIUM);
        
        return defaultGroup;
      }

      // 缓存群信息
      await setCache(cacheKey, group, EXPIRY.MEDIUM);
      
      return group as Group;
    } catch (error) {
      console.error('Error in getGroup:', error);
      // 返回一个包含 groupId 的默认群对象，避免页面崩溃
      const defaultGroup = {
        id: groupId,
        name: `群聊 ${groupId.substring(0, 8)}`, // 使用 groupId 的前 8 个字符作为默认名称
        description: '',
        avatar_url: undefined,
        creator_id: 'unknown',
        member_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Group;
      
      // 缓存默认群对象，避免频繁查询
      const cacheKey = `chat:group:${groupId}`;
      await setCache(cacheKey, defaultGroup, EXPIRY.MEDIUM);
      
      return defaultGroup;
    }
  },

  // 获取群成员列表
  getGroupMembers: async (groupId: string, ignoreCache?: boolean): Promise<GroupMember[]> => {
    try {
      // 生成缓存键
      const cacheKey = `chat:group:${groupId}:members`;
      
      // 尝试从缓存获取群成员列表，除非明确要求忽略缓存
      if (!ignoreCache) {
        const cachedMembers = await getCache<GroupMember[]>(cacheKey);
        if (cachedMembers) {
          return cachedMembers;
        }
      }
      
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
        await setCache(cacheKey, [], EXPIRY.SHORT);
        return members as GroupMember[];
      }

      // 获取所有成员的用户ID
      const userIds = members.map(member => member.user_id);
      
      // 直接从数据库获取所有成员的最新资料，包含在线状态，不依赖缓存
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, email, avatar_url, online_status, last_seen')
        .in('id', userIds);

      // 创建资料映射
      const memberProfiles: Record<string, Profile> = {};
      if (!profilesError && profiles) {
        for (const profile of profiles) {
          memberProfiles[profile.id] = profile;
        }
      }

      // 将用户资料映射到群成员信息中
      const membersWithProfiles = members.map(member => {
        // 查找对应的用户资料
        const profile = memberProfiles[member.user_id];
        return {
          ...member,
          user_profile: profile // 将用户资料添加到群成员对象中
        };
      });

      // 缓存群成员列表，设置较短的过期时间（1分钟），确保信息不会过时太久
      await setCache(cacheKey, membersWithProfiles, EXPIRY.SHORT / 5);
      
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
  sendGroupMessage: async (groupId: string, content: string, type: 'text' | 'image' | 'video' | 'file' | 'voice' = 'text'): Promise<ChatMessage> => {
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
        type,
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
        
        // 清除所有群成员的群列表缓存，确保未读消息数量更新
        for (const member of groupMembers) {
          const groupListCacheKey = `chat:groups:${member.user_id}`;
          await removeCache(groupListCacheKey);
        }
      }

    // 获取发送者资料
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', senderId)
      .single();

    // 构造完整的消息对象
    const completeMessage = {
      ...data,
      sender_profile: senderProfile || null
    } as ChatMessage;

    // 导入缓存工具函数（动态导入避免循环依赖）
    const { updateCache, getChatCacheKey } = await import('../utils/cache');
    
    // 更新缓存，将新消息添加到缓存中
    const cacheKey = getChatCacheKey(senderId, groupId, true);
    updateCache<ChatMessage[]>(cacheKey, (cachedMessages) => {
      // 确保缓存中没有重复消息
      if (!cachedMessages.some(msg => msg.id === completeMessage.id)) {
        return [...cachedMessages, completeMessage];
      }
      return cachedMessages;
    });

    // 清除发送者的群列表缓存，确保未读消息数量更新
    const senderGroupListCacheKey = `chat:groups:${senderId}`;
    await removeCache(senderGroupListCacheKey);

    // 使用Redis消息队列发布群消息通知
    try {
      await queueService.publishNotification(
        senderId,
        {
          message: completeMessage,
          type: 'group_message_sent',
          groupId
        },
        MessagePriority.MEDIUM
      );
    } catch (redisError) {
      // 只记录错误，不影响主要流程
      console.error('Failed to publish group message to Redis:', redisError);
    }

    // 返回包含发送者资料的消息
    return completeMessage;
  },

  // 获取群消息
  getGroupMessages: async (groupId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> => {
    try {
      // 获取当前认证用户
      const user = await supabase.auth.getUser();
      if (user.error || !user.data.user?.id) {
        return [];
      }
      
      const userId = user.data.user.id;
      
      // 导入缓存工具函数（动态导入避免循环依赖）
      const { getCache, setCache, getChatCacheKey } = await import('../utils/cache');
      
      // 如果是初始加载（offset为0），尝试从缓存获取消息
      let cachedMessages: ChatMessage[] = [];
      if (offset === 0) {
        const cacheKey = getChatCacheKey(userId, groupId, true);
        const cachedData = await getCache<ChatMessage[]>(cacheKey);
        if (cachedData) {
          cachedMessages = cachedData;
        }
      }
      
      // 使用与私聊相同的查询方式，返回所有字段
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error('Error getting group messages:', messagesError.message || JSON.stringify(messagesError));
        // 如果从服务器获取失败，返回缓存消息（如果有）
        return cachedMessages;
      }

      // 确保 messages 是数组
      const chatMessages = messages || [];

      // 如果没有消息，直接返回空数组
      if (chatMessages.length === 0) {
        return cachedMessages;
      }

      // 获取所有发送者的ID
      const senderIds = [...new Set(chatMessages.map(msg => msg.sender_id))];
      
      // 初始化发送者资料对象
      const senderProfiles: Record<string, Profile> = {};
      
      // 尝试从缓存获取发送者资料
      for (const senderId of senderIds) {
        const profileCacheKey = getUserProfileCacheKey(senderId);
        const cachedProfile = await getCache<Profile>(profileCacheKey);
        if (cachedProfile) {
          senderProfiles[senderId] = cachedProfile;
        }
      }
      
      // 获取缓存中没有的发送者资料
      const uncachedSenderIds = senderIds.filter(senderId => !senderProfiles[senderId]);
      if (uncachedSenderIds.length > 0) {
        // 单独获取发送者的资料，包含在线状态
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, email, avatar_url, online_status, last_seen')
          .in('id', uncachedSenderIds);

        if (!profilesError && profiles) {
          // 缓存新获取的发送者资料
          for (const profile of profiles) {
            const profileCacheKey = getUserProfileCacheKey(profile.id);
            await setCache(profileCacheKey, profile, EXPIRY.MEDIUM);
            senderProfiles[profile.id] = profile;
          }
        }
      }

      // 将发送者资料合并到消息中
      const messagesWithProfiles = chatMessages.map(msg => {
        const senderProfile = senderProfiles[msg.sender_id];
        return {
          ...msg,
          sender_profile: senderProfile
        };
      });

      // 如果是初始加载，缓存结果
      if (offset === 0) {
        const cacheKey = getChatCacheKey(userId, groupId, true);
        await setCache(cacheKey, messagesWithProfiles);
      }

      // 与私聊一致，不反转消息顺序，保持API返回的顺序
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

  // 检查用户是否是群管理员（群主或管理员）
  isGroupAdmin: async (groupId: string, userId: string): Promise<boolean> => {
    const { data: member, error } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (error || !member) {
      return false;
    }

    return member.role === 'owner' || member.role === 'admin';
  },

  // 删除聊天消息
  deleteMessages: async (messageIds: string[], isGroup: boolean = false, otherId: string = ''): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // 获取当前时间，计算两分钟前的时间戳
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    // 获取消息详情，用于权限检查和删除逻辑
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id, sender_id, group_id, created_at, content')
      .in('id', messageIds);
    
    if (!messages || messages.length === 0) {
      // 没有可删除的消息，直接返回
      return;
    }
    
    // 准备更新或删除的消息ID数组
    const databaseDeleteIds: string[] = [];
    const adminUpdateIds: string[] = [];
    
    // 遍历消息，根据权限和时间决定处理方式
    for (const message of messages) {
      if (message.group_id) {
        // 群消息
        // 检查是否是群管理员
        const isAdmin = await chatService.isGroupAdmin(message.group_id, userId);
        
        if (isAdmin && message.sender_id !== userId) {
          // 管理员删除其他人的消息：保留消息，修改内容为删除提示
          adminUpdateIds.push(message.id);
        } else if (isAdmin || (message.sender_id === userId && message.created_at >= twoMinutesAgo)) {
          // 管理员删除自己的消息或普通用户删除自己两分钟内的消息：直接删除
          databaseDeleteIds.push(message.id);
        }
      } else {
        // 私聊消息
        if (message.sender_id === userId && message.created_at >= twoMinutesAgo) {
          // 只能删除自己发送的且在两分钟内的消息
          databaseDeleteIds.push(message.id);
        }
      }
    }
    
    // 1. 管理员删除其他人的消息：更新消息内容
    if (adminUpdateIds.length > 0) {
      // 为每个消息获取原始发送者信息
      for (const messageId of adminUpdateIds) {
        const message = messages.find(msg => msg.id === messageId);
        if (!message) continue;
        
        // 更新消息内容为删除提示
        const { error } = await supabase
          .from('chat_messages')
          .update({
            content: '[你的消息被群管理员删除]',
            deleted: true
          })
          .eq('id', messageId);

        if (error) {
          console.error(`Error updating message ${messageId}:`, {
            error: error,
            errorMessage: error?.message || 'Unknown error',
            errorCode: error?.code || 'No code',
            messageId: messageId,
            groupId: message.group_id,
            senderId: message.sender_id,
            currentUserId: userId
          });
          // 继续处理其他消息，不中断整个流程
        }
      }
    }
    
    // 2. 直接删除消息（管理员删除自己的消息或普通用户删除自己两分钟内的消息）
    if (databaseDeleteIds.length > 0) {
      // 删除聊天消息
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .in('id', databaseDeleteIds);

      if (error) {
        throw error;
      }
      
      // 过滤出群消息
      const groupMessageIds = messages
        .filter(msg => msg.group_id !== null && databaseDeleteIds.includes(msg.id))
        .map(msg => msg.id);
      
      // 如果有群消息，删除对应的群消息未读状态记录
      if (groupMessageIds.length > 0) {
        await supabase
          .from('group_message_read_status')
          .delete()
          .in('message_id', groupMessageIds);
      }
    }
    
    // 对于所有消息，添加到本地已删除消息列表
    // 这确保刷新页面后消息不会重新出现
    for (const message of messages) {
      const key = isGroup 
        ? `deleted_messages_${userId}_${message.group_id}` 
        : `deleted_messages_${userId}_${message.group_id || otherId}`;
      
      // 获取当前已删除消息列表（增强版，包含删除类型）
      let deletedMessages: Record<string, { deletedAt: number; deletedByAdmin: boolean }> = {};
      const existingData = localStorage.getItem(key);
      if (existingData) {
        try {
          deletedMessages = JSON.parse(existingData);
        } catch {
          deletedMessages = {};
        }
      }
      
      // 添加新的已删除消息信息
      for (const messageId of messageIds) {
        // 检查是否是管理员删除其他人的消息
        const isAdminDeletion = message.group_id && 
                               (message.sender_id !== userId) && 
                               (adminUpdateIds.includes(messageId) || databaseDeleteIds.includes(messageId));
        
        deletedMessages[messageId] = {
          deletedAt: Date.now(),
          deletedByAdmin: isAdminDeletion
        };
      }
      
      // 保存更新后的已删除消息列表
      localStorage.setItem(key, JSON.stringify(deletedMessages));
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
      .select('id, username, display_name, email, avatar_url, created_at, bio, online_status, last_seen');

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

    try {
      // 先根据 otherUserId 获取用户的实际 UUID
      let targetUserId = otherUserId;
      
      // 如果 otherUserId 不是 UUID 格式，尝试根据用户名获取用户信息
      if (otherUserId.length !== 36 || !otherUserId.includes('-')) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', otherUserId)
          .limit(1);
        
        if (!profileError && profile && profile.length > 0) {
          targetUserId = profile[0].id;
        } else {
          // 如果不是 UUID 且不是有效的用户名，返回 none
          return 'none';
        }
      }
      
      // 使用 fetch 直接调用 Supabase API，避免 Postgrest 客户端的问题
      // 检查是否已经是好友
      const friendshipsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friendships?select=id&user_id=eq.${userId}&friend_id=eq.${targetUserId}&limit=1`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
          }
        }
      );
      
      const friendships = await friendshipsResponse.json();
      if (Array.isArray(friendships) && friendships.length > 0) {
        return 'accepted';
      }

      // 检查是否有未处理的好友请求
      const requestsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?select=id&or=(and(sender_id.eq.${userId},receiver_id.eq.${targetUserId},status.eq.pending),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId},status.eq.pending))&limit=1`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
          }
        }
      );
      
      const friendRequests = await requestsResponse.json();
      if (Array.isArray(friendRequests) && friendRequests.length > 0) {
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

      // 4. 清除缓存，确保双方的好友列表及时更新
      try {
        // 清除当前用户的好友列表缓存
        const currentUserCacheKey = `chat:friends:${userId}`;
        await removeCache(currentUserCacheKey);
        
        // 清除好友的好友列表缓存（如果存在）
        const friendCacheKey = `chat:friends:${friendId}`;
        await removeCache(friendCacheKey);
        
        // 清除相关聊天缓存
        const chatCacheKey = `chat:messages:${userId}:${friendId}`;
        await removeCache(chatCacheKey);
        
        // 清除反向聊天缓存
        const reverseChatCacheKey = `chat:messages:${friendId}:${userId}`;
        await removeCache(reverseChatCacheKey);
      } catch (cacheError) {
        // 只记录缓存错误，不影响主要功能
        console.error('Error clearing cache after removing friend:', cacheError);
      }

    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  },

  // 获取用户的通知列表
  getNotifications: async (): Promise<Notification[]> => {
    try {
      const session = await supabase.auth.getSession();
      
      // 如果没有会话，直接返回空数组，不记录错误
      if (!session.data.session) {
        return [];
      }
      
      const user = await supabase.auth.getUser();
      const accessToken = session.data.session.access_token;
      
      // 检查是否有错误获取用户信息
      if (user.error) {
        return [];
      }
      
      const userId = user.data?.user?.id;

      if (!userId) {
        return [];
      }

      // 先尝试从缓存获取通知列表
      const cachedNotifications = await getCachedNotificationsList<Notification>(userId);
      if (cachedNotifications) {
        return cachedNotifications;
      }

      // 缓存未命中，从数据库获取
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/notifications?select=*&recipient_id=eq.${userId}&order=created_at.desc`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as Notification[];
      
      // 将通知列表缓存
      await setCachedNotificationsList(userId, data);
      
      return data;
    } catch {
      return [];
    }
  },

  // 获取未读通知数量
  getUnreadNotificationsCount: async (): Promise<number> => {
    try {
      const session = await supabase.auth.getSession();
      
      // 如果没有会话，直接返回0，不记录错误
      if (!session.data.session) {
        return 0;
      }
      
      const user = await supabase.auth.getUser();
      const accessToken = session.data.session.access_token;
      
      // 检查是否有错误获取用户信息
      if (user.error) {
        return 0;
      }
      
      const userId = user.data?.user?.id;

      if (!userId) {
        return 0;
      }

      // 先尝试从缓存获取未读通知数量
      const cachedCount = await getCachedUnreadNotificationsCount(userId);
      if (cachedCount !== null) {
        return cachedCount;
      }

      // 缓存未命中，从数据库获取
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/notifications?select=id&recipient_id=eq.${userId}&read_status=eq.false`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      const count = data.length || 0;
      
      // 将未读通知数量缓存
      await setCachedUnreadNotificationsCount(userId, count);
      
      return count;
    } catch {
      return 0;
    }
  },

  // 标记通知为已读
  markNotificationAsRead: async (notificationId: string): Promise<Notification> => {
    const user = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token || '';
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      throw new Error('User not authenticated');
    }
    
    const userId = user.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 使用直接的 fetch 调用来标记通知为已读
      const updateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/notifications?id=eq.${notificationId}&recipient_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ read_status: true })
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to mark notification as read: ${await updateResponse.text()}`);
      }

      // 获取更新后的通知
      const getResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/notifications?id=eq.${notificationId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!getResponse.ok) {
        throw new Error(`Failed to get updated notification: ${await getResponse.text()}`);
      }

      const updatedNotificationData = await getResponse.json();
      const updatedNotification = updatedNotificationData[0] as Notification;
      
      // 使用Redis消息队列发布通知状态更新
      try {
        await queueService.publishNotification(
          userId,
          {
            notification: updatedNotification,
            type: 'notification_updated',
            updateType: 'read_status'
          },
          MessagePriority.LOW
        );
        // 清除相关缓存
        await clearUnreadNotificationsCountCache(userId);
        await clearNotificationsListCache(userId);
      } catch (redisError) {
        // 只记录错误，不影响主要流程
        console.error('Failed to publish notification update to Redis:', redisError);
      }
      
      return updatedNotification;
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      throw error;
    }
  },

  // 标记所有通知为已读
  markAllNotificationsAsRead: async (): Promise<void> => {
    const user = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token || '';
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      throw new Error('User not authenticated');
    }
    
    const userId = user.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 使用直接的 fetch 调用来标记所有通知为已读
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/notifications?recipient_id=eq.${userId}&read_status=eq.false`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ read_status: true })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to mark all notifications as read: ${await response.text()}`);
      }
      
      // 使用Redis消息队列发布批量更新通知
      try {
        await queueService.publishNotification(
          userId,
          {
            type: 'notifications_updated',
            updateType: 'mark_all_as_read'
          },
          MessagePriority.LOW
        );
        // 清除相关缓存
        await clearUnreadNotificationsCountCache(userId);
        await clearNotificationsListCache(userId);
      } catch (redisError) {
        // 只记录错误，不影响主要流程
        console.error('Failed to publish mark-all-as-read notification to Redis:', redisError);
      }
    } catch (error) {
      console.error('Error in markAllNotificationsAsRead:', error);
      throw error;
    }
  },

  // 删除通知
  deleteNotification: async (notificationId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token || '';
    
    // 检查是否有错误获取用户信息
    if (user.error) {
      throw new Error('User not authenticated');
    }
    
    const userId = user.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 使用直接的 fetch 调用来删除通知
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/notifications?id=eq.${notificationId}&recipient_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${await response.text()}`);
      }
      
      // 使用Redis消息队列发布通知删除事件
      try {
        await queueService.publishNotification(
          userId,
          {
            notificationId,
            type: 'notification_deleted'
          },
          MessagePriority.LOW
        );
        // 清除相关缓存
        await clearUnreadNotificationsCountCache(userId);
        await clearNotificationsListCache(userId);
      } catch (redisError) {
        // 只记录错误，不影响主要流程
        console.error('Failed to publish notification deletion to Redis:', redisError);
      }
    } catch (error) {
      console.error('Error in deleteNotification:', error);
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

      // 3. 清理所有群成员的群列表缓存
      // 获取所有群成员
      const { data: allMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      // 清理每个成员的群列表缓存
      if (allMembers) {
        for (const member of allMembers) {
          const cacheKey = `chat:groups:${member.user_id}`;
          await removeCache(cacheKey);
        }
      }

      // 清理退出用户的群列表缓存
      const exitUserCacheKey = `chat:groups:${userId}`;
      await removeCache(exitUserCacheKey);

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

      // 5. 清理所有群成员的群列表缓存
      // 获取所有群成员
      const { data: allMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      // 清理每个成员的群列表缓存
      if (allMembers) {
        for (const member of allMembers) {
          const cacheKey = `chat:groups:${member.user_id}`;
          await removeCache(cacheKey);
        }
      }

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
      
      // 先检查用户是否是群成员
      const { data: isMember, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (memberError || !isMember) {
        console.error('User is not a member of this group:', { groupId, userId });
        return 0;
      }
      
      // 使用新创建的视图获取未读消息数量
      const { data: unreadCount, error } = await supabase
        .from('group_unread_counts')
        .select('unread_count')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error getting group unread message count:', { 
          error, 
          message: error.message, 
          code: error.code, 
          groupId, 
          userId 
        });
        return 0;
      }

      return unreadCount?.unread_count || 0;
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
      // 先检查用户是否是群成员
      const { data: isMember, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (memberError || !isMember) {
        console.error(`User is not a member of group ${groupId}`);
        return;
      }
      
      // 更新 chat_messages 表中对应消息的 is_read 字段
      if (messageIds && messageIds.length > 0) {
        // 如果提供了消息ID列表，只更新这些消息
        // 更新 chat_messages 表
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('group_id', groupId)
          .in('id', messageIds);
        
        if (updateError) {
          console.error('Error updating message is_read status:', updateError);
        }
        
        // 同时更新 group_message_read_status 表
        const { error: statusUpdateError } = await supabase
          .from('group_message_read_status')
          .update({ is_read: true })
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .in('message_id', messageIds);
        
        if (statusUpdateError) {
          console.error('Error updating group_message_read_status:', statusUpdateError);
        }
      } else {
        // 否则只更新未读消息，而不是所有消息，优化性能并避免权限问题
        // 更新 chat_messages 表，只更新未读消息
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('group_id', groupId)
          .eq('is_read', false);
        
        if (updateError) {
          console.error('Error updating unread messages is_read status:', updateError.message || JSON.stringify(updateError));
        }
        
        // 同时更新 group_message_read_status 表，只更新未读消息
        const { error: statusUpdateError } = await supabase
          .from('group_message_read_status')
          .update({ is_read: true })
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .eq('is_read', false);
        
        if (statusUpdateError) {
          console.error('Error updating unread group_message_read_status:', statusUpdateError.message || JSON.stringify(statusUpdateError));
        }
      }
      
      let latestMessageId: string | undefined;
      
      if (messageIds && messageIds.length > 0) {
        // 如果提供了消息ID列表，使用最新的消息ID
        // 获取消息列表的最新创建时间
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select('id, created_at')
          .in('id', messageIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!error && messages) {
          latestMessageId = messages.id;
        }
      } else {
        // 否则获取群聊中最新的消息ID
        const { data: latestMessage, error } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!error && latestMessage) {
          latestMessageId = latestMessage.id;
        }
      }
      
      if (!latestMessageId) {
        // 群聊中没有消息，不需要标记已读
        return;
      }
      
      // 更新群聊已读计数器 - 使用try-catch避免整体功能失败
      try {
        // 先尝试UPDATE，如果没有找到记录再执行INSERT，避免违反RLS策略
        const { error: updateError } = await supabase
          .from('group_read_counters')
          .update(
            {
              last_read_message_id: latestMessageId,
              last_read_at: new Date().toISOString()
            }
          )
          .eq('group_id', groupId)
          .eq('user_id', userId);
        
        if (updateError) {
          // 如果UPDATE失败，尝试INSERT
          const { error: insertError } = await supabase
            .from('group_read_counters')
            .insert(
              {
                group_id: groupId,
                user_id: userId,
                last_read_message_id: latestMessageId,
                last_read_at: new Date().toISOString()
              }
            );
          
          if (insertError) {
            // 简化错误日志，避免复杂对象导致的控制台错误
            console.error(`Error updating group read counter for group ${groupId}:`, insertError.message || 'Unknown error');
          }
        }
      } catch (e) {
        // 捕获任何可能的异常，避免影响主要功能
        console.error(`Exception updating group read counter for group ${groupId}:`, e instanceof Error ? e.message : String(e));
      }
    } catch (error) {
      console.error('Error in markGroupMessagesAsRead:', error);
      // 不抛出错误，确保函数始终成功返回
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

  // 删除好友
  deleteFriend: async (friendId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // 开始事务，同时删除两条好友关系记录
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

      if (error) {
        throw error;
      }

      // 清除相关缓存
      // 清除当前用户的好友列表缓存
      const currentUserCacheKey = `chat:friends:${userId}`;
      await removeCache(currentUserCacheKey);
      
      // 清除好友的好友列表缓存
      const friendCacheKey = `chat:friends:${friendId}`;
      await removeCache(friendCacheKey);
    } catch (error) {
      console.error('Error deleting friend:', error);
      throw error;
    }
  },

  // 订阅通知实时更新
  subscribeToNotifications: (userId: string, callback: (notification: Notification) => void) => {
    if (!userId) {
      // 用户未登录，返回一个空的订阅对象 ，避免抛出错误
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
          filter: `recipient_id.eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return subscription;
  }
};

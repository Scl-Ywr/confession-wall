// 聊天相关类型定义

// 导入Profile类型
import { Profile } from './confession';

// 重新导出Profile类型供外部使用
export type { Profile };

// 用户在线状态
export type OnlineStatus = 'online' | 'offline' | 'away' | 'busy';

// 好友关系状态
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

// 好友申请
export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message?: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  sender_profile?: Profile;
  receiver_profile?: Profile;
}

// 好友关系
export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  updated_at: string;
  friend_profile?: Profile;
  unread_count: number;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string; // 一对一聊天时的接收者ID
  group_id?: string; // 群聊时的群ID
  content: string;
  created_at: string;
  updated_at: string;
  sender_profile?: Profile;
  is_read: boolean;
  type: 'text' | 'image' | 'video' | 'file';
}

// 聊天会话
export interface ChatSession {
  id: string;
  type: 'private' | 'group';
  other_user_id?: string;
  group_id?: string;
  last_message?: ChatMessage;
  unread_count: number;
  updated_at: string;
  other_user_profile?: Profile;
  group_info?: Group;
}

// 交流群
export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  unread_count?: number;
}

// 群成员
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  updated_at: string;
  user_profile?: Profile;
  group_nickname?: string; // 群内昵称
  group_avatar_url?: string; // 群内头像
}

// 群公告
export interface GroupAnnouncement {
  id: string;
  group_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_profile?: Profile;
}

// 通知类型
export type NotificationType = 'friend_request' | 'friend_accepted' | 'friend_rejected' | 'friend_request_sent' | 'group_invite';


// 通知
export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  content: string;
  type: NotificationType;
  read_status: boolean;
  created_at: string;
  updated_at: string;
  friend_request_id?: string;
  group_id?: string;
  sender_profile?: Profile;
}

// 搜索用户结果
export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  online_status?: OnlineStatus;
  bio?: string;
}



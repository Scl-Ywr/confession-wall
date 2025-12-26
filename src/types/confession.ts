export interface ConfessionImage {
  id: string;
  confession_id: string;
  image_url: string;
  file_type: 'image' | 'video';
  created_at: string;
  is_locked: boolean;
  lock_type: 'password' | 'user' | 'public';
  lock_password?: string;
  locked_at?: string;
}

export type OnlineStatus = 'online' | 'offline' | 'away' | 'busy';

export interface Profile {
  id: string;
  display_name: string;
  username: string;
  email: string;
  avatar_url?: string;
  online_status?: OnlineStatus;
  last_seen?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
  user_ip?: string;
  user_city?: string;
  user_province?: string;
  user_country?: string;
  ip_updated_at?: string;
  is_admin?: boolean;
}

// 话题标签
export interface Hashtag {
  id: string;
  tag: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// 表白分类
export interface ConfessionCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at: string;
}

// 表白与标签关联
export interface ConfessionHashtag {
  id: string;
  confession_id: string;
  hashtag_id: string;
  created_at: string;
  hashtag?: Hashtag;
}

// 用户提及
export interface UserMention {
  id: string;
  confession_id: string;
  mentioned_user_id: string;
  mentioned_by_user_id: string;
  created_at: string;
  mentioned_user_profile?: Profile;
  mentioned_by_user_profile?: Profile;
}

// 通知类型
export type NotificationType = 'like' | 'comment' | 'mention' | 'follow' | 'confession_like' | 'comment_reply';

// 通知
export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: NotificationType;
  content: string;
  read_status: boolean;
  created_at: string;
  updated_at: string;
  related_id?: string; // 相关内容ID（表白ID、评论ID等）
  sender_profile?: Profile;
}

export interface Confession {
  id: string;
  content: string;
  is_anonymous: boolean;
  user_id?: string;
  created_at: string;
  likes_count: number;
  profile?: Profile;
  liked_by_user?: boolean;
  images?: ConfessionImage[];
  category_id?: string;
  category?: ConfessionCategory;
  hashtags?: ConfessionHashtag[];
  mentions?: UserMention[];
}

export interface Like {
  id: string;
  confession_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  confession_id: string;
  content: string;
  is_anonymous: boolean;
  user_id: string;
  created_at: string;
  profile?: Profile;
}

export interface ConfessionFormData {
  content: string;
  is_anonymous: boolean;
  images?: File[];
  videoUrls?: string[];
  category_id?: string;
  hashtags?: string[]; // 标签数组
  group_id?: string; // 兴趣圈子ID
}

export interface CommentFormData {
  content: string;
  is_anonymous: boolean;
}

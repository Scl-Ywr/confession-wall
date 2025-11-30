export interface ConfessionImage {
  id: string;
  confession_id: string;
  image_url: string;
  file_type: 'image' | 'video';
  created_at: string;
}

export interface Profile {
  display_name: string;
  username: string;
  avatar_url?: string;
}

export interface Confession {
  id: string;
  content: string;
  is_anonymous: boolean;
  user_id: string;
  created_at: string;
  likes_count: number;
  profile?: Profile;
  liked_by_user?: boolean;
  images?: ConfessionImage[];
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
}

export interface CommentFormData {
  content: string;
  is_anonymous: boolean;
}

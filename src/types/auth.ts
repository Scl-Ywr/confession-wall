export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  is_admin?: boolean;
  auth_provider?: 'supabase' | 'google' | 'github' | 'wechat' | 'qq' | 'logto';
  oauth_provider?: string;
  oauth_avatar_url?: string;
  oauth_username?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  authProvider?: 'supabase' | 'logto' | null;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LogtoUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  username?: string;
  provider: string;
  raw: Record<string, unknown>;
}

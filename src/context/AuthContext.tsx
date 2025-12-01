'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User | null) => void;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // 更新用户在线状态的辅助函数
  const updateOnlineStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          online_status: status,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
      if (error) {
        console.error('Error updating online status:', error);
      }
    } catch (error) {
      console.error('Unexpected error updating online status:', error);
    }
  };

  useEffect(() => {
    // 跟踪认证检查是否已完成
    let isAuthChecked = false;
    
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 用户已登录，设置在线状态
          await updateOnlineStatus(user.id, 'online');
        }
        isAuthChecked = true;
        setState(prev => ({ 
          ...prev, 
          user: user ? {
            id: user.id,
            email: user.email || '',
            email_confirmed_at: user.email_confirmed_at,
            created_at: user.created_at,
            updated_at: user.updated_at
          } as User : null, 
          loading: false 
        }));
      } catch (error) {
        console.error('Error checking user:', error);
        isAuthChecked = true;
        setState(prev => ({ ...prev, loading: false, error: 'Failed to check user' }));
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // 用户登录或会话恢复，设置在线状态
        updateOnlineStatus(session.user.id, 'online');
      } else if (event === 'SIGNED_OUT') {
        // 用户主动退出登录，设置离线状态
        const userId = state.user?.id;
        if (userId) {
          updateOnlineStatus(userId, 'offline');
        }
      }
      
      // 只有当认证检查已完成或会话存在时，才更新状态并设置loading为false
      // 这避免了在checkUser完成前，onAuthStateChange触发导致的状态闪烁
      if (isAuthChecked || session?.user) {
        setState(prev => ({
          ...prev,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email || '',
            email_confirmed_at: session.user.email_confirmed_at,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at
          } as User : null,
          loading: false,
        }));
      }
    });

    // 监听页面关闭或刷新事件，设置离线状态
    const handleBeforeUnload = async () => {
      const userId = state.user?.id;
      if (userId) {
        try {
          // 尝试使用fetch发送同步请求，确保请求能被处理
          await fetch('/api/update-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, status: 'offline' }),
            keepalive: true,
          });
        } catch (error) {
          console.error('Error sending offline status:', error);
          // 如果fetch失败，尝试使用navigator.sendBeacon
          try {
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('status', 'offline');
            navigator.sendBeacon('/api/update-status', formData);
          } catch (beaconError) {
            console.error('Error sending beacon for offline status:', beaconError);
          }
        }
      }
    };

    // 监听页面可见性变化，当页面隐藏时设置为离开，显示时设置为在线
    const handleVisibilityChange = async () => {
      const userId = state.user?.id;
      if (userId) {
        const status = document.hidden ? 'away' : 'online';
        await updateOnlineStatus(userId, status as 'online' | 'offline');
      }
    };

    // 添加心跳机制，定期更新在线状态
    const heartbeatInterval = setInterval(async () => {
      const userId = state.user?.id;
      if (userId) {
        await updateOnlineStatus(userId, 'online');
      }
    }, 30000); // 每30秒发送一次心跳

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      // 组件卸载时也设置为离线
      const userId = state.user?.id;
      if (userId) {
        updateOnlineStatus(userId, 'offline');
      }
    };
  }, [state.user?.id]);

  const register = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // 只在客户端执行，确保window对象存在
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/verify-email` 
        : '';
      
      // 尝试注册
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        // 如果用户已存在，直接提示用户登录
        if (error.message.includes('User already registered') || error.message.includes('already exists')) {
          throw new Error('该邮箱已注册，您可以直接登录');
        } else {
          throw error;
        }
      }
      
      // 注册成功，设置loading为false
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // 检查用户邮箱是否已验证
      if (data.user && !data.user.email_confirmed_at) {
        // 邮箱未验证，登出用户并返回错误
        await supabase.auth.signOut();
        throw new Error('请先验证您的邮箱，然后再登录');
      }
      
      // 如果用户已登录，检查是否有profile记录，如果没有则创建
      if (data.user) {
        const userId = data.user.id;
        const userEmail = data.user.email;
        
        if (userEmail) {
          // 检查profile是否存在
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          
          if (profileError) {
            console.error('Error checking profile:', profileError);
          } else if (!profileData) {
            // 创建默认profile
            const username = userEmail.split('@')[0];
            
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                username,
                display_name: username
              });
            
            if (createError) {
              console.error('Error creating profile:', createError);
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const logout = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // 只在客户端执行，确保window对象存在
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/verify-email` 
        : '';
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const updateUser = (user: User | null) => {
    setState(prev => ({ ...prev, user }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        logout,
        updateUser,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

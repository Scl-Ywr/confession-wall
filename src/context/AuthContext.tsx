'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, AuthState } from '@/types/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType extends AuthState {
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User | null) => void;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // 更新用户在线状态的辅助函数
  const updateOnlineStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
    try {
      // 移除对state.user的依赖，确保即使用户已登出也能更新状态
      const { error } = await supabase
        .from('profiles')
        .update({
          online_status: status,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
      if (error) {
        // 改进错误日志，提供更详细的信息
        console.error('Error updating online status:', {
          userId,
          status,
          errorMessage: error.message || JSON.stringify(error)
        });
      }
    } catch (error) {
      // 忽略网络请求错误，例如用户已离线或会话过期
      if (error instanceof Error) {
        console.error('Unexpected error updating online status:', {
          userId,
          status,
          errorMessage: error.message
        });
      } else {
        console.error('Unexpected error updating online status:', {
          userId,
          status,
          errorType: typeof error,
          error: JSON.stringify(error)
        });
      }
    }
  };

  useEffect(() => {
    // 跟踪认证检查是否已完成
    let isAuthChecked = false;
    // 保存当前登录用户的ID到闭包变量，用于登出时更新状态
    let currentUserId: string | null = null;
    
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 用户已登录，设置在线状态
          await updateOnlineStatus(user.id, 'online');
          // 保存userId到闭包变量
          currentUserId = user.id;
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
        // 保存userId到闭包变量
        currentUserId = session.user.id;
      } else if (event === 'SIGNED_OUT') {
        // 用户主动退出登录，设置离线状态
        // 使用闭包变量中的userId，而不是state.user
        if (currentUserId) {
          updateOnlineStatus(currentUserId, 'offline');
          // 清空闭包变量
          currentUserId = null;
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
    const handleBeforeUnload = () => {
      // 使用闭包变量中的userId
      if (currentUserId) {
        try {
          // 使用navigator.sendBeacon发送离线状态更新，确保在页面关闭时能可靠发送
          const formData = new FormData();
          formData.append('userId', currentUserId);
          formData.append('status', 'offline');
          navigator.sendBeacon('/api/update-status', formData);
        } catch (error) {
          console.error('Error sending beacon:', error);
          // 如果sendBeacon失败，尝试使用传统的fetch请求
          fetch('/api/update-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: currentUserId,
              status: 'offline'
            }),
            keepalive: true // 确保请求在页面关闭时仍能完成
          }).catch(err => {
            console.error('Error updating status on unload:', err);
          });
        }
      }
    };

    // 监听页面可见性变化，当页面隐藏时设置为离开，显示时设置为在线
    const handleVisibilityChange = async () => {
      // 使用闭包变量中的userId
      if (currentUserId) {
        const status = document.hidden ? 'away' : 'online';
        await updateOnlineStatus(currentUserId, status);
      }
    };

    // 添加心跳机制，定期更新在线状态
    // 只有当用户实际登录时才运行心跳机制
    const heartbeatInterval = setInterval(async () => {
      // 使用闭包变量中的userId
      if (currentUserId) {
        try {
          // 直接更新在线状态，不获取最新的user对象，避免user对象频繁变化
          await updateOnlineStatus(currentUserId, 'online');
        } catch (error) {
          // 忽略心跳更新失败，这可能是网络问题或用户已离线
          // 但我们可以记录这个错误，方便调试
          const errorObj = error as Error;
          if (errorObj.message) {
            console.error('Heartbeat update failed:', errorObj.message);
          }
          // 不要在catch块中再次调用updateOnlineStatus，避免潜在的无限循环
        }
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
      // 使用闭包变量中的userId
      if (currentUserId) {
        try {
          // 使用navigator.sendBeacon发送离线状态更新，确保在组件卸载时能可靠发送
          const formData = new FormData();
          formData.append('userId', currentUserId);
          formData.append('status', 'offline');
          navigator.sendBeacon('/api/update-status', formData);
        } catch (error) {
          console.error('Error sending beacon on cleanup:', error);
          // 如果sendBeacon失败，尝试使用传统的fetch请求
          fetch('/api/update-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: currentUserId,
              status: 'offline'
            }),
            keepalive: true // 确保请求在页面关闭时仍能完成
          }).catch(err => {
            console.error('Error updating status on cleanup:', err);
          });
        }
      }
    };
  }, []);

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
      // 在登出前手动更新状态为离线
      const userId = state.user?.id;
      if (userId) {
        await updateOnlineStatus(userId, 'offline');
      }
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
      
      // 退出登录成功后跳转到主页
      router.push('/');
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

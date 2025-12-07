'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, AuthState } from '@/types/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType extends AuthState {
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: (options?: { redirect?: boolean; redirectUrl?: string }) => Promise<void>;
  updateUser: (user: User | null) => void;
  resendVerificationEmail: (email: string) => Promise<void>;
  clearError: () => void;
  checkEmailExists: (email: string) => Promise<{ exists: boolean; verified: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // 错误信息翻译函数，将英文错误转换为中文
  const translateError = (error: Error): string => {
    const errorMessage = error.message.toLowerCase();
    
    // 登录相关错误
    if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid email or password')) {
      return '邮箱或密码不正确';
    }
    if (errorMessage.includes('email not confirmed')) {
      return '请先验证您的邮箱，然后再登录';
    }
    
    // 注册相关错误
    if (errorMessage.includes('user already registered') || errorMessage.includes('already exists')) {
      return '该邮箱已注册，您可以直接登录';
    }
    if (errorMessage.includes('password too short') || errorMessage.includes('password must be at least')) {
      return '密码长度不能少于6个字符';
    }
    
    // 邮箱验证相关错误
    if (errorMessage.includes('invalid token') || errorMessage.includes('token expired') || errorMessage.includes('invalid otp')) {
      return '验证链接无效或已过期，请重新注册获取新的验证链接';
    }
    if (errorMessage.includes('rate limit exceeded')) {
      return '操作过于频繁，请稍后再试';
    }
    
    // 网络错误
    if (errorMessage.includes('network error') || errorMessage.includes('failed to fetch')) {
      return '网络连接失败，请检查您的网络设置';
    }
    
    // 其他错误
    return error.message || '发生未知错误，请重试';
  };

  // 更新用户在线状态的辅助函数
  const updateOnlineStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
    try {
      // 获取当前登录用户，确保只有当前登录用户才能更新自己的状态
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // 如果没有登录用户，忽略状态更新
        return;
      }
      
      // 确保只有当前登录用户才能更新自己的状态
      if (user.id !== userId) {
        // 仅在开发环境下记录日志，生产环境下忽略
        if (process.env.NODE_ENV === 'development') {
          console.debug('Online status update rejected: User can only update their own status', {
            currentUserId: user.id,
            targetUserId: userId,
            status
          });
        }
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          online_status: status,
          // 使用客户端当前时间，Supabase会自动转换为PostgreSQL时间格式
          last_seen: new Date()
        })
        .eq('id', userId);
      if (error) {
        // 静默处理错误，仅在开发环境下记录详细日志
        if (process.env.NODE_ENV === 'development') {
          console.debug('Online status update info:', {
            userId,
            status,
            error: error.message || 'Unknown error'
          });
        }
      }
    } catch (error) {
      // 忽略网络请求错误，例如用户已离线或会话过期
      // 仅在开发环境下记录日志
      if (process.env.NODE_ENV === 'development') {
        if (error instanceof Error) {
          console.debug('Online status update info:', {
            userId,
            status,
            error: error.message
          });
        } else {
          console.debug('Online status update info:', {
            userId,
            status,
            error: 'Non-error object caught'
          });
        }
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
      try {
        // 每次心跳都获取最新的登录用户信息，确保只更新当前登录用户的状态
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 只更新当前登录用户的状态
          await updateOnlineStatus(user.id, 'online');
          // 更新闭包变量中的userId，确保其他地方也使用正确的userId
          currentUserId = user.id;
        } else {
          // 如果没有登录用户，清空闭包变量
          currentUserId = null;
        }
      } catch (error) {
        // 忽略心跳更新失败，这可能是网络问题或用户已离线
        // 仅在开发环境下记录调试信息
        if (process.env.NODE_ENV === 'development') {
          const errorObj = error as Error;
          console.debug('Heartbeat update info:', {
            error: errorObj.message || 'Unknown error'
          });
        }
        // 不要在catch块中再次调用updateOnlineStatus，避免潜在的无限循环
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
      // 1. 检查邮箱是否存在及验证状态
      const emailStatus = await checkEmailExists(email);
      
      // 2. 根据邮箱状态处理不同情况
      if (emailStatus.exists) {
        if (emailStatus.verified) {
          throw new Error('您已经注册成功');
        } else {
          // 未验证的用户，检查是否为注销用户（密码为随机值）
          const loginAttempt = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!loginAttempt.error) {
            // 登录成功，说明密码正确，用户是正常用户
            await supabase.auth.signOut();
            throw new Error('您已经注册成功');
          }
          
          // 登录失败，说明是注销用户或密码错误
          // 对于注销用户，我们需要引导用户前往密码重置页面
          const errorMsg = loginAttempt.error.message.toLowerCase();
          
          if (errorMsg.includes('invalid login credentials')) {
            // 密码错误，说明是注销用户，密码已被重置为随机值
            // 提示用户前往密码重置页面
            throw new Error('您的账号已注销，请前往密码重置页面重置密码后再登录');
          } else {
            // 其他错误，如邮箱未验证
            throw new Error('该邮箱尚未验证');
          }
        }
      }
      
      // 3. 邮箱不存在，执行正常注册流程
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/verify-email` 
        : '';
      
      const signupResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            signup_timestamp: new Date().toISOString()
          }
        },
      });

      if (signupResult.error) {
        // 处理Supabase返回的错误
        const errorMsg = signupResult.error.message.toLowerCase();
        if (errorMsg.includes('user already registered') || errorMsg.includes('already exists')) {
          // 对于已经存在的用户，再次检查其状态
          const updatedStatus = await checkEmailExists(email);
          if (updatedStatus.verified) {
            throw new Error('您已经注册成功');
          } else {
            // 尝试直接登录，确认密码是否正确
            const { error: loginError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (loginError) {
              // 登录失败，说明是注销用户，提示前往密码重置页面
              throw new Error('您的账号已注销，请前往密码重置页面重置密码后再登录');
            } else {
              // 登录成功，说明密码正确，用户是正常用户
              await supabase.auth.signOut();
              throw new Error('您已经注册成功');
            }
          }
        }
        throw signupResult.error;
      }
      
      // 注册成功，设置loading为false
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('An unknown error occurred');
      setState(prev => ({ ...prev, loading: false, error: translateError(errorObj) }));
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
      const errorObj = error instanceof Error ? error : new Error('An unknown error occurred');
      const errorMessage = translateError(errorObj);
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const logout = async (options?: { redirect?: boolean; redirectUrl?: string }) => {
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
      
      // 登出成功，更新状态并重置loading
      setState(prev => ({ 
        ...prev, 
        user: null, // 确保用户状态被清空
        loading: false // 重置loading状态
      }));
      
      // 根据选项决定是否重定向
      if (options?.redirect) {
        router.push(options.redirectUrl || '/');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    // 不要设置全局loading状态，避免影响其他按钮
    setState(prev => ({ ...prev, error: null }));
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
      const errorObj = error instanceof Error ? error : new Error('An unknown error occurred');
      const errorMessage = translateError(errorObj);
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  };

  const updateUser = (user: User | null) => {
    setState(prev => ({ ...prev, user }));
  };

  // 使用useCallback确保clearError函数引用稳定，避免useEffect无限循环
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 检查邮箱是否存在及验证状态
  const checkEmailExists = useCallback(async (email: string): Promise<{ exists: boolean; verified: boolean }> => {
    try {
      // 1. 首先尝试使用RPC函数检查
      const rpcResult = await supabase.rpc('check_email_status', { email_to_check: email });
      
      if (rpcResult.error) {
        // RPC调用失败，使用备选方案：尝试登录
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: 'invalid-password-123456',
        });
        
        if (!signInError) {
          // 登录成功，说明邮箱存在且密码正确
          await supabase.auth.signOut();
          return { exists: true, verified: true };
        }
        
        const errorMsg = signInError.message.toLowerCase();
        if (errorMsg.includes('invalid login credentials')) {
          // 密码错误，说明邮箱存在但可能是注销用户
          // 对于注销用户，我们应该允许重新注册
          return { exists: false, verified: false };
        } else if (errorMsg.includes('email not confirmed')) {
          // 邮箱未确认，说明是真实的注册用户
          return { exists: true, verified: false };
        } else if (errorMsg.includes('user not found')) {
          // 用户不存在
          return { exists: false, verified: false };
        }
        
        return { exists: false, verified: false };
      }
      
      // 处理RPC返回的结果
      if (rpcResult.data && Array.isArray(rpcResult.data) && rpcResult.data.length > 0) {
        // 取数组的第一个元素
        const rpcData = rpcResult.data[0];
        return {
          exists: Boolean(rpcData.email_exists),
          verified: Boolean(rpcData.verified)
        };
      } else if (rpcResult.data && typeof rpcResult.data === 'object') {
        // 兼容单个对象的情况
        return {
          exists: Boolean(rpcResult.data.email_exists),
          verified: Boolean(rpcResult.data.verified)
        };
      } else {
        return { exists: false, verified: false };
      }
    } catch {
      // 所有检查都失败，默认返回用户不存在
      return { exists: false, verified: false };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        logout,
        updateUser,
        resendVerificationEmail,
        clearError,
        checkEmailExists,
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

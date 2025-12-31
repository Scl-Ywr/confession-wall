'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, AuthState } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { globalMessageService } from '@/services/globalMessageService';

interface AuthContextType extends AuthState {
  register: (email: string, password: string, captchaToken?: string) => Promise<void>;
  login: (email: string, password: string, captchaToken?: string, isAdminLogin?: boolean) => Promise<void>;
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
    if (errorMessage.includes('email not confirmed') || errorMessage.includes('email not verified')) {
      return '请先验证您的邮箱，然后再登录';
    }
    if (errorMessage.includes('login failed too many times') || errorMessage.includes('登录失败次数过多')) {
      return error.message; // 直接返回自定义的锁定错误信息
    }
    if (errorMessage.includes('user not found')) {
      return '该邮箱未注册，请先注册';
    }
    
    // 注册相关错误
    if (errorMessage.includes('user already registered') || errorMessage.includes('already exists')) {
      return '该邮箱已注册，您可以直接登录';
    }
    if (errorMessage.includes('password too short') || errorMessage.includes('password must be at least')) {
      return '密码长度不能少于8个字符';
    }
    if (errorMessage.includes('password') && (errorMessage.includes('uppercase') || errorMessage.includes('lowercase') || errorMessage.includes('digit') || errorMessage.includes('special'))) {
      return '密码必须包含大小写字母、数字和特殊字符';
    }
    if (errorMessage.includes('password confirmation')) {
      return '两次输入的密码不一致';
    }
    
    // 邮箱验证相关错误
    if (errorMessage.includes('invalid token') || errorMessage.includes('token expired') || errorMessage.includes('invalid otp') || errorMessage.includes('token_hash')) {
      return '验证链接无效或已过期，请重新注册获取新的验证链接';
    }
    if (errorMessage.includes('rate limit exceeded') || errorMessage.includes('too many requests')) {
      return '操作过于频繁，请稍后再试';
    }
    if (errorMessage.includes('email rate limit exceeded')) {
      return '发送验证邮件过于频繁，请稍后再试';
    }
    
    // 网络错误
    if (errorMessage.includes('network error') || errorMessage.includes('failed to fetch') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return '网络连接失败，请检查您的网络设置';
    }
    
    // 权限相关错误
    if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return '您没有权限执行此操作';
    }
    if (errorMessage.includes('您不是管理员')) {
      return error.message;
    }
    if (errorMessage.includes('admin only')) {
      return '只有管理员才能执行此操作';
    }
    
    // Supabase Auth相关错误
    if (errorMessage.includes('auth session missing') || errorMessage.includes('session not found') || errorMessage.includes('invalid session')) {
      return '登录会话已过期，请重新登录';
    }
    if (errorMessage.includes('jwt expired') || errorMessage.includes('token expired')) {
      return '登录凭证已过期，请重新登录';
    }
    if (errorMessage.includes('refresh token expired')) {
      return '登录会话已过期，请重新登录';
    }
    if (errorMessage.includes('auth provider configuration')) {
      return '认证服务配置错误，请联系管理员';
    }
    
    // 数据库相关错误
    if (errorMessage.includes('database error') || errorMessage.includes('postgres error')) {
      return '数据库操作失败，请稍后重试';
    }
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
      return '该记录已存在，请勿重复操作';
    }
    
    // 验证码相关错误
    if (errorMessage.includes('captcha protection')) {
      if (errorMessage.includes('invalid-input-response')) {
        return '验证码错误，请重新验证';
      }
      return '验证码验证失败，请重试';
    }
    
    // 其他错误
    return error.message || '发生未知错误，请重试';
  };

  // 更新用户在线状态的辅助函数
  const updateOnlineStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
    try {
      // 获取当前登录用户，确保只有当前登录用户才能更新自己的状态
      const userResult = await supabase.auth.getUser();
      if (userResult.error) {
        // 会话可能已过期，忽略状态更新
        if (process.env.NODE_ENV === 'development') {
          console.debug('Online status update skipped: Session expired or invalid', {
            userId,
            status,
            error: userResult.error.message
          });
        }
        return;
      }
      
      const user = userResult.data.user;
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
      
      const updateResult = await supabase
        .from('profiles')
        .update({
          online_status: status,
          // 使用客户端当前时间，Supabase会自动转换为PostgreSQL时间格式
          last_seen: new Date()
        })
        .eq('id', userId);
      if (updateResult.error) {
        // 静默处理错误，仅在开发环境下记录详细日志
        if (process.env.NODE_ENV === 'development') {
          console.debug('Online status update info:', {
            userId,
            status,
            error: updateResult.error.message || 'Unknown error'
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
    
    // 会话自动刷新相关变量
    let sessionRefreshInterval: NodeJS.Timeout | null = null;
    const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟刷新一次会话
    
    // 获取完整用户资料（包括profile表中的信息）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCompleteUserProfile = async (authUser: any | null) => {
      if (!authUser) return null;
      
      try {
        // 从profiles表获取完整用户资料
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Error getting profile:', profileError.message);
          // 即使获取profile失败，也要返回基本用户信息
          return {
            id: authUser.id,
            email: authUser.email || '',
            email_confirmed_at: authUser.email_confirmed_at,
            created_at: authUser.created_at,
            updated_at: authUser.updated_at,
            is_admin: false
          } as User;
        }
        
        // 返回完整的用户资料
        return {
          id: authUser.id,
          email: authUser.email || '',
          email_confirmed_at: authUser.email_confirmed_at,
          created_at: authUser.created_at,
          updated_at: authUser.updated_at,
          username: profileData?.username,
          display_name: profileData?.display_name,
          avatar_url: profileData?.avatar_url || null,
          is_admin: profileData?.is_admin || false
        } as User;
      } catch (error) {
        console.error('Error getting complete user profile:', error);
        // 即使获取profile失败，也要返回基本用户信息
        return {
          id: authUser.id,
          email: authUser.email || '',
          email_confirmed_at: authUser.email_confirmed_at,
          created_at: authUser.created_at,
          updated_at: authUser.updated_at,
          is_admin: false
        } as User;
      }
    };
    
    // 刷新会话
    const refreshSession = async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Error refreshing session:', error);
          // 会话刷新失败，可能需要重新登录
          await supabase.auth.signOut();
          if (currentUserId) {
            updateOnlineStatus(currentUserId, 'offline');
            currentUserId = null;
          }
          setState(prev => ({ ...prev, user: null, loading: false }));
        } else {
          console.debug('Session refreshed successfully');
        }
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
    };
    
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        
        if (getUserError) {
          console.error('Error getting user:', getUserError);
          // 处理会话缺失错误，这是正常情况，可能是用户切换了账户
          if (getUserError.message === 'Auth session missing!' || getUserError.name === 'AuthSessionMissingError') {
            isAuthChecked = true;
            setState(prev => ({ ...prev, user: null, loading: false }));
            // 取消消息订阅
            globalMessageService.unsubscribe();
            return;
          }
          // 其他错误同样设置为未登录状态
          isAuthChecked = true;
          setState(prev => ({ ...prev, user: null, loading: false }));
          // 取消消息订阅
          globalMessageService.unsubscribe();
          return;
        }
        
        if (user) {
          // 用户已登录，设置在线状态（异步，不阻塞主流程）
          updateOnlineStatus(user.id, 'online').catch(console.error);
          // 保存userId到闭包变量
          currentUserId = user.id;
          
          // 初始化全局消息服务
          globalMessageService.init(user.id);
          
          // 获取会话信息，检查会话是否即将过期
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              // 启动会话刷新定时器
              if (sessionRefreshInterval) {
                clearInterval(sessionRefreshInterval);
              }
              sessionRefreshInterval = setInterval(refreshSession, SESSION_REFRESH_INTERVAL);
            }
          } catch (sessionError) {
            console.error('Error getting session:', sessionError);
            // 会话获取失败，不影响主流程
          }
        }
        
        // 获取完整用户资料
        const completeUser = await getCompleteUserProfile(user);
        
        isAuthChecked = true;
        setState(prev => ({
          ...prev,
          user: completeUser,
          loading: false
        }));
      } catch (error) {
        console.error('Error checking user:', error);
        // 处理会话相关的异常，这不是致命错误
        if (error instanceof Error && (
          error.message === 'Auth session missing!' ||
          error.name === 'AuthSessionMissingError' ||
          error.message.includes('Session not found')
        )) {
          isAuthChecked = true;
          setState(prev => ({ ...prev, user: null, loading: false }));
        } else {
          isAuthChecked = true;
          setState(prev => ({ ...prev, user: null, loading: false, error: 'Failed to check user' }));
        }
        // 取消消息订阅
        globalMessageService.unsubscribe();
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // 用户登录或会话恢复，设置在线状态
        updateOnlineStatus(session.user.id, 'online');
        // 保存userId到闭包变量
        currentUserId = session.user.id;
        
        // 初始化全局消息服务
        globalMessageService.init(session.user.id);
        
        // 获取完整用户资料
        const completeUser = await getCompleteUserProfile(session.user);
        
        // 启动会话刷新定时器
        if (sessionRefreshInterval) {
          clearInterval(sessionRefreshInterval);
        }
        sessionRefreshInterval = setInterval(refreshSession, SESSION_REFRESH_INTERVAL);
        
        // 只有当认证检查已完成或会话存在时，才更新状态并设置loading为false
        // 这避免了在checkUser完成前，onAuthStateChange触发导致的状态闪烁
        if (isAuthChecked || session?.user) {
          setState(prev => ({
            ...prev,
            user: completeUser,
            loading: false,
          }));
        }
      } else if (event === 'SIGNED_OUT') {
        // 用户退出登录或会话失效，设置离线状态
        // 使用闭包变量中的userId，而不是state.user
        if (currentUserId) {
          updateOnlineStatus(currentUserId, 'offline');
          // 清空闭包变量
          currentUserId = null;
        }
        
        // 清除会话刷新定时器
        if (sessionRefreshInterval) {
          clearInterval(sessionRefreshInterval);
          sessionRefreshInterval = null;
        }
        
        // 取消消息订阅
        globalMessageService.unsubscribe();
        
        // 更新状态为未登录
        setState(prev => ({
          ...prev,
          user: null,
          loading: false,
        }));
      }
    });

    // 监听页面关闭或刷新事件，设置离线状态
    const handleBeforeUnload = () => {
      // 使用闭包变量中的userId
      if (currentUserId) {
        const userId = currentUserId;
        // 优先使用sendBeacon，它是专门为页面卸载场景设计的
        try {
          const formData = new FormData();
          formData.append('userId', userId);
          formData.append('status', 'offline');
          // sendBeacon会返回一个布尔值，表示请求是否被成功加入队列
          const isQueued = navigator.sendBeacon('/api/update-status', formData);
          if (!isQueued) {
            // 如果sendBeacon失败，尝试使用fetch作为备选
            fetch('/api/update-status', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId,
                status: 'offline'
              }),
              keepalive: true // 确保请求在页面关闭时仍能完成
            }).catch(() => {
              // 忽略fetch失败，因为页面正在卸载
            });
          }
        } catch {
          // 忽略所有错误，因为页面正在卸载
        }
      }
    };

    // 监听页面可见性变化，当页面隐藏时设置为离开，显示时设置为在线
    const handleVisibilityChange = async () => {
      // 使用闭包变量中的userId
      if (currentUserId) {
        const status = document.hidden ? 'away' : 'online';
        await updateOnlineStatus(currentUserId, status);
        
        if (!document.hidden) {
          // 页面重新可见，检查会话状态
          await checkUser();
        }
      }
    };

    // 添加心跳机制，定期更新在线状态
    // 只有当用户实际登录时才运行心跳机制
    const heartbeatInterval = setInterval(async () => {
      try {
        // 每次心跳都获取最新的登录用户信息，确保只更新当前登录用户的状态
        const userResult = await supabase.auth.getUser();
        
        if (userResult.error) {
          // 会话可能已过期，检查是否是正常的会话缺失错误
          if (userResult.error.message === 'Auth session missing!' || userResult.error.name === 'AuthSessionMissingError') {
            if (currentUserId) {
              // 尝试更新离线状态，但不处理错误
              await updateOnlineStatus(currentUserId, 'offline').catch(() => {
                // 忽略更新错误
              });
              currentUserId = null;
            }
            if (sessionRefreshInterval) {
              clearInterval(sessionRefreshInterval);
              sessionRefreshInterval = null;
            }
            return;
          }
          // 其他错误也按同样的方式处理
          if (currentUserId) {
            await updateOnlineStatus(currentUserId, 'offline').catch(() => {
              // 忽略更新错误
            });
            currentUserId = null;
          }
          if (sessionRefreshInterval) {
            clearInterval(sessionRefreshInterval);
            sessionRefreshInterval = null;
          }
          return;
        }
        
        const user = userResult.data.user;
        if (user) {
          // 只更新当前登录用户的状态
          await updateOnlineStatus(user.id, 'online');
          // 更新闭包变量中的userId，确保其他地方也使用正确的userId
          currentUserId = user.id;
        } else {
          // 如果没有登录用户，清空闭包变量和定时器
          if (currentUserId) {
            await updateOnlineStatus(currentUserId, 'offline').catch(() => {
              // 忽略更新错误
            });
            currentUserId = null;
          }
          if (sessionRefreshInterval) {
            clearInterval(sessionRefreshInterval);
            sessionRefreshInterval = null;
          }
        }
      } catch (error) {
        // 忽略心跳更新失败，这可能是网络问题或用户已离线
        // 仅在开发环境下记录调试信息
        if (process.env.NODE_ENV === 'development') {
          if (error instanceof Error) {
            console.debug('Heartbeat update info:', {
              error: error.message
            });
          } else {
            console.debug('Heartbeat update info:', {
              error: 'Non-error object caught'
            });
          }
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
      
      // 清除会话刷新定时器
      if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
      }
      
      // 组件卸载时也设置为离线
      // 使用闭包变量中的userId
      if (currentUserId) {
        const userId = currentUserId;
        // 优先使用sendBeacon，它是专门为页面卸载场景设计的
        try {
          const formData = new FormData();
          formData.append('userId', userId);
          formData.append('status', 'offline');
          // sendBeacon会返回一个布尔值，表示请求是否被成功加入队列
          const isQueued = navigator.sendBeacon('/api/update-status', formData);
          if (!isQueued) {
            // 如果sendBeacon失败，尝试使用fetch作为备选
            fetch('/api/update-status', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId,
                status: 'offline'
              }),
              keepalive: true // 确保请求在页面关闭时仍能完成
            }).catch(() => {
              // 忽略fetch失败，因为组件正在卸载
            });
          }
        } catch {
          // 忽略所有错误，因为组件正在卸载
        }
      }
    };
  }, []);

  const register = async (email: string, password: string, captchaToken?: string) => {
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
      // 使用应用URL配置，不区分环境
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/verify-email` : `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`;
      
      const signupResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            signup_timestamp: new Date().toISOString()
          },
          captchaToken
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

  // 获取客户端IP地址
  const getClientIp = async (): Promise<string> => {
    try {
      const response = await fetch('/api/get-ip');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      console.error('Failed to get client IP:', error);
      return 'unknown';
    }
  };

  // 记录登录尝试
  const logLoginAttempt = async (email: string, ipAddress: string, successful: boolean, failureReason?: string) => {
    try {
      await supabase.from('login_attempts').insert({
        email,
        ip_address: ipAddress,
        successful,
        failure_reason: failureReason
      });
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  };

  const login = async (email: string, password: string, captchaToken?: string, isAdminLogin = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // 1. 检查登录尝试限制
      const { data: attemptCheck, error: checkError } = await supabase
        .rpc('check_login_attempts', { 
          p_email: email, 
          p_ip_address: 'unknown'
        });
      
      if (checkError) {
        console.error('Error checking login attempts:', checkError);
      } else if (attemptCheck && attemptCheck.is_locked) {
        const lockTimeSeconds = Math.ceil(attemptCheck.lock_time_remaining.seconds || 0);
        const minutes = Math.floor(lockTimeSeconds / 60);
        const seconds = lockTimeSeconds % 60;
        const lockTimeMessage = `${minutes}分${seconds}秒`;
        
        throw new Error(`登录失败次数过多，请在${lockTimeMessage}后再试`);
      }
      
      // 2. 尝试登录
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken
        }
      });

      if (signInError) {
        throw signInError;
      }

      // 3. 登录成功后，获取IP地址
      let ipAddress = 'unknown';
      try {
        ipAddress = await getClientIp();
      } catch (error) {
        console.error('Failed to get client IP after login:', error);
      }

      // 4. 检查用户邮箱是否已验证
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        logLoginAttempt(email, ipAddress, false, 'Email not verified').catch(console.error);
        throw new Error('请先验证您的邮箱，然后再登录');
      }
      
      // 5. 获取完整用户Profile信息
      let completeUser: User | null = null;
      if (data.user) {
        const userId = data.user.id;
        const userEmail = data.user.email;
        let isAdmin = false;
        
        if (userEmail) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          
          if (profileError) {
            console.error('Error checking profile:', profileError?.message || 'Unknown error');
          } else if (profileData) {
            isAdmin = profileData.is_admin || false;
            
            completeUser = {
              id: data.user.id,
              email: data.user.email || '',
              email_confirmed_at: data.user.email_confirmed_at,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at,
              is_admin: isAdmin,
              username: profileData.username,
              display_name: profileData.display_name,
              avatar_url: profileData.avatar_url || null
            } as User;
          } else {
            const username = userEmail.split('@')[0];
            
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: userEmail,
                username,
                display_name: username,
                is_admin: false
              });
            
            if (createError) {
              console.error('Error creating profile:', createError.message);
            } else {
              try {
                await supabase
                  .from('user_roles')
                  .insert({
                    user_id: userId,
                    role_id: 'role_user'
                  });
              } catch (error) {
                console.error('Error assigning default role:', (error as Error).message);
              }
              
              completeUser = {
                id: data.user.id,
                email: data.user.email || '',
                email_confirmed_at: data.user.email_confirmed_at,
                created_at: data.user.created_at,
                updated_at: data.user.updated_at,
                is_admin: false,
                username,
                display_name: username,
                avatar_url: undefined
              } as User;
            }
          }
          
          // 6. 管理员权限检查
          if (isAdminLogin && !isAdmin) {
            await supabase.auth.signOut();
            logLoginAttempt(email, ipAddress, false, 'Not an admin user').catch(console.error);
            throw new Error('您不是管理员，无法登录管理员后台');
          }
        } else {
          if (isAdminLogin) {
            await supabase.auth.signOut();
            logLoginAttempt(email, ipAddress, false, 'No email for admin login').catch(console.error);
            throw new Error('您不是管理员，无法登录管理员后台');
          } else {
            completeUser = {
              id: data.user.id,
              email: data.user.email || '',
              email_confirmed_at: data.user.email_confirmed_at,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at,
              is_admin: false
            } as User;
          }
        }
        
        logLoginAttempt(email, ipAddress, true).catch(console.error);
        updateOnlineStatus(userId, 'online').catch(console.error);
      }
      
      // 7. 更新状态，完成登录
      setState(prev => ({
        ...prev,
        user: completeUser,
        loading: false
      }));
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('An unknown error occurred');
      
      const errorMessage = translateError(errorObj);
      setState(prev => ({
        ...prev,
        loading: false, 
        error: errorMessage 
      }));
      
      throw new Error(errorMessage);
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
      // 使用应用URL配置，不区分环境
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/verify-email` : `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`;
      
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
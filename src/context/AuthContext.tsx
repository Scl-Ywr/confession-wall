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

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
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
        setState(prev => ({ ...prev, loading: false, error: 'Failed to check user' }));
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
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
    });

    return () => {
      authListener.subscription.unsubscribe();
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

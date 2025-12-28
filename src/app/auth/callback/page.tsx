'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface AuthCallbackState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<AuthCallbackState>({
    loading: true,
    error: null,
    success: false,
  });

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 获取URL中的错误信息
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('OAuth callback error:', error, errorDescription);
          
          // 处理不同的错误类型
          let errorMessage = '登录失败，请重试';
          
          switch (error) {
            case 'access_denied':
              errorMessage = '您取消了授权登录';
              break;
            case 'invalid_request':
              errorMessage = '请求参数无效';
              break;
            case 'server_error':
              errorMessage = '服务器错误，请稍后重试';
              break;
            case 'temporarily_unavailable':
              errorMessage = '服务暂时不可用，请稍后重试';
              break;
            default:
              errorMessage = errorDescription || '登录失败，请重试';
          }
          
          setState({
            loading: false,
            error: errorMessage,
            success: false,
          });
          
          // 3秒后跳转到登录页
          setTimeout(() => {
            router.push('/auth/login?error=' + encodeURIComponent(errorMessage));
          }, 3000);
          return;
        }

        // 处理 OAuth 回调
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (data.session) {
          console.log('OAuth login successful:', {
            userId: data.session.user.id,
            provider: data.session.user.app_metadata?.provider,
            email: data.session.user.email,
          });

          // 检查是否是OAuth用户并设置元数据
          const isOAuthUser = data.session.user.app_metadata?.provider !== 'email';
          
          if (isOAuthUser) {
            // 更新用户元数据，标记为OAuth用户
            await supabase.auth.updateUser({
              data: {
                is_oauth_user: true,
                provider: data.session.user.app_metadata?.provider,
                login_method: 'oauth',
              }
            });
          }

          // 检查用户profile是否存在，如果不存在则创建
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error checking profile:', profileError);
          } else if (!profileData) {
            // 创建用户profile
            const provider = data.session.user.app_metadata?.provider;
            const email = data.session.user.email || '';
            const username = email.split('@')[0];
            
            // 获取用户头像和显示名称
            let avatarUrl = data.session.user.user_metadata?.avatar_url || null;
            let displayName = data.session.user.user_metadata?.full_name || 
                             data.session.user.user_metadata?.name || 
                             username;

            // 根据不同提供商获取特定的用户信息
            if (provider === 'github') {
              avatarUrl = data.session.user.user_metadata?.avatar_url || avatarUrl;
              displayName = data.session.user.user_metadata?.full_name || 
                           data.session.user.user_metadata?.login || 
                           displayName;
            } else if (provider === 'google') {
              avatarUrl = data.session.user.user_metadata?.avatar_url || avatarUrl;
              displayName = data.session.user.user_metadata?.full_name || 
                           data.session.user.user_metadata?.name || 
                           displayName;
            }

            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: data.session.user.id,
                email: email,
                username: username,
                display_name: displayName,
                avatar_url: avatarUrl,
                is_admin: false, // OAuth用户默认非管理员
                email_confirmed_at: data.session.user.email_confirmed_at,
                created_at: data.session.user.created_at,
                updated_at: new Date().toISOString(),
              });

            if (createError) {
              console.error('Error creating profile:', createError);
            } else {
              // 为新用户分配默认角色
              try {
                await supabase
                  .from('user_roles')
                  .insert({
                    user_id: data.session.user.id,
                    role_id: 'role_user' // 默认普通用户角色
                  });
              } catch (roleError) {
                console.error('Error assigning default role:', roleError);
              }
            }
          }

          setState({
            loading: false,
            error: null,
            success: true,
          });

          // 登录成功，跳转到首页并显示欢迎信息
          router.push('/?welcome=true&provider=' + (data.session.user.app_metadata?.provider || 'unknown'));
        } else {
          // 没有找到会话，可能是用户取消了登录
          setState({
            loading: false,
            error: '登录已取消',
            success: false,
          });
          
          setTimeout(() => {
            router.push('/auth/login?cancelled=true');
          }, 2000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        
        setState({
          loading: false,
          error: '登录处理失败：' + errorMessage,
          success: false,
        });
        
        setTimeout(() => {
          router.push('/auth/login?error=' + encodeURIComponent('登录处理失败：' + errorMessage));
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 animate-pulse">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            正在验证登录...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            请稍候，我们正在处理您的登录信息
          </p>
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 dark:from-gray-900 dark:via-red-900/20 dark:to-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto h-16 w-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            登录失败
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {state.error}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            正在跳转到登录页面...
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
          >
            立即返回登录
          </button>
        </div>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-green-900/20 dark:to-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto h-16 w-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            登录成功！
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            欢迎使用表白墙应用，正在跳转到首页...
          </p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
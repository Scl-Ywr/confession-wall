'use client';

import React from 'react';
import { supabase } from '@/lib/supabase/client';

type OAuthProvider = 'github' | 'google' | 'facebook';

interface SocialLoginButtonProps {
  provider: OAuthProvider;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  provider,
  label,
  icon,
  disabled = false,
  loading: externalLoading = false,
}) => {
  const [internalLoading, setInternalLoading] = React.useState(false);
  
  // Use external loading state if provided, otherwise use internal state
  const loading = externalLoading || internalLoading;
  
  const handleClick = async () => {
    if (disabled || loading) {
      return;
    }
    
    try {
      // Set loading state immediately when button is clicked
      setInternalLoading(true);
      
      // 动态获取当前 origin，确保回调 URL 正确
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      
      // 检查当前会话状态
      await supabase.auth.getSession();
      
      // 使用 Supabase 的原生 OAuth 功能
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${currentOrigin}/auth/callback`,
          queryParams: provider === 'google' 
            ? { access_type: 'offline', prompt: 'consent' }
            : undefined,
        }
      });

      if (oauthError) {
        let errorMessage = '登录失败，请重试';
        
        if (oauthError.message.includes('access_denied')) {
          errorMessage = '您取消了授权登录';
        } else if (oauthError.message.includes('server_error')) {
          errorMessage = '服务器错误，请稍后重试';
        } else if (oauthError.message.includes('temporarily_unavailable')) {
          errorMessage = '服务暂时不可用，请稍后重试';
        }
        
        alert(errorMessage);
        // Reset loading state if there's an error
        setInternalLoading(false);
      }
    } catch {
      alert('登录过程中发生未知错误，请重试');
      // Reset loading state if there's an error
      setInternalLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 backdrop-blur-sm ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        {loading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          icon
        )}
      </span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {loading ? '登录中...' : `使用 ${label} 登录`}
      </span>
    </button>
  );
};

interface SocialLoginButtonsProps {
  disabled?: boolean;
  loading?: boolean;
  loadingProvider?: OAuthProvider | null;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  disabled = false,
  loading = false,
  loadingProvider = null,
}) => {
  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-transparent text-gray-500 dark:text-gray-400">
            或使用第三方账号登录
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <SocialLoginButton
          provider="google"
          label="Google"
          disabled={disabled}
          loading={loading && loadingProvider === 'google'}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          }
        />

        <SocialLoginButton
          provider="github"
          label="GitHub"
          disabled={disabled}
          loading={loading && loadingProvider === 'github'}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          }
        />
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          登录即表示您同意我们的{' '}
          <a href="/terms" className="text-primary-600 hover:text-primary-500 underline">
            服务条款
          </a>{' '}
          和{' '}
          <a href="/privacy" className="text-primary-600 hover:text-primary-500 underline">
            隐私政策
          </a>
        </p>
      </div>
    </div>
  );
};

export default SocialLoginButtons;
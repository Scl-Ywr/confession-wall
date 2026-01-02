'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Turnstile type definitions
declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        'timeout-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
        retry?: 'auto' | 'never';
        'retry-interval'?: number;
        'refresh-expired'?: 'auto' | 'manual' | 'never';
      }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      ready: (callback: () => void) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  onTimeout?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  testMode?: boolean;
}

const Turnstile: React.FC<TurnstileProps> = ({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  onTimeout,
  theme = 'auto',
  size = 'normal',
  testMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isRenderingRef = useRef(false);
  const mountedRef = useRef(true);
  const scriptLoadedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 稳定的回调引用
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
    onTimeoutRef.current = onTimeout;
  }, [onSuccess, onError, onExpire, onTimeout]);

  // 渲染 widget 的函数
  const renderWidget = useCallback(() => {
    if (!containerRef.current || isRenderingRef.current || !mountedRef.current) {
      return;
    }

    if (!window.turnstile) {
      console.warn('Turnstile not ready yet');
      return;
    }

    // 清理已存在的 widget
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        console.warn('Failed to remove existing widget:', e);
      }
      widgetIdRef.current = null;
    }

    isRenderingRef.current = true;

    try {
      // 清空容器
      containerRef.current.innerHTML = '';

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          if (mountedRef.current) {
            setError(null);
            setIsLoading(false);
            onSuccessRef.current(token);
          }
        },
        'error-callback': () => {
          if (mountedRef.current) {
            setError('验证失败，请点击重试');
            setIsLoading(false);
            onErrorRef.current?.();
          }
        },
        'expired-callback': () => {
          if (mountedRef.current) {
            setError(null);
            setIsLoading(true);
            onExpireRef.current?.();
            // 自动重置
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch (e) {
                console.warn('Failed to reset widget:', e);
              }
            }
          }
        },
        'timeout-callback': () => {
          if (mountedRef.current) {
            setError('验证超时，正在重试...');
            setIsLoading(true);
            onTimeoutRef.current?.();
            // 自动重置
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch (e) {
                console.warn('Failed to reset widget:', e);
              }
            }
          }
        },
        theme,
        size,
        retry: 'auto',
        'retry-interval': 3000,
        'refresh-expired': 'auto',
      });

      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Turnstile render error:', err);
      setError(err instanceof Error ? err.message : '无法加载验证组件');
      setIsLoading(false);
      onErrorRef.current?.();
    } finally {
      isRenderingRef.current = false;
    }
  }, [siteKey, theme, size]);

  // 加载脚本
  useEffect(() => {
    if (testMode) {
      setIsLoading(false);
      onSuccessRef.current('test_token_' + Math.random().toString(36).substring(2));
      return;
    }

    mountedRef.current = true;

    // 检查脚本是否已加载
    const checkAndRender = () => {
      if (window.turnstile) {
        scriptLoadedRef.current = true;
        renderWidget();
      }
    };

    // 如果 turnstile 已经可用，直接渲染
    if (window.turnstile) {
      scriptLoadedRef.current = true;
      // 使用 setTimeout 确保 DOM 已准备好
      setTimeout(renderWidget, 0);
    } else {
      // 设置全局回调，等待脚本加载完成
      const existingCallback = window.onTurnstileLoad;
      window.onTurnstileLoad = () => {
        existingCallback?.();
        if (mountedRef.current) {
          checkAndRender();
        }
      };

      // 检查脚本是否已存在
      const existingScript = document.querySelector('script[src*="turnstile"]');
      if (!existingScript) {
        // 动态加载脚本
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
        script.async = true;
        document.head.appendChild(script);
      } else {
        // 脚本已存在，轮询等待加载完成
        const pollInterval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(pollInterval);
            if (mountedRef.current) {
              checkAndRender();
            }
          }
        }, 100);

        // 10秒超时
        setTimeout(() => {
          clearInterval(pollInterval);
          if (!window.turnstile && mountedRef.current) {
            setError('验证组件加载超时，请刷新页面');
            setIsLoading(false);
          }
        }, 10000);
      }
    }

    return () => {
      mountedRef.current = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          console.warn('Failed to remove widget on cleanup:', e);
        }
        widgetIdRef.current = null;
      }
      isRenderingRef.current = false;
    };
  }, [testMode, renderWidget]);

  // 手动重试
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // 重置失败，重新渲染
        renderWidget();
      }
    } else {
      renderWidget();
    }
  }, [renderWidget]);

  if (testMode) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
          ✓ 测试模式 - 验证已跳过
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        ref={containerRef} 
        className="w-full flex justify-center min-h-[65px]" 
        id="turnstile-container"
      />
      {isLoading && !error && (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin"></div>
          正在加载验证...
        </div>
      )}
      {error && (
        <div className="text-sm text-red-500 text-center">
          <p>{error}</p>
          <button 
            type="button"
            onClick={handleRetry}
            className="mt-2 px-3 py-1 text-xs bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
          >
            点击重试
          </button>
        </div>
      )}
    </div>
  );
};

export default Turnstile;
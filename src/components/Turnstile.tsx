'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

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
  resetSignal?: number | string;
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
  resetSignal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isRenderingRef = useRef(false);
  const mountedRef = useRef(true);
  const scriptLoadedRef = useRef(false);
  const lastResetSignalRef = useRef(resetSignal);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedSize, setResolvedSize] = useState<'normal' | 'compact'>(size);

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

  useEffect(() => {
    const resolveSize = () => {
      if (size === 'compact') {
        setResolvedSize('compact');
        return;
      }
      setResolvedSize(window.innerWidth < 380 ? 'compact' : 'normal');
    };

    resolveSize();
    window.addEventListener('resize', resolveSize);
    return () => window.removeEventListener('resize', resolveSize);
  }, [size]);

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
            console.error('Turnstile error callback triggered. Widget ID:', widgetIdRef.current);
            onErrorRef.current?.();
            if (widgetIdRef.current && window.turnstile) {
              try {
                console.log('Automatically resetting Turnstile widget...');
                window.turnstile.reset(widgetIdRef.current);
                setError('验证已刷新，请重新完成验证');
                setIsLoading(false);
              } catch (e) {
                console.warn('Failed to reset widget automatically, showing error:', e);
                setError('验证失败，请检查网络连接或点击重试');
                setIsLoading(false);
              }
            } else {
              setError('验证失败，请点击重试');
              setIsLoading(false);
            }
          }
        },
        'expired-callback': () => {
          if (mountedRef.current) {
            console.log('Turnstile expired callback triggered');
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
            console.warn('Turnstile timeout callback triggered');
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
        size: resolvedSize,
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
  }, [siteKey, theme, resolvedSize]);

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
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
        script.async = true;
        script.defer = true;
        // 添加错误处理
        script.onerror = () => {
          if (mountedRef.current) {
            console.error('Turnstile script failed to load');
            setError('验证组件加载失败，请检查网络连接或刷新页面');
            setIsLoading(false);
            onErrorRef.current?.();
          }
        };
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
            onErrorRef.current?.();
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
    onErrorRef.current?.();
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

  useEffect(() => {
    if (lastResetSignalRef.current === resetSignal) {
      return;
    }

    lastResetSignalRef.current = resetSignal;
    if (resetSignal === undefined) {
      return;
    }

    setError(null);
    setIsLoading(true);
    onExpireRef.current?.();

    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setIsLoading(false);
      } catch (error) {
        console.warn('Failed to reset Turnstile from resetSignal:', error);
        renderWidget();
      }
    } else {
      renderWidget();
    }
  }, [resetSignal, renderWidget]);

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
        className="flex min-h-[65px] w-full justify-center overflow-visible rounded-2xl"
      />
      {isLoading && !error && (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-rose-500"></div>
          正在加载验证...
        </div>
      )}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm p-3 rounded-xl text-sm bg-red-50/90 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">验证失败</p>
          </div>
          <p className="text-center text-sm mb-3 opacity-90">{error}</p>
          <div className="flex justify-center">
            <motion.button 
              type="button"
              onClick={handleRetry}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100/80 dark:bg-red-800/50 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-200/80 dark:hover:bg-red-700/50 transition-colors duration-200 shadow-sm"
            >
              点击重试
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Turnstile;

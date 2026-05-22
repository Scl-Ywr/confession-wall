'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const FALLBACK_TOKENS = [
  'fallback_token_001',
  'fallback_token_002',
  'fallback_token_003',
  'fallback_token_004',
  'fallback_token_005',
];

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

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: (error: string) => void;
        'expired-callback'?: (token: string) => void;
        'timeout-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
        retry?: 'auto' | 'never';
        'retry-interval'?: number;
        'refresh-expired'?: 'auto' | 'manual' | 'never';
      }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const scriptLoadedRef = useRef(false);
  const mountedRef = useRef(true);

  const handleSuccess = useCallback((token: string) => {
    console.log('Turnstile verification success:', token?.substring(0, 20) + '...');
    setError(null);
    setIsLoading(false);
    onSuccess(token);
  }, [onSuccess]);

  const handleError = useCallback((errorCode: string) => {
    console.error('Turnstile error:', errorCode);
    setRetryCount(prev => prev + 1);
    onError?.();
  }, [onError]);

  const handleExpire = useCallback((token: string) => {
    console.log('Turnstile expired');
    setError(null);
    setIsLoading(true);
    onExpire?.();
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (e) {
        console.warn('Failed to reset widget:', e);
      }
    }
  }, [onExpire]);

  const handleTimeout = useCallback(() => {
    console.warn('Turnstile timeout');
    setRetryCount(prev => prev + 1);
    setError('验证超时，正在重试...');
    onTimeout?.();
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (e) {
        console.warn('Failed to reset widget:', e);
      }
    }
  }, [onTimeout]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !mountedRef.current) {
      return;
    }

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        console.warn('Failed to remove existing widget:', e);
      }
      widgetIdRef.current = null;
    }

    try {
      containerRef.current.innerHTML = '';
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: handleSuccess,
        'error-callback': handleError,
        'expired-callback': handleExpire,
        'timeout-callback': handleTimeout,
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
      onError?.();
    }
  }, [siteKey, theme, size, handleSuccess, handleError, handleExpire, handleTimeout, onError]);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRetryCount(0);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (e) {
        console.warn('Failed to reset widget, re-rendering:', e);
        renderWidget();
      }
    } else {
      renderWidget();
    }
    onError?.();
  }, [renderWidget, onError]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (testMode) {
      setIsLoading(false);
      onSuccess('test_token_' + Math.random().toString(36).substring(2));
      return;
    }

    let scriptElement: HTMLScriptElement | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let scriptErrorOccurred = false;

    const loadScriptWithRetry = (attempt: number = 1) => {
      if (!mountedRef.current) return;

      const existingScript = document.querySelector('script[src*="turnstile"]');
      if (existingScript) {
        scriptElement = existingScript as HTMLScriptElement;
        startPolling();
        return;
      }

      scriptElement = document.createElement('script');
      scriptElement.src = 'https://challenges.cloudflare.com/turnstile/v1/api.js?render=explicit&onload=onTurnstileLoad';
      scriptElement.async = true;
      scriptElement.defer = true;

      scriptElement.onerror = () => {
        if (!mountedRef.current) return;
        scriptErrorOccurred = true;
        console.error(`Turnstile script failed to load (attempt ${attempt})`);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          setTimeout(() => {
            if (scriptElement && scriptElement.parentNode) {
              scriptElement.parentNode.removeChild(scriptElement);
            }
            loadScriptWithRetry(attempt + 1);
          }, delay);
        } else {
          handleScriptLoadFailure();
        }
      };

      scriptElement.onload = () => {
        if (mountedRef.current) {
          scriptLoadedRef.current = true;
          renderWidget();
        }
      };

      document.head.appendChild(scriptElement);
      startPolling();
    };

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);

      pollInterval = setInterval(() => {
        if (window.turnstile) {
          if (pollInterval) clearInterval(pollInterval);
          if (mountedRef.current) {
            scriptLoadedRef.current = true;
            renderWidget();
          }
        }
      }, 100);

      timeoutId = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        if (!window.turnstile && mountedRef.current && !scriptErrorOccurred) {
          console.error('Turnstile script timeout');
          handleScriptLoadFailure();
        }
      }, 10000);
    };

    const handleScriptLoadFailure = () => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.log('Using fallback token in development mode');
        const fallbackToken = FALLBACK_TOKENS[Math.floor(Math.random() * FALLBACK_TOKENS.length)];
        setError(null);
        setIsLoading(false);
        onSuccess(fallbackToken);
      } else {
        setError('验证服务暂时不可用，请稍后重试或检查网络连接');
        setIsLoading(false);
      }
    };

    const existingCallback = window.onTurnstileLoad;
    window.onTurnstileLoad = () => {
      existingCallback?.();
      if (mountedRef.current && window.turnstile) {
        scriptLoadedRef.current = true;
        renderWidget();
      }
    };

    if (window.turnstile) {
      scriptLoadedRef.current = true;
      setTimeout(renderWidget, 0);
    } else {
      loadScriptWithRetry();
    }

    return () => {
      mountedRef.current = false;
      if (scriptElement && scriptElement.parentNode) {
        try {
          scriptElement.parentNode.removeChild(scriptElement);
        } catch (e) {
          console.warn('Failed to remove script element:', e);
        }
      }
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          console.warn('Failed to remove widget on cleanup:', e);
        }
        widgetIdRef.current = null;
      }
    };
  }, [testMode, onSuccess, renderWidget]);

  useEffect(() => {
    if (retryCount >= maxRetries && !error) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.log('Using fallback token after multiple retries');
        const fallbackToken = FALLBACK_TOKENS[Math.floor(Math.random() * FALLBACK_TOKENS.length)];
        setError(null);
        setIsLoading(false);
        onSuccess(fallbackToken);
      } else {
        setError('验证服务暂时不可用，请稍后重试');
        setIsLoading(false);
      }
    }
  }, [retryCount, maxRetries, error, onSuccess]);

  useEffect(() => {
    if (resetSignal !== undefined) {
      setError(null);
      setIsLoading(true);
      setRetryCount(0);
      onExpire?.();
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (e) {
          console.warn('Failed to reset from signal:', e);
          renderWidget();
        }
      }
    }
  }, [resetSignal, onExpire, renderWidget]);

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
          className="w-full max-w-sm"
        >
          <div className="p-3 rounded-xl text-sm bg-red-50/90 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 shadow-sm">
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
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Turnstile;

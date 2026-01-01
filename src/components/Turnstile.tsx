'use client';

import React, { useEffect, useRef, useState } from 'react';

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
      }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
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
  testMode = false, // 默认关闭testMode，显示真实验证组件
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isRenderingRef = useRef(false);
  const mountedRef = useRef(true);
  const hasRenderedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Test mode: Directly call onSuccess with a test token
  useEffect(() => {
    if (testMode) {
      // Simulate successful verification immediately
      setIsLoading(false);
      // Call onSuccess with a test token
      onSuccess('test_token_' + Math.random().toString(36).substring(2));
      return;
    }
  }, [testMode, onSuccess]);

  useEffect(() => {
    // Skip real Turnstile rendering in test mode
    if (testMode) {
      return;
    }

    mountedRef.current = true;

    // Load Turnstile script if not already loaded
    const loadTurnstileScript = () => {
      return new Promise<void>((resolve, reject) => {
        // If Turnstile is already loaded, resolve immediately
        if (window.turnstile) {
          resolve();
          return;
        }

        // Check if script tag already exists
        if (document.getElementById('cf-turnstile-script')) {
          // Wait for script to load
          const checkInterval = setInterval(() => {
            if (window.turnstile) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          return;
        }

        // Create script tag without onload parameter to avoid potential issues
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;

        // Set up load event listener
        script.onload = () => {
          clearTimeout(timeout);
          resolve();
        };

        // Set up error event listener
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load Turnstile script'));
        };

        // Set timeout for script loading (10 seconds)
        const timeout = setTimeout(() => {
          reject(new Error('Turnstile script loading timeout'));
        }, 10000);

        // Add script to document
        document.head.appendChild(script);
      });
    };

    // Render widget - ONLY ONCE
    const renderWidget = async () => {
      // Prevent multiple renders
      if (!containerRef.current || isRenderingRef.current || !mountedRef.current || hasRenderedRef.current) {
        return;
      }

      isRenderingRef.current = true;

      try {
        // Load Turnstile script
        await loadTurnstileScript();

        if (!mountedRef.current || !containerRef.current || hasRenderedRef.current) {
          return;
        }

        // Clear container to prevent duplicate rendering
        containerRef.current.innerHTML = '';

        // Mark as rendered BEFORE actual render to prevent race conditions
        hasRenderedRef.current = true;

        // Render Turnstile widget - explicitly set size to normal to ensure visible widget
        widgetIdRef.current = window.turnstile!.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            setError(null);
            setIsLoading(false);
            onSuccess(token);
          },
          'error-callback': () => {
            setError('验证失败');
            setIsLoading(false);
            if (onError) onError();
            // DO NOT RETRY - just show error
          },
          'expired-callback': () => {
            setError('验证已过期，请刷新页面重试');
            setIsLoading(false);
            if (onExpire) onExpire();
          },
          'timeout-callback': () => {
            setError('验证超时，请刷新页面重试');
            setIsLoading(false);
            if (onTimeout) onTimeout();
          },
          theme,
          size: 'normal', // 明确设置为normal，确保显示可见的验证组件
        });

        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('Turnstile render error:', err);
        setError(err instanceof Error ? err.message : '无法加载验证组件');
        setIsLoading(false);
        hasRenderedRef.current = false; // Allow retry on next mount

        if (onError) onError();
      } finally {
        isRenderingRef.current = false;
      }
    };

    // Cleanup function
    const cleanup = () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (err) {
          console.warn('Failed to remove Turnstile widget:', err);
        }
        widgetIdRef.current = null;
      }
      isRenderingRef.current = false;
      hasRenderedRef.current = false;
    };

    renderWidget();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [siteKey, onSuccess, onError, onExpire, onTimeout, theme, size, testMode]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} className="w-full flex justify-center min-h-[65px]" />
      {isLoading && !error && (
        <div className="text-sm text-gray-500">正在加载验证...</div>
      )}
      {error && (
        <div className="text-sm text-red-500 text-center">
          <p>{error}</p>
          <p className="text-xs mt-1">如果问题持续，请尝试刷新页面</p>
        </div>
      )}
    </div>
  );
};

export default Turnstile;

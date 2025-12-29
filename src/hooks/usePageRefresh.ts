'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * 页面刷新钩子
 * 在页面重新获得焦点时自动刷新数据
 * 
 * @param refreshCallback 刷新数据的回调函数
 * @param dependencies 依赖数组，当依赖变化时重新设置刷新回调
 * @param options 配置选项
 * @param options.enabled 是否启用刷新机制，默认 true
 * @param options.debounceMs 防抖时间，默认 500ms
 */
export function usePageRefresh(
  refreshCallback: () => Promise<void> | void,
  dependencies: React.DependencyList = [],
  options: {
    enabled?: boolean;
    debounceMs?: number;
  } = {}
) {
  const {
    enabled = true,
    debounceMs = 500
  } = options;

  const refreshCallbackRef = useRef(refreshCallback);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 更新回调引用
  useEffect(() => {
    refreshCallbackRef.current = refreshCallback;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCallback, ...dependencies]);

  // 页面获得焦点时的刷新处理
  const handleRefresh = useCallback(() => {
    if (!enabled) return;

    // 清除之前的防抖定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // 设置新的防抖定时器
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        refreshCallbackRef.current();
      } catch (error) {
        console.error('页面刷新时发生错误:', error);
      }
    }, debounceMs);
  }, [enabled, debounceMs]);

  // 监听页面可见性变化
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleRefresh();
      }
    };

    const handleFocus = () => {
      handleRefresh();
    };

    // 添加事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [handleRefresh, enabled]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, []);

  // 返回刷新方法，可以手动调用
  return {
    refresh: handleRefresh,
    isEnabled: enabled
  };
}

/**
 * 简单的页面刷新钩子，不依赖特定数据
 * @param refreshCallback 刷新回调
 * @param enabled 是否启用，默认 true
 */
export function useSimplePageRefresh(
  refreshCallback: () => Promise<void> | void,
  enabled: boolean = true
) {
  return usePageRefresh(refreshCallback, [], { enabled });
}
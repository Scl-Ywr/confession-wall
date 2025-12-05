'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { Provider as NiceModalProvider } from '@ebay/nice-modal-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 数据5分钟后过期
      retry: 2, // 失败后重试2次
      refetchOnWindowFocus: false, // 窗口聚焦时不自动重取
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NiceModalProvider>
        {children}
      </NiceModalProvider>
      {/* 开发环境才显示React Query DevTools */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      {/* Toast通知组件 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },

        }}
      />
    </QueryClientProvider>
  );
}
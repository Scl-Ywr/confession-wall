'use client';

// 客户端布局组件，处理移动端响应式设计
import { ReactNode, useState } from 'react';
import { AdminSidebar } from './Sidebar';
import { AdminHeader } from './Header';
import { MobileSidebar } from './MobileSidebar';
import { usePageRefresh } from '@/hooks/usePageRefresh';

interface AdminClientLayoutProps {
  children: ReactNode;
}

export function AdminClientLayout({ children }: AdminClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 页面刷新机制 - 当页面重新获得焦点时刷新数据
  // 这里提供一个全局的刷新触发器，子页面可以根据需要监听这个事件
  usePageRefresh(
    () => {
        // 触发自定义事件，让子页面监听并刷新数据
        window.dispatchEvent(new CustomEvent('adminPageRefresh'));
    },
    []
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 桌面端侧边栏 */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 桌面端顶部导航 */}
        <div className="hidden md:block">
          <AdminHeader />
        </div>
        
        {/* 移动端标题栏 */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-300"
          >
            🍔
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            后台管理
          </h1>
          <div className="w-8"></div>
        </div>
        
        {/* 内容区域 */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
      
      {/* 移动端侧边栏 */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}

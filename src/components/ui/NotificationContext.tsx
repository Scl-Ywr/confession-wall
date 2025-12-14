// 通知上下文，管理全局通知
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Notification } from './Notification';

interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (type: NotificationItem['type'], message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 生成唯一ID
  const generateId = () => Math.random().toString(36).substring(2, 10);

  // 显示通知
  const showNotification = (type: NotificationItem['type'], message: string, duration: number = 3000) => {
    const id = generateId();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
  };

  // 显示成功通知
  const showSuccess = (message: string, duration?: number) => {
    showNotification('success', message, duration);
  };

  // 显示错误通知
  const showError = (message: string, duration?: number) => {
    showNotification('error', message, duration);
  };

  // 显示警告通知
  const showWarning = (message: string, duration?: number) => {
    showNotification('warning', message, duration);
  };

  // 显示信息通知
  const showInfo = (message: string, duration?: number) => {
    showNotification('info', message, duration);
  };

  // 关闭通知
  const closeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* 渲染所有通知 */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          isVisible={true}
          onClose={() => closeNotification(notification.id)}
          duration={notification.duration}
        />
      ))}
    </NotificationContext.Provider>
  );
}

// 自定义钩子，用于访问通知上下文
export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
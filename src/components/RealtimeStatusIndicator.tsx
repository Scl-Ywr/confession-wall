'use client';

import { useRealtimeConnection } from '@/context/RealtimeContext';
import { useEffect, useState } from 'react';

export default function RealtimeStatusIndicator() {
  const { isConnected, connectionStatus, connectedChannels, totalChannels } = useRealtimeConnection();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isConnected]);

  if (!isVisible) {
    return null;
  }

  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: '实时连接已建立',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    connecting: {
      color: 'bg-yellow-500',
      text: `正在连接实时服务... (${connectedChannels}/${totalChannels})`,
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    disconnected: {
      color: 'bg-orange-500',
      text: '实时连接已断开，尝试重新连接...',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    error: {
      color: 'bg-red-500',
      text: '实时连接出错，部分功能可能受限',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  };

  const config = statusConfig[connectionStatus];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${config.color} text-white`}
        style={{ minWidth: '200px' }}
      >
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    </div>
  );
}

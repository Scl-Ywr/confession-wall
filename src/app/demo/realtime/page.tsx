'use client';

import { useState } from 'react';
import { useConfessionRealtime, useLikesRealtime, useCommentsRealtime } from '@/hooks/useConfessionRealtime';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';
import { usePrivateChatRealtime, useGroupChatRealtime } from '@/hooks/useChatRealtime';
import { useRealtime } from '@/context/RealtimeContext';
import toast from 'react-hot-toast';

export default function RealtimeDemoPage() {
  const [activeTab, setActiveTab] = useState<'confessions' | 'notifications' | 'chat' | 'status'>('confessions');
  const [events, setEvents] = useState<Array<{ type: string; data: unknown; timestamp: Date }>>([]);

  const {
    connectionStatus: confessionStatus,
    isConnected: confessionConnected,
  } = useConfessionRealtime({
    onNewConfession: (confession) => {
      addEvent('confession:new', confession);
      toast.success('检测到新表白！');
    },
    onUpdateConfession: (confession) => {
      addEvent('confession:update', confession);
    },
    onDeleteConfession: (id) => {
      addEvent('confession:delete', { id });
    },
  });

  const { unreadCount, markAllAsRead } = useNotificationsRealtime({
    userId: 'demo-user',
    onNewNotification: (notification) => {
      addEvent('notification:new', notification);
      toast.success('收到新通知！');
    },
  });

  const { isConnected: chatConnected } = usePrivateChatRealtime({
    currentUserId: 'user1',
    otherUserId: 'user2',
    onNewMessage: (message) => {
      addEvent('chat:message', message);
      toast.success('收到新消息！');
    },
    onMessageDeleted: (messageId) => {
      addEvent('chat:message:delete', { messageId });
    },
  });

  const { isConnected: groupConnected } = useGroupChatRealtime({
    currentUserId: 'user1',
    groupId: 'group1',
    onNewMessage: (message) => {
      addEvent('group:message', message);
    },
    onMemberJoined: (member) => {
      addEvent('group:member:joined', member);
      toast.info('有新成员加入群聊！');
    },
    onMemberLeft: (memberId) => {
      addEvent('group:member:left', { memberId });
    },
  });

  const { isConnected: realtimeConnected, connectionStatus, connectedChannels, totalChannels } = useRealtime();

  const addEvent = (type: string, data: unknown) => {
    setEvents(prev => [
      { type, data, timestamp: new Date() },
      ...prev.slice(0, 99),
    ]);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">实时订阅功能演示</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">表白订阅</h3>
              <p className="text-sm text-blue-600 mt-1">
                状态: {confessionConnected ? '✅ 已连接' : '❌ 未连接'}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">通知订阅</h3>
              <p className="text-sm text-green-600 mt-1">
                未读数: {unreadCount}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">聊天订阅</h3>
              <p className="text-sm text-purple-600 mt-1">
                私聊: {chatConnected ? '✅' : '❌'} | 群聊: {groupConnected ? '✅' : '❌'}
              </p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800">全局连接</h3>
              <p className="text-sm text-orange-600 mt-1">
                {connectedChannels}/{totalChannels} 频道
              </p>
              <p className="text-xs text-orange-500">
                状态: {connectionStatus}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => markAllAsRead()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              标记所有通知为已读
            </button>
            <button
              onClick={clearEvents}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              清空事件日志
            </button>
          </div>

          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {(['confessions', 'notifications', 'chat', 'status'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab === 'confessions' && '表白'}
                  {tab === 'notifications' && '通知'}
                  {tab === 'chat' && '聊天'}
                  {tab === 'status' && '状态'}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2">实时事件日志</h3>
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无事件，请执行相关操作...</p>
            ) : (
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div key={index} className="bg-white p-2 rounded border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                          {event.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs text-gray-700 mt-1 overflow-x-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">使用说明</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">1. 表白实时订阅</h3>
              <p className="text-gray-600">
                订阅表白墙的创建、更新和删除事件。当有新表白发布时，会自动更新列表。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">2. 通知实时订阅</h3>
              <p className="text-gray-600">
                实时接收通知，包括好友请求、点赞、评论等。显示未读数量并支持一键标记已读。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">3. 聊天实时订阅</h3>
              <p className="text-gray-600">
                实时接收私聊和群聊消息，包括成员加入和离开事件。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">4. 连接状态监控</h3>
              <p className="text-gray-600">
                实时显示所有订阅的连接状态，支持自动重连和手动重连。
              </p>
            </div>
          </div>

          <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 提示</h4>
            <p className="text-sm text-yellow-700">
              这个演示页面展示了实时订阅的各种功能。在实际应用中，这些功能会在后台自动运行，
              你可以通过 Toast 通知和浏览器通知来感知新事件。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

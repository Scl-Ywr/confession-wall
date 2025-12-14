// 聊天消息管理页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getChatMessages, deleteChatMessage } from '@/services/admin/adminService';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  sender?: User;
  receiver?: User | null;
  group?: Group | null;
}

interface ChatMessagesData {
  messages: ChatMessage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ChatsPage() {
  const [chatMessagesData, setChatMessagesData] = useState<ChatMessagesData>({
    messages: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    search: '',
    userId: '',
    groupId: '',
    startDate: '',
    endDate: ''
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: async () => {}
  });

  // 加载聊天消息数据
  const loadChatMessages = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const { messages, total, page: currentPage, pageSize, totalPages } = await getChatMessages({
        page,
        pageSize: 10,
        search: searchParams.search,
        userId: searchParams.userId,
        groupId: searchParams.groupId,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate
      });
      
      setChatMessagesData({
        messages,
        total,
        page: currentPage,
        pageSize,
        totalPages
      });
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      toast.error('加载聊天消息失败');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // 初始加载数据
  useEffect(() => {
    loadChatMessages();
  }, [loadChatMessages, searchParams]);

  // 处理搜索和筛选
  const handleSearch = () => {
    loadChatMessages();
  };

  // 处理表单变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= chatMessagesData.totalPages) {
      loadChatMessages(newPage);
    }
  };

  // 处理删除消息
  const handleDeleteMessage = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: '确定要删除这条聊天消息吗？此操作不可恢复。',
      onConfirm: async () => {
        try {
          const result = await deleteChatMessage(id);
          if (result.success) {
            toast.success('聊天消息删除成功');
            loadChatMessages(chatMessagesData.page);
          } else {
            toast.error(`删除失败：${result.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '删除聊天消息失败';
          toast.error(errorMessage);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">聊天管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理系统中的所有聊天消息</p>
      </div>

      {/* 搜索和筛选栏 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>搜索和筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">消息内容</label>
              <input
                type="text"
                name="search"
                value={searchParams.search}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="搜索消息内容..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户ID</label>
              <input
                type="text"
                name="userId"
                value={searchParams.userId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="按用户ID筛选..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">群聊ID</label>
              <input
                type="text"
                name="groupId"
                value={searchParams.groupId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="按群聊ID筛选..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">开始日期</label>
              <input
                type="date"
                name="startDate"
                value={searchParams.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">结束日期</label>
              <input
                type="date"
                name="endDate"
                value={searchParams.endDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                搜索
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 聊天消息列表 */}
      <Card>
        <CardHeader>
          <CardTitle>聊天消息列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        发送者
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        接收者
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        群聊
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        内容
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {chatMessagesData.messages.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {message.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {message.sender?.display_name || message.sender?.username || message.sender_id.substring(0, 8) + '...'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {message.receiver ? (message.receiver.display_name || message.receiver.username || '-') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {message.group ? message.group.name : (message.group_id ? message.group_id.substring(0, 8) + '...' : '-')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {message.content}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(message.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              <div className="px-6 py-4 border-t border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    显示 {((chatMessagesData.page - 1) * chatMessagesData.pageSize) + 1} 到 {Math.min(chatMessagesData.page * chatMessagesData.pageSize, chatMessagesData.total)} 条，共 {chatMessagesData.total} 条
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePageChange(chatMessagesData.page - 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={chatMessagesData.page === 1}
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                      {chatMessagesData.page}
                    </span>
                    <button 
                      onClick={() => handlePageChange(chatMessagesData.page + 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={chatMessagesData.page === chatMessagesData.totalPages}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 确认删除对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="确认删除"
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
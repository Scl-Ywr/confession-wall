// 聊天消息管理页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getChatMessages } from '@/services/admin/adminService';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface MessagesData {
  messages: ChatMessage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function MessagesPage() {
  const [messagesData, setMessagesData] = useState<MessagesData>({
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

  // 加载消息数据
  const loadMessages = useCallback(async (page: number = 1) => {
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
      
      setMessagesData({
        messages,
        total,
        page: currentPage,
        pageSize,
        totalPages
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // 初始加载数据
  useEffect(() => {
    loadMessages();
  }, [loadMessages, searchParams]);

  // 处理搜索和筛选
  const handleSearch = () => {
    loadMessages();
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
    if (newPage >= 1 && newPage <= messagesData.totalPages) {
      loadMessages(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">聊天消息管理</h1>
        <p className="text-gray-600 mt-1">管理系统中的所有聊天消息</p>
      </div>

      {/* 搜索和筛选栏 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>搜索和筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">搜索内容</label>
              <input
                type="text"
                name="search"
                value={searchParams.search}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="搜索消息内容..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户ID</label>
              <input
                type="text"
                name="userId"
                value={searchParams.userId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="按用户ID筛选..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">群ID</label>
              <input
                type="text"
                name="groupId"
                value={searchParams.groupId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="按群ID筛选..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                name="startDate"
                value={searchParams.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                name="endDate"
                value={searchParams.endDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* 消息列表 */}
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        发送者
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        接收者/群
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        内容
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        类型
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        是否已读
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {messagesData.messages.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {message.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {message.sender_id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {message.receiver_id ? (
                            <span className="text-blue-600">私聊: {message.receiver_id.substring(0, 8)}...</span>
                          ) : message.group_id ? (
                            <span className="text-green-600">群聊: {message.group_id.substring(0, 8)}...</span>
                          ) : (
                            <span className="text-gray-500">未知</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                          {message.content || '无内容'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${message.type === 'text' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            {message.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${message.is_read ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {message.is_read ? '已读' : '未读'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(message.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-red-600 hover:text-red-900">
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
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    显示 {((messagesData.page - 1) * messagesData.pageSize) + 1} 到 {Math.min(messagesData.page * messagesData.pageSize, messagesData.total)} 条，共 {messagesData.total} 条
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePageChange(messagesData.page - 1)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={messagesData.page === 1}
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white">
                      {messagesData.page}
                    </span>
                    <button 
                      onClick={() => handlePageChange(messagesData.page + 1)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={messagesData.page === messagesData.totalPages}
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
    </div>
  );
}
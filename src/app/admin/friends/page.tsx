// 好友关系管理页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getFriendships, deleteFriendship } from '@/services/admin/adminService';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface User {
  id: string;
  username: string;
  display_name: string | null;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  updated_at: string;
  user: User | null;
  friend: User | null;
}

interface FriendshipsData {
  friendships: Friendship[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function FriendsPage() {
  const [friendshipsData, setFriendshipsData] = useState<FriendshipsData>({
    friendships: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    userId: ''
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: async () => {}
  });

  // 加载好友关系数据
  const loadFriendships = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const { friendships, total, page: currentPage, pageSize, totalPages } = await getFriendships({
        page,
        pageSize: 10,
        userId: searchParams.userId
      });
      
      // 使用类型断言确保数据结构正确
      setFriendshipsData({
        friendships: friendships as Friendship[],
        total,
        page: currentPage,
        pageSize,
        totalPages
      });
    } catch (error) {
      console.error('Failed to load friendships:', error);
      toast.error('加载好友关系数据失败');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // 初始加载数据
  useEffect(() => {
    loadFriendships();
  }, [loadFriendships, searchParams]);

  // 处理搜索和筛选
  const handleSearch = () => {
    loadFriendships();
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
    if (newPage >= 1 && newPage <= friendshipsData.totalPages) {
      loadFriendships(newPage);
    }
  };

  // 处理删除好友关系
  const handleDeleteFriendship = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: '确定要删除这条好友关系吗？此操作不可恢复。',
      onConfirm: async () => {
        try {
          const result = await deleteFriendship(id);
          if (result.success) {
            toast.success('好友关系删除成功');
            loadFriendships(friendshipsData.page);
          } else {
            toast.error(`删除失败：${result.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '删除好友关系失败';
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">好友关系管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理系统中的所有好友关系</p>
      </div>

      {/* 搜索和筛选栏 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>搜索和筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户ID</label>
              <input
                type="text"
                name="userId"
                value={searchParams.userId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="按用户ID筛选好友关系..."
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

      {/* 好友关系列表 */}
      <Card>
        <CardHeader>
          <CardTitle>好友关系列表</CardTitle>
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
                        用户
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        好友
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        更新时间
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {friendshipsData.friendships.map((friendship) => (
                      <tr key={friendship.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {friendship.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="font-medium">{friendship.user?.username || '未知用户'}</span>
                            {friendship.user?.display_name && (
                              <span className="ml-2 text-gray-400 dark:text-gray-500">({friendship.user.display_name})</span>
                            )}
                            <br />
                            <span className="text-xs text-gray-400 dark:text-gray-500">{friendship.user_id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="font-medium">{friendship.friend?.username || '未知用户'}</span>
                            {friendship.friend?.display_name && (
                              <span className="ml-2 text-gray-400 dark:text-gray-500">({friendship.friend.display_name})</span>
                            )}
                            <br />
                            <span className="text-xs text-gray-400 dark:text-gray-500">{friendship.friend_id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(friendship.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(friendship.updated_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleDeleteFriendship(friendship.id)}
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
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    显示 {((friendshipsData.page - 1) * friendshipsData.pageSize) + 1} 到 {Math.min(friendshipsData.page * friendshipsData.pageSize, friendshipsData.total)} 条，共 {friendshipsData.total} 条
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePageChange(friendshipsData.page - 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={friendshipsData.page === 1}
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                      {friendshipsData.page}
                    </span>
                    <button 
                      onClick={() => handlePageChange(friendshipsData.page + 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={friendshipsData.page === friendshipsData.totalPages}
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
// 用户管理主内容客户端组件，集成搜索、筛选和删除功能
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { UsersSearch } from './UsersSearch';
import { UsersList } from './UsersList';
import { getUsers } from '@/services/admin/adminService';

interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  online_status: string;
  created_at: string;
}

interface UsersData {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function UsersContent() {
  const [usersData, setUsersData] = useState<UsersData>({
    users: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    search: '',
    status: ''
  });

  // 加载用户数据
  const loadUsers = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const { users, total, page: currentPage, pageSize, totalPages } = await getUsers({
        page,
        pageSize: 10,
        search: searchParams.search,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      
      setUsersData({
        users,
        total,
        page: currentPage,
        pageSize,
        totalPages
      });
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // 初始加载数据和定时刷新
  useEffect(() => {
    loadUsers();
    
    // 添加定时刷新机制，每30秒刷新一次数据
    const refreshInterval = setInterval(() => {
      loadUsers();
    }, 30000);
    
    // 清理定时器
    return () => clearInterval(refreshInterval);
  }, [loadUsers, searchParams]);

  // 处理搜索和筛选
  const handleSearch = (search: string, status: string) => {
    setSearchParams({
      search,
      status
    });
  };

  // 处理用户删除
  const handleUserDeleted = () => {
    loadUsers();
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= usersData.totalPages) {
      loadUsers(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选栏 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>搜索和筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersSearch 
            onSearch={handleSearch} 
            initialSearch={searchParams.search} 
            initialStatus={searchParams.status} 
          />
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <UsersList 
                users={usersData.users} 
                onUserDeleted={handleUserDeleted} 
              />

              {/* 分页 */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    显示 {((usersData.page - 1) * usersData.pageSize) + 1} 到 {Math.min(usersData.page * usersData.pageSize, usersData.total)} 条，共 {usersData.total} 条
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePageChange(usersData.page - 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={usersData.page === 1}
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                      {usersData.page}
                    </span>
                    <button 
                      onClick={() => handlePageChange(usersData.page + 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={usersData.page === usersData.totalPages}
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
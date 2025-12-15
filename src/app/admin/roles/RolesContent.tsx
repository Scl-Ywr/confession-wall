// 角色管理主内容客户端组件，集成搜索、筛选和管理功能
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { RolesList } from './RolesList';
import { UserRolesList } from './UserRolesList';
import { getUsers } from '@/services/admin/adminService';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

// 用户接口
interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  online_status: string;
  created_at: string;
}

// 角色接口
export interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// 角色数据接口
interface RolesData {
  roles: Role[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 用户角色关系数据接口
interface UserRolesData {
  userRoles: Array<{
    userId: string;
    userName: string;
    userDisplayName: string;
    userEmail: string;
    isAdmin: boolean;
    roleId: string;
    roleName: string;
    roleDescription: string;
    assignedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 搜索参数接口
interface SearchParams {
  search: string;
}

export function RolesContent() {
  const router = useRouter();
  
  // 状态管理 - 角色列表
  const [rolesData, setRolesData] = useState<RolesData>({
    roles: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [rolesSearchParams, setRolesSearchParams] = useState<SearchParams>({
    search: ''
  });
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  
  // 状态管理 - 用户角色关系
  const [userRolesData, setUserRolesData] = useState<UserRolesData>({
    userRoles: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [userRolesSearchParams, setUserRolesSearchParams] = useState<SearchParams>({
    search: ''
  });
  const [isLoadingUserRoles, setIsLoadingUserRoles] = useState<boolean>(true);
  const [userRolesError, setUserRolesError] = useState<string | null>(null);
  
  // 用户搜索状态
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showUserSearchResults, setShowUserSearchResults] = useState(false);
  
  // 搜索用户
  const handleUserSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSearchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearchingUsers(true);
    try {
      const { users } = await getUsers({ 
        page: 1, 
        pageSize: 10,
        search: userSearchTerm 
      });
      setSearchResults(users);
      setShowUserSearchResults(true);
    } catch (err) {
      console.error('搜索用户失败:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  }, [userSearchTerm]);
  
  // 处理用户选择
  const handleUserSelect = (userId: string) => {
    router.push(`/admin/users/${userId}/roles`);
    setShowUserSearchResults(false);
    setUserSearchTerm('');
  };

  // 加载角色数据
  const loadRoles = useCallback(async (page: number = 1) => {
    setIsLoadingRoles(true);
    setRolesError(null);

    try {
      // 通过 API 获取角色数据
      const response = await fetch(
        `/api/admin/roles?page=${page}&pageSize=${rolesData.pageSize}&search=${encodeURIComponent(rolesSearchParams.search)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取角色数据失败');
      }

      const result = await response.json();
      setRolesData(result);
    } catch (err) {
      setRolesError('加载角色数据失败，请重试');
      console.error('加载角色数据失败:', err);
    } finally {
      setIsLoadingRoles(false);
    }
  }, [rolesSearchParams.search, rolesData.pageSize]);

  // 加载用户角色关系数据
  const loadUserRoles = useCallback(async (page: number = 1) => {
    setIsLoadingUserRoles(true);
    setUserRolesError(null);

    try {
      // 通过 API 获取用户角色关系数据
      const response = await fetch(
        `/api/admin/user-roles?page=${page}&pageSize=${userRolesData.pageSize}&search=${encodeURIComponent(userRolesSearchParams.search)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取用户角色关系数据失败');
      }

      const result = await response.json();
      setUserRolesData(result);
    } catch (err) {
      setUserRolesError('加载用户角色关系数据失败，请重试');
      console.error('加载用户角色关系数据失败:', err);
    } finally {
      setIsLoadingUserRoles(false);
    }
  }, [userRolesSearchParams.search, userRolesData.pageSize]);

  // 初始加载数据
  useEffect(() => {
    loadRoles();
    loadUserRoles();
  }, [loadRoles, loadUserRoles]);

  // 处理角色搜索和筛选
  const handleRolesSearch = (search: string) => {
    setRolesSearchParams({
      search
    });
    loadRoles(1); // 搜索时重置到第一页
  };

  // 处理用户角色关系搜索和筛选
  const handleUserRolesSearch = (search: string) => {
    setUserRolesSearchParams({
      search
    });
    loadUserRoles(1); // 搜索时重置到第一页
  };

  // 处理角色删除
  const handleRoleDeleted = () => {
    loadRoles(rolesData.page);
    loadUserRoles(userRolesData.page); // 角色删除后，刷新用户角色关系列表
  };

  // 处理角色列表分页
  const handleRolesPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= rolesData.totalPages) {
      loadRoles(newPage);
    }
  };

  // 处理用户角色关系列表分页
  const handleUserRolesPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= userRolesData.totalPages) {
      loadUserRoles(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* 用户搜索框 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">为用户分配角色</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <form onSubmit={handleUserSearch} className="flex items-center gap-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="搜索用户..."
                  className="w-full px-4 py-2 pl-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all duration-300"
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    if (!e.target.value.trim()) {
                      setShowUserSearchResults(false);
                    }
                  }}
                  onClick={() => {
                    setShowUserSearchResults(false);
                  }}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-black dark:text-white font-black rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                disabled={isSearchingUsers}
              >
                {isSearchingUsers ? '搜索中...' : '搜索'}
              </button>
            </form>
            
            {/* 用户搜索结果 */}
            {showUserSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-50 overflow-hidden">
                <ul className="max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <li
                      key={user.id}
                      className="px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200 flex items-center justify-between cursor-pointer"
                      onClick={() => handleUserSelect(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                          <span className="text-lg font-medium text-gray-800 dark:text-white">
                            {user.display_name?.charAt(0) || user.username?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">
                            {user.display_name || user.username || '未命名用户'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserSelect(user.id);
                        }}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors duration-300"
                      >
                        分配角色
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {showUserSearchResults && searchResults.length === 0 && !isSearchingUsers && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-50 p-4 text-center">
                <p className="text-gray-500 dark:text-gray-400">未找到匹配的用户</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 角色列表卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">角色列表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 角色列表 */}
          <RolesList
            roles={rolesData.roles}
            isLoading={isLoadingRoles}
            error={rolesError}
            onRoleDeleted={handleRoleDeleted}
            total={rolesData.total}
            currentPage={rolesData.page}
            totalPages={rolesData.totalPages}
            onPageChange={handleRolesPageChange}
            onSearch={handleRolesSearch}
          />
        </CardContent>
      </Card>
      
      {/* 用户角色关系列表卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">用户角色关系表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 用户角色关系列表 */}
          <UserRolesList
            userRoles={userRolesData.userRoles}
            isLoading={isLoadingUserRoles}
            error={userRolesError}
            total={userRolesData.total}
            currentPage={userRolesData.page}
            totalPages={userRolesData.totalPages}
            onPageChange={handleUserRolesPageChange}
            onSearch={handleUserRolesSearch}
          />
        </CardContent>
      </Card>
    </div>
  );
}
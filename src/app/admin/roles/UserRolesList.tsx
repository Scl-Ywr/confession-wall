// 用户角色关系列表客户端组件，显示所有用户对应的角色
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

// 用户角色关系接口
interface UserRoleRelation {
  userId: string;
  userName: string;
  userDisplayName: string;
  userEmail: string;
  isAdmin: boolean;
  roleId: string;
  roleName: string;
  roleDescription: string;
  assignedAt: string;
}

interface UserRolesListProps {
  userRoles: UserRoleRelation[];
  isLoading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
}

export function UserRolesList({
  userRoles,
  isLoading,
  error,
  total,
  currentPage,
  totalPages,
  onPageChange,
  onSearch
}: UserRolesListProps) {
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');

  // 处理搜索
  const handleSearch = () => {
    onSearch(searchTerm);
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 处理回车键搜索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="w-full md:w-64 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            placeholder="搜索用户或角色..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-all duration-300 border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 用户角色关系列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : userRoles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-gray-500 mb-4">暂无用户角色关系数据</div>
          <div className="text-gray-400 mb-6">当用户被分配角色时，相关数据将显示在这里</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  用户名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  用户邮箱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  角色名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  角色描述
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  分配时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900">
              {userRoles.map((relation) => (
                <tr
                  key={`${relation.userId}-${relation.roleId}`}
                  className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {relation.userDisplayName}
                      {relation.isAdmin && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded-full">
                          管理员
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {relation.userName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {relation.userEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {relation.roleName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {relation.roleDescription || '-'} 
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(relation.assignedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                    <Link
                      href={`/admin/users/${relation.userId}/roles`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      管理角色
                    </Link>
                    <Link
                      href={`/admin/roles/${relation.roleId}/permissions`}
                      className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      查看权限
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {total > 0 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            共 {total} 条记录，第 {currentPage} / {totalPages} 页
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 text-sm border rounded-md transition-colors ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              上一页
            </button>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {currentPage}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 text-sm border rounded-md transition-colors ${currentPage === totalPages ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
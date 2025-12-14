// 角色列表客户端组件，处理角色显示、搜索和管理
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteRole } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';
import { Role } from '@/services/admin/adminService';

interface RolesListProps {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  onRoleDeleted: () => void;
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
}

export function RolesList({ 
  roles, 
  isLoading, 
  error, 
  onRoleDeleted, 
  total, 
  currentPage, 
  totalPages, 
  onPageChange, 
  onSearch 
}: RolesListProps) {
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    roleId: '',
    roleName: ''
  });

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

  // 打开删除确认对话框
  const handleDeleteClick = (roleId: string, roleName: string) => {
    setConfirmDialog({
      isOpen: true,
      roleId,
      roleName
    });
  };

  // 确认删除角色
  const confirmDelete = async () => {
    try {
      const result = await deleteRole(confirmDialog.roleId);
      if (result.success) {
        showSuccess('角色删除成功');
        onRoleDeleted();
      } else {
        showError(result.error || '角色删除失败');
      }
    } catch (err) {
      showError('角色删除失败');
      console.error('删除角色失败:', err);
    } finally {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  // 取消删除
  const cancelDelete = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="w-full md:w-64 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            placeholder="搜索角色..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-md transition-colors border border-gray-300 dark:border-gray-600"
          >
            搜索
          </button>
          <Link href="/admin/roles/create">
            <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors">
              创建角色
            </button>
          </Link>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 角色列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : roles.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">暂无角色数据</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  角色名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  描述
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  更新时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900">
              {roles.map((role) => (
                <tr 
                  key={role.id} 
                  className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {role.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {role.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(role.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(role.updated_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                    <Link 
                      href={`/admin/roles/${role.id}/permissions`} 
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      权限
                    </Link>
                    <Link 
                      href={`/admin/roles/${role.id}/edit`} 
                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 mr-3"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(role.id, role.name)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      删除
                    </button>
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="确认删除角色"
        message={`您确定要删除角色 "${confirmDialog.roleName}" 吗？此操作不可恢复。`}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />
    </div>
  );
}
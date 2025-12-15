// 用户列表客户端组件，处理删除功能
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteUser } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';

interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  online_status: string;
  created_at: string;
}

interface UsersListProps {
  users: User[];
  onUserDeleted: () => void;
}

export function UsersList({ users, onUserDeleted }: UsersListProps) {
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    userId: ''
  });

  // 打开确认对话框
  const handleDeleteClick = (userId: string) => {
    setConfirmDialog({
      isOpen: true,
      userId
    });
  };

  // 关闭确认对话框
  const handleCloseDialog = () => {
    setConfirmDialog({
      isOpen: false,
      userId: ''
    });
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    try {
      const result = await deleteUser(confirmDialog.userId);
      if (result.success) {
        // 显示成功通知
        showSuccess('用户删除成功');
        // 通知父组件用户已删除
        onUserDeleted();
      } else {
        // 显示错误通知
        showError(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      showError('删除用户失败');
    } finally {
      handleCloseDialog();
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                用户名
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                显示名称
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                邮箱
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                注册时间
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden mr-3">
                      <Image 
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username || '用户'}`} 
                        alt={user.username || '用户头像'} 
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username || '未设置'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.display_name || '未设置'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${user.online_status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : user.online_status === 'away' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {user.online_status === 'online' ? '在线' : user.online_status === 'away' ? '离开' : '离线'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(user.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      详情
                    </Link>
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                    >
                      编辑
                    </Link>
                    <Link
                      href={`/admin/users/${user.id}/roles`}
                      className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      角色
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(user.id)}
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

      {/* 确认删除对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        title="确认删除用户"
        message="您确定要删除这个用户吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
        confirmColor="red"
      />
    </>
  );
}
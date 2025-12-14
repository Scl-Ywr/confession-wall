// 表白列表客户端组件，处理删除功能
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteConfession, updateConfessionStatus } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';

interface Confession {
  id: string;
  content: string | null;
  user_id: string | null;
  is_anonymous: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  status: 'approved' | 'rejected' | 'pending';
  moderator_id: string | null;
  moderated_at: string | null;
  rejection_reason: string | null;
  is_published?: boolean;
}

interface ConfessionsListProps {
  confessions: Confession[];
  onConfessionDeleted: () => void;
}

export function ConfessionsList({ confessions, onConfessionDeleted }: ConfessionsListProps) {
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    confessionId: ''
  });

  // 打开确认对话框
  const handleDeleteClick = (confessionId: string) => {
    setConfirmDialog({
      isOpen: true,
      confessionId
    });
  };

  // 关闭确认对话框
  const handleCloseDialog = () => {
    setConfirmDialog({
      isOpen: false,
      confessionId: ''
    });
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    try {
      const result = await deleteConfession(confirmDialog.confessionId);
      if (result.success) {
        // 显示成功通知
        showSuccess('表白删除成功');
        // 通知父组件表白已删除
        onConfessionDeleted();
      } else {
        // 显示错误通知
        showError(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete confession:', error);
      showError('删除表白失败');
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
                内容
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                用户
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                匿名
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                点赞数
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                评论数
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                创建时间
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {confessions.map((confession) => (
              <tr key={confession.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {confession.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                  {confession.content || '无内容'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {confession.user_id ? confession.user_id.substring(0, 8) + '...' : '匿名用户'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${confession.is_anonymous ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {confession.is_anonymous ? '是' : '否'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {confession.likes_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {confession.comments_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(confession.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${confession.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : confession.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                    {confession.status === 'approved' ? '已通过' : confession.status === 'rejected' ? '已拒绝' : '待审核'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Link
                      href={`/admin/confessions/${confession.id}`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      详情
                    </Link>
                    <Link
                      href={`/admin/confessions/${confession.id}/edit`}
                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                    >
                      编辑
                    </Link>
                    {confession.status !== 'approved' && (
                      <button
                        onClick={async () => {
                          try {
                            // 获取当前用户ID（实际应用中应从上下文或认证信息中获取）
                            const currentUserId = 'admin'; // 临时值，实际应从认证信息中获取
                            const result = await updateConfessionStatus(confession.id, 'approved', currentUserId);
                            if (result.success) {
                              showSuccess('表白已通过审核');
                              onConfessionDeleted();
                            } else {
                              showError(result.error || '审核失败');
                            }
                          } catch (error) {
                            console.error('Failed to approve confession:', error);
                            showError('审核失败');
                          }
                        }}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      >
                        通过
                      </button>
                    )}
                    {confession.status !== 'rejected' && (
                      <button
                        onClick={async () => {
                          try {
                            // 获取当前用户ID（实际应用中应从上下文或认证信息中获取）
                            const currentUserId = 'admin'; // 临时值，实际应从认证信息中获取
                            const rejectionReason = prompt('请输入拒绝理由：');
                            if (rejectionReason === null) return; // 用户取消了操作
                            
                            const result = await updateConfessionStatus(confession.id, 'rejected', currentUserId, rejectionReason);
                            if (result.success) {
                              showSuccess('表白已拒绝');
                              onConfessionDeleted();
                            } else {
                              showError(result.error || '拒绝失败');
                            }
                          } catch (error) {
                            console.error('Failed to reject confession:', error);
                            showError('拒绝失败');
                          }
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        拒绝
                      </button>
                    )}
                    {confession.status !== 'pending' && (
                      <button
                        onClick={async () => {
                          try {
                            // 获取当前用户ID（实际应用中应从上下文或认证信息中获取）
                            const currentUserId = 'admin'; // 临时值，实际应从认证信息中获取
                            const result = await updateConfessionStatus(confession.id, 'pending', currentUserId);
                            if (result.success) {
                              showSuccess('表白已设为待审核');
                              onConfessionDeleted();
                            } else {
                              showError(result.error || '设置失败');
                            }
                          } catch (error) {
                            console.error('Failed to set pending status:', error);
                            showError('设置失败');
                          }
                        }}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                      >
                        待审核
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(confession.id)}
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
        title="确认删除表白"
        message="您确定要删除这个表白吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
        confirmColor="red"
      />
    </>
  );
}
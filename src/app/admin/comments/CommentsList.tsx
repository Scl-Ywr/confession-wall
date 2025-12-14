// 评论列表客户端组件，处理删除和审核功能
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteComment, updateCommentStatus } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  online_status: string;
  is_admin?: boolean;
}

interface Comment {
  id: string;
  content: string | null;
  user_id: string | null;
  is_anonymous: boolean;
  confession_id: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  status: 'approved' | 'rejected' | 'pending';
  moderator_id: string | null;
  moderated_at: string | null;
  rejection_reason: string | null;
  is_published?: boolean;
  profiles?: Profile | null;
}

interface CommentsListProps {
  comments: Comment[];
  onCommentDeleted: () => void;
}

export function CommentsList({ comments, onCommentDeleted }: CommentsListProps) {
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    commentId: ''
  });

  // 打开确认对话框
  const handleDeleteClick = (commentId: string) => {
    setConfirmDialog({
      isOpen: true,
      commentId
    });
  };

  // 关闭确认对话框
  const handleCloseDialog = () => {
    setConfirmDialog({
      isOpen: false,
      commentId: ''
    });
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    try {
      const result = await deleteComment(confirmDialog.commentId);
      if (result.success) {
        // 显示成功通知
        showSuccess('评论删除成功');
        // 通知父组件评论已删除
        onCommentDeleted();
      } else {
        // 显示错误通知
        showError(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      showError('删除评论失败');
    } finally {
      handleCloseDialog();
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                内容
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                匿名
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                表白ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comments.map((comment) => (
              <tr key={comment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {comment.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                  {comment.content || '无内容'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {comment.is_anonymous ? '匿名用户' : (
                    comment.profiles ? (
                      comment.profiles.display_name || comment.profiles.username || '未知用户'
                    ) : (
                      comment.user_id ? comment.user_id.substring(0, 8) + '...' : '未知用户'
                    )
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${comment.is_anonymous ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {comment.is_anonymous ? '是' : '否'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link 
                    href={`/admin/confessions/${comment.confession_id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {comment.confession_id.substring(0, 8)}...
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(comment.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${comment.status === 'approved' ? 'bg-green-100 text-green-800' : comment.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {comment.status === 'approved' ? '已通过' : comment.status === 'rejected' ? '已拒绝' : '待审核'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    {comment.status !== 'approved' && (
                      <button
                        onClick={async () => {
                          try {
                            // 获取当前用户ID（实际应用中应从上下文或认证信息中获取）
                            const currentUserId = 'admin'; // 临时值，实际应从认证信息中获取
                            const result = await updateCommentStatus(comment.id, 'approved', currentUserId);
                            if (result.success) {
                              showSuccess('评论已通过审核');
                              onCommentDeleted();
                            } else {
                              showError(result.error || '审核失败');
                            }
                          } catch (error) {
                            console.error('Failed to approve comment:', error);
                            showError('审核失败');
                          }
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        通过
                      </button>
                    )}
                    {comment.status !== 'rejected' && (
                      <button
                        onClick={async () => {
                          try {
                            // 获取当前用户ID（实际应用中应从上下文或认证信息中获取）
                            const currentUserId = 'admin'; // 临时值，实际应从认证信息中获取
                            const rejectionReason = prompt('请输入拒绝理由：');
                            if (rejectionReason === null) return; // 用户取消了操作
                            
                            const result = await updateCommentStatus(comment.id, 'rejected', currentUserId, rejectionReason);
                            if (result.success) {
                              showSuccess('评论已拒绝');
                              onCommentDeleted();
                            } else {
                              showError(result.error || '拒绝失败');
                            }
                          } catch (error) {
                            console.error('Failed to reject comment:', error);
                            showError('拒绝失败');
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        拒绝
                      </button>
                    )}
                    {comment.status !== 'pending' && (
                      <button
                        onClick={async () => {
                          try {
                            // 获取当前用户ID（实际应用中应从上下文或认证信息中获取）
                            const currentUserId = 'admin'; // 临时值，实际应从认证信息中获取
                            const result = await updateCommentStatus(comment.id, 'pending', currentUserId);
                            if (result.success) {
                              showSuccess('评论已设为待审核');
                              onCommentDeleted();
                            } else {
                              showError(result.error || '设置失败');
                            }
                          } catch (error) {
                            console.error('Failed to set pending status:', error);
                            showError('设置失败');
                          }
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        待审核
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(comment.id)}
                      className="text-red-600 hover:text-red-900"
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
        title="确认删除评论"
        message="您确定要删除这个评论吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
        confirmColor="red"
      />
    </>
  );
}
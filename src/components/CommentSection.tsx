'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { confessionService } from '@/services/confessionService';
import { Comment, CommentFormData } from '@/types/confession';
import { useRouter } from 'next/navigation';

interface CommentSectionProps {
  confessionId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ confessionId }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CommentFormData>({
    content: '',
    is_anonymous: false,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 获取评论列表
  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await confessionService.getComments(confessionId);
      setComments(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取评论失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchComments();
    }
  }, [isExpanded, confessionId]);

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!formData.content.trim()) {
      setFormError('评论内容不能为空');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const newComment = await confessionService.createComment(confessionId, formData);
      // 更新本地评论列表
      setComments(prev => [...prev, newComment]);
      // 重置表单
      setFormData({
        content: '',
        is_anonymous: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发布评论失败';
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors mb-4"
      >
        <span>💬</span>
        <span>{comments.length} 条评论</span>
        <span>{isExpanded ? '收起' : '展开'}</span>
      </button>

      {isExpanded && (
        <div className="space-y-4">
          {/* 评论表单 */}
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="写下你的评论..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              ></textarea>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="comment-anonymous"
                  className="mr-2"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                />
                <label htmlFor="comment-anonymous" className="text-sm text-gray-700">
                  匿名评论
                </label>
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded-md transition-colors text-sm ${formLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {formLoading ? '发布中...' : '发布'}
              </button>
            </div>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
          </form>

          {/* 评论列表 */}
          {loading ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">加载评论中...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchComments}
                className="mt-1 text-sm text-blue-600 hover:text-blue-500"
              >
                重试
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
              <p className="text-sm text-gray-600">还没有评论，快来抢沙发吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center mb-2">
                    {comment.is_anonymous ? (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                        <span className="text-xs text-gray-600 font-medium">匿</span>
                      </div>
                    ) : comment.profile ? (
                      comment.profile.avatar_url ? (
                        <Image
                          src={comment.profile.avatar_url}
                          alt={comment.profile.display_name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover mr-2 border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                          <span className="text-xs text-gray-600 font-medium">用</span>
                        </div>
                      )
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                        <span className="text-xs text-gray-600 font-medium">用</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {comment.is_anonymous ? '匿名用户' : comment.profile?.display_name || '未知用户'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;

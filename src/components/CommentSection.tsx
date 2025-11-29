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
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-gray-500 hover:text-primary-500 transition-all duration-200 transform hover:scale-105 mb-5 dark:text-gray-400 dark:hover:text-primary-400"
      >
        <span className="text-lg">💬</span>
        <span className="font-medium">{comments.length} 条评论</span>
        <span className="text-sm">{isExpanded ? '收起' : '展开'}</span>
      </button>

      {isExpanded && (
        <div className="space-y-6 animate-fade-in">
          {/* 评论表单 */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-transparent"
                rows={3}
                placeholder="写下你的评论..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              ></textarea>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="comment-anonymous"
                  className="mr-2 rounded text-primary-600 focus:ring-primary-500 dark:text-primary-400 dark:focus:ring-primary-600"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                />
                <label htmlFor="comment-anonymous" className="text-sm text-gray-700 dark:text-gray-300">
                  匿名评论
                </label>
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className={`flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 text-sm ${formLoading ? 'opacity-50 cursor-not-allowed' : ''} dark:bg-primary-500 dark:hover:bg-primary-400`}
              >
                {formLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    发布中...
                  </>
                ) : (
                  '发布'
                )}
              </button>
            </div>
            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
            )}
          </form>

          {/* 评论列表 */}
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">加载评论中...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/30 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchComments}
                className="mt-2 text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                重试
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center dark:bg-gray-700 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">还没有评论，快来抢沙发吧！</p>
            </div>
          ) : (
            <div className="space-y-5">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4 transition-all duration-300 hover:shadow-sm dark:bg-gray-700 dark:border-gray-600">
                  <div className="flex items-center mb-3">
                    {comment.is_anonymous ? (
                      <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center mr-3 transition-all duration-300 transform hover:scale-110 dark:bg-gray-600">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">匿</span>
                      </div>
                    ) : comment.profile ? (
                      comment.profile.avatar_url ? (
                        <Image
                          src={comment.profile.avatar_url}
                          alt={comment.profile.display_name}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-full object-cover mr-3 border-2 border-gray-200 transition-all duration-300 transform hover:scale-110 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center mr-3 transition-all duration-300 transform hover:scale-110 dark:bg-gray-600">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">用</span>
                        </div>
                      )
                    ) : (
                      <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center mr-3 transition-all duration-300 transform hover:scale-110 dark:bg-gray-600">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">用</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {comment.is_anonymous ? '匿名用户' : comment.profile?.display_name || '未知用户'}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed dark:text-gray-300">
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

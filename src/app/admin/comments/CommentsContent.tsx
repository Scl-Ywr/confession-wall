// 评论管理主内容客户端组件，集成搜索、筛选和删除功能
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CommentsSearch } from './CommentsSearch';
import { CommentsList } from './CommentsList';
import { getComments } from '@/services/admin/adminService';

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
}

interface CommentsData {
  comments: Comment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function CommentsContent() {
  const [commentsData, setCommentsData] = useState<CommentsData>({
    comments: [],
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

  // 加载评论数据
  const loadComments = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const { comments, total, page: currentPage, pageSize, totalPages } = await getComments({
        page,
        pageSize: 10,
        search: searchParams.search,
        status: searchParams.status
      });
      
      setCommentsData({
        comments,
        total,
        page: currentPage,
        pageSize,
        totalPages
      });
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // 初始加载数据
  useEffect(() => {
    loadComments();
  }, [loadComments, searchParams]);

  // 处理搜索和筛选
  const handleSearch = (search: string, status: string = '') => {
    setSearchParams({
      search,
      status
    });
  };

  // 处理评论删除
  const handleCommentDeleted = () => {
    loadComments();
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= commentsData.totalPages) {
      loadComments(newPage);
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
          <CommentsSearch 
            onSearch={handleSearch} 
            initialSearch={searchParams.search} 
            initialStatus={searchParams.status} 
          />
        </CardContent>
      </Card>

      {/* 评论列表 */}
      <Card>
        <CardHeader>
          <CardTitle>评论列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <CommentsList 
                comments={commentsData.comments} 
                onCommentDeleted={handleCommentDeleted} 
              />

              {/* 分页 */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    显示 {((commentsData.page - 1) * commentsData.pageSize) + 1} 到 {Math.min(commentsData.page * commentsData.pageSize, commentsData.total)} 条，共 {commentsData.total} 条
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePageChange(commentsData.page - 1)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={commentsData.page === 1}
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white">
                      {commentsData.page}
                    </span>
                    <button 
                      onClick={() => handlePageChange(commentsData.page + 1)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={commentsData.page === commentsData.totalPages}
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
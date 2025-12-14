// 表白管理主内容客户端组件，集成搜索、筛选和删除功能
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfessionsSearch } from './ConfessionsSearch';
import { ConfessionsList } from './ConfessionsList';
import { getConfessions } from '@/services/admin/adminService';

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

interface ConfessionsData {
  confessions: Confession[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function ConfessionsContent() {
  const [confessionsData, setConfessionsData] = useState<ConfessionsData>({
    confessions: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    search: '',
    anonymousStatus: '',
    status: ''
  });

  // 加载表白数据
  const loadConfessions = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const { confessions, total, page: currentPage, pageSize, totalPages } = await getConfessions({
        page,
        pageSize: 10,
        search: searchParams.search,
        sortBy: 'created_at',
        sortOrder: 'desc',
        status: searchParams.status
      });
      
      setConfessionsData({
        confessions,
        total,
        page: currentPage,
        pageSize,
        totalPages
      });
    } catch (error) {
      console.error('Failed to load confessions:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // 初始加载数据和定时刷新
  useEffect(() => {
    loadConfessions();
    
    // 添加定时刷新机制，每30秒刷新一次数据
    const refreshInterval = setInterval(() => {
      loadConfessions();
    }, 30000);
    
    // 清理定时器
    return () => clearInterval(refreshInterval);
  }, [loadConfessions, searchParams]);

  // 处理搜索和筛选
  const handleSearch = (search: string, anonymousStatus: string, status: string = '') => {
    setSearchParams({
      search,
      anonymousStatus,
      status
    });
  };

  // 处理表白删除
  const handleConfessionDeleted = () => {
    loadConfessions();
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= confessionsData.totalPages) {
      loadConfessions(newPage);
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
          <ConfessionsSearch 
            onSearch={handleSearch} 
            initialSearch={searchParams.search} 
            initialAnonymousStatus={searchParams.anonymousStatus} 
            initialStatus={searchParams.status} 
          />
        </CardContent>
      </Card>

      {/* 表白列表 */}
      <Card>
        <CardHeader>
          <CardTitle>表白列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <ConfessionsList 
                confessions={confessionsData.confessions} 
                onConfessionDeleted={handleConfessionDeleted} 
              />

              {/* 分页 */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    显示 {((confessionsData.page - 1) * confessionsData.pageSize) + 1} 到 {Math.min(confessionsData.page * confessionsData.pageSize, confessionsData.total)} 条，共 {confessionsData.total} 条
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePageChange(confessionsData.page - 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={confessionsData.page === 1}
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                      {confessionsData.page}
                    </span>
                    <button 
                      onClick={() => handlePageChange(confessionsData.page + 1)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={confessionsData.page === confessionsData.totalPages}
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
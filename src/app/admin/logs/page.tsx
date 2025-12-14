// 日志管理页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getLogs } from '@/services/admin/adminService';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface User {
  id: string;
  username: string;
  display_name: string | null;
}

interface Log {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: User;
}

interface LogsData {
  logs: Log[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function LogsPage() {
  const [logsData, setLogsData] = useState<LogsData>({
    logs: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0
  });

  // 加载日志数据
  const loadLogs = useCallback(async (page: number = 1) => {
    try {
      const result = await getLogs({ 
        page, 
        pageSize: logsData.pageSize 
      });
      setLogsData({
        logs: result.logs || [],
        total: result.total || 0,
        page: result.page || 1,
        pageSize: result.pageSize || 20,
        totalPages: result.totalPages || 0
      });
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }, [logsData.pageSize]);

  // 初始加载数据
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 0);
    
    // 添加定时刷新机制，每30秒刷新一次数据
    const refreshInterval = setInterval(() => {
      loadLogs();
    }, 30000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(refreshInterval);
    };
  }, [loadLogs]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= logsData.totalPages) {
      loadLogs(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">日志管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">系统操作日志记录</p>
      </div>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle>操作日志</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-300">操作人</th>
                  <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-300">操作类型</th>
                  <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-300">资源类型</th>
                  <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-300">资源ID</th>
                  <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-300">操作详情</th>
                  <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-300">IP地址</th>
                  <th scope="col" className="px-6 py-3 text-gray-500 dark:text-gray-300">操作时间</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logsData.logs.length > 0 ? (
                  logsData.logs.map((log) => (
                    <tr key={log.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {log.user ? (log.user.display_name || log.user.username) : log.user_id}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{log.action}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{log.resource_type}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{log.resource_id || '-'}</td>
                      <td className="px-6 py-4">
                        <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-white">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{log.ip_address || '-'}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{formatDate(log.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      暂无日志记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {logsData.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  显示 {((logsData.page - 1) * logsData.pageSize) + 1} 到 {Math.min(logsData.page * logsData.pageSize, logsData.total)} 条，共 {logsData.total} 条
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handlePageChange(logsData.page - 1)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={logsData.page === 1}
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                    {logsData.page}
                  </span>
                  <button 
                    onClick={() => handlePageChange(logsData.page + 1)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={logsData.page === logsData.totalPages}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

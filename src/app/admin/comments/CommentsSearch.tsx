// 评论管理搜索和筛选组件
'use client';

import React, { useState, useEffect } from 'react';
import { CustomSelect } from '@/components/CustomSelect';

interface CommentsSearchProps {
  onSearch: (search: string, status: string) => void;
  initialSearch?: string;
  initialStatus?: string;
}

export function CommentsSearch({ onSearch, initialSearch = '', initialStatus = '' }: CommentsSearchProps) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始搜索
  useEffect(() => {
    if (initialSearch || initialStatus) {
      onSearch(initialSearch, initialStatus);
    }
  }, [initialSearch, initialStatus, onSearch]);

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSearch(search, status);
    setIsSubmitting(false);
  };

  // 处理重置
  const handleReset = () => {
    setSearch('');
    setStatus('');
    onSearch('', '');
  };

  // 状态选项
  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'approved', label: '已通过' },
    { value: 'rejected', label: '已拒绝' },
    { value: 'pending', label: '待审核' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 搜索框 */}
        <div className="md:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            搜索评论内容
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              placeholder="输入评论内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 状态筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            评论状态
          </label>
          <CustomSelect
            options={statusOptions}
            value={status}
            onChange={setStatus}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          重置
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? '搜索中...' : '搜索'}
        </button>
      </div>
    </form>
  );
}
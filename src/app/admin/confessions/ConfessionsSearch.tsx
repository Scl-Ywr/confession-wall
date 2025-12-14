// 表白搜索和筛选客户端组件
'use client';

import { useState } from 'react';
import { CustomSelect } from '@/components/CustomSelect';

interface ConfessionsSearchProps {
  onSearch: (search: string, anonymousStatus: string, status: string) => void;
  initialSearch?: string;
  initialAnonymousStatus?: string;
  initialStatus?: string;
}

export function ConfessionsSearch({ onSearch, initialSearch = '', initialAnonymousStatus = '', initialStatus = '' }: ConfessionsSearchProps) {
  const [search, setSearch] = useState(initialSearch);
  const [anonymousStatus, setAnonymousStatus] = useState(initialAnonymousStatus);
  const [status, setStatus] = useState(initialStatus);

  // 处理搜索提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(search, anonymousStatus, status);
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // 选项定义
  const anonymousOptions = [
    { value: '', label: '所有状态' },
    { value: 'anonymous', label: '匿名' },
    { value: 'non-anonymous', label: '非匿名' }
  ];

  const statusOptions = [
    { value: '', label: '所有审核状态' },
    { value: 'pending', label: '待审核' },
    { value: 'approved', label: '已通过' },
    { value: 'rejected', label: '已拒绝' }
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="搜索表白内容..."
          value={search}
          onChange={handleSearchChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="w-40">
        <CustomSelect
          options={anonymousOptions}
          value={anonymousStatus}
          onChange={setAnonymousStatus}
        />
      </div>
      <div className="w-40">
        <CustomSelect
          options={statusOptions}
          value={status}
          onChange={setStatus}
        />
      </div>
      <div className="flex items-end">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          搜索
        </button>
      </div>
    </form>
  );
}
// 用户搜索和筛选客户端组件
'use client';

import { useState } from 'react';
import { CustomSelect } from '@/components/CustomSelect';

interface UsersSearchProps {
  onSearch: (search: string, status: string) => void;
  initialSearch?: string;
  initialStatus?: string;
}

export function UsersSearch({ onSearch, initialSearch = '', initialStatus = '' }: UsersSearchProps) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);

  // 处理搜索提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(search, status);
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // 状态选项
  const statusOptions = [
    { value: '', label: '所有状态' },
    { value: 'online', label: '在线' },
    { value: 'away', label: '离开' },
    { value: 'offline', label: '离线' }
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="搜索用户名或邮箱..."
          value={search}
          onChange={handleSearchChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
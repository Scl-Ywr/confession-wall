'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface InterestGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  cover_image?: string;
  member_count: number;
  is_public: boolean;
  created_at: string;
}

const InterestGroupList: React.FC = () => {
  const [groups, setGroups] = useState<InterestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/interest-groups?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
      const data = await response.json();
      setGroups(data.groups);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchGroups();
  }, [page, search, fetchGroups]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/interest-groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchGroups(); // 刷新列表
      }
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">兴趣圈子</h1>
        <button
          onClick={() => router.push('/interest-groups/create')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
        >
          创建圈子
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="搜索兴趣圈子..."
          value={search}
          onChange={handleSearch}
          className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="h-40 bg-gradient-to-r from-blue-400 to-purple-500 relative">
              {group.cover_image && (
                <Image
                  src={group.cover_image}
                  alt={group.name}
                  width={0}
                  height={0}
                  sizes="100vw"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-4 left-4 bg-white rounded-full p-2">
                <span className="text-2xl">{group.icon}</span>
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{group.name}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{group.description}</p>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {group.member_count} 成员
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/interest-groups/${group.id}`)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
                  >
                    查看
                  </button>
                  <button
                    onClick={() => handleJoinGroup(group.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm"
                  >
                    加入
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="inline-flex items-center space-x-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 hover:bg-gray-50"
            >
              上一页
            </button>
            
            <span className="px-3 py-1">
              第 {page} 页 / 共 {totalPages} 页
            </span>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 hover:bg-gray-50"
            >
              下一页
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default InterestGroupList;
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import ConfessionCard from './ConfessionCard';

interface InterestGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  cover_image?: string;
  member_count: number;
  is_public: boolean;
  created_at: string;
  created_by: string;
}

interface Confession {
  id: string;
  content: string;
  is_anonymous: boolean;
  user_id: string;
  likes_count: number;
  created_at: string;
  users?: {
    username: string;
    avatar_url?: string;
  };
}

interface GroupMember {
  user_id: string;
  role: string;
  joined_at: string;
  users: {
    username: string;
    avatar_url?: string;
  };
}

const InterestGroupDetail: React.FC = () => {
  const params = useParams();
  const groupId = params?.groupId as string | undefined;
  const router = useRouter();
  const [group, setGroup] = useState<InterestGroup | null>(null);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('confessions');
  const [isMember, setIsMember] = useState(false);

  const fetchGroupData = useCallback(async () => {
    setLoading(true);
    try {
      // 并行获取圈子信息、表白和成员
      const [groupRes, confessionsRes, membersRes] = await Promise.all([
        fetch(`/api/interest-groups/${groupId}`),
        fetch(`/api/interest-groups/${groupId}/confessions`),
        fetch(`/api/interest-groups/${groupId}/members`)
      ]);

      const groupData = await groupRes.json();
      const confessionsData = await confessionsRes.json();
      const membersData = await membersRes.json();

      setGroup(groupData);
      setConfessions(confessionsData.confessions || []);
      setMembers(membersData || []);

      // 检查当前用户是否是成员（简化实现，实际应该从认证信息中获取user_id）
      // 这里假设我们有一个获取当前用户ID的方法
      // const currentUserId = getCurrentUserId();
      // setIsMember(membersData.some(member => member.user_id === currentUserId));
    } catch (error) {
      console.error('Failed to fetch group data:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId, fetchGroupData]);

  const handleJoinGroup = async () => {
    try {
      const response = await fetch(`/api/interest-groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchGroupData();
        setIsMember(true);
      }
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const response = await fetch(`/api/interest-groups/${groupId}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchGroupData();
        setIsMember(false);
      }
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  if (loading || !group) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 圈子头部 */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="h-60 bg-gradient-to-r from-blue-400 to-purple-500 relative">
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
          <div className="absolute top-4 left-4 bg-white rounded-full p-3">
            <span className="text-3xl">{group.icon}</span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
              <p className="text-gray-600 mb-4">{group.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{group.member_count} 成员</span>
                <span>{group.is_public ? '公开圈子' : '私有圈子'}</span>
                <span>创建于 {new Date(group.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {isMember ? (
                <button
                  onClick={handleLeaveGroup}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-full text-sm"
                >
                  退出圈子
                </button>
              ) : (
                <button
                  onClick={handleJoinGroup}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm"
                >
                  加入圈子
                </button>
              )}
              <button
                onClick={() => router.push(`/create?groupId=${group.id}`)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm"
              >
                发布表白
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('confessions')}
            className={`px-6 py-3 font-medium ${activeTab === 'confessions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            圈子表白墙
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 font-medium ${activeTab === 'members' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            成员列表
          </button>
        </div>

        {/* 表白墙内容 */}
        {activeTab === 'confessions' && (
          <div className="p-6">
            {confessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <p>还没有表白，快来发布第一条吧！</p>
              </div>
            ) : (
              <div className="space-y-6">
                {confessions.map((confession) => (
                  <ConfessionCard key={confession.id} confession={confession} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 成员列表内容 */}
        {activeTab === 'members' && (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map((member) => (
                <motion.div
                  key={member.user_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {member.users.avatar_url ? (
                      <Image
                        src={member.users.avatar_url}
                        alt={member.users.username}
                        width={40}
                        height={40}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      member.users.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{member.users.username}</div>
                    <div className="text-xs text-gray-500">{member.role}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterestGroupDetail;
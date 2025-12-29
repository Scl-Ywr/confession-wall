'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  condition: number;
  reward_points: number;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  progress: number;
  is_unlocked: boolean;
  achievements: Achievement;
}

interface UserLevel {
  user_id: string;
  current_level: number;
  total_points: number;
  next_level_points: number;
  updated_at: string;
}

const AchievementPanel: React.FC = () => {
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    try {
      // 获取用户成就
      const achievementsResponse = await fetch(`/api/users/${userId}/achievements`);
      const achievementsData = await achievementsResponse.json();
      setUserAchievements(achievementsData);

      // 获取用户等级
      const levelResponse = await fetch(`/api/users/${userId}/level`);
      const levelData = await levelResponse.json();
      setLevel(levelData);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchAchievements();
    }
  }, [userId, fetchAchievements]);

  // 过滤成就
  const filteredAchievements = userAchievements.filter(achievement => {
    if (filter === 'unlocked') return achievement.is_unlocked;
    if (filter === 'locked') return !achievement.is_unlocked;
    return true;
  });

  if (loading || !level) {
    return <div className="text-center py-8">加载中...</div>;
  }

  // 计算等级进度百分比
  const progressPercentage = Math.min(100, (level.total_points / level.next_level_points) * 100);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">我的成就</h1>

      {/* 等级信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-md p-6 mb-8"
      >
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {level.current_level}
            </div>
            <div>
              <h2 className="text-xl font-bold">等级 {level.current_level}</h2>
              <p className="text-gray-600">总积分: {level.total_points}</p>
            </div>
          </div>
          
          <div className="w-full md:w-1/2">
            <div className="flex justify-between text-sm mb-1">
              <span>当前积分</span>
              <span>{level.total_points} / {level.next_level_points}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1 }}
                className="bg-gradient-to-r from-blue-400 to-purple-500 h-4 rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 成就过滤 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          全部成就
        </button>
        <button
          onClick={() => setFilter('unlocked')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'unlocked' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          已解锁
        </button>
        <button
          onClick={() => setFilter('locked')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'locked' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          未解锁
        </button>
      </div>

      {/* 成就列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAchievements.map((userAchievement) => {
          const { achievements, progress, is_unlocked } = userAchievement;
          const progressPercentage = Math.min(100, (progress / achievements.condition) * 100);
          
          return (
            <motion.div
              key={userAchievement.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`bg-white rounded-xl shadow-md overflow-hidden ${is_unlocked ? '' : 'opacity-70'}`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${is_unlocked ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {achievements.icon}
                    </div>
                    <div>
                      <h3 className="font-bold">{achievements.name}</h3>
                      <p className="text-sm text-gray-500">{achievements.description}</p>
                    </div>
                  </div>
                  {is_unlocked && (
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                      已解锁
                    </div>
                  )}
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>进度</span>
                    <span>{progress} / {achievements.condition}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${is_unlocked ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-blue-400 to-purple-500'}`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  奖励: {achievements.reward_points} 积分
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementPanel;
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Profile } from '@/types/chat';
import { ChatInterface } from '@/components/ChatInterface';
import Navbar from '@/components/Navbar';
import { chatService } from '@/services/chatService';

const ChatPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [otherUserProfile, setOtherUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnfriendedModal, setShowUnfriendedModal] = useState(false);

  useEffect(() => {
    const fetchUserProfileAndFriendship = async () => {
      try {
        // 获取用户资料
        const profile = await chatService.getUserProfile(userId);
        setOtherUserProfile(profile);
        
        // 检查好友关系状态，无论profile是否存在都执行
        const status = await chatService.checkFriendshipStatus(userId);
        
        // 如果不是好友关系，显示提示弹窗
        if (status === 'none') {
          setShowUnfriendedModal(true);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfileAndFriendship();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (!otherUserProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">用户不存在</h2>
            <p className="text-gray-500 dark:text-gray-400">无法找到该用户的资料</p>
          </div>
        </div>
      </div>
    );
  }

  // 处理弹窗确定按钮点击
  const handleModalConfirm = () => {
    setShowUnfriendedModal(false);
    router.push('/chat'); // 返回聊天列表页
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            与 {otherUserProfile.display_name || otherUserProfile.username} 聊天
          </h1>
        </div>
        <ChatInterface otherUserId={userId} otherUserProfile={otherUserProfile} />
      </main>
      
      {/* 好友关系解除提示弹窗 */}
      {showUnfriendedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">好友关系已解除</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                你们的好友关系已解除，若需继续交流，请重新搜索该用户并发送好友请求
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleModalConfirm}
                className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-primary-500/30"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;

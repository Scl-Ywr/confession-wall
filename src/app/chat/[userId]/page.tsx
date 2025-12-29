'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Profile } from '@/types/chat';
import { ChatInterface } from '@/components/ChatInterface';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import PageLoader from '@/components/PageLoader';

const ChatPage = () => {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [otherUserProfile, setOtherUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnfriendedModal, setShowUnfriendedModal] = useState(false);

  useEffect(() => {
  }, [user]);

  useEffect(() => {
    const fetchUserProfileAndFriendship = async () => {
      if (authLoading) {
        return;
      }
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        const profile = await chatService.getUserProfile(userId);
        
        if (!profile) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const retryProfile = await chatService.getUserProfile(userId);
          setOtherUserProfile(retryProfile);
        } else {
          setOtherUserProfile(profile);
        }
        
        const status = await chatService.checkFriendshipStatus(userId);
        
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
  }, [userId, user, authLoading]);

  if (loading) {
    return (
      <PageLoader 
        type="spinner" 
        message="正在加载聊天记录..." 
        showNavbar={true}
        fullscreen={true}
      />
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-120px)] flex items-center justify-center">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded-lg max-w-md w-full shadow-lg">
            <div className="flex items-center gap-3">
              <div className="text-yellow-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-300 text-lg">请登录</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                  您需要登录才能使用聊天功能
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Link
                href="/auth/login"
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors shadow-md hover:shadow-lg"
              >
                去登录
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!otherUserProfile || !userId) {
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

  const handleModalConfirm = () => {
    setShowUnfriendedModal(false);
    router.push('/chat');
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

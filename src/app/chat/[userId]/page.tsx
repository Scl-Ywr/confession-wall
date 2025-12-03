'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Profile } from '@/types/chat';
import { ChatInterface } from '@/components/ChatInterface';
import Navbar from '@/components/Navbar';
import { chatService } from '@/services/chatService';

const ChatPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [otherUserProfile, setOtherUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // 使用chatService获取用户资料
        const profile = await chatService.getUserProfile(userId);
        setOtherUserProfile(profile);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
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
    </div>
  );
};

export default ChatPage;

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserSearch } from '@/components/UserSearch';
import { Profile } from '@/types/chat';
import Navbar from '@/components/Navbar';
import { UserSearchIcon, MessageCircleIcon } from 'lucide-react';

const UserSearchPage = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <UserSearchIcon className="h-6 w-6 text-primary-500" />
            查找用户
          </h1>
          <button
            onClick={() => window.location.href = '/chat'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
          >
            <MessageCircleIcon className="h-4 w-4" />
            返回聊天
          </button>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <UserSearch 
            onUserSelect={setSelectedUser} 
            currentUserId={user?.id || ''}
          />
        </div>
      </main>
    </div>
  );
};

export default UserSearchPage;

'use client';

import React, { useState } from 'react';
import { chatService } from '@/services/chatService';

type FriendRequestFormProps = {
  receiverId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function FriendRequestForm({ receiverId, onSuccess, onCancel }: FriendRequestFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await chatService.sendFriendRequest(receiverId, message);
      onSuccess();
    } catch (error) {
      console.error('Failed to send friend request:', error);
      // 这里可以添加错误提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">发送好友申请</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            申请理由（可选）
          </label>
          <textarea
            id="message"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            placeholder="请输入申请理由..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? '发送中...' : '发送申请'}
          </button>
        </div>
      </form>
    </div>
  );
}

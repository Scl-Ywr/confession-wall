// 系统设置页面
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getSystemSettings } from '@/services/admin/adminService';
import { toast } from 'react-hot-toast';

interface SystemSettings {
  siteTitle: string;
  siteDescription: string;
  enableAnonymousConfessions: boolean;
  enableComments: boolean;
  enableFriendSystem: boolean;
  enableChatSystem: boolean;
  maxConfessionLength: number;
  maxCommentLength: number;
  defaultPageSize: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    siteTitle: '表白墙',
    siteDescription: '一个匿名表白平台',
    enableAnonymousConfessions: true,
    enableComments: true,
    enableFriendSystem: true,
    enableChatSystem: true,
    maxConfessionLength: 500,
    maxCommentLength: 200,
    defaultPageSize: 10
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  // 加载初始设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setInitialLoading(true);
        const savedSettings = await getSystemSettings();
        setSettings(savedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('加载设置失败');
      } finally {
        setInitialLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 处理表单变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value, type } = target;
    
    let fieldValue: string | number | boolean = value;
    
    if (type === 'checkbox' && 'checked' in target) {
      fieldValue = target.checked;
    } else if (type === 'number') {
      fieldValue = parseInt(value) || 0;
    }
    
    setSettings(prev => ({
      ...prev,
      [name]: fieldValue
    }));
  };

  // 保存设置
  const handleSave = async () => {
    try {
      setLoading(true);
      // 通过API路由保存设置，以便正确记录日志
      const response = await fetch('/api/admin/save-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('系统设置保存成功');
      } else {
        toast.error(`保存设置失败：${result.error || '未知错误'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存设置失败';
      toast.error(errorMessage);
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">系统设置</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理系统的各项配置</p>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* 标签页导航 */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'basic' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              基本设置
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'features' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              功能开关
            </button>
            <button
              onClick={() => setActiveTab('limits')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'limits' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              内容限制
            </button>
          </div>

          {/* 表单内容 */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'basic' && '基本设置'}
                {activeTab === 'features' && '功能开关'}
                {activeTab === 'limits' && '内容限制'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                {/* 基本设置 */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">网站标题</label>
                      <input
                        type="text"
                        name="siteTitle"
                        value={settings.siteTitle}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="输入网站标题"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">网站描述</label>
                      <textarea
                        name="siteDescription"
                        value={settings.siteDescription}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="输入网站描述"
                      ></textarea>
                    </div>
                  </div>
                )}

                {/* 功能开关 */}
                {activeTab === 'features' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">允许匿名表白</label>
                      <input
                        type="checkbox"
                        name="enableAnonymousConfessions"
                        checked={settings.enableAnonymousConfessions}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">允许评论</label>
                      <input
                        type="checkbox"
                        name="enableComments"
                        checked={settings.enableComments}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用好友系统</label>
                      <input
                        type="checkbox"
                        name="enableFriendSystem"
                        checked={settings.enableFriendSystem}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用聊天系统</label>
                      <input
                        type="checkbox"
                        name="enableChatSystem"
                        checked={settings.enableChatSystem}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  </div>
                )}

                {/* 内容限制 */}
                {activeTab === 'limits' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">表白最大长度</label>
                      <input
                        type="number"
                        name="maxConfessionLength"
                        value={settings.maxConfessionLength}
                        onChange={handleChange}
                        min="100"
                        max="2000"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">限制表白内容的最大字符数</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">评论最大长度</label>
                      <input
                        type="number"
                        name="maxCommentLength"
                        value={settings.maxCommentLength}
                        onChange={handleChange}
                        min="50"
                        max="1000"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">限制评论内容的最大字符数</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">默认分页大小</label>
                      <input
                        type="number"
                        name="defaultPageSize"
                        value={settings.defaultPageSize}
                        onChange={handleChange}
                        min="5"
                        max="50"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">列表默认显示的条数</p>
                    </div>
                  </div>
                )}

                {/* 保存按钮 */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={async () => {
                      // 从API重新获取设置
                      try {
                        const savedSettings = await getSystemSettings();
                        setSettings(savedSettings);
                        toast.success('设置已重置');
                      } catch (error) {
                        console.error('Failed to reset settings:', error);
                        toast.error('重置设置失败');
                      }
                    }}
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? '保存中...' : '保存设置'}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 系统信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>系统信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">系统版本</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">v1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">最后更新时间</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">服务器状态</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">正常</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
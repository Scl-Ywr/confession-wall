'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function OAuthTest() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [hostname, setHostname] = useState<string>('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
    setHostname(window.location.hostname);
  }, []);

  const testOAuth = async () => {
    setLoading(true);
    setResult('正在启动 OAuth 流程...');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        setResult(`错误: ${error.message}`);
      } else {
        setResult('成功启动 OAuth 流程，应该会跳转到 GitHub');
      }
    } catch (error) {
      setResult(`异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const checkSupabaseConfig = () => {
    const config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      currentOrigin: window.location.origin,
      shouldRedirectTo: `${window.location.origin}/auth/callback`,
    };
    setResult(JSON.stringify(config, null, 2));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">OAuth 配置诊断工具</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">当前环境信息</h2>
            <div className="bg-gray-100 p-3 rounded text-sm">
              <p><strong>当前URL:</strong> {currentUrl || '加载中...'}</p>
              <p><strong>环境:</strong> {hostname || '加载中...'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={checkSupabaseConfig}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              检查 Supabase 配置
            </button>

            <button
              onClick={testOAuth}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试 GitHub OAuth'}
            </button>
          </div>

          {result && (
            <div>
              <h3 className="font-semibold mb-2">结果:</h3>
              <div className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap">
                {result}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">🔧 如果仍然跳转到生产域名：</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. 确保访问的是: http://localhost:3000/oauth-test</li>
            <li>2. 清除浏览器缓存 (Ctrl+Shift+Delete)</li>
            <li>3. 修改 GitHub OAuth App 配置：
              <ul className="ml-4 mt-1">
                <li>• Homepage URL: http://localhost:3000</li>
                <li>• Authorization callback URL: https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback</li>
              </ul>
            </li>
            <li>4. 在 Supabase Dashboard 中启用 GitHub Provider</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

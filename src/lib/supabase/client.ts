import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // 确保会话持久化
      persistSession: true,
      // 配置邮箱验证相关设置
      flowType: 'pkce',
      // 确保会话状态正确管理
      autoRefreshToken: true,
      // 确保在服务器端渲染时不会出错
      detectSessionInUrl: true,
    },
    realtime: {
      // 设置心跳间隔
      heartbeatIntervalMs: 30000
    },
    storage: {
      // 配置存储的缓存控制头
      cacheControl: 'public, max-age=31536000, immutable',
      // 设置请求超时时间
      timeout: 30000,
    }
  }
);

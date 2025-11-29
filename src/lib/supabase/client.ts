import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      // 配置邮箱验证相关设置
      // 移除无效的autoSignIn配置
      // 移除直接使用window对象的emailRedirectTo配置，改为在register方法中动态设置
    },
    global: {
      // 确保API key被正确传递
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    },
  }
);

import { createBrowserClient } from '@supabase/ssr';

// 使用 Supabase 的默认 cookie 处理器
// 这是最可靠的方式，无需自定义实现
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

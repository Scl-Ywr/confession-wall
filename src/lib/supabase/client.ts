import { createBrowserClient } from '@supabase/ssr';

// 使用 Supabase 的默认 cookie 处理器
// 这是最可靠的方式，无需自定义实现
let supabaseClient;

try {
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
} catch (error) {
  console.error('Error creating Supabase client:', error);
  // 创建一个模拟的 Supabase 客户端，防止客户端应用崩溃
  supabaseClient = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => () => {}
    },
    from: () => ({
      select: () => ({
        order: () => ({
          range: () => Promise.resolve({ data: [], error: null })
        }),
        eq: () => ({
          select: () => Promise.resolve({ data: [], error: null })
        }),
        in: () => ({
          select: () => Promise.resolve({ data: [], error: null })
        })
      }),
      rpc: () => Promise.resolve({ data: [], error: null })
    })
  } as any;
}

export const supabase = supabaseClient;

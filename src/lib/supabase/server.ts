import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Create a simple cookie store adapter that matches Supabase SSR requirements
export async function createSupabaseServerClient() {
  // Get the cookie store once at the beginning
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options?: Record<string, unknown>) => {
          // Only pass used options to avoid TypeScript errors
          cookieStore.set(name, value, options as Record<string, unknown>);
        },
        remove: (name: string) => {
          cookieStore.delete(name);
        },
      },
    }
  );
}

// 创建用于服务器端管理操作的Supabase客户端，使用服务角色密钥
export async function createSupabaseAdminClient() {
  // Get the cookie store once at the beginning
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options?: Record<string, unknown>) => {
          // Only pass used options to avoid TypeScript errors
          cookieStore.set(name, value, options as Record<string, unknown>);
        },
        remove: (name: string) => {
          cookieStore.delete(name);
        },
      },
    }
  );
}

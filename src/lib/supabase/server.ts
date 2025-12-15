import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a simple cookie store adapter that matches Supabase SSR requirements
// This version works in both middleware and server components
export async function createSupabaseServerClient(request?: Request) {
  // For middleware and API routes, use the request's cookies
  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    

    
    // 解析cookies
    const parsedCookies = cookieHeader
      .split(';')
      .map(cookie => cookie.trim())
      .filter(cookie => cookie.length > 0)
      .map(cookie => {
        const [name, ...valueParts] = cookie.split('=');
        return { name: name.trim(), value: valueParts.join('=').trim() };
      });
    

    
    // 检查是否有supabase会话cookie
    parsedCookies.find(cookie => cookie.name.startsWith('sb-'));

    
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => parsedCookies,
          setAll: () => {
            // Not needed in middleware/API context
          },
        },
      }
    );
  }
  
  // For server components, use the cookie store from next/headers
  // Note: In some environments like server components, cookies() might be a sync function
  // but in API routes/middleware, it returns a Promise. We need to handle both cases.
  const cookiesResult = cookies();
  
  // 确保我们获得的是实际的cookie store对象，而不是Promise
  let cookieStore;
  if (cookiesResult instanceof Promise) {
    cookieStore = await cookiesResult;
  } else {
    cookieStore = cookiesResult;
  }
  
  // 获取初始cookie列表用于日志记录
  const initialCookies = cookieStore.getAll();
  
  
  // 检查是否有supabase会话cookie
  initialCookies.some(cookie => cookie.name.startsWith('sb-'));
  
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          // 实时获取所有cookies，确保返回最新的cookie列表
          const currentCookies = cookieStore.getAll();

          return currentCookies;
        },
        setAll: () => {
          // 在服务器组件中，我们不能设置cookies，只能在Server Actions或Route Handlers中设置
          // 因此我们需要跳过这里的cookie设置，避免在服务器组件中抛出错误
          // 不使用console.debug以避免source map解析问题
        },
      },
    }
  );
}

// 创建用于服务器端管理操作的Supabase客户端，使用服务角色密钥
export function createSupabaseAdminClient() {
  // 使用@supabase/supabase-js包中的createClient函数创建管理员客户端
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  return supabaseAdmin;
}

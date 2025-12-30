import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 使用更简单的方式实现中间件，避免复杂的cookie处理
  const response = NextResponse.next();
  
  // 直接从request中获取cookies
  const cookies = request.cookies.getAll();
  
  // 创建Supabase客户端，使用更简单的cookie处理
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies;
        },
        setAll(newCookies) {
          // 只在response中设置cookies，不修改request
          newCookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  // 调用getUser()检查认证状态
  await supabase.auth.getUser();
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

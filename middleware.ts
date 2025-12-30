import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 不再直接修改request.cookies，只修改response的cookies
          // 创建一个新的请求头，包含所有cookies
          const newHeaders = new Headers(request.headers);
          
          // 创建一个新的Response对象
          supabaseResponse = NextResponse.next({
            request: new NextRequest(request.url, {
              headers: newHeaders,
              method: request.method,
              body: request.body,
              redirect: request.redirect,
              cache: request.cache,
              credentials: request.credentials,
              integrity: request.integrity,
              keepalive: request.keepalive,
              referrer: request.referrer,
              referrerPolicy: request.referrerPolicy,
              signal: request.signal,
            }),
          });
          
          // 在response上设置所有cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

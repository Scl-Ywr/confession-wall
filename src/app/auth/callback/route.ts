import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  console.log('[Server OAuth Callback] Processing callback:', {
    hasCode: !!code,
    origin: requestUrl.origin,
    next
  });

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              console.error('[Server OAuth Callback] Error setting cookies:', error);
            }
          },
        },
      }
    );

    console.log('[Server OAuth Callback] Exchanging code for session...');

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[Server OAuth Callback] Exchange error:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?error=${encodeURIComponent(error.message)}`
        );
      }

      if (data.session) {
        console.log('[Server OAuth Callback] Session established:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          provider: data.session.user.app_metadata?.provider
        });

        // 重定向到首页或指定页面
        return NextResponse.redirect(`${requestUrl.origin}${next}`);
      }
    } catch (err) {
      console.error('[Server OAuth Callback] Exception:', err);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/login?error=${encodeURIComponent('登录失败，请重试')}`
      );
    }
  }

  console.error('[Server OAuth Callback] No code provided');
  return NextResponse.redirect(
    `${requestUrl.origin}/auth/login?error=${encodeURIComponent('无效的授权码')}`
  );
}

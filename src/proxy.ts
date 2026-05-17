import { createServerClient } from '@supabase/ssr';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_BOOTSTRAP_API_ROUTES = new Set(['/api/admin/register']);

function isAdminPath(pathname: string) {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/');
}

function createAdminAuthResponse(request: NextRequest, status: 401 | 403, message: string) {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json({ error: message }, { status });
  }

  const loginUrl = new URL('/auth/admin-login', request.url);
  loginUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value }) =>
            supabaseResponse.cookies.set(name, value)
          );
        },
      },
    }
  );

  let user: SupabaseUser | null = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    user = data.user;
  } catch (error) {
    console.error('Error getting user in proxy:', error);
  }

  const pathname = request.nextUrl.pathname;
  if (isAdminPath(pathname) && !ADMIN_BOOTSTRAP_API_ROUTES.has(pathname)) {
    if (!user) {
      return createAdminAuthResponse(request, 401, 'Unauthorized: admin login required');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking admin permissions in proxy:', profileError);
      return createAdminAuthResponse(request, 403, 'Forbidden: failed to verify admin permissions');
    }

    if (!profile?.is_admin) {
      return createAdminAuthResponse(request, 403, 'Forbidden: admin access required');
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

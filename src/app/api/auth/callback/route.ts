import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

interface CookieItem {
  name: string;
  value: string;
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get('cookie');
    const allCookies: CookieItem[] = [];
    
    if (cookieHeader) {
      const parsedCookies = cookieHeader.split(';').map(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        return {
          name: name.trim(),
          value: valueParts.join('=').trim()
        };
      });
      
      allCookies.push(...parsedCookies);
    } else {
      console.warn('[OAuth Callback API] No Cookie header found!');
    }
    
    if (allCookies.length === 0) {
      const requestCookies = request.cookies.getAll();
      allCookies.push(...requestCookies);
      console.log('[OAuth Callback API] Using request.cookies:', requestCookies.map(c => c.name));
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return allCookies;
          },
          setAll() {
          },
        },
      }
    );
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('[OAuth Callback API] Exchange error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('[OAuth Callback API] Exchange successful:', {
      userId: data.session?.user.id,
      provider: data.session?.user.app_metadata?.provider,
    });

    return NextResponse.json({
      success: true,
      session: {
        userId: data.session?.user.id,
        email: data.session?.user.email,
        provider: data.session?.user.app_metadata?.provider,
      }
    });
  } catch (error) {
    console.error('[OAuth Callback API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

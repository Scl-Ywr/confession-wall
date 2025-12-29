import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient(request?: Request) {
  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    
    const parsedCookies = cookieHeader
      .split(';')
      .map(cookie => cookie.trim())
      .filter(cookie => cookie.length > 0)
      .map(cookie => {
        const [name, ...valueParts] = cookie.split('=');
        return { name: name.trim(), value: valueParts.join('=').trim() };
      });
    
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parsedCookies;
          },
          setAll() {
          },
        },
      }
    );
  }
  
  const cookiesResult = cookies();
  
  let cookieStore;
  if (cookiesResult instanceof Promise) {
    cookieStore = await cookiesResult;
  } else {
    cookieStore = cookiesResult;
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
          }
        },
      },
    }
  );
}

export function createSupabaseAdminClient() {
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

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient(request?: Request) {
  try {
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
  } catch (error) {
    console.error('Error creating Supabase server client:', error);
    // 返回一个模拟的Supabase客户端，防止API路由崩溃
    return {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              in: () => ({
                single: () => ({ data: null, error: null }),
                then: (callback) => callback({ data: null, error: null })
              }),
              single: () => ({ data: null, error: null }),
              then: (callback) => callback({ data: null, error: null })
            }),
            single: () => ({ data: null, error: null }),
            then: (callback) => callback({ data: null, error: null })
          }),
          single: () => ({ data: null, error: null }),
          then: (callback) => callback({ data: null, error: null })
        }),
        insert: () => ({
          select: () => ({
            single: () => ({ data: null, error: null }),
            then: (callback) => callback({ data: null, error: null })
          }),
          then: (callback) => callback({ data: null, error: null })
        }),
        update: () => ({
          select: () => ({
            single: () => ({ data: null, error: null }),
            then: (callback) => callback({ data: null, error: null })
          }),
          then: (callback) => callback({ data: null, error: null })
        }),
        delete: () => ({
          select: () => ({
            single: () => ({ data: null, error: null }),
            then: (callback) => callback({ data: null, error: null })
          }),
          then: (callback) => callback({ data: null, error: null })
        }),
        in: () => ({
          select: () => ({
            single: () => ({ data: null, error: null }),
            then: (callback) => callback({ data: null, error: null })
          }),
          then: (callback) => callback({ data: null, error: null })
        }),
        eq: () => ({
          select: () => ({
            single: () => ({ data: null, error: null }),
            then: (callback) => callback({ data: null, error: null })
          }),
          then: (callback) => callback({ data: null, error: null })
        })
      }),
      rpc: () => ({ data: null, error: new Error('Supabase connection failed') })
    } as any;
  }
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

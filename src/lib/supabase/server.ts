import { createServerClient } from '@supabase/ssr';
import { cookies as nextCookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookiesStore = await nextCookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookiesStore.get(name)?.value;
        },
        set: (name: string, value: string) => {
          // Only set the name and value, ignore other options for now
          cookiesStore.set(name, value);
        },
        remove: (name: string) => {
          cookiesStore.delete(name);
        },
      },
    }
  );
}

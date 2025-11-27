import { supabase } from './client';

// Test the Supabase client configuration
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Supabase Client:', supabase);

// Test a simple request
async function testRequest() {
  try {
    const { data, error } = await supabase.from('confessions').select('id').limit(1);
    console.log('Test Request Data:', data);
    console.log('Test Request Error:', error);
  } catch (error) {
    console.error('Test Request Failed:', error);
  }
}

testRequest();

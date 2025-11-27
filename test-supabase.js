const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  'https://ltbacrfoksjzfszpsmow.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0YmFjcmZva3NqemZzenBzbW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzc3NzcsImV4cCI6MjA3OTYxMzc3N30.qcTjIabDQC1cRDRvt4X4NKCHNe58KWXzWr89g5u-5xQ'
);

// Test a simple select query
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test 1: Get confessions
    const { data: confessions, error: confessionsError } = await supabase
      .from('confessions')
      .select('id, content')
      .limit(1);
    
    if (confessionsError) {
      console.error('Error getting confessions:', confessionsError);
    } else {
      console.log('Success! Got confessions:', confessions);
    }
    
    // Test 2: Check if likes table exists
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('id')
      .limit(1);
    
    if (likesError) {
      console.error('Error getting likes:', likesError);
    } else {
      console.log('Success! Got likes:', likes);
    }
    
    console.log('All tests completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSupabaseConnection();

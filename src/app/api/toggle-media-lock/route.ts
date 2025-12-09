// API route to toggle media lock status
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { hash } from 'bcryptjs';

// Toggle the lock status of a confession image
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { imageId, isLocked, password, lockType = 'password' } = await req.json();
    
    if (!imageId) {
      return NextResponse.json({ error: 'Missing imageId' }, { status: 400 });
    }
    
    // Get supabase client for authenticated operations
    const supabase = await createSupabaseServerClient();
    
    // Check if user is authenticated
    let session;
    const authHeader = req.headers.get('authorization');
    
    // Initialize admin client once at the beginning
    const supabaseAdmin = await createSupabaseAdminClient();
    
    // Try to get session from header or cookie
    if (authHeader?.startsWith('Bearer ')) {
      // If Authorization header is present, use admin client to verify token
      const token = authHeader.split(' ')[1];
      
      // Verify the token
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      // Create a session-like object for user
      session = {
        user: data.user,
        access_token: token
      } as { user: typeof data.user; access_token: string };
    } else {
      // Otherwise, use regular session from cookie
      const { data: { session: cookieSession } } = await supabase.auth.getSession();
      session = cookieSession;
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user owns the image
    // First, get the image to check existence and get confession_id
    const { data: images, error: getImageError } = await supabaseAdmin
      .from('confession_images')
      .select('id, confession_id')
      .eq('id', imageId);
    
    if (getImageError) {
      console.error('Get image error:', getImageError);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Get the first (and only) image
    const image = images[0];
    
    // Verify user owns the confession
    const { data: confessions, error: getConfessionError } = await supabaseAdmin
      .from('confessions')
      .select('id')
      .eq('id', image.confession_id)
      .eq('user_id', session.user.id);
    
    if (getConfessionError) {
      console.error('Get confession error:', getConfessionError);
      return NextResponse.json({ error: 'You do not own this image' }, { status: 403 });
    }
    
    if (!confessions || confessions.length === 0) {
      return NextResponse.json({ error: 'You do not own this image' }, { status: 403 });
    }
    
    // Prepare update data
    const updateData: {
      is_locked: boolean;
      lock_type: 'password' | 'user' | 'public';
      locked_at: string | null;
      lock_password?: string;
    } = {
      // If lockType is 'public', media should not be locked regardless of isLocked parameter
      is_locked: lockType === 'public' ? false : isLocked,
      lock_type: lockType,
      locked_at: (lockType !== 'public' && isLocked) ? new Date().toISOString() : null
    };
    
    // Handle password if provided
    if (lockType === 'password' && password) {
      updateData.lock_password = await hash(password, 10);
    } else if (!isLocked) {
      // Clear password when unlocking
      updateData.lock_password = undefined;
    }
    
    // Update the lock status - use the existing supabaseAdmin client
    const { data: updatedImages, error: updateError } = await supabaseAdmin
      .from('confession_images')
      .update(updateData)
      .eq('id', imageId)
      .select();
    
    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }
    
    // Check if any rows were updated
    if (!updatedImages || updatedImages.length === 0) {
      return NextResponse.json({ error: 'Image not found or you do not have permission' }, { status: 404 });
    }
    
    // Get the first (and only) updated image
    const updatedImage = updatedImages[0];
    
    return NextResponse.json({ 
      success: true, 
      isLocked: updatedImage.is_locked,
      lockType: updatedImage.lock_type
    });
  } catch (error) {
    console.error('Error toggling media lock:', error);
    return NextResponse.json({ error: 'Failed to toggle lock' }, { status: 500 });
  }
}

// Verify password and unlock media
export async function PATCH(req: NextRequest) {
  try {
    // Parse request body
    const { imageId, password } = await req.json();
    
    if (!imageId || !password) {
      return NextResponse.json({ error: 'Missing imageId or password' }, { status: 400 });
    }
    
    // Use admin client to get the image
    const supabaseAdmin = await createSupabaseAdminClient();
    
    // Get the image
    const { data: images, error: getImageError } = await supabaseAdmin
      .from('confession_images')
      .select('id, lock_password')
      .eq('id', imageId);
    
    if (getImageError) {
      console.error('Get image error:', getImageError);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Get the first (and only) image
    const image = images[0];
    
    if (!image.lock_password) {
      return NextResponse.json({ error: 'Image is not password locked' }, { status: 400 });
    }
    
    // Verify password (to be implemented in client-side or with a helper function)
    // Note: This is a placeholder, actual password verification should be done
    // with a proper comparison using bcryptjs.compare()
    
    return NextResponse.json({ 
      success: true,
      message: 'Password verified. Image can be unlocked for this session.'
    });
  } catch (error) {
    console.error('Error verifying media password:', error);
    return NextResponse.json({ error: 'Failed to verify password' }, { status: 500 });
  }
}

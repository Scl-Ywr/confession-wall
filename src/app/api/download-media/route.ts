// API route to handle media downloads with authorization
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import bcryptjs from 'bcryptjs';

// Simple in-memory rate limiting store - for production use Redis or database
interface RateLimitEntry {
  count: number;
  lastReset: number;
}

// Store for rate limiting - key: IP address, value: RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX = 10; // 10 downloads per minute per IP

// Check rate limit for a given IP address
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  
  if (!entry) {
    // First request from this IP, create entry
    rateLimitStore.set(ip, {
      count: 1,
      lastReset: now
    });
    return true;
  }
  
  // Check if window has expired
  if (now - entry.lastReset > RATE_LIMIT_WINDOW) {
    // Reset counter for new window
    rateLimitStore.set(ip, {
      count: 1,
      lastReset: now
    });
    return true;
  }
  
  // Check if count exceeds limit
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  // Increment count
  rateLimitStore.set(ip, {
    count: entry.count + 1,
    lastReset: entry.lastReset
  });
  return true;
}

// Download a confession image or video with authorization checks
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const imageId = url.searchParams.get('imageId');
    const password = url.searchParams.get('password');
    
    if (!imageId) {
      return NextResponse.json({ error: 'Missing imageId' }, { status: 400 });
    }
    
    // Get admin client for server-side operations
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get the image and its associated confession
    const { data: images, error: getImageError } = await supabaseAdmin
      .from('confession_images')
      .select('id, image_url, is_locked, lock_type, lock_password, confession_id')
      .eq('id', imageId);
    
    if (getImageError) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Get the first (and only) image
    const image = images[0];
    
    // Get authenticated user session - required for all downloads
    let session;
    const authHeader = req.headers.get('authorization');
    
    // Try to get session from header or cookie
    if (authHeader?.startsWith('Bearer ')) {
      // If Authorization header is present, use admin client to verify token
      const token = authHeader.split(' ')[1];
      
      // Verify the token
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && data.user) {
        session = {
          user: data.user,
          access_token: token
        } as { user: typeof data.user; access_token: string };
      }
    } 
    
    if (!session) {
      // Try to get session from cookie if header auth failed
      const supabase = await createSupabaseServerClient();
      const { data: { session: cookieSession } } = await supabase.auth.getSession();
      session = cookieSession;
    }
    
    // Check if media is locked
    if (image.is_locked) {
      // Check lock type and handle accordingly
      switch (image.lock_type) {
        case 'password':
          if (!password || !image.lock_password) {
            return NextResponse.json({ error: 'Media is locked. Please provide password.' }, { status: 401 });
          }
          // Verify password using bcryptjs
          const isPasswordValid = await bcryptjs.compare(password, image.lock_password);
          if (!isPasswordValid) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
          }
          break;
          
        case 'user':
          if (!session) {
            return NextResponse.json({ error: 'Please log in to download this media' }, { status: 401 });
          }
          // Allow any logged-in user to download
          break;
          
        case 'public':
          // Get client IP for rate limiting
          const clientIpPublic = req.headers.get('x-forwarded-for') || 'unknown';
          
          // Check rate limit for public locked media
          if (!checkRateLimit(clientIpPublic)) {
            return NextResponse.json(
              { error: 'Download limit exceeded. Please try again later.' },
              { status: 429 }
            );
          }
          break;
          
        default:
          return NextResponse.json({ error: 'Invalid lock type' }, { status: 400 });
      }
    } 
    
    // Apply rate limiting for all public downloads (even if not locked)
    if (!image.is_locked) {
      // Get client IP for rate limiting
      const clientIpPublic = req.headers.get('x-forwarded-for') || 'unknown';
      
      // Check rate limit for public downloads
      if (!checkRateLimit(clientIpPublic)) {
        return NextResponse.json(
          { error: 'Download limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }
    
    // Fetch the media file from the URL
    const mediaResponse = await fetch(image.image_url);
    
    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch media file: ${mediaResponse.status} ${mediaResponse.statusText}`);
    }
    
    // Get the content type from the response
    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream';
    
    // Extract filename from URL
    const filename = image.image_url.split('/').pop() || `media_${image.id}`;
    
    // Create a response with the media content
    return new NextResponse(mediaResponse.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error handling media download:', error);
    return NextResponse.json({ error: 'Failed to download media' }, { status: 500 });
  }
}

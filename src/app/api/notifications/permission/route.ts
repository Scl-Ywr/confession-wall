import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'requestPermission') {
      if (typeof window === 'undefined') {
        return NextResponse.json({ error: 'Not available in server context' }, { status: 400 });
      }

      if (!('Notification' in window)) {
        return NextResponse.json({ error: 'Browser does not support notifications' }, { status: 400 });
      }

      if (Notification.permission === 'granted') {
        return NextResponse.json({ permission: 'granted' });
      }

      if (Notification.permission === 'denied') {
        return NextResponse.json({ permission: 'denied' });
      }

      const permission = await Notification.requestPermission();
      return NextResponse.json({ permission });
    }

    if (action === 'checkPermission') {
      if (typeof window === 'undefined') {
        return NextResponse.json({ permission: 'unavailable' });
      }

      if (!('Notification' in window)) {
        return NextResponse.json({ permission: 'unsupported' });
      }

      return NextResponse.json({ permission: Notification.permission });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

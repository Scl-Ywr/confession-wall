import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 获取用户通知
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // 获取用户通知
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`*
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: `Failed to fetch notifications: ${error.message}` }, { status: 500 });
    }
    
    // 分别获取发送者资料，避免关联查询失败
    if (notifications && notifications.length > 0) {
      // 提取所有唯一的发送者ID
      const senderIds = [...new Set(notifications.map(notification => notification.sender_id))];
      
      // 获取发送者资料
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', senderIds);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        // 将发送者资料添加到通知中
        const profilesMap = profiles.reduce((map, profile) => {
          map[profile.id] = profile;
          return map;
        }, {} as Record<string, typeof profiles[0]>);
        
        notifications.forEach(notification => {
          notification.sender_profile = profilesMap[notification.sender_id];
        });
      }
    }
    
    // 计算未读通知数量
    const unreadCount = notifications.filter(notification => !notification.read_status).length;
    
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 标记单个通知为已读
export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json();
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // 标记通知为已读
    const { error } = await supabase
      .from('notifications')
      .update({ read_status: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId);
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark notification as read API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 标记所有通知为已读
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // 标记所有通知为已读
    const { error } = await supabase
      .from('notifications')
      .update({ read_status: true, updated_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('read_status', false);
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark all notifications as read API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
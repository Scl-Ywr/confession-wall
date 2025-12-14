import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 解析请求数据
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // 1. 验证当前用户身份
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
    }
    
    // 2. 确保用户只能删除自己的账号
    const currentUserId = authData.user.id;
    if (currentUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own account' }, { status: 403 });
    }
    
    // 3. 使用服务角色密钥执行删除操作
    const adminSupabase = createSupabaseAdminClient();
    
    // 4. 删除用户的存储文件
    const { error: storageError } = await adminSupabase.storage
      .from('confession_images')
      .remove([`avatars/${userId}/*`, `confession_images/${userId}/*`]);
    
    if (storageError) {
      console.error('Error deleting storage files:', storageError);
      // 继续执行，不中断流程
    }
    
    // 5. 删除用户的点赞记录
    const { error: likesError } = await adminSupabase
      .from('likes')
      .delete()
      .eq('user_id', userId);
    
    if (likesError) {
      console.error('Error deleting likes:', likesError);
    }
    
    // 6. 删除用户的评论
    const { error: commentsError } = await adminSupabase
      .from('comments')
      .delete()
      .eq('user_id', userId);
    
    if (commentsError) {
      console.error('Error deleting comments:', commentsError);
    }
    
    // 7. 先获取用户的所有表白ID
    const { data: confessions, error: getConfessionsError } = await adminSupabase
      .from('confessions')
      .select('id')
      .eq('user_id', userId);
    
    if (getConfessionsError) {
      console.error('Error getting user confessions:', getConfessionsError);
    } else if (confessions && confessions.length > 0) {
      // 获取所有表白ID
      const confessionIds = confessions.map(confession => confession.id);
      
      // 8. 删除这些表白的图片记录
      const { error: confessionImagesError } = await adminSupabase
        .from('confession_images')
        .delete()
        .in('confession_id', confessionIds);
      
      if (confessionImagesError) {
        console.error('Error deleting confession images:', confessionImagesError);
      }
    }
    
    // 9. 删除用户的表白记录
    const { error: confessionsError } = await adminSupabase
      .from('confessions')
      .delete()
      .eq('user_id', userId);
    
    if (confessionsError) {
      console.error('Error deleting confessions:', confessionsError);
    }
    
    // 10. 删除用户的个人资料
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
    }
    
    // 11. 删除用户账号（使用服务角色密钥）
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Error deleting user account:', deleteUserError);
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete-user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

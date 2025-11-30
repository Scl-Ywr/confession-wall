import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用匿名密钥创建supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // 使用匿名密钥
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // 1. 删除用户的存储文件
    const { error: storageError } = await supabase.storage
      .from('confession_images')
      .remove([`avatars/${userId}/*`, `confession_images/${userId}/*`]);
    
    if (storageError) {
      console.error('Error deleting storage files:', storageError);
      // 继续执行，不中断流程
    }
    
    // 2. 删除用户的点赞记录
    const { error: likesError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId);
    
    if (likesError) {
      console.error('Error deleting likes:', likesError);
    }
    
    // 3. 删除用户的评论
    const { error: commentsError } = await supabase
      .from('comments')
      .delete()
      .eq('user_id', userId);
    
    if (commentsError) {
      console.error('Error deleting comments:', commentsError);
    }
    
    // 4. 先获取用户的所有表白ID
    const { data: confessions, error: getConfessionsError } = await supabase
      .from('confessions')
      .select('id')
      .eq('user_id', userId);
    
    if (getConfessionsError) {
      console.error('Error getting user confessions:', getConfessionsError);
    } else if (confessions && confessions.length > 0) {
      // 获取所有表白ID
      const confessionIds = confessions.map(confession => confession.id);
      
      // 5. 删除这些表白的图片记录
      const { error: confessionImagesError } = await supabase
        .from('confession_images')
        .delete()
        .in('confession_id', confessionIds);
      
      if (confessionImagesError) {
        console.error('Error deleting confession images:', confessionImagesError);
      }
    }
    
    // 6. 删除用户的表白记录
    const { error: confessionsError } = await supabase
      .from('confessions')
      .delete()
      .eq('user_id', userId);
    
    if (confessionsError) {
      console.error('Error deleting confessions:', confessionsError);
    }
    
    // 7. 删除用户的个人资料
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
      // 抛出错误，确保profile删除成功
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
    }
    
    // 用户账号删除将由客户端处理
    // 我们已经删除了所有关联数据，客户端可以调用logout来结束会话
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete-user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

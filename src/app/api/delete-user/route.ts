import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

function extractStoragePath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) {
    return null;
  }

  const marker = '/storage/v1/object/public/confession_images/';
  const markerIndex = publicUrl.indexOf(marker);

  try {
    if (markerIndex >= 0) {
      return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
    }

    if (!/^https?:\/\//i.test(publicUrl)) {
      return publicUrl.replace(/^\/+/, '');
    }
  } catch {
    return null;
  }

  return null;
}

function assertNoError(error: { message?: string } | null, message: string) {
  if (error) {
    console.error(message, error);
    throw new Error(error.message || message);
  }
}

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

    const { data: profile, error: profileLookupError } = await adminSupabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();

    assertNoError(profileLookupError, 'Error getting profile before deletion');

    const { data: confessions, error: getConfessionsError } = await adminSupabase
      .from('confessions')
      .select('id')
      .eq('user_id', userId);

    assertNoError(getConfessionsError, 'Error getting user confessions before deletion');

    const confessionIds = (confessions || []).map(confession => confession.id);
    const storagePaths = new Set<string>();
    const avatarPath = extractStoragePath(profile?.avatar_url);

    if (avatarPath) {
      storagePaths.add(avatarPath);
    }

    if (confessionIds.length > 0) {
      const { data: confessionImages, error: getImagesError } = await adminSupabase
        .from('confession_images')
        .select('image_url')
        .in('confession_id', confessionIds);

      assertNoError(getImagesError, 'Error getting confession images before deletion');

      (confessionImages || []).forEach(image => {
        const imagePath = extractStoragePath(image.image_url);
        if (imagePath) {
          storagePaths.add(imagePath);
        }
      });
    }

    if (storagePaths.size > 0) {
      const { error: storageError } = await adminSupabase.storage
        .from('confession_images')
        .remove([...storagePaths]);

      if (storageError) {
        console.error('Error deleting storage files:', storageError);
      }
    }

    // 4. 删除用户发出的点赞记录，以及用户表白收到的点赞记录
    const { error: userLikesError } = await adminSupabase
      .from('likes')
      .delete()
      .eq('user_id', userId);

    assertNoError(userLikesError, 'Error deleting user likes');

    if (confessionIds.length > 0) {
      const { error: confessionLikesError } = await adminSupabase
        .from('likes')
        .delete()
        .in('confession_id', confessionIds);

      assertNoError(confessionLikesError, 'Error deleting likes on user confessions');
    }

    // 5. 删除用户发出的评论，以及用户表白下的评论
    const { error: userCommentsError } = await adminSupabase
      .from('comments')
      .delete()
      .eq('user_id', userId);

    assertNoError(userCommentsError, 'Error deleting user comments');

    if (confessionIds.length > 0) {
      const { error: confessionCommentsError } = await adminSupabase
        .from('comments')
        .delete()
        .in('confession_id', confessionIds);

      assertNoError(confessionCommentsError, 'Error deleting comments on user confessions');
    }

    if (confessionIds.length > 0) {
      const { error: confessionImagesError } = await adminSupabase
        .from('confession_images')
        .delete()
        .in('confession_id', confessionIds);

      assertNoError(confessionImagesError, 'Error deleting confession image records');
    }

    // 6. 删除用户的表白记录
    const { error: confessionsError } = await adminSupabase
      .from('confessions')
      .delete()
      .eq('user_id', userId);

    assertNoError(confessionsError, 'Error deleting user confessions');

    // 7. 删除认证用户，成功后再清理 profile，避免 auth 删除失败时留下无 profile 账号
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting user account:', deleteUserError);
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 });
    }

    const { error: profileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile after auth deletion:', profileError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete-user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

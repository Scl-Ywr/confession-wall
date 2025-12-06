import { supabase } from '@/lib/supabase/client';
import { Profile } from './profileService';
import { Confession, ConfessionFormData, Comment, CommentFormData, ConfessionImage } from '@/types/confession';
import { profileService } from './profileService';

export const confessionService = {
  // 获取表白列表
  getConfessions: async (page: number = 1, limit: number = 10): Promise<Confession[]> => {
    // 1. 获取当前用户ID
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    // 2. 优化查询，包含likes_count字段
    const { data: confessions, error: confessionsError } = await supabase
      .from('confessions')
      .select('id, content, is_anonymous, user_id, created_at, likes_count')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (confessionsError) {
      throw confessionsError;
    }

    // 处理confessions为null或undefined的情况
    if (!confessions) {
      return [];
    }

    // 3. 获取所有表白的图片
    const confessionIds = confessions.map(confession => confession.id);
    const { data: images, error: imagesError } = await supabase
      .from('confession_images')
      .select('id, confession_id, image_url, file_type')
      .in('confession_id', confessionIds);

    if (imagesError) {
      throw imagesError;
    }

    // 4. 获取所有相关用户的资料
    const userIds = confessions
      .filter(confession => confession.user_id)
      .map(confession => confession.user_id)
      .filter((id): id is string => !!id);
    
    const profilesMap: Record<string, {id: string; username: string; display_name: string; avatar_url: string | null}> = {};
    if (userIds.length > 0) {
      // 去重处理
      const uniqueUserIds = [...new Set(userIds)];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', uniqueUserIds);
      
      if (profilesError) {
        throw profilesError;
      }
      
      // 将profile按user_id分组
      profiles?.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }

    // 5. 将图片分组到对应的表白
    const imagesByConfessionId = (images || []).reduce((acc: Record<string, Array<{id: string; image_url: string; file_type: string}>>, image: {id: string; confession_id: string; image_url: string; file_type: string}) => {
      if (!acc[image.confession_id]) {
        acc[image.confession_id] = [];
      }
      acc[image.confession_id].push({ id: image.id, image_url: image.image_url, file_type: image.file_type });
      return acc;
    }, {});

    // 6. 检查当前用户是否点赞了这些表白
    const likesMap: Record<string, boolean> = {};
    
    if (userId) {
      // 批量获取当前用户的所有点赞记录，不限制confession_id
      // 这样可以确保所有点赞记录都被正确映射
      const { data: userLikes, error: userLikesError } = await supabase
        .from('likes')
        .select('id, confession_id')
        .eq('user_id', userId);
      
      if (!userLikesError && userLikes && userLikes.length > 0) {
        // 修复：确保正确处理所有返回的点赞记录
        userLikes.forEach(like => {
          if (like.confession_id) {
            likesMap[like.confession_id] = true;
          }
        });
        
        console.log('User likes:', userLikes);
        console.log('Likes map:', likesMap);
      }
    }

    // 7. 合并图片、profile和点赞状态到表白对象
    const confessionsWithImages = confessions.map(confession => ({
      ...confession,
      profile: confession.user_id ? profilesMap[confession.user_id] : undefined,
      images: imagesByConfessionId[confession.id] || [],
      likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
      liked_by_user: likesMap[confession.id] || false
    })) as Confession[];

    return confessionsWithImages;
  },

  // 获取单个表白
  getConfession: async (id: string): Promise<Confession | null> => {
    // 1. 获取当前用户ID
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    // 2. 优化查询，包含likes_count字段
    const { data: confession, error: confessionError } = await supabase
      .from('confessions')
      .select('id, content, is_anonymous, user_id, created_at, likes_count')
      .eq('id', id)
      .single();

    if (confessionError) {
      throw confessionError;
    }

    // 3. 获取表白的图片
    const { data: images, error: imagesError } = await supabase
      .from('confession_images')
      .select('id, image_url, file_type')
      .eq('confession_id', id);

    if (imagesError) {
      throw imagesError;
    }

    // 4. 获取用户资料
    let profile = undefined;
    if (confession.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', confession.user_id)
        .single();
      
      if (!profileError && profileData) {
        profile = profileData;
      }
    }

    // 5. 检查当前用户是否点赞了该表白
    let liked_by_user = false;
    if (userId) {
      const { data: like, error: likeError } = await supabase
        .from('likes')
        .select('id')
        .eq('confession_id', id)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!likeError && like) {
        liked_by_user = true;
      }
    }

    return {
      ...confession,
      profile,
      images: images as ConfessionImage[],
      likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
      liked_by_user
    } as Confession;
  },

  // 上传图片到Supabase Storage
  uploadImage: async (file: File, confessionId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${confessionId}/${Date.now()}.${fileExt}`;
    // 不要在filePath中包含bucket名称，因为from()已经指定了
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('confession_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // 获取图片URL
    const { data: urlData } = supabase.storage
      .from('confession_images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },

  // 创建表白
  createConfession: async (formData: ConfessionFormData): Promise<Confession> => {
    // 获取当前用户
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // 确保用户有一个有效的profile
    await profileService.getCurrentProfile();
    
    // 1. 创建表白
    const { data: confession, error: confessionError } = await supabase
      .from('confessions')
      .insert({
        content: formData.content,
        is_anonymous: formData.is_anonymous,
        user_id: userId,
      })
      .select('*')
      .single();

    if (confessionError) {
      throw confessionError;
    }

    // 2. 处理媒体文件（图片和视频）
    const mediaItems: ConfessionImage[] = [];
    
    // 2.1 上传图片（如果有）
    if (formData.images && formData.images.length > 0) {
      for (const file of formData.images) {
        try {
          const imageUrl = await confessionService.uploadImage(file, confession.id);
          
          // 保存图片记录到数据库
          const { data: imageRecord, error: imageError } = await supabase
            .from('confession_images')
            .insert({
              confession_id: confession.id,
              image_url: imageUrl,
              file_type: 'image'
            })
            .select('*')
            .single();

          if (imageError) {
            throw imageError;
          }

          mediaItems.push(imageRecord as ConfessionImage);
        } catch (error) {
          console.error('Error uploading image:', error);
          // 继续上传其他图片，不中断整个过程
        }
      }
    }
    
    // 2.2 处理视频URL（如果有）
    if (formData.videoUrls && formData.videoUrls.length > 0) {
      for (const videoUrl of formData.videoUrls) {
        try {
          // 保存视频记录到数据库
          const { data: videoRecord, error: videoError } = await supabase
            .from('confession_images')
            .insert({
              confession_id: confession.id,
              image_url: videoUrl,
              file_type: 'video'
            })
            .select('*')
            .single();

          if (videoError) {
            throw videoError;
          }

          mediaItems.push(videoRecord as ConfessionImage);
        } catch (error) {
          console.error('Error saving video:', error);
          // 继续处理其他视频，不中断整个过程
        }
      }
    }
    
    // 获取用户资料
    let profile = undefined;
    if (confession.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', confession.user_id)
        .maybeSingle();
      
      if (profileError) {
        // 如果找不到profile，不抛出错误，继续执行
        console.error('Error getting profile:', profileError);
      } else {
        profile = profileData;
      }
    }

    return {
      ...confession,
      profile,
      images: mediaItems,
      likes_count: 0, // 新创建的表白，点赞数初始化为0
      liked_by_user: false // 新创建的表白，当前用户默认未点赞
    } as Confession;
  },

  // 更新表白
  updateConfession: async (id: string, formData: Partial<ConfessionFormData>): Promise<Confession> => {
    // 1. 更新表白，只获取需要的字段，包含likes_count
    const { data: confession, error: confessionError } = await supabase
      .from('confessions')
      .update({
        content: formData.content,
        is_anonymous: formData.is_anonymous,
      })
      .eq('id', id)
      .select('id, content, is_anonymous, user_id, created_at, likes_count')
      .single();

    if (confessionError) {
      throw confessionError;
    }

    // 2. 获取用户资料
    let profile = undefined;
    if (confession.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', confession.user_id)
        .maybeSingle();
      
      if (profileError) {
        // 如果找不到profile，不抛出错误，继续执行
        console.error('Error getting profile:', profileError);
      } else {
        profile = profileData;
      }
    }

    // 3. 检查当前用户是否点赞了该表白
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    let liked_by_user = false;
    
    if (userId) {
      const { data: like, error: likeError } = await supabase
        .from('likes')
        .select('id')
        .eq('confession_id', id)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!likeError && like) {
        liked_by_user = true;
      }
    }

    return {
      ...confession,
      profile,
      likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
      liked_by_user
    } as Confession;
  },

  // 删除表白
  deleteConfession: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('confessions')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  // 点赞表白
  likeConfession: async (confessionId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // 直接执行插入操作
    const { error } = await supabase
      .from('likes')
      .insert({
        confession_id: confessionId,
        user_id: userId,
      });

    if (error) {
      // 抛出所有错误，包括唯一约束冲突，由toggleLike函数处理
      throw error;
    }
  },

  // 取消点赞表白
  unlikeConfession: async (confessionId: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // 直接执行删除操作
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('confession_id', confessionId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  },

  // 检查用户是否点赞了表白
  checkIfLiked: async (confessionId: string): Promise<boolean> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('confession_id', confessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return !!data;
  },

  // 切换点赞状态
  toggleLike: async (confessionId: string): Promise<{ success: boolean; error?: string }> => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      // 检查用户是否已经点赞
      const isLiked = await confessionService.checkIfLiked(confessionId);
      
      if (isLiked) {
        // 如果已经点赞，执行取消点赞操作
        await confessionService.unlikeConfession(confessionId);
      } else {
        // 如果未点赞，执行点赞操作
        await confessionService.likeConfession(confessionId);
      }
      
      return { success: true };
    } catch (error) {
      // 处理各种类型的错误
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null 
        ? JSON.stringify(error) 
        : String(error);
      
      return { 
        success: false, 
        error: `Failed to toggle like: ${errorMessage}` 
      };
    }
  },

  // 获取表白的评论
  getComments: async (confessionId: string): Promise<Comment[]> => {
    // 1. 获取评论列表
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('confession_id', confessionId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw commentsError;
    }

    // 2. 获取所有相关用户的资料
    const userIds = comments
      .filter(comment => comment.user_id)
      .map(comment => comment.user_id)
      .filter((id): id is string => !!id);
    
    const profilesMap: Record<string, Profile> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) {
        throw profilesError;
      }
      
      // 将profile按user_id分组
      profiles?.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }

    // 3. 合并profile到评论对象
    const commentsWithProfiles = comments.map(comment => ({
      ...comment,
      profile: comment.user_id ? profilesMap[comment.user_id] : undefined
    })) as Comment[];

    return commentsWithProfiles;
  },

  // 创建评论
  createComment: async (confessionId: string, formData: CommentFormData): Promise<Comment> => {
    // 获取当前用户
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // 确保用户有一个有效的profile
    await profileService.getCurrentProfile();
    
    // 1. 创建评论
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        confession_id: confessionId,
        content: formData.content,
        is_anonymous: formData.is_anonymous,
        user_id: userId,
      })
      .select('*')
      .single();

    if (commentError) {
      throw commentError;
    }

    // 2. 获取用户资料
    let profile = undefined;
    if (comment.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', comment.user_id)
        .maybeSingle();
      
      if (profileError) {
        // 如果找不到profile，不抛出错误，继续执行
        console.error('Error getting profile:', profileError);
      } else {
        profile = profileData;
      }
    }

    return {
      ...comment,
      profile
    } as Comment;
  },

  // 删除评论
  deleteComment: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  // 搜索表白
  searchConfessions: async (keyword: string, searchType: 'content' | 'username', page: number = 1, limit: number = 10): Promise<Confession[]> => {
    const offset = (page - 1) * limit;
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    let confessions: Array<{id: string; content: string; is_anonymous: boolean; user_id: string | null; created_at: string; likes_count: number}> = [];

    // 根据搜索类型执行不同的搜索逻辑
    if (searchType === 'username') {
      // 优化：先获取匹配用户名的用户
      const { data: matchedProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', `%${keyword}%`);
      
      if (profilesError) {
        throw profilesError;
      }
      
      if (matchedProfiles && matchedProfiles.length > 0) {
        // 获取匹配用户的ID列表
        const matchedUserIds = matchedProfiles.map(profile => profile.id);
        
        // 然后获取这些用户的表白，包含likes_count字段
        const { data, error } = await supabase
          .from('confessions')
          .select('id, content, is_anonymous, user_id, created_at, likes_count')
          .in('user_id', matchedUserIds)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (error) {
          throw error;
        }
        
        confessions = (data || []) as Array<{id: string; content: string; is_anonymous: boolean; user_id: string | null; created_at: string; likes_count: number}>;
      }
    } else {
      // 按表白内容搜索，包含likes_count字段
      const { data, error } = await supabase
        .from('confessions')
        .select('id, content, is_anonymous, user_id, created_at, likes_count')
        .ilike('content', `%${keyword}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        throw error;
      }
      
      confessions = (data || []) as Array<{id: string; content: string; is_anonymous: boolean; user_id: string | null; created_at: string; likes_count: number}>;
    }

    // 处理confessions为null或undefined的情况
    if (!confessions) {
      return [];
    }

    // 3. 获取所有表白的图片
    const confessionIds = confessions.map(confession => confession.id);
    const { data: images, error: imagesError } = await supabase
      .from('confession_images')
      .select('id, confession_id, image_url, file_type')
      .in('confession_id', confessionIds);

    if (imagesError) {
      throw imagesError;
    }

    // 4. 获取所有相关用户的资料
    const userIds = confessions
      .filter(confession => confession.user_id)
      .map(confession => confession.user_id)
      .filter((id): id is string => !!id);
    
    const profilesMap: Record<string, {id: string; username: string; display_name: string; avatar_url: string | null}> = {};
    if (userIds.length > 0) {
      // 去重处理
      const uniqueUserIds = [...new Set(userIds)];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', uniqueUserIds);
      
      if (profilesError) {
        throw profilesError;
      }
      
      // 将profile按user_id分组
      profiles?.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }

    // 5. 将图片分组到对应的表白
    const imagesByConfessionId = (images || []).reduce((acc: Record<string, Array<{id: string; image_url: string; file_type: string}>>, image: {id: string; confession_id: string; image_url: string; file_type: string}) => {
      if (!acc[image.confession_id]) {
        acc[image.confession_id] = [];
      }
      acc[image.confession_id].push({ id: image.id, image_url: image.image_url, file_type: image.file_type });
      return acc;
    }, {});

    // 6. 检查当前用户是否点赞了这些表白
    const likesMap: Record<string, boolean> = {};
    
    if (userId) {
      // 批量获取当前用户的所有点赞记录，不限制confession_id
      // 这样可以确保所有点赞记录都被正确映射
      const { data: userLikes, error: userLikesError } = await supabase
        .from('likes')
        .select('id, confession_id')
        .eq('user_id', userId);
      
      if (!userLikesError && userLikes && userLikes.length > 0) {
        // 修复：确保正确处理所有返回的点赞记录
        userLikes.forEach(like => {
          if (like.confession_id) {
            likesMap[like.confession_id] = true;
          }
        });
      }
    }

    // 7. 合并图片、profile和点赞状态到表白对象
    const confessionsWithImages = confessions.map(confession => ({
      ...confession,
      profile: confession.user_id ? profilesMap[confession.user_id] : undefined,
      images: imagesByConfessionId[confession.id] || [],
      likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
      liked_by_user: likesMap[confession.id] || false
    })) as Confession[];

    return confessionsWithImages;
  },
};

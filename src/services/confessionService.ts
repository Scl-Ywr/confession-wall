import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/types/confession';
import { Confession, ConfessionFormData, Comment, CommentFormData, ConfessionImage } from '@/types/confession';
import { profileService } from './profileService';
import { cacheKeyManager } from '@/lib/redis/cache-key-manager';
import { cacheManager } from '@/lib/redis/cache-manager';
export const confessionService = {
  // 获取表白列表
  getConfessions: async (page: number = 1, limit: number = 10): Promise<Confession[]> => {
    // 1. 获取当前用户ID
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;

    // 2. 生成缓存键，添加用户ID，确保每个用户有独立的缓存
    const listCacheKey = cacheKeyManager.confession.list(page, limit, userId);

    // 3. 尝试从缓存获取数据
    const cachedData = await cacheManager.getCache<Confession[]>(listCacheKey);
    if (cachedData) {
      return cachedData;
    }

    // 4. 缓存穿透防护：检查是否是空值缓存
    const nullCacheKey = `${listCacheKey}:null`;
    const isNullCached = await cacheManager.getCache<boolean>(nullCacheKey);
    if (isNullCached) {
      return [];
    }

    // 5. 再次检查缓存
    const doubleCheckCachedData = await cacheManager.getCache<Confession[]>(listCacheKey);
    if (doubleCheckCachedData) {
      return doubleCheckCachedData;
    }

    try {
      // 6. 优化查询，包含likes_count字段
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
        // 设置空值缓存
        await cacheManager.setCache(nullCacheKey, true, 300);
        return [];
      }

      const confessionIds = confessions.map(confession => confession.id);
      
      // 7. 并行执行多个查询，减少整体加载时间
      const [images, profiles, userLikes] = await Promise.all([
        // 获取所有表白的图片
        supabase
          .from('confession_images')
          .select('id, confession_id, image_url, file_type, is_locked, lock_type')
          .in('confession_id', confessionIds),
        
        // 获取所有相关用户的资料
        (async () => {
          const userIds = confessions
            .filter(confession => confession.user_id)
            .map(confession => confession.user_id)
            .filter((id): id is string => !!id);
          
          if (userIds.length === 0) {
            return { data: [], error: null };
          }
          
          // 去重处理
          const uniqueUserIds = [...new Set(userIds)];
          
          const profilesResult = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', uniqueUserIds);
          
          return profilesResult;
        })(),
        
        // 检查当前用户是否点赞了这些表白
        (async () => {
          if (!userId) {
            return { data: [], error: null };
          }
          
          // 只获取当前页表白的点赞记录，减少数据传输
          const likesResult = await supabase
            .from('likes')
            .select('id, confession_id')
            .eq('user_id', userId)
            .in('confession_id', confessionIds);
          
          return likesResult;
        })()
      ]);

      // 处理错误
      if (images.error) {

        throw images.error;
      }
      if (profiles.error) {

        throw profiles.error;
      }
      if (userLikes.error) {

        throw userLikes.error;
      }

      // 8. 将图片分组到对应的表白
      const imagesByConfessionId = (images.data || []).reduce((acc: Record<string, Array<{id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public'}>>, image: any) => {
        if (!acc[image.confession_id]) {
          acc[image.confession_id] = [];
        }
        acc[image.confession_id].push({ 
          id: image.id, 
          image_url: image.image_url, 
          file_type: image.file_type,
          is_locked: image.is_locked,
          lock_type: image.lock_type
        });
        return acc;
      }, {});

      // 9. 将profile按user_id分组
      const profilesMap: Record<string, {id: string; username: string; display_name: string; avatar_url: string | null}> = {};
      profiles.data?.forEach(profile => {
        profilesMap[profile.id] = profile;
      });

      // 10. 构建点赞映射
      const likesMap: Record<string, boolean> = {};
      
      if (userLikes.data && userLikes.data.length > 0) {
        userLikes.data.forEach(like => {
          if (like.confession_id) {
            likesMap[like.confession_id] = true;
          }
        });
      }

      // 11. 合并图片、profile和点赞状态到表白对象
      const confessionsWithLikes = confessions.map(confession => ({
        ...confession,
        profile: confession.user_id ? profilesMap[confession.user_id] : undefined,
        images: imagesByConfessionId[confession.id] || [],
        likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
        liked_by_user: likesMap[confession.id] || false
      })) as Confession[];
      
      // 12. 设置缓存
      // 缓存雪崩防护：添加随机过期时间（300-600秒）
      const expiry = 300 + Math.random() * 300;
      await cacheManager.setCache(listCacheKey, confessionsWithLikes, expiry);
      
      return confessionsWithLikes;
    } catch (error) {
      // 13. 缓存穿透防护：仅在发生错误时设置空值缓存
      await cacheManager.setCache(nullCacheKey, true, 300);
      throw error;
    }
  },

  // 获取单个表白
  getConfession: async (id: string): Promise<Confession | null> => {
    // 6. 获取当前用户ID
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;
    
    // 生成缓存键，添加用户ID，确保每个用户有独立的缓存
    const cacheKey = cacheKeyManager.confession.detail(id, userId);
    
    // 1. 尝试从缓存获取数据
    const cachedData = await cacheManager.getCache<Confession>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // 2. 缓存穿透防护：检查是否是空值缓存
    const nullCacheKey = `${cacheKey}:null`;
    const isNullCached = await cacheManager.getCache<boolean>(nullCacheKey);
    if (isNullCached) {
      return null;
    }

    try {
      // 3. 再次检查缓存
      const doubleCheckCachedData = await cacheManager.getCache<Confession>(cacheKey);
      if (doubleCheckCachedData) {
        return doubleCheckCachedData;
      }

      // 7. 优化查询，包含likes_count字段
      const { data: confession, error: confessionError } = await supabase
        .from('confessions')
        .select('id, content, is_anonymous, user_id, created_at, likes_count')
        .eq('id', id)
        .single();

      if (confessionError) {
        // 8. 缓存穿透防护：设置空值缓存
        await cacheManager.setCache(nullCacheKey, true, 300);
        return null;
      }

      // 9. 获取表白的图片
      const { data: images, error: imagesError } = await supabase
        .from('confession_images')
        .select('id, image_url, file_type, is_locked, lock_type')
        .eq('confession_id', id);

      if (imagesError) {
        throw imagesError;
      }

      // 10. 获取用户资料
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

      // 11. 检查当前用户是否点赞了该表白
      let liked_by_user = false;
      if (userId) {
        const { data: like, error: likeError } = await supabase
          .from('likes')
          .select('id, confession_id, user_id')
          .eq('confession_id', id)
          .eq('user_id', userId)
          .maybeSingle();
        
        if (likeError) {

        } else if (like) {
          liked_by_user = true;
        }
      }

      const confessionData = {
        ...confession,
        profile,
        images: images as ConfessionImage[],
        likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
        liked_by_user
      } as Confession;

      // 12. 缓存雪崩防护：添加随机过期时间（30分钟-1小时）
      const expiry = 3600 + Math.random() * 3600;
      
      // 13. 设置缓存
      await cacheManager.setCache(cacheKey, confessionData, expiry);
      
      return confessionData;
    } catch (error) {
      // 15.1 仅在发生错误时设置空值缓存
      await cacheManager.setCache(nullCacheKey, true, 300);
      throw error;
    }
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

  // 从URL中提取文件名
  extractFileNameFromUrl: (url: string): string => {
    // 从URL中提取文件名，处理不同格式的URL
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1] || '';
  },

  // 移动临时文件到永久位置
  moveTempFileToPermanent: async (tempUrl: string, confessionId: string): Promise<string> => {
    try {
      // 从临时URL中提取文件名
      const tempFileName = confessionService.extractFileNameFromUrl(tempUrl);
      const tempFilePath = `temp/${tempFileName}`;
      
      // 提取文件扩展名
      const fileExt = tempFileName.split('.').pop();
      const newFileName = `${Date.now()}.${fileExt}`;
      const newFilePath = `${confessionId}/${newFileName}`;
      
      // 移动文件到新位置
      const { error: moveError } = await supabase.storage
        .from('confession_images')
        .move(tempFilePath, newFilePath);
      
      if (moveError) {
        // 如果移动失败，记录错误但继续使用原始URL

        throw moveError;
      }
      
      // 获取新文件的URL
      const { data: urlData } = supabase.storage
        .from('confession_images')
        .getPublicUrl(newFilePath);
      
      return urlData.publicUrl;
    } catch {
      // 如果处理失败，返回原始URL作为备选
      return tempUrl;
    }
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
        } catch {
          // 继续上传其他图片，不中断整个过程
        }
      }
    }
    
    // 2.2 处理视频URL（如果有）
    if (formData.videoUrls && formData.videoUrls.length > 0) {
      for (const videoUrl of formData.videoUrls) {
        try {
          // 移动临时视频文件到永久位置
          const permanentVideoUrl = await confessionService.moveTempFileToPermanent(videoUrl, confession.id);
          
          // 保存视频记录到数据库
          const { data: videoRecord, error: videoError } = await supabase
            .from('confession_images')
            .insert({
              confession_id: confession.id,
              image_url: permanentVideoUrl,
              file_type: 'video'
            })
            .select('*')
            .single();

          if (videoError) {
            throw videoError;
          }

          mediaItems.push(videoRecord as ConfessionImage);
        } catch {
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
      } else {
        profile = profileData;
      }
    }

    const newConfession = {
      ...confession,
      profile,
      images: mediaItems,
      likes_count: 0, // 新创建的表白，点赞数初始化为0
      liked_by_user: false // 新创建的表白，当前用户默认未点赞
    } as Confession;

    // 3. 缓存更新：清除所有相关缓存，确保新表白能显示
    // 清除所有用户的表白列表缓存，使用通配符确保清除所有相关缓存
    await cacheManager.deleteCacheByPattern(`confession:list:*`);
    await cacheManager.deleteCacheByPattern(`confession:list:*:null`);

    return newConfession;
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

    const updatedConfession = {
      ...confession,
      profile,
      likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
      liked_by_user
    } as Confession;

    // 4. 缓存更新：清除该表白的所有缓存，包括所有用户的缓存
    await cacheManager.deleteCacheByPattern(`confession:detail:${id}:*`);
    await cacheManager.deleteCacheByPattern(`confession:detail:${id}:*:null`);

    // 5. 清除所有用户的表白列表缓存
    await cacheManager.deleteCacheByPattern(`confession:list:*`);
    await cacheManager.deleteCacheByPattern(`confession:list:*:null`);

    return updatedConfession;
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

    // 缓存更新：清除该表白的所有相关缓存
    await cacheManager.deleteCacheByPattern(`confession:detail:${id}:*`);
    await cacheManager.deleteCacheByPattern(`confession:detail:${id}:*:null`);
    await cacheManager.deleteCacheByPattern(`confession:likes:${id}:*`);
    await cacheManager.deleteCacheByPattern(`confession:comments:${id}:*`);

    // 清除所有用户的表白列表缓存
    await cacheManager.deleteCacheByPattern(`confession:list:*`);
    await cacheManager.deleteCacheByPattern(`confession:list:*:null`);
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
      })
      .select();

    if (error) {
      // 抛出所有错误，包括唯一约束冲突，由toggleLike函数处理
      throw error;
    }

    // 缓存更新：清除所有相关缓存
    await cacheManager.deleteCacheByPattern(`confession:detail:${confessionId}:*`);
    await cacheManager.deleteCacheByPattern(`confession:detail:${confessionId}:*:null`);
    await cacheManager.deleteCacheByPattern(`confession:list:*`);
    await cacheManager.deleteCacheByPattern(`confession:list:*:null`);
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
      .eq('user_id', userId)
      .select();

    if (error) {
      throw error;
    }

    // 缓存更新：清除所有相关缓存
    await cacheManager.deleteCacheByPattern(`confession:detail:${confessionId}:*`);
    await cacheManager.deleteCacheByPattern(`confession:detail:${confessionId}:*:null`);
    await cacheManager.deleteCacheByPattern(`confession:list:*`);
    await cacheManager.deleteCacheByPattern(`confession:list:*:null`);
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

  // 切换点赞状态（使用已有的用户ID）
  toggleLikeWithUserId: async (confessionId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. 检查当前用户是否已经点赞
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('confession_id', confessionId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) {

        return { success: false, error: `Failed to check existing like: ${checkError.message}` };
      }
      
      if (existingLike) {
        // 2. 已点赞，执行取消点赞操作
        
        // 执行取消点赞操作
        const { data: deletedLike, error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', userId)
          .select();
        
        if (deleteError) {

          return { success: false, error: `Failed to unlike confession: ${deleteError.message}` };
        }
        
        // 确保删除成功
        if (!deletedLike || deletedLike.length === 0) {

          return { success: false, error: 'Failed to unlike confession: No record deleted' };
        }
      } else {
        // 3. 未点赞，执行点赞操作
        const likeData = {
          confession_id: confessionId,
          user_id: userId
        };
        
        // 使用supabase.from().insert()插入点赞记录
        const { data: insertedLike, error: insertError } = await supabase
          .from('likes')
          .insert(likeData)
          .select();
        
        if (insertError) {

          return { success: false, error: `Failed to like confession: ${insertError?.message || 'Unknown error'}` };
        }
        
        // 确保插入成功，返回了至少一条记录
        if (!insertedLike || insertedLike.length === 0) {

          return { success: false, error: 'Failed to like confession: No record inserted' };
        }
      }
      
      // 4. 清除相关缓存
      // 使用通配符清除所有用户的表白详情缓存
      await cacheManager.deleteCacheByPattern(`confession:detail:${confessionId}:*`);
      await cacheManager.deleteCacheByPattern(`confession:detail:${confessionId}:*:null`);
      
      // 使用通配符清除所有用户的表白列表缓存
      await cacheManager.deleteCacheByPattern(`confession:list:*`);
      await cacheManager.deleteCacheByPattern(`confession:list:*:null`);
      
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

  // 切换点赞状态（兼容旧接口）
  toggleLike: async (confessionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. 检查用户是否登录
      const userResult = await supabase.auth.getUser();
      
      // 确保userResult.error为null且user存在
      if (userResult.error || !userResult.data.user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const userId = userResult.data.user.id;
      
      // 2. 调用新的toggleLikeWithUserId函数
      return await confessionService.toggleLikeWithUserId(confessionId, userId);
    } catch (error) {
      // 处理各种类型的错误
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null 
        ? JSON.stringify(error) 
        : String(error);
      
      console.error('[ConfessionService] Failed to toggle like:', error);
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
      .select('id, confession_id, image_url, file_type, is_locked, lock_type')
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
    const imagesByConfessionId = (images || []).reduce((acc: Record<string, Array<{id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public'}>>, image: any) => {
      if (!acc[image.confession_id]) {
        acc[image.confession_id] = [];
      }
      acc[image.confession_id].push({ 
        id: image.id, 
        image_url: image.image_url, 
        file_type: image.file_type,
        is_locked: image.is_locked,
        lock_type: image.lock_type
      });
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
      
      if (userLikesError) {

      } else if (userLikes && userLikes.length > 0) {
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

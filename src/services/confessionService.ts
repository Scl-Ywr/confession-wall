import { supabase } from '@/lib/supabase/client';
import { Profile, Hashtag, ConfessionCategory, ConfessionHashtag } from '@/types/confession';
import { Confession, ConfessionFormData, Comment, CommentFormData, ConfessionImage } from '@/types/confession';
import { profileService } from './profileService';
import { cacheKeyManager } from '@/lib/redis/cache-key-manager';
import { cacheManager } from '@/lib/redis/cache-manager';
import { MODULE_EXPIRY } from '@/lib/redis/cache.config';
export const confessionService = {
  // 获取表白列表
  getConfessions: async (page: number = 1, limit: number = 10): Promise<Confession[]> => {
    // 1. 获取当前用户ID
    let userId = null;
    try {
      const userResult = await supabase.auth.getUser();
      
      // 处理会话缺失错误
      if (userResult.error) {
        if (userResult.error.message === 'Auth session missing!' || userResult.error.name === 'AuthSessionMissingError') {
          // 继续执行，返回空列表或默认内容
        } else {
          console.error('Error getting user:', userResult.error);
          // 继续执行，不影响表白列表获取
        }
      } else {
        userId = userResult.data.user?.id;
      }
    } catch (error) {
      console.error('Error getting user:', error);
      // 继续执行，不影响表白列表获取
    }

    // 2. 生成缓存键，添加用户ID，确保每个用户有独立的缓存
    const listCacheKey = cacheKeyManager.confession.list(page, limit, userId || undefined);

    try {
      // 3. 尝试从缓存获取数据（只在服务器环境中）
      let cachedData = null;
      if (typeof window === 'undefined') {
        cachedData = await cacheManager.getCache<Confession[]>(listCacheKey);
      }
      if (cachedData) {
        return cachedData;
      }

      // 4. 缓存穿透防护：检查是否是空值缓存（只在服务器环境中）
      let isNullCached = false;
      if (typeof window === 'undefined') {
        const nullCacheKey = `${listCacheKey}:null`;
        isNullCached = await cacheManager.getCache<boolean>(nullCacheKey) || false;
      }
      if (isNullCached) {
        return [];
      }

      // 5. 再次检查缓存（只在服务器环境中）
      if (typeof window === 'undefined') {
        const doubleCheckCachedData = await cacheManager.getCache<Confession[]>(listCacheKey);
        if (doubleCheckCachedData) {
          return doubleCheckCachedData;
        }
      }

      // 6. 优化查询，包含likes_count字段
      const { data: confessions, error: confessionsError } = await supabase
        .from('confessions')
        .select(`
          id, 
          content, 
          is_anonymous, 
          user_id, 
          created_at, 
          likes_count,
          category_id,
          category:confession_categories(id, name, icon, color)
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (confessionsError) {
        console.error('Error fetching confessions:', confessionsError);
        return [];
      }

      // 处理confessions为null或undefined的情况
      if (!confessions || confessions.length === 0) {
        // 设置空值缓存（只在服务器环境中）
        if (typeof window === 'undefined') {
          const nullCacheKey = `${listCacheKey}:null`;
          await cacheManager.setCache(nullCacheKey, true, 300).catch(console.error);
        }
        return [];
      }

      const confessionIds = confessions.map(confession => confession.id);
      
      // 7. 并行执行多个查询，减少整体加载时间，但每个查询都有独立的错误处理
      let imagesData: { id: string; confession_id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public' }[] = [];
      let profilesData: { id: string; username: string; display_name: string; avatar_url: string | null }[] = [];
      let likesData: { id: string; confession_id: string }[] = [];
      let hashtagsData: { id: string; confession_id: string; hashtag_id: string; hashtag: { id: string; tag: string } }[] = [];

      // 使用Promise.allSettled替代Promise.all，确保一个查询失败不会影响其他查询
      const [imagesResult, profilesResult, userLikesResult, hashtagsResult] = await Promise.allSettled([
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
          
          return await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', uniqueUserIds);
        })(),
        
        // 检查当前用户是否点赞了这些表白
        (async () => {
          if (!userId) {
            return { data: [], error: null };
          }
          
          // 只获取当前页表白的点赞记录，减少数据传输
          return await supabase
            .from('likes')
            .select('id, confession_id')
            .eq('user_id', userId)
            .in('confession_id', confessionIds);
        })(),
        
        // 获取表白相关的标签
        supabase
          .from('confession_hashtags')
          .select('id, confession_id, hashtag_id, hashtag:hashtags(id, tag)')
          .in('confession_id', confessionIds)
      ]);

      // 处理每个查询的结果
      if (imagesResult.status === 'fulfilled') {
        const result = imagesResult.value;
        if (!result.error) {
          imagesData = result.data || [];
        } else {
          console.error('Error fetching images:', result.error);
        }
      } else {
        console.error('Error fetching images:', imagesResult.reason);
      }

      if (profilesResult.status === 'fulfilled') {
        const result = profilesResult.value;
        if (!result.error) {
          profilesData = result.data || [];
        } else {
          console.error('Error fetching profiles:', result.error);
        }
      } else {
        console.error('Error fetching profiles:', profilesResult.reason);
      }

      if (userLikesResult.status === 'fulfilled') {
        const result = userLikesResult.value;
        if (!result.error) {
          likesData = result.data || [];
        } else {
          console.error('Error fetching user likes:', result.error);
        }
      } else {
        console.error('Error fetching user likes:', userLikesResult.reason);
      }

      if (hashtagsResult.status === 'fulfilled') {
        const result = hashtagsResult.value;
        if (!result.error) {
          hashtagsData = (result.data || []) as unknown as { id: string; confession_id: string; hashtag_id: string; hashtag: { id: string; tag: string; }; }[];
        } else {
          console.error('Error fetching hashtags:', result.error);
        }
      } else {
        console.error('Error fetching hashtags:', hashtagsResult.reason);
      }

      // 8. 将图片分组到对应的表白
      const imagesByConfessionId = imagesData.reduce((acc: Record<string, Array<{id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public'}>>, image) => {
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
      profilesData.forEach(profile => {
        profilesMap[profile.id] = {
          ...profile,
          avatar_url: profile.avatar_url || null
        };
      });

      // 10. 构建点赞映射
      const likesMap: Record<string, boolean> = {};
      
      if (likesData.length > 0) {
        likesData.forEach(like => {
          if (like.confession_id) {
            likesMap[like.confession_id] = true;
          }
        });
      }

      // 11. 将标签分组到对应的表白
      const hashtagsByConfessionId = hashtagsData.reduce((acc: Record<string, Array<{id: string; hashtag_id: string; hashtag: { id: string; tag: string }}>>, confessionHashtag) => {
        if (!acc[confessionHashtag.confession_id]) {
          acc[confessionHashtag.confession_id] = [];
        }
        acc[confessionHashtag.confession_id].push(confessionHashtag);
        return acc;
      }, {});

      // 12. 合并图片、profile、点赞状态和标签到表白对象
      const confessionsWithLikes = confessions.map(confession => ({
        ...confession,
        profile: confession.user_id ? profilesMap[confession.user_id] : undefined,
        images: (imagesByConfessionId[confession.id] || []).map(img => ({
          ...img,
          confession_id: confession.id,
          created_at: confession.created_at
        })) as ConfessionImage[],
        likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
        liked_by_user: likesMap[confession.id] || false,
        hashtags: (hashtagsByConfessionId[confession.id] || []).map(ht => ({
          ...ht,
          hashtag: ht.hashtag || { id: '', tag: '' } // 确保hashtag是单个对象
        })) as unknown as ConfessionHashtag[]
      })) as unknown as Confession[];
      
      // 12. 设置缓存（只在服务器环境中，异步执行，不阻塞主流程）
      if (typeof window === 'undefined') {
        // 缓存雪崩防护：添加随机过期时间（300-600秒）
        const expiry = 300 + Math.random() * 300;
        cacheManager.setCache(listCacheKey, confessionsWithLikes, expiry).catch(console.error);
      }
      
      return confessionsWithLikes;
    } catch (error) {
      console.error('Error in getConfessions:', error);
      // 不抛出错误，而是返回空数组，确保页面能够正常显示
      return [];
    }
  },

  // 获取单个表白
  getConfession: async (id: string): Promise<Confession | null> => {
    // 6. 获取当前用户ID
    const user = await supabase.auth.getUser();
    
    // 处理会话缺失错误
    if (user.error) {
      if (user.error.message === 'Auth session missing!' || user.error.name === 'AuthSessionMissingError') {
        // 继续执行，返回null或默认内容
      } else {
        console.error('Error getting user:', user.error);
        // 继续执行，返回null
      }
    }
    
    const userId = user.data?.user?.id;
    
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
    
    // 处理会话缺失错误
    if (user.error) {
      if (user.error.message === 'Auth session missing!' || user.error.name === 'AuthSessionMissingError') {
        throw new Error('用户会话不存在，请重新登录');
      }
      throw new Error('User not authenticated');
    }
    
    const userId = user.data.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // 确保用户有一个有效的profile
    await profileService.getCurrentProfile();
    
    // 1. 验证表白内容
    const validationResult = await import('@/lib/validation').then(mod => mod.validateConfessionContent(formData.content));
    
    if (!validationResult.isValid) {
      throw new Error(validationResult.message || '表白内容无效');
    }
    
    // 2. 创建表白，使用过滤后的内容
    const { data: confession, error: confessionError } = await supabase
      .from('confessions')
      .insert({
        content: validationResult.filteredContent || formData.content,
        is_anonymous: formData.is_anonymous,
        user_id: userId,
        category_id: formData.category_id || null,
      })
      .select('*')
      .single();

    if (confessionError) {
      throw confessionError;
    }

    // 3. 处理标签（如果有）
    if (formData.hashtags && formData.hashtags.length > 0) {
      for (const tagText of formData.hashtags) {
        try {
          // 确保标签以#开头，如果没有则添加
          const normalizedTag = tagText.startsWith('#') ? tagText : `#${tagText}`;
          
          // 检查标签是否已存在
          const { data: existingTag, error: tagError } = await supabase
            .from('hashtags')
            .select('id')
            .eq('tag', normalizedTag)
            .single();
          
          let hashtagId: string;
          
          if (tagError && tagError.code === 'PGRST116') {
            // 标签不存在，创建新标签
            const { data: newTag, error: createTagError } = await supabase
              .from('hashtags')
              .insert({ tag: normalizedTag })
              .select('id')
              .single();
            
            if (createTagError) {
              console.error('Error creating hashtag:', createTagError);
              continue;
            }
            
            hashtagId = newTag.id;
          } else if (existingTag) {
            // 标签已存在
            hashtagId = existingTag.id;
          } else {
            console.error('Error checking hashtag:', tagError);
            continue;
          }
          
          // 创建表白与标签的关联
          const { error: linkError } = await supabase
            .from('confession_hashtags')
            .insert({
              confession_id: confession.id,
              hashtag_id: hashtagId,
            });
          
          if (linkError) {
            console.error('Error linking hashtag to confession:', linkError);
          }
        } catch (error) {
          console.error('Error processing hashtag:', tagText, error);
        }
      }
    }

    // 4. 处理媒体文件（图片和视频）
    const mediaItems: ConfessionImage[] = [];
    
    // 4.1 上传图片（如果有）
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
    
    // 4.2 处理视频URL（如果有）
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
    
    // 5. 如果提供了group_id，将表白发布到指定圈子
    if (formData.group_id) {
      try {
        await supabase
          .from('group_confessions')
          .insert({
            confession_id: confession.id,
            group_id: formData.group_id
          });
      } catch (error) {
        console.error('Error posting confession to group:', error);
        // 继续执行，不中断整个过程
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

    // 6. 缓存更新：清除所有相关缓存，确保新表白能显示
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
    
    // 处理会话缺失错误
    if (user.error) {
      if (user.error.message === 'Auth session missing!' || user.error.name === 'AuthSessionMissingError') {
        // 继续执行，设置liked_by_user为false
      } else {
        console.error('Error getting user:', user.error);
        // 继续执行，设置liked_by_user为false
      }
    }
    
    const userId = user.data?.user?.id;
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
    
    // 处理会话缺失错误
    if (user.error) {
      if (user.error.message === 'Auth session missing!' || user.error.name === 'AuthSessionMissingError') {
        throw new Error('用户会话不存在，请重新登录');
      }
      throw new Error('User not authenticated');
    }
    
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
    
    // 处理会话缺失错误
    if (user.error) {
      if (user.error.message === 'Auth session missing!' || user.error.name === 'AuthSessionMissingError') {
        throw new Error('用户会话不存在，请重新登录');
      }
      throw new Error('User not authenticated');
    }
    
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
    
    // 处理会话缺失错误
    if (user.error) {
      if (user.error.message === 'Auth session missing!' || user.error.name === 'AuthSessionMissingError') {
        return false; // 返回false，表示未点赞
      }
      throw new Error('User not authenticated');
    }
    
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
  getComments: async (confessionId: string, page: number = 1, limit: number = 20): Promise<Comment[]> => {
    const offset = (page - 1) * limit;
    const cacheKey = cacheKeyManager.comment.list(confessionId, page, limit);

    // 使用缓存管理器的 getOrSetCache 方法（参考 getConfessions 的实现）
    const comments = await cacheManager.getOrSetCache<Comment[]>(
      cacheKey,
      async () => {
        // 数据源函数：仅在缓存失效时执行
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .eq('confession_id', confessionId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        if (commentsError) {
          throw commentsError;
        }

        if (!commentsData || commentsData.length === 0) {
          return [];
        }

        // 批量获取用户资料（消除 N+1 查询）
        const uniqueUserIds = [...new Set(
          commentsData
            .map(c => c.user_id)
            .filter((id): id is string => !!id)
        )];

        if (uniqueUserIds.length === 0) {
          return commentsData as Comment[];
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', uniqueUserIds);

        if (profilesError) {
          throw profilesError;
        }

        // 构建映射并组装数据
        const profilesMap: Record<string, Profile> = Object.fromEntries(
          (profiles || []).map(p => [p.id, p])
        );

        return commentsData.map(comment => ({
          ...comment,
          profile: comment.user_id ? profilesMap[comment.user_id] : undefined
        })) as Comment[];
      },
      MODULE_EXPIRY.COMMENT_LIST  // 5分钟缓存
    );

    return comments || [];
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
    
    // 1. 验证评论内容
    const validationResult = await import('@/lib/validation').then(mod => mod.validateCommentContent(formData.content));
    
    if (!validationResult.isValid) {
      throw new Error(validationResult.message || '评论内容无效');
    }
    
    // 2. 创建评论，使用过滤后的内容
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        confession_id: confessionId,
        content: validationResult.filteredContent || formData.content,
        is_anonymous: formData.is_anonymous,
        user_id: userId,
      })
      .select('*')
      .single();

    if (commentError) {
      throw commentError;
    }

    // 3. 获取用户资料
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

    // 4. 失效相关缓存
    await Promise.all([
      // 失效该表白的所有评论列表缓存（所有分页）
      cacheManager.deleteCacheByPattern(`comment:list:${confessionId}:*`),
      // 失效评论数量统计
      cacheManager.deleteCache(cacheKeyManager.comment.count(confessionId)),
      // 失效表白详情缓存（包含评论统计）
      cacheManager.deleteCacheByPattern(`confession:detail:${confessionId}:*`),
      // 失效表白列表缓存（评论数变化影响列表显示）
      cacheManager.deleteCacheByPattern(`confession:list:*`)
    ]).catch(err => console.error('Error invalidating cache:', err));

    return {
      ...comment,
      profile
    } as Comment;
  },

  // 删除评论
  deleteComment: async (id: string): Promise<void> => {
    // 先获取评论信息（用于失效缓存）
    const { data: comment } = await supabase
      .from('comments')
      .select('confession_id')
      .eq('id', id)
      .single();

    // 执行删除
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // 失效相关缓存
    if (comment?.confession_id) {
      await Promise.all([
        // 失效评论详情缓存
        cacheManager.deleteCache(cacheKeyManager.comment.detail(id)),
        // 失效该表白的所有评论列表缓存
        cacheManager.deleteCacheByPattern(`comment:list:${comment.confession_id}:*`),
        // 失效评论数量统计
        cacheManager.deleteCache(cacheKeyManager.comment.count(comment.confession_id)),
        // 失效表白详情缓存
        cacheManager.deleteCacheByPattern(`confession:detail:${comment.confession_id}:*`),
        // 失效表白列表缓存
        cacheManager.deleteCacheByPattern(`confession:list:*`)
      ]).catch(err => console.error('Error invalidating cache:', err));
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
    const imagesByConfessionId = (images || []).reduce((acc: Record<string, Array<{id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public'}>>, image: { id: string; confession_id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public' }) => {
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

  // 获取热门标签
  getTrendingHashtags: async (limit: number = 10): Promise<Hashtag[]> => {
    try {
      const { data: hashtags, error } = await supabase
        .rpc('get_trending_hashtags', { limit_count: limit });
      
      if (error) {
        console.error('Error fetching trending hashtags:', error);
        // 备选方案：直接查询
        const { data: fallbackHashtags, error: fallbackError } = await supabase
          .from('hashtags')
          .select('*')
          .order('usage_count', { ascending: false })
          .limit(limit);
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        return fallbackHashtags || [];
      }
      
      return hashtags || [];
    } catch (error) {
      console.error('Error in getTrendingHashtags:', error);
      return [];
    }
  },

  // 获取所有分类
  getCategories: async (): Promise<ConfessionCategory[]> => {
    try {
      // 直接使用 API 路由获取分类数据，避免客户端 Supabase 连接问题
      const response = await fetch('/api/categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const categories = result.categories || [];
      
      return categories;
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  },

  // 根据标签获取表白
  getConfessionsByHashtag: async (tag: string, page: number = 1, limit: number = 10): Promise<Confession[]> => {
    try {
      const offset = (page - 1) * limit;
      
      // 使用RPC函数获取包含特定标签的表白
      const { data: confessions, error } = await supabase
        .rpc('get_confessions_by_hashtag', { 
          tag_text: tag, 
          limit_count: limit, 
          offset_count: offset 
        });
      
      if (error) {
        console.error('Error fetching confessions by hashtag:', error);
        return [];
      }
      
      // 获取完整的表白信息，包括用户资料和标签
      const confessionIds = confessions.map((c: { id: string }) => c.id);
      if (confessionIds.length === 0) {
        return [];
      }
      
      // 获取完整的表白信息
      const { data: fullConfessions, error: fullError } = await supabase
        .from('confessions')
        .select(`
          *,
          profile:profiles(id, display_name, username, avatar_url),
          category:confession_categories(id, name, icon, color),
          hashtags:confession_hashtags(
            id,
            hashtag:hashtags(id, tag)
          )
        `)
        .in('id', confessionIds)
        .order('created_at', { ascending: false });
      
      if (fullError) {
        console.error('Error fetching full confessions:', fullError);
        return [];
      }
      
      // 获取图片信息
      const { data: images, error: imagesError } = await supabase
        .from('confession_images')
        .select('id, confession_id, image_url, file_type, is_locked, lock_type')
        .in('confession_id', confessionIds);
      
      if (imagesError) {
        console.error('Error fetching images:', imagesError);
      }
      
      // 将图片分组到对应的表白
      const imagesByConfessionId = (images || []).reduce((acc: Record<string, Array<{id: string; confession_id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public'}>>, image) => {
        if (!acc[image.confession_id]) {
          acc[image.confession_id] = [];
        }
        acc[image.confession_id].push(image);
        return acc;
      }, {});
      
      // 合并图片信息到表白对象
      return (fullConfessions || []).map(confession => ({
        ...confession,
        images: imagesByConfessionId[confession.id] || []
      })) as Confession[];
    } catch (error) {
      console.error('Error in getConfessionsByHashtag:', error);
      return [];
    }
  },

  // 根据分类获取表白
  getConfessionsByCategory: async (categoryId: string, page: number = 1, limit: number = 10): Promise<Confession[]> => {
    // 1. 获取当前用户ID
    let userId = null;
    try {
      const userResult = await supabase.auth.getUser();
      userId = userResult.data.user?.id;
    } catch (error) {
      console.error('Error getting user:', error);
      // 继续执行，不影响表白列表获取
    }

    try {
      // 2. 验证 categoryId 参数
      if (!categoryId || typeof categoryId !== 'string') {
        console.error('Invalid categoryId parameter:', categoryId);
        return [];
      }

      // 3. 优化查询，包含likes_count字段
      const { data: confessions, error: confessionsError } = await supabase
        .from('confessions')
        .select(`
          id, 
          content, 
          is_anonymous, 
          user_id, 
          created_at, 
          likes_count,
          category_id,
          category:confession_categories(id, name, icon, color)
        `)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (confessionsError) {
        console.error('Error fetching confessions:', confessionsError);
        return [];
      }

      // 处理confessions为null或undefined的情况
      if (!confessions || confessions.length === 0) {
        return [];
      }

      const confessionIds = confessions.map(confession => confession.id);
      
      // 4. 并行执行多个查询，减少整体加载时间，但每个查询都有独立的错误处理
      let imagesData: { id: string; confession_id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public' }[] = [];
      let profilesData: { id: string; username: string; display_name: string; avatar_url: string | null }[] = [];
      let likesData: { id: string; confession_id: string }[] = [];
      let hashtagsData: { id: string; confession_id: string; hashtag_id: string; hashtag: { id: string; tag: string } }[] = [];

      // 使用Promise.allSettled替代Promise.all，确保一个查询失败不会影响其他查询
      const [imagesResult, profilesResult, userLikesResult, hashtagsResult] = await Promise.allSettled([
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
          
          return await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', uniqueUserIds);
        })(),
        
        // 检查当前用户是否点赞了这些表白
        (async () => {
          if (!userId) {
            return { data: [], error: null };
          }
          
          return await supabase
            .from('likes')
            .select('id, confession_id')
            .eq('user_id', userId)
            .in('confession_id', confessionIds);
        })(),
        
        // 获取表白相关的标签
        supabase
          .from('confession_hashtags')
          .select('id, confession_id, hashtag_id, hashtag:hashtags(id, tag)')
          .in('confession_id', confessionIds)
      ]);

      // 处理每个查询的结果
      if (imagesResult.status === 'fulfilled') {
        const result = imagesResult.value;
        if (!result.error) {
          imagesData = result.data || [];
        } else {
          console.error('Error fetching images:', result.error);
        }
      } else {
        console.error('Error fetching images:', imagesResult.reason);
      }

      if (profilesResult.status === 'fulfilled') {
        const result = profilesResult.value;
        if (!result.error) {
          profilesData = result.data || [];
        } else {
          console.error('Error fetching profiles:', result.error);
        }
      } else {
        console.error('Error fetching profiles:', profilesResult.reason);
      }

      if (userLikesResult.status === 'fulfilled') {
        const result = userLikesResult.value;
        if (!result.error) {
          likesData = result.data || [];
        } else {
          console.error('Error fetching user likes:', result.error);
        }
      } else {
        console.error('Error fetching user likes:', userLikesResult.reason);
      }

      if (hashtagsResult.status === 'fulfilled') {
        const result = hashtagsResult.value;
        if (!result.error) {
          hashtagsData = (result.data || []) as unknown as { id: string; confession_id: string; hashtag_id: string; hashtag: { id: string; tag: string; }; }[];
        } else {
          console.error('Error fetching hashtags:', result.error);
        }
      } else {
        console.error('Error fetching hashtags:', hashtagsResult.reason);
      }

      // 5. 将图片分组到对应的表白
      const imagesByConfessionId = imagesData.reduce((acc: Record<string, Array<{id: string; image_url: string; file_type: string; is_locked: boolean; lock_type: 'password' | 'user' | 'public'}>>, image) => {
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

      // 6. 将profile按user_id分组
      const profilesMap: Record<string, {id: string; username: string; display_name: string; avatar_url: string | null}> = {};
      profilesData.forEach(profile => {
        profilesMap[profile.id] = {
          ...profile,
          avatar_url: profile.avatar_url || null
        };
      });

      // 7. 构建点赞映射
      const likesMap: Record<string, boolean> = {};
      
      if (likesData.length > 0) {
        likesData.forEach(like => {
          if (like.confession_id) {
            likesMap[like.confession_id] = true;
          }
        });
      }

      // 8. 将标签分组到对应的表白
      const hashtagsByConfessionId = hashtagsData.reduce((acc: Record<string, Array<{id: string; hashtag_id: string; hashtag: { id: string; tag: string }}>>, confessionHashtag) => {
        if (!acc[confessionHashtag.confession_id]) {
          acc[confessionHashtag.confession_id] = [];
        }
        acc[confessionHashtag.confession_id].push(confessionHashtag);
        return acc;
      }, {});

      // 9. 合并图片、profile、点赞状态和标签到表白对象
      const confessionsWithLikes = confessions.map(confession => ({
        ...confession,
        profile: confession.user_id ? profilesMap[confession.user_id] : undefined,
        images: (imagesByConfessionId[confession.id] || []).map(img => ({
          ...img,
          confession_id: confession.id,
          created_at: confession.created_at
        })) as ConfessionImage[],
        likes_count: Number(confession.likes_count) || 0, // 确保是数字类型，避免出现NaN
        liked_by_user: likesMap[confession.id] || false,
        hashtags: (hashtagsByConfessionId[confession.id] || []).map(ht => ({
          ...ht,
          hashtag: ht.hashtag || { id: '', tag: '' } // 确保hashtag是单个对象
        })) as unknown as ConfessionHashtag[]
      })) as unknown as Confession[];
      
      return confessionsWithLikes;
    } catch (error) {
      console.error('Error in getConfessionsByCategory:', error);
      // 不抛出错误，而是返回空数组，确保页面能够正常显示
      return [];
    }
  },
};

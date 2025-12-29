import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/types/confession';
import { getCache, setCache, removeCache } from '@/utils/cache';
import { getUserProfileCacheKey, EXPIRY } from '@/lib/redis/cache';

export interface ProfileUpdateData {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface IpLocationUpdateData {
  user_ip: string;
  user_city: string;
  user_country: string;
  user_province?: string;
}

export const profileService = {
  // Get current user's profile
  getCurrentProfile: async (): Promise<Profile> => {
    // Get current user first
    const userResult = await supabase.auth.getUser();
    
    // 处理会话缺失错误
    if (userResult.error) {
      if (userResult.error.message === 'Auth session missing!' || userResult.error.name === 'AuthSessionMissingError') {
        throw new Error('用户会话不存在，请重新登录');
      }
      throw new Error('User not authenticated');
    }
    
    const user = userResult.data.user;
    const userId = user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Try to get profile from cache first
    const cacheKey = getUserProfileCacheKey(userId);
    const cachedProfile = await getCache<Profile>(cacheKey);
    if (cachedProfile) {
      return cachedProfile;
    }
    
    // Try to get existing profile from database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    
    // If profile exists, cache it and return
    if (data) {
      await setCache(cacheKey, data, EXPIRY.MEDIUM);
      return data as Profile;
    }
    
    // If profile doesn't exist, create a default one
    const defaultUsername = user?.email?.split('@')[0] || `user_${userId.substring(0, 8)}`;
    const defaultDisplayName = user?.email?.split('@')[0] || `User ${userId.substring(0, 8)}`;
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: defaultUsername,
        display_name: defaultDisplayName,
        avatar_url: undefined
      })
      .select('*')
      .single();
    
    if (createError) {
      throw createError;
    }

    // Cache the newly created profile
    await setCache(cacheKey, newProfile, EXPIRY.MEDIUM);
    
    return newProfile as Profile;
  },

  // Get a user's profile by ID
  getProfileById: async (userId: string): Promise<Profile | null> => {
    // Try to get profile from cache first
    const cacheKey = getUserProfileCacheKey(userId);
    const cachedProfile = await getCache<Profile>(cacheKey);
    if (cachedProfile) {
      return cachedProfile;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    // Cache the profile
    await setCache(cacheKey, data, EXPIRY.MEDIUM);

    return data as Profile;
  },

  // Get a user's profile by username
  getProfileByUsername: async (username: string): Promise<Profile | null> => {
    // 检查用户名是否为空
    if (!username || username.trim() === '') {
      return null;
    }

    // 解码URL编码的用户名
    const decodedUsername = decodeURIComponent(username);

    // Note: 不缓存按用户名查询的结果，因为用户名可能会变化
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', decodedUsername)
      .maybeSingle();

    if (error) {
      console.error('获取用户资料失败:', error);
      return null;
    }

    // 如果找到用户，缓存其按ID查询的结果
    if (data) {
      const cacheKey = getUserProfileCacheKey(data.id);
      await setCache(cacheKey, data, EXPIRY.MEDIUM);
    }

    return data as Profile;
  },

  // Update user's profile
  updateProfile: async (data: ProfileUpdateData): Promise<Profile> => {
    // Get current user first
    const userResult = await supabase.auth.getUser();
    
    // 处理会话缺失错误
    if (userResult.error) {
      if (userResult.error.message === 'Auth session missing!' || userResult.error.name === 'AuthSessionMissingError') {
        throw new Error('用户会话不存在，请重新登录');
      }
      throw new Error('User not authenticated');
    }
    
    const userId = userResult.data.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // 获取当前用户资料，用于比较
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      throw new Error(`获取当前用户资料失败: ${fetchError.message}`);
    }
    
    // 移除undefined值，但允许空字符串
    const filteredData = Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== undefined)
    );
    
    // 只保留与当前值不同的字段，正确处理null值
    const updateData = Object.fromEntries(
      Object.entries(filteredData)
        .filter(([key, value]) => {
          const currentValue = currentProfile[key];
          // 处理null和空字符串的比较
          if (currentValue === null && value === '') {
            return false; // null和空字符串视为相同，不更新
          }
          if (currentValue === '' && value === null) {
            return false; // 空字符串和null视为相同，不更新
          }
          return currentValue !== value;
        })
    );
    
    // 如果没有要更新的数据，直接返回当前用户资料
    if (Object.keys(updateData).length === 0) {
      return currentProfile as Profile;
    }
    
    // 直接更新表，确保只更新自己的资料
    const { data: updateResult, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*');

    if (updateError) {
      throw new Error(`更新个人资料失败: ${updateError.message} (${updateError.code || 'Unknown error'})`);
    }
    
    let updatedProfile;
    // 如果更新成功，返回更新后的资料
    if (updateResult && updateResult.length > 0) {
      updatedProfile = updateResult[0] as Profile;
    } else {
      // 如果没有返回结果，重新获取用户资料
      const { data: fetchedUpdatedProfile, error: fetchUpdatedError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchUpdatedError) {
        // 返回当前资料，因为更新已经成功
        return currentProfile as Profile;
      }
      updatedProfile = fetchedUpdatedProfile as Profile;
    }

    // Invalidate cache
    const cacheKey = getUserProfileCacheKey(userId);
    await removeCache(cacheKey);
    
    // Cache the updated profile
    await setCache(cacheKey, updatedProfile, EXPIRY.MEDIUM);

    return updatedProfile;
  },

  // Upload avatar image
  uploadAvatar: async (file: File): Promise<string> => {
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

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('confession_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('confession_images')
      .getPublicUrl(filePath);

    // Invalidate user profile cache since avatar has changed
    const cacheKey = getUserProfileCacheKey(userId);
    await removeCache(cacheKey);

    return urlData.publicUrl;
  },

  // Update user password (using Supabase Auth)
  updatePassword: async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }
  },

  // Update user IP and location information
  updateIpLocation: async (data: IpLocationUpdateData): Promise<void> => {
    // Get current user first
    const userResult = await supabase.auth.getUser();
    
    // 处理会话缺失错误
    if (userResult.error) {
      if (userResult.error.message === 'Auth session missing!' || userResult.error.name === 'AuthSessionMissingError') {
        throw new Error('用户会话不存在，请重新登录');
      }
      throw new Error('User not authenticated');
    }
    
    const userId = userResult.data.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // 更新IP地址、城市、省份、国家和更新时间
    const updateData: Record<string, unknown> = {
      user_ip: data.user_ip,
      user_city: data.user_city,
      user_country: data.user_country,
      ip_updated_at: new Date().toISOString()
    };
    
    // 只有当province存在且不为空时才更新
    if (data.user_province) {
      updateData.user_province = data.user_province;
    }
    
    // 更新数据库
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('更新IP和地理位置失败:', updateError);
      throw updateError;
    }
    
    // Invalidate cache
    const cacheKey = getUserProfileCacheKey(userId);
    await removeCache(cacheKey);
  },
};

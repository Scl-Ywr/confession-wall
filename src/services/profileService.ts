import { supabase } from '@/lib/supabase/client';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export const profileService = {
  // Get current user's profile
  getCurrentProfile: async (): Promise<Profile> => {
    // Get current user first
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    const userId = user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Try to get existing profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    
    // If profile exists, return it
    if (data) {
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
    
    return newProfile as Profile;
  },

  // Get a user's profile by ID
  getProfileById: async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', decodedUsername)
      .maybeSingle();

    if (error) {
      console.error('获取用户资料失败:', error);
      return null;
    }

    return data as Profile;
  },

  // Update user's profile
  updateProfile: async (data: ProfileUpdateData): Promise<Profile> => {
    // Get current user first
    const userResult = await supabase.auth.getUser();
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
    
    // 如果更新成功，返回更新后的资料
    if (updateResult && updateResult.length > 0) {
      return updateResult[0] as Profile;
    }
    
    // 如果没有返回结果，重新获取用户资料
    const { data: updatedProfile, error: fetchUpdatedError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchUpdatedError) {
      // 返回当前资料，因为更新已经成功
      return currentProfile as Profile;
    }

    return updatedProfile as Profile;
  },

  // Upload avatar image
  uploadAvatar: async (file: File): Promise<string> => {
    const user = await supabase.auth.getUser();
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
};

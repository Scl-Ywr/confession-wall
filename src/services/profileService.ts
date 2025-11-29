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
  getCurrentProfile: async (): Promise<Profile | null> => {
    // Get current user first
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    const userId = user?.id;
    
    if (!userId || !user?.email) {
      return null;
    }
    
    // Try to get existing profile
    let result: Profile | null = null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    
    // If profile doesn't exist, create a default one
    if (!data) {
      // Extract username from email (before @ symbol)
      const username = user.email.split('@')[0];
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username,
          display_name: username
        })
        .select('*')
        .single();
      
      if (createError) {
        throw createError;
      }
      
      result = newProfile;
    } else {
      result = data;
    }

    return result as Profile;
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      throw error;
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
    
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      throw error;
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

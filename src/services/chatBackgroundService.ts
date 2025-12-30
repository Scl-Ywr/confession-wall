'use client';

import { supabase } from '@/lib/supabase/client';

interface ChatBackgroundSetting {
  id: string;
  user_id: string;
  target_id: string;
  target_type: 'private' | 'group';
  background_image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatBackgroundHistory {
  id: string;
  user_id: string;
  image_url: string;
  image_name?: string;
  created_at: string;
  used_at: string;
}

/**
 * 聊天背景服务
 * 处理私人聊天和群聊的背景图片设置
 */
export const chatBackgroundService = {
  /**
   * 获取用户的聊天背景设置
   * @param userId 用户ID
   * @param targetId 目标ID（好友ID或群ID）
   * @param targetType 目标类型（private或group）
   */
  async getChatBackground(
    userId: string,
    targetId: string,
    targetType: 'private' | 'group'
  ): Promise<ChatBackgroundSetting | null> {
    const { data, error } = await supabase
      .from('chat_background_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .single();

    if (error) {
      // 如果错误是"未找到"，这是预期的，因为用户可能还没有设置聊天背景
      if (error.code === 'PGRST116') {
        return null;
      }
      // 其他错误才记录
      console.error('Error getting chat background:', error);
      return null;
    }

    // 如果background_image_url为null，返回null，表示没有背景图片
    if (data.background_image_url === null) {
      return null;
    }

    return data;
  },

  /**
   * 设置聊天背景图片
   * @param userId 用户ID
   * @param targetId 目标ID（好友ID或群ID）
   * @param targetType 目标类型（private或group）
   * @param backgroundImageUrl 背景图片URL
   */
  async setChatBackground(
    userId: string,
    targetId: string,
    targetType: 'private' | 'group',
    backgroundImageUrl: string | null
  ): Promise<ChatBackgroundSetting | null> {
    if (backgroundImageUrl === null) {
      // 如果background_image_url为null，删除记录
      const { error: deleteError } = await supabase
        .from('chat_background_settings')
        .delete()
        .eq('user_id', userId)
        .eq('target_id', targetId)
        .eq('target_type', targetType);

      if (deleteError) {
        console.error('Error removing chat background:', deleteError);
        throw deleteError;
      }

      return null;
    } else {
      // 否则，更新或插入记录
      const { data, error } = await supabase
        .from('chat_background_settings')
        .upsert(
          {
            user_id: userId,
            target_id: targetId,
            target_type: targetType,
            background_image_url: backgroundImageUrl,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,target_id,target_type',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('Error setting chat background:', error);
        throw error;
      }

      return data;
    }
  },

  /**
   * 上传背景图片到存储桶
   * @param file 图片文件
   * @param userId 用户ID
   */
  async uploadBackgroundImage(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `chat_backgrounds/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('confession_images')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading background image:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('confession_images')
      .getPublicUrl(filePath);

    // 将上传的图片添加到历史记录
    await this.addBackgroundToHistory(userId, data.publicUrl, file.name);

    return data.publicUrl;
  },

  /**
   * 获取用户的背景图片历史记录
   * @param userId 用户ID
   * @param limit 返回记录数量，默认10条
   */
  async getBackgroundHistory(userId: string, limit: number = 10): Promise<ChatBackgroundHistory[]> {
    const { data, error } = await supabase
      .from('chat_background_history')
      .select('*')
      .eq('user_id', userId)
      .order('used_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting background history:', error);
      return [];
    }

    return data;
  },

  /**
   * 添加背景图片到历史记录
   * @param userId 用户ID
   * @param imageUrl 图片URL
   * @param imageName 图片名称
   */
  async addBackgroundToHistory(userId: string, imageUrl: string, imageName?: string): Promise<ChatBackgroundHistory> {
    // 检查图片是否已存在于历史记录中
    const { data: existingImages, error: checkError } = await supabase
      .from('chat_background_history')
      .select('id')
      .eq('user_id', userId)
      .eq('image_url', imageUrl)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing background:', checkError);
    }

    // 如果图片已存在，更新使用时间
    if (existingImages && existingImages.length > 0) {
      const { data, error } = await supabase
        .from('chat_background_history')
        .update({
          used_at: new Date().toISOString(),
        })
        .eq('id', existingImages[0].id)
        .select()
        .single();

      if (error) {
        console.error('Error updating background history:', error);
        throw error;
      }

      return data;
    }

    // 否则，添加新记录
    const { data, error } = await supabase
      .from('chat_background_history')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        image_name: imageName,
        used_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding background to history:', error);
      throw error;
    }

    return data;
  },

  /**
   * 使用历史背景图片
   * @param userId 用户ID
   * @param targetId 目标ID（好友ID或群ID）
   * @param targetType 目标类型（private或group）
   * @param imageUrl 图片URL
   */
  async useBackgroundFromHistory(
    userId: string,
    targetId: string,
    targetType: 'private' | 'group',
    imageUrl: string
  ): Promise<ChatBackgroundSetting | null> {
    // 更新图片的使用时间
    await this.addBackgroundToHistory(userId, imageUrl);

    // 设置为当前聊天背景
    return this.setChatBackground(userId, targetId, targetType, imageUrl);
  },
};

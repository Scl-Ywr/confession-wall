// 用户统计服务，处理用户统计数据的业务逻辑
import { supabase } from '@/lib/supabase/client';
import { getOrSetCache, deleteCache, deleteCacheByPattern } from '@/lib/redis/cache-manager';
import { CACHE_EXPIRY } from '@/lib/redis/cache.config';
import { generateCacheKey } from '@/lib/redis/cache.config';

// 引入类型定义
import {
  LoginLog,
  OnlineSession,
  UserPoints,
  UserStats,
  CreateLoginLogInput,
  CreateOnlineSessionInput,
  UpdateOnlineSessionInput,
  UpdateUserPointsInput
} from '@/types/user-stats';

// 获取用户登录日志
export async function getUserLoginLogs(userId: string, limit: number = 10): Promise<LoginLog[]> {
  try {
    const { data } = await supabase
      .from('login_logs')
      .select('*')
      .eq('user_id', userId)
      .order('login_time', { ascending: false })
      .limit(limit)
      .throwOnError();

    return data || [];
  } catch (error) {
    console.error('获取用户登录日志失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return [];
  }
}

// 创建用户登录日志
export async function createLoginLog(input: CreateLoginLogInput): Promise<LoginLog | null> {
  try {
    const { data } = await supabase
      .from('login_logs')
      .insert([input])
      .select('*')
      .single()
      .throwOnError();

    return data || null;
  } catch (error) {
    console.error('创建用户登录日志失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 获取用户在线会话
export async function getUserOnlineSessions(userId: string, limit: number = 10): Promise<OnlineSession[]> {
  try {
    const { data } = await supabase
      .from('online_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_start', { ascending: false })
      .limit(limit)
      .throwOnError();

    return data || [];
  } catch (error) {
    console.error('获取用户在线会话失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return [];
  }
}

// 创建在线会话
export async function createOnlineSession(input: CreateOnlineSessionInput): Promise<OnlineSession | null> {
  try {
    const { data } = await supabase
      .from('online_sessions')
      .insert([input])
      .select('*')
      .single()
      .throwOnError();

    return data || null;
  } catch (error) {
    console.error('创建在线会话失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 更新在线会话（结束会话）
export async function updateOnlineSession(sessionId: string, input: UpdateOnlineSessionInput): Promise<OnlineSession | null> {
  try {
    const { data } = await supabase
      .from('online_sessions')
      .update(input)
      .eq('id', sessionId)
      .select('*')
      .single()
      .throwOnError();

    return data || null;
  } catch (error) {
    console.error('更新在线会话失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 获取用户积分
export async function getUserPoints(userId: string): Promise<UserPoints | null> {
  try {
    // 生成缓存键
    const cacheKey = generateCacheKey('USER_POINTS', { userId });
    
    // 使用缓存机制获取用户积分
    const points = await getOrSetCache<UserPoints | null>(
      cacheKey,
      async () => {
        // 不使用single()方法，避免没有记录时抛出错误
        const { data } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', userId)
          .throwOnError();

        // 如果有数据，返回第一个记录，否则返回null
        return data && data.length > 0 ? data[0] : null;
      },
      CACHE_EXPIRY.MEDIUM // 设置30分钟过期时间
    );

    return points;
  } catch (error) {
    console.error('获取用户积分失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 更新用户积分
export async function updateUserPoints(userId: string, input: UpdateUserPointsInput): Promise<UserPoints | null> {
  try {
    const { data } = await supabase
      .from('user_points')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('*')
      .single()
      .throwOnError();

    // 清除相关缓存
    const cacheKey = generateCacheKey('USER_POINTS', { userId });
    await deleteCache(cacheKey);
    await deleteCacheByPattern(`USER_STATS*`);

    return data || null;
  } catch (error) {
    console.error('更新用户积分失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 增加用户积分
export async function increaseUserPoints(userId: string, amount: number): Promise<UserPoints | null> {
  try {
    const currentPoints = await getUserPoints(userId);
    if (!currentPoints) {
      // 如果用户积分记录不存在，创建一个
      const { data } = await supabase
        .from('user_points')
        .insert([{
          user_id: userId,
          points: amount,
          updated_at: new Date().toISOString()
        }])
        .select('*')
        .single()
        .throwOnError();

      return data || null;
    }

    // 更新用户积分
    const newPoints = currentPoints.points + amount;
    return await updateUserPoints(userId, { points: newPoints });
  } catch (error) {
    console.error('增加用户积分失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 减少用户积分
export async function decreaseUserPoints(userId: string, amount: number): Promise<UserPoints | null> {
  try {
    const currentPoints = await getUserPoints(userId);
    if (!currentPoints) {
      return null;
    }

    // 确保积分不会为负数
    const newPoints = Math.max(0, currentPoints.points - amount);
    return await updateUserPoints(userId, { points: newPoints });
  } catch (error) {
    console.error('减少用户积分失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    return null;
  }
}

// 获取用户的综合统计数据
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    // 生成缓存键
    const cacheKey = generateCacheKey('USER_STATS', { userId });
    
    // 使用缓存机制获取用户统计数据
    const stats = await getOrSetCache<UserStats>(
      cacheKey,
      async () => {
        // 定义一个安全获取数据的函数，处理可能不存在的表
        const safeGetCount = async (table: string, column: string, value: string) => {
          try {
            const result = await supabase.from(table).select('id', { count: 'exact' }).eq(column, value).throwOnError();
            return result.count || 0;
          } catch (error) {
            console.error(`获取${table}数据失败:`, error);
            return 0;
          }
        };

        // 定义一个安全获取or条件数据的函数
        const safeGetCountWithOr = async (table: string, conditions: string) => {
          try {
            const result = await supabase.from(table).select('id', { count: 'exact' }).or(conditions).throwOnError();
            return result.count || 0;
          } catch (error) {
            console.error(`获取${table}数据失败:`, error);
            return 0;
          }
        };

        // 使用Promise.all并行获取所有统计数据，提高性能
        const [
          totalConfessions,
          totalLikes,
          totalComments,
          totalFriends,
          totalChatMessages,
          totalLogins,
          onlineDuration,
          userPoints
        ] = await Promise.all([
          // 获取发布的表白数量
          safeGetCount('confessions', 'user_id', userId),
          // 获取收到的点赞数量
          (async () => {
            try {
              // 先获取用户的所有表白ID
              const { data: confessions } = await supabase.from('confessions').select('id').eq('user_id', userId).throwOnError();
              const confessionIds = confessions?.map(c => c.id) || [];
              
              // 如果没有表白，直接返回0
              if (confessionIds.length === 0) {
                return 0;
              }
              
              // 获取这些表白收到的点赞数量
              const { count } = await supabase.from('likes').select('id', { count: 'exact' })
                .in('confession_id', confessionIds)
                .throwOnError();
              
              return count || 0;
            } catch (error) {
              console.error('获取点赞数量失败:', error);
              return 0;
            }
          })(),
          // 获取发表的评论数量
          safeGetCount('comments', 'user_id', userId),
          // 获取好友数量
          safeGetCountWithOr('friendships', `user_id.eq.${userId},friend_id.eq.${userId}`),
          // 获取聊天消息数量
          safeGetCountWithOr('chat_messages', `sender_id.eq.${userId},receiver_id.eq.${userId}`),
          // 获取登录次数（如果login_logs表不存在，返回0）
          safeGetCount('login_logs', 'user_id', userId),
          // 获取在线时长（如果online_sessions表不存在，返回默认值）
          (async () => {
            try {
              const result = await supabase.from('online_sessions').select('duration').eq('user_id', userId).throwOnError();
              const totalSeconds = result.data?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;
              return `${(totalSeconds / 3600).toFixed(1)}h`;
            } catch {
              return '0.0h';
            }
          })(),
          // 获取系统积分
          (async () => {
            try {
              const points = await getUserPoints(userId);
              return points?.points || 0;
            } catch (error) {
              console.error('获取用户积分失败:', error);
              return 0;
            }
          })()
        ]);

        // 返回整合的统计数据
        return {
          totalConfessions,
          totalLikes,
          totalComments,
          totalFriends,
          totalChatMessages,
          totalLogins,
          onlineDuration,
          systemPoints: userPoints
        };
      },
      CACHE_EXPIRY.SHORT // 设置5分钟过期时间
    );

    return stats || {
      totalConfessions: 0,
      totalLikes: 0,
      totalComments: 0,
      totalFriends: 0,
      totalChatMessages: 0,
      totalLogins: 0,
      onlineDuration: '0.0h',
      systemPoints: 0
    };
  } catch (error) {
    console.error('获取用户统计数据失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack);
    }
    // 返回默认值，确保系统不会崩溃
    return {
      totalConfessions: 0,
      totalLikes: 0,
      totalComments: 0,
      totalFriends: 0,
      totalChatMessages: 0,
      totalLogins: 0,
      onlineDuration: '0.0h',
      systemPoints: 0
    };
  }
}

// 使用 Supabase MCP 和 Redis MCP 将 Supabase 数据同步到 Redis
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 初始化 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 初始化 Redis 客户端
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB),
});

// 定义过期时间常量
const EXPIRY_TIMES = {
  SHORT: 5 * 60,           // 5分钟
  MEDIUM: 60 * 60,         // 1小时
  DEFAULT: 7 * 24 * 60 * 60, // 7天
  LONG: 30 * 24 * 60 * 60,   // 30天
  NULL_VALUE: 5 * 60,       // 5分钟
  LOCK: 10,                 // 10秒
  INSTANT: 60,              // 1分钟
  FOREVER: 0,               // 永不过期
};

// 定义缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  version: number;
  hits: number;
}

// 日志函数
function log(message: string, level: 'info' | 'error' | 'success' = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    error: '\x1b[31m',
    success: '\x1b[32m',
  };
  console.log(`${colors[level]}[${timestamp}] ${message}\x1b[0m`);
}

// 生成缓存项
function createCacheItem<T>(data: T): CacheItem<T> {
  return {
    data,
    timestamp: Date.now(),
    version: 1,
    hits: 0,
  };
}

// 同步用户资料到 Redis
async function syncUserProfiles() {
  log('开始同步用户资料...', 'info');
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    if (profiles && profiles.length > 0) {
      log(`发现 ${profiles.length} 个用户资料`, 'info');
      
      for (const profile of profiles) {
        const key = `user:profile:${profile.id}`;
        const cacheItem = createCacheItem(profile);
        
        await redis.setex(key, EXPIRY_TIMES.DEFAULT, JSON.stringify(cacheItem));
      }
      
      log(`成功同步 ${profiles.length} 个用户资料到 Redis`, 'success');
    } else {
      log('没有用户资料需要同步', 'info');
    }
  } catch (error) {
    log(`同步用户资料失败: ${error}`, 'error');
  }
}

// 同步表白墙数据到 Redis
async function syncConfessions() {
  log('开始同步表白墙数据...', 'info');
  
  try {
    const { data: confessions, error } = await supabase
      .from('confessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    if (confessions && confessions.length > 0) {
      log(`发现 ${confessions.length} 条表白`, 'info');
      
      // 同步表白列表缓存
      const listKey = `confession:list:1:10:all`;
      const listCacheItem = createCacheItem(confessions.slice(0, 10));
      await redis.setex(listKey, EXPIRY_TIMES.DEFAULT, JSON.stringify(listCacheItem));
      
      // 同步单个表白缓存
      for (const confession of confessions) {
        const detailKey = `confession:detail:${confession.id}:all`;
        const detailCacheItem = createCacheItem(confession);
        
        await redis.setex(detailKey, EXPIRY_TIMES.DEFAULT, JSON.stringify(detailCacheItem));
      }
      
      log(`成功同步 ${confessions.length} 条表白到 Redis`, 'success');
    } else {
      log('没有表白数据需要同步', 'info');
    }
  } catch (error) {
    log(`同步表白墙数据失败: ${error}`, 'error');
  }
}

// 同步表白点赞数据到 Redis
async function syncConfessionLikes() {
  log('开始同步表白点赞数据...', 'info');
  
  try {
    const { data: likes, error } = await supabase
      .from('likes')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    if (likes && likes.length > 0) {
      log(`发现 ${likes.length} 条点赞记录`, 'info');
      
      // 按表白ID分组
      const likesByConfession = likes.reduce((acc, like) => {
        const confessionId = like.confession_id;
        if (!acc[confessionId]) {
          acc[confessionId] = [];
        }
        acc[confessionId].push(like);
        return acc;
      }, {} as Record<string, typeof likes>);
      
      // 同步点赞状态缓存
      for (const [confessionId, confessionLikes] of Object.entries(likesByConfession)) {
        const likesKey = `confession:likes:${confessionId}:all`;
        const likesCacheItem = createCacheItem(confessionLikes);
        
        await redis.setex(likesKey, EXPIRY_TIMES.DEFAULT, JSON.stringify(likesCacheItem));
      }
      
      log(`成功同步 ${likes.length} 条点赞记录到 Redis`, 'success');
    } else {
      log('没有点赞数据需要同步', 'info');
    }
  } catch (error) {
    log(`同步表白点赞数据失败: ${error}`, 'error');
  }
}

// 同步表白评论数据到 Redis
async function syncConfessionComments() {
  log('开始同步表白评论数据...', 'info');
  
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    if (comments && comments.length > 0) {
      log(`发现 ${comments.length} 条评论`, 'info');
      
      // 按表白ID分组
      const commentsByConfession = comments.reduce((acc, comment) => {
        const confessionId = comment.confession_id;
        if (!acc[confessionId]) {
          acc[confessionId] = [];
        }
        acc[confessionId].push(comment);
        return acc;
      }, {} as Record<string, typeof comments>);
      
      // 同步评论缓存
      for (const [confessionId, confessionComments] of Object.entries(commentsByConfession)) {
        const commentsKey = `confession:comments:${confessionId}:all`;
        const commentsCacheItem = createCacheItem(confessionComments);
        
        await redis.setex(commentsKey, EXPIRY_TIMES.DEFAULT, JSON.stringify(commentsCacheItem));
      }
      
      log(`成功同步 ${comments.length} 条评论到 Redis`, 'success');
    } else {
      log('没有评论数据需要同步', 'info');
    }
  } catch (error) {
    log(`同步表白评论数据失败: ${error}`, 'error');
  }
}

// 同步表白图片数据到 Redis
async function syncConfessionImages() {
  log('开始同步表白图片数据...', 'info');
  
  try {
    const { data: images, error } = await supabase
      .from('confession_images')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    if (images && images.length > 0) {
      log(`发现 ${images.length} 张图片`, 'info');
      
      // 可以考虑在表白详情缓存中包含图片信息，或者单独缓存
      log(`成功处理 ${images.length} 张图片`, 'success');
    } else {
      log('没有图片数据需要同步', 'info');
    }
  } catch (error) {
    log(`同步表白图片数据失败: ${error}`, 'error');
  }
}

// 同步系统设置到 Redis
async function syncSystemSettings() {
  log('开始同步系统设置...', 'info');
  
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    if (settings && settings.length > 0) {
      log(`发现 ${settings.length} 个系统设置`, 'info');
      
      // 同步系统设置缓存
      for (const setting of settings) {
        const settingKey = `system:setting:${setting.key}`;
        const settingCacheItem = createCacheItem(setting);
        
        // 管理员验证码设置永不过期
        const expiryTime = setting.key === 'admin_verification_code' 
          ? EXPIRY_TIMES.FOREVER 
          : EXPIRY_TIMES.DEFAULT;
        
        await redis.setex(settingKey, expiryTime, JSON.stringify(settingCacheItem));
      }
      
      log(`成功同步 ${settings.length} 个系统设置到 Redis`, 'success');
    } else {
      log('没有系统设置需要同步', 'info');
    }
  } catch (error) {
    log(`同步系统设置失败: ${error}`, 'error');
  }
}

// 主同步函数
async function main() {
  log('开始执行 Supabase 到 Redis 的数据同步', 'info');
  
  try {
    // 按顺序执行同步任务
    await Promise.all([
      syncUserProfiles(),
      syncConfessions(),
      syncConfessionLikes(),
      syncConfessionComments(),
      syncConfessionImages(),
      syncSystemSettings()
    ]);
    
    log('所有数据同步任务完成', 'success');
  } catch (error) {
    log(`同步过程中发生错误: ${error}`, 'error');
  } finally {
    // 关闭连接
    await redis.quit();
  }
}

// 执行主函数
main();
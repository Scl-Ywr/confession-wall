// 简单的测试脚本，用于验证Supabase和Redis连接并更新缓存
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @next/next/no-assign-module-variable */
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// 加载环境变量
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local'), override: true });

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 创建Redis客户端
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || '',
  db: 0,
});

// 定义缓存键命名
const SERVICE_NAME = 'confession_wall';

// 缓存键生成函数 (当前未使用，保留备用)
// function generateCacheKey(module, resource, id = '', version = CACHE_VERSION) {
//   const parts = [SERVICE_NAME, module, resource];
//   if (id) {
//     parts.push(String(id));
//   }
//   parts.push(version);
//   return parts.join(':');
// }

// 主要更新函数
async function updateRedisCache() {
  try {
    console.log('=== 开始更新Redis缓存 ===');
    
    // 1. 验证Supabase连接
    console.log('验证Supabase连接...');
    const { error: supabaseError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (supabaseError) {
      throw new Error(`Supabase连接失败: ${supabaseError.message}`);
    }
    console.log('✓ Supabase连接成功');
    
    // 2. 验证Redis连接
    console.log('验证Redis连接...');
    const redisTest = await redis.ping();
    if (redisTest !== 'PONG') {
      throw new Error('Redis连接失败');
    }
    console.log('✓ Redis连接成功');
    
    // 3. 获取所有现有Redis键
    console.log('获取所有现有Redis键...');
    const keys = await redis.keys(`${SERVICE_NAME}:*`);
    console.log(`找到 ${keys.length} 个缓存键`);
    
    // 4. 遍历并更新每个键
    for (const key of keys) {
      console.log(`\n处理键: ${key}`);
      
      // 解析键结构
      const parts = key.split(':');
      if (parts.length < 3) {
        console.log(`跳过无效键: ${key}`);
        continue;
      }
      
      const module = parts[1];
      const resource = parts[2];
      const id = parts.length > 4 ? parts.slice(3, -1).join(':') : '';
      
      let freshData = null;
      
      try {
        // 根据模块和资源类型从Supabase获取最新数据
        switch (module) {
          case 'user':
            if (resource === 'profile' && id) {
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
              if (error) throw error;
              freshData = data;
            } else if (resource === 'status' && id) {
              const { data, error } = await supabase
                .from('profiles')
                .select('online_status, last_seen')
                .eq('id', id)
                .single();
              if (error) throw error;
              freshData = data;
            }
            break;
          
          case 'confession':
            if (resource === 'list' && id) {
              const [page, limit] = id.split(':').map(Number);
              const { data, error } = await supabase
                .from('confessions')
                .select('*')
                .order('created_at', { ascending: false })
                .range((page - 1) * limit, page * limit - 1);
              if (error) throw error;
              freshData = data;
            } else if (resource === 'detail' && id) {
              const { data, error } = await supabase
                .from('confessions')
                .select('*')
                .eq('id', id)
                .single();
              if (error) throw error;
              freshData = data;
            }
            break;
          
          case 'chat':
            if (resource === 'private' && id) {
              const [userId1, userId2] = id.split(':');
              const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`(sender_id.eq.${userId1},recipient_id.eq.${userId2}),(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
                .order('created_at', { ascending: true });
              if (error) throw error;
              freshData = data;
            } else if (resource === 'group' && id) {
              const { data, error } = await supabase
                .from('group_messages')
                .select('*')
                .eq('group_id', id)
                .order('created_at', { ascending: true });
              if (error) throw error;
              freshData = data;
            }
            break;
          
          case 'system':
            // 系统键，跳过更新
            console.log('跳过系统键');
            continue;
          
          default:
            console.log(`未知模块: ${module}，跳过`);
            continue;
        }
        
        // 更新Redis缓存
        if (freshData !== null) {
          await redis.set(key, JSON.stringify(freshData));
          console.log(`✓ 成功更新缓存: ${key}`);
          
          // 验证更新后的一致性
          const cachedData = await redis.get(key);
          const parsedCachedData = JSON.parse(cachedData);
          
          // 简单验证：检查数据类型是否一致
          const isConsistent = typeof parsedCachedData === typeof freshData;
          if (isConsistent) {
            console.log(`✓ 数据一致性验证通过`);
          } else {
            console.log(`✗ 数据一致性验证失败: 类型不匹配`);
          }
        } else {
          console.log(`无数据可更新: ${key}`);
        }
        
      } catch (error) {
        console.log(`✗ 处理键 ${key} 时出错: ${error.message}`);
      }
    }
    
    console.log('\n=== Redis缓存更新完成 ===');
    
  } catch (error) {
    console.error('更新过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    // 关闭连接
    await redis.quit();
    console.log('连接已关闭');
  }
}

// 执行更新
updateRedisCache();
// 验证 Redis 同步结果
import dotenv from 'dotenv';
import Redis from 'ioredis';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 初始化 Redis 客户端
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB),
});

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

// 验证函数
async function verifyRedisSync() {
  log('开始验证 Redis 同步结果...', 'info');
  
  try {
    // 检查用户资料缓存
    const userKeys = await redis.keys('user:profile:*');
    log(`发现 ${userKeys.length} 个用户资料缓存键`, 'info');
    
    if (userKeys.length > 0) {
      const sampleUserKey = userKeys[0];
      const sampleUserData = await redis.get(sampleUserKey);
      if (sampleUserData) {
        const parsedData = JSON.parse(sampleUserData);
        log(`示例用户资料缓存: ${sampleUserKey} -> 包含 ${Object.keys(parsedData.data).join(', ')} 字段`, 'success');
      }
    }
    
    // 检查表白墙缓存
    const confessionKeys = await redis.keys('confession:detail:*');
    log(`发现 ${confessionKeys.length} 个表白详情缓存键`, 'info');
    
    if (confessionKeys.length > 0) {
      const sampleConfessionKey = confessionKeys[0];
      const sampleConfessionData = await redis.get(sampleConfessionKey);
      if (sampleConfessionData) {
        const parsedData = JSON.parse(sampleConfessionData);
        log(`示例表白详情缓存: ${sampleConfessionKey} -> 标题: ${parsedData.data.title || '无标题'}`, 'success');
      }
    }
    
    // 检查点赞缓存
    const likeKeys = await redis.keys('confession:likes:*');
    log(`发现 ${likeKeys.length} 个点赞状态缓存键`, 'info');
    
    // 检查评论缓存
    const commentKeys = await redis.keys('confession:comments:*');
    log(`发现 ${commentKeys.length} 个评论缓存键`, 'info');
    
    // 检查表白列表缓存
    const listKeys = await redis.keys('confession:list:*');
    log(`发现 ${listKeys.length} 个表白列表缓存键`, 'info');
    
    // 总键数
    const totalKeys = await redis.keys('*');
    log(`Redis 中总共有 ${totalKeys.length} 个键`, 'success');
    
  } catch (error) {
    log(`验证过程中发生错误: ${error}`, 'error');
  } finally {
    // 关闭连接
    await redis.quit();
  }
}

// 执行验证
verifyRedisSync();
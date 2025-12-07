import { NextResponse } from 'next/server';
import { RedisCacheManager } from '@/lib/redis/cache-manager';

/**
 * GET /api/clear-cache
 * 清空所有Redis缓存
 * 注意：此端点需要通过API密钥进行验证，防止误操作
 */
export async function GET(request: Request) {
  try {
    // 1. API密钥验证
    const apiKey = request.headers.get('X-API-KEY');
    const expectedApiKey = process.env.CACHE_CLEAR_API_KEY;
    
    // 检查API密钥是否配置
    if (!expectedApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: '缓存清空功能未配置，请联系管理员'
        },
        { status: 401 }
      );
    }
    
    // 验证API密钥
    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: '无效的API密钥'
        },
        { status: 401 }
      );
    }
    
    // 2. 获取缓存管理器实例
    const cacheManager = RedisCacheManager.getInstance();
    
    // 3. 记录缓存清除操作
    console.log(`[Cache Management] Clear cache requested by API key at ${new Date().toISOString()}`);
    
    // 4. 清空所有缓存
    const result = await cacheManager.clearCache();
    
    // 5. 记录操作结果
    console.log(`[Cache Management] Clear cache result: ${result ? 'success' : 'failed'} at ${new Date().toISOString()}`);
    
    return NextResponse.json({
      success: result,
      message: result ? '缓存已成功清空' : '缓存清空失败'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: '缓存清空失败'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clear-cache
 * 更细粒度的缓存清除
 * 支持按模块或键模式清除缓存
 */
export async function POST(request: Request) {
  try {
    // 1. API密钥验证
    const apiKey = request.headers.get('X-API-KEY');
    const expectedApiKey = process.env.CACHE_CLEAR_API_KEY;
    
    if (!expectedApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: '缓存清空功能未配置，请联系管理员'
        },
        { status: 401 }
      );
    }
    
    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: '无效的API密钥'
        },
        { status: 401 }
      );
    }
    
    // 2. 获取请求体
    const body = await request.json();
    const { module, pattern, keys } = body;
    
    // 3. 获取缓存管理器实例
    const cacheManager = RedisCacheManager.getInstance();
    
    const result = true;
    let message = '缓存清除成功';
    
    // 4. 根据不同参数执行不同的清除逻辑
    if (keys && Array.isArray(keys) && keys.length > 0) {
      // 清除指定的键列表
      for (const key of keys) {
        await cacheManager.deleteCache(key);
      }
      message = `成功清除 ${keys.length} 个缓存键`;
      console.log(`[Cache Management] Clear cache for specific keys: ${keys.join(', ')} at ${new Date().toISOString()}`);
    } else if (pattern) {
      // 清除匹配模式的键
      const allKeys = await cacheManager.getCacheKeys(pattern);
      for (const key of allKeys) {
        await cacheManager.deleteCache(key);
      }
      message = `成功清除匹配模式 "${pattern}" 的 ${allKeys.length} 个缓存键`;
      console.log(`[Cache Management] Clear cache for pattern: ${pattern} at ${new Date().toISOString()}`);
    } else if (module) {
      // 清除指定模块的键
      const modulePattern = `${module}:*`;
      const allKeys = await cacheManager.getCacheKeys(modulePattern);
      for (const key of allKeys) {
        await cacheManager.deleteCache(key);
      }
      message = `成功清除模块 "${module}" 的 ${allKeys.length} 个缓存键`;
      console.log(`[Cache Management] Clear cache for module: ${module} at ${new Date().toISOString()}`);
    } else {
      // 默认清除所有缓存（需要额外确认）
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: '请指定清除范围：keys、pattern或module，或使用GET请求清除所有缓存'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: result,
      message: message
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: '缓存清空失败'
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { cacheManager } from '@/lib/redis/cache-manager';
import { cacheInvalidationManager } from '@/lib/redis/cache-invalidation-manager';
import { CacheModule, CacheResource } from '@/lib/redis/cache-key-naming';

// API密钥验证
const validateApiKey = (request: Request): boolean => {
  const apiKey = request.headers.get('X-API-KEY');
  const expectedApiKey = process.env.CACHE_MANAGEMENT_API_KEY;
  
  if (!expectedApiKey) {
    return false;
  }
  
  return apiKey === expectedApiKey;
};

// 获取缓存统计信息
export async function GET(request: Request) {
  // 验证API密钥
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: '无效的API密钥' },
      { status: 401 }
    );
  }
  
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // 获取统计类型
    const type = searchParams.get('type') || 'summary';
    
    if (type === 'keys') {
      // 获取缓存键列表
      const pattern = searchParams.get('pattern') || '*';
      const keys = await cacheManager.getCacheKeys(pattern);
      
      return NextResponse.json({
        success: true,
        data: {
          keys,
          count: keys.length
        }
      });
    } else if (type === 'modules') {
      // 获取模块版本信息
      const moduleVersions = cacheInvalidationManager.getAllModuleVersions();
      const modules = Array.from(moduleVersions.entries()).map(([module, version]) => ({
        module,
        version
      }));
      
      return NextResponse.json({
        success: true,
        data: { modules }
      });
    } else {
      // 获取缓存统计摘要
      const stats = await cacheManager.getCacheStatistics();
      
      return NextResponse.json({
        success: true,
        data: stats
      });
    }
  } catch (error) {
    console.error('[Cache API] Error getting cache statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', message: '获取缓存统计信息失败' },
      { status: 500 }
    );
  }
}

// 删除缓存
export async function DELETE(request: Request) {
  // 验证API密钥
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: '无效的API密钥' },
      { status: 401 }
    );
  }
  
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // 获取删除类型
    const key = searchParams.get('key');
    const pattern = searchParams.get('pattern');
    const all = searchParams.get('all');
    
    if (all) {
      // 清除所有缓存
      const result = await cacheManager.clearCache();
      return NextResponse.json({
        success: result,
        message: result ? '所有缓存已清除' : '清除缓存失败'
      });
    } else if (key) {
      // 清除单个缓存键
      const result = await cacheManager.deleteCache(key);
      return NextResponse.json({
        success: result,
        message: result ? `缓存键 ${key} 已清除` : `清除缓存键 ${key} 失败`
      });
    } else if (pattern) {
      // 按模式清除缓存
      const result = await cacheManager.deleteCacheByPattern(pattern);
      return NextResponse.json({
        success: result > 0,
        message: result > 0 ? `已清除 ${result} 个匹配模式 ${pattern} 的缓存键` : `没有找到匹配模式 ${pattern} 的缓存键`
      });
    } else if (searchParams.get('module')) {
      // 按模块清除缓存
      const moduleName = searchParams.get('module') as string;
      const result = await cacheManager.deleteCacheByModule(moduleName);
      return NextResponse.json({
        success: result > 0,
        message: result > 0 ? `已清除 ${result} 个模块 ${moduleName} 的缓存键` : `没有找到模块 ${moduleName} 的缓存键`
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Bad Request', message: '缺少必要参数' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Cache API] Error deleting cache:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', message: '删除缓存失败' },
      { status: 500 }
    );
  }
}

// 更新缓存
export async function POST(request: Request) {
  // 验证API密钥
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: '无效的API密钥' },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { action, data } = body;
    
    if (action === 'invalidate') {
      // 手动触发缓存失效
      const { key, module, resource, confessionId, userId } = data;
      
      if (key) {
        await cacheInvalidationManager.invalidateCache(key);
        return NextResponse.json({
          success: true,
          message: `缓存键 ${key} 已失效`
        });
      } else if (module && resource) {
        await cacheInvalidationManager.invalidateResourceCaches(
          module as CacheModule,
          resource as CacheResource
        );
        return NextResponse.json({
          success: true,
          message: `模块 ${module} 的资源 ${resource} 已失效`
        });
      } else if (module) {
        await cacheInvalidationManager.invalidateModuleCaches(module as CacheModule);
        return NextResponse.json({
          success: true,
          message: `模块 ${module} 已失效`
        });
      } else if (confessionId) {
        await cacheInvalidationManager.invalidateConfessionCache(confessionId);
        return NextResponse.json({
          success: true,
          message: `告白 ${confessionId} 相关缓存已失效`
        });
      } else if (userId) {
        await cacheInvalidationManager.invalidateUserCache(userId);
        return NextResponse.json({
          success: true,
          message: `用户 ${userId} 相关缓存已失效`
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Bad Request', message: '缺少必要参数' },
          { status: 400 }
        );
      }
    } else if (action === 'clearAll') {
      // 清除所有缓存
      await cacheInvalidationManager.clearAllCache();
      return NextResponse.json({
        success: true,
        message: '所有缓存已清除'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Bad Request', message: '无效的操作类型' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Cache API] Error updating cache:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', message: '更新缓存失败' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { RedisCacheManager } from '@/lib/redis/cache-manager';

/**
 * GET /api/clear-cache
 * 清空所有Redis缓存
 */
export async function GET() {
  try {
    // 获取缓存管理器实例
    const cacheManager = RedisCacheManager.getInstance();
    
    // 清空所有缓存
    const result = await cacheManager.clearCache();
    
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

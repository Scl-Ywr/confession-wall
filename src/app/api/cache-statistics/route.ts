import { NextResponse } from 'next/server';
import { getCacheStatistics } from '@/lib/redis/cache-manager';

/**
 * GET /api/cache-statistics
 * 获取缓存统计信息
 * 用于监控缓存命中率、请求数、命中数和未命中数等指标
 */
export async function GET() {
  try {
    // 获取缓存统计信息
    const stats = await getCacheStatistics();
    
    // 如果没有统计数据，返回默认值
    const defaultStats = {
      hits: 0,
      misses: 0,
      requests: 0,
      hitRate: 0,
      lastUpdated: Date.now()
    };
    
    return NextResponse.json({
      success: true,
      data: stats || defaultStats
    });
  } catch (error) {
    console.error('Error getting cache statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        data: {
          hits: 0,
          misses: 0,
          requests: 0,
          hitRate: 0,
          lastUpdated: Date.now()
        }
      },
      { status: 500 }
    );
  }
}

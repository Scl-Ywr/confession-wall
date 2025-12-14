// 表白详情页面
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getConfessionById, getLikes, getComments } from '@/services/admin/adminService';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaGallery } from '@/components/MediaGallery';
import { ConfessionImage } from '@/types/confession';
import Image from 'next/image';

// 定义媒体文件类型
interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
}

export default async function ConfessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 在Next.js 16中，params是一个Promise，需要先await解包
  const { id } = await params;
  
  // 获取表白详情、点赞列表和评论列表
  const [confession, likesResult, commentsResult] = await Promise.all([
    getConfessionById(id),
    getLikes({ confessionId: id }),
    getComments({ confessionId: id })
  ]);
  
  // 如果表白不存在，返回404
  if (!confession) {
    notFound();
  }

  // 从表白数据中提取媒体文件
  const mediaFiles: MediaFile[] = (confession.images || []).map((image: ConfessionImage) => ({
    id: image.id,
    url: image.image_url,
    type: image.file_type === 'video' ? 'video' : 'image',
    name: `media_${image.id}.${image.file_type === 'video' ? 'mp4' : 'jpg'}`
  }));

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">表白详情</h1>
            <p className="text-gray-600 mt-1">查看表白的完整信息和媒体文件</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/admin/confessions/${id}/edit`}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center space-x-2"
            >
              <span>✏️</span>
              <span>编辑表白</span>
            </Link>
            <button className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center space-x-2">
              <span>🗑️</span>
              <span>删除表白</span>
            </button>
          </div>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">📋</span>
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 左侧基本信息 */}
              <div className="md:col-span-1 space-y-4">
                {[
                  { label: '表白ID', value: confession.id, icon: '🆔' },
                  { label: '用户ID', value: confession.user_id || '匿名用户', icon: '👤' },
                  { label: '匿名状态', value: confession.is_anonymous ? '是' : '否', icon: confession.is_anonymous ? '🕵️' : '👤', color: confession.is_anonymous ? 'blue' : 'gray' },
                  { label: '创建时间', value: new Date(confession.created_at).toLocaleString(), icon: '📅' }
                ].map((item) => (
                  <div key={item.label} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`mt-1 text-${item.color || 'gray'}-500`}>{item.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{item.label}</p>
                      <p className="text-base font-semibold text-gray-900">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 中间统计信息 */}
              <div className="md:col-span-1 space-y-4">
                {[
                  { label: '点赞数', value: confession.likes_count || 0, icon: '❤️', color: 'red' },
                  { label: '评论数', value: confession.comments_count || 0, icon: '💬', color: 'blue' },
                  { label: '分享数', value: '0', icon: '📤', color: 'green' },
                  { label: '浏览量', value: '123', icon: '👁️', color: 'purple' }
                ].map((item) => (
                  <div key={item.label} className={`p-4 rounded-lg bg-${item.color}-50 border border-${item.color}-100`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">{item.label}</span>
                      <span className={`text-${item.color}-600`}>{item.icon}</span>
                    </div>
                    <p className={`text-2xl font-bold text-${item.color}-700`}>{item.value}</p>
                  </div>
                ))}
              </div>
              
              {/* 右侧状态信息 */}
              <div className="md:col-span-1 space-y-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-3">审核状态</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-${confession.status === 'approved' ? 'green' : confession.status === 'rejected' ? 'red' : 'yellow'}-600`}>
                        {confession.status === 'approved' ? '✅' : confession.status === 'rejected' ? '❌' : '⏳'}
                      </span>
                      <span className="font-medium text-gray-800">
                        {confession.status === 'approved' ? '已通过' : confession.status === 'rejected' ? '已拒绝' : '待审核'}
                      </span>
                    </div>
                    <button className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors">
                      更改状态
                    </button>
                  </div>
                  {confession.moderated_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      审核时间：{new Date(confession.moderated_at).toLocaleString()}
                    </p>
                  )}
                  {confession.rejection_reason && (
                    <p className="text-xs text-red-600 mt-2">
                      拒绝原因：{confession.rejection_reason}
                    </p>
                  )}
                </div>
                
                <div className="p-4 rounded-lg bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-3">操作日志</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">创建表白</span>
                      <span className="text-gray-500">{new Date(confession.created_at).toLocaleString()}</span>
                    </div>
                    {confession.moderated_at && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">审核通过</span>
                        <span className="text-gray-500">{new Date(confession.moderated_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 表白内容卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">💬</span>
              表白内容
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-gray-200">
              <p className="text-lg text-gray-900 whitespace-pre-wrap leading-relaxed">{confession.content || '无内容'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 媒体文件卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">📸</span>
                媒体文件
              </CardTitle>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors">
                  下载全部
                </button>
                <button className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors">
                  管理媒体
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MediaGallery mediaFiles={mediaFiles} />
          </CardContent>
        </Card>
      </div>

      {/* 点赞列表卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">❤️</span>
                点赞列表
              </CardTitle>
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors">
                导出列表
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户名
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      点赞时间
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {likesResult.likes.length > 0 ? (
                    likesResult.likes.map((like) => (
                      <tr key={like.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {like.user_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {like.profiles?.avatar_url ? (
                              <div className="w-10 h-10 rounded-full mr-2 overflow-hidden relative">
                                <Image 
                                  src={like.profiles.avatar_url} 
                                  alt={like.profiles.username} 
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                                <span className="text-gray-600">👤</span>
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {like.profiles?.username || '未知用户'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(like.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button className="text-red-600 hover:text-red-900">移除</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                        暂无点赞记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 评论列表卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">💬</span>
                评论列表
              </CardTitle>
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors">
                导出列表
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {commentsResult.comments.length > 0 ? (
                commentsResult.comments.map((comment) => (
                  <div 
                    key={comment.id}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {comment.is_anonymous ? (
                          <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                            <span className="text-gray-600">🕵️</span>
                          </div>
                        ) : comment.profiles?.avatar_url ? (
                          <div className="w-10 h-10 rounded-full mr-3 overflow-hidden relative">
                            <Image 
                              src={comment.profiles.avatar_url} 
                              alt={comment.profiles.username} 
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                            <span className="text-gray-600">👤</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {comment.is_anonymous ? '匿名用户' : (comment.profiles?.username || '未知用户')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 text-sm">
                          回复
                        </button>
                        <button className="text-red-600 hover:text-red-900 text-sm">
                          删除
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{comment.content || '无内容'}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <button className="flex items-center space-x-1 hover:text-blue-600 transition-colors">
                        <span>❤️</span>
                        <span>0</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-blue-600 transition-colors">
                        <span>💬</span>
                        <span>0</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-blue-600 transition-colors">
                        <span>🔗</span>
                        <span>分享</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                  暂无评论记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

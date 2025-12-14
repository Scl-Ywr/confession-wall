// 用户详情页面
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getUserById, getUserStats } from '@/services/admin/adminService';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 在Next.js 16中，params是一个Promise，需要先await解包
  const { id } = await params;
  
  // 获取用户详情和统计数据
  const [user, stats] = await Promise.all([
    getUserById(id),
    getUserStats(id)
  ]);
  
  // 如果用户不存在，返回404
  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">用户详情</h1>
            <p className="text-gray-600 mt-1">查看用户的完整信息和活动记录</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/admin/users/${id}/edit`}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center space-x-2"
            >
              <span>✏️</span>
              <span>编辑用户</span>
            </Link>
            <button className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center space-x-2">
              <span>🗑️</span>
              <span>删除用户</span>
            </button>
          </div>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">👤</span>
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 左侧头像和基本信息 */}
              <div className="md:col-span-1">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg">
                    <Image 
                      src={user.avatar_url || 'https://ui-avatars.com/api/?name=' + user.username + '&background=random'} 
                      alt={user.username} 
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900">{user.display_name || user.username}</h3>
                    <p className="text-gray-500">{user.username}</p>
                    <div className={`mt-2 px-3 py-1 inline-block text-sm rounded-full ${user.online_status === 'online' ? 'bg-green-100 text-green-800' : user.online_status === 'away' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.online_status === 'online' ? '在线' : user.online_status === 'away' ? '离开' : '离线'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 右侧详细信息 */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '用户ID', value: user.id, icon: '🆔' },
                  { label: '邮箱', value: user.email, icon: '📧' },
                  { label: '注册时间', value: new Date(user.created_at).toLocaleString(), icon: '📅' },
                  { label: '最后更新', value: new Date(user.updated_at).toLocaleString(), icon: '🔄' },
                  { label: '最后登录', value: new Date(user.last_seen).toLocaleString(), icon: '👁️' },
                  { label: '账户状态', value: user.is_admin ? '管理员' : '普通用户', icon: '👑' }
                ].map((item) => (
                  <div key={item.label} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="mt-1 text-gray-500">{item.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{item.label}</p>
                      <p className="text-base font-semibold text-gray-900">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 个人简介卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">📝</span>
              个人简介
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{user.bio || '用户未填写个人简介'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 权限配置卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">🔑</span>
              权限配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">用户角色</h3>
                <div className="space-y-2">
                  {user.is_admin ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">👑</span>
                        <span className="font-medium text-blue-800">管理员</span>
                      </div>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">系统角色</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">👤</span>
                        <span className="font-medium text-gray-800">普通用户</span>
                      </div>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">系统角色</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3">特殊权限</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: '发布表白', value: true, color: 'green' },
                    { name: '评论表白', value: true, color: 'green' },
                    { name: '发送消息', value: true, color: 'green' },
                    { name: '添加好友', value: true, color: 'green' },
                    { name: '管理用户', value: user.is_admin, color: user.is_admin ? 'green' : 'red' },
                    { name: '管理表白', value: user.is_admin, color: user.is_admin ? 'green' : 'red' },
                    { name: '管理聊天', value: user.is_admin, color: user.is_admin ? 'green' : 'red' },
                    { name: '系统设置', value: user.is_admin, color: user.is_admin ? 'green' : 'red' }
                  ].map((permission) => (
                    <div key={permission.name} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                      <span className="text-sm text-gray-700">{permission.name}</span>
                      <div className={`w-5 h-5 rounded-full bg-${permission.color}-500 flex items-center justify-center text-white text-xs`}>
                        {permission.value ? '✓' : '✗'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 数据统计卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">📊</span>
              用户数据统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: '发布表白', value: stats.totalConfessions.toString(), icon: '💬', color: 'blue' },
                { name: '收到点赞', value: stats.totalLikes.toString(), icon: '❤️', color: 'red' },
                { name: '发表评论', value: stats.totalComments.toString(), icon: '💬', color: 'green' },
                { name: '好友数量', value: stats.totalFriends.toString(), icon: '🤝', color: 'purple' },
                { name: '聊天消息', value: stats.totalChatMessages.toString(), icon: '💬', color: 'yellow' },
                { name: '登录次数', value: stats.totalLogins.toString(), icon: '👁️', color: 'orange' },
                { name: '在线时长', value: stats.onlineDuration, icon: '⚡', color: 'cyan' },
                { name: '系统积分', value: stats.systemPoints.toString(), icon: '🏆', color: 'pink' }
              ].map((stat) => (
                <div key={stat.name} className={`p-4 rounded-lg bg-${stat.color}-50 border border-${stat.color}-100`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">{stat.name}</span>
                    <span className={`text-${stat.color}-600`}>{stat.icon}</span>
                  </div>
                  <p className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作日志卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">📋</span>
              操作日志
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 生成固定的模拟数据，避免不纯函数调用 */}
            {(() => {
              const baseDate = new Date();
              const logs = [
                { action: '注册账号', time: user.created_at, status: '成功', color: 'green', icon: '📝' },
                { action: '更新个人资料', time: user.updated_at, status: '成功', color: 'blue', icon: '🔄' },
                { action: '发布表白', time: new Date(baseDate.getTime() - 3600000).toISOString(), status: '成功', color: 'purple', icon: '💬' },
                { action: '登录系统', time: user.last_seen, status: '成功', color: 'green', icon: '👁️' },
                { action: '添加好友', time: new Date(baseDate.getTime() - 7200000).toISOString(), status: '成功', color: 'green', icon: '🤝' },
                { action: '发送消息', time: new Date(baseDate.getTime() - 10800000).toISOString(), status: '成功', color: 'blue', icon: '💬' }
              ];
              
              return logs.map((log) => (
                <div 
                  key={log.action}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full bg-${log.color}-100 flex items-center justify-center text-${log.color}-600`}>
                      {log.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{log.action}</p>
                      <p className="text-sm text-gray-500">{new Date(log.time).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs bg-${log.color}-100 text-${log.color}-800 rounded-full`}>
                    {log.status}
                  </span>
                </div>
              ));
            })()}
            <div className="mt-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center space-x-1 mx-auto">
                <span>查看更多日志</span>
                <span>→</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 风险评估卡片 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">⚠️</span>
              风险评估
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-green-800">账户安全</h3>
                  <span className="text-green-600">✅</span>
                </div>
                <p className="text-sm text-green-700">账户状态正常，无异常登录记录</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-yellow-800">内容合规</h3>
                  <span className="text-yellow-600">⚠️</span>
                </div>
                <p className="text-sm text-yellow-700">有1条内容待审核，请及时处理</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-800">活动状态</h3>
                  <span className="text-blue-600">📊</span>
                </div>
                <p className="text-sm text-blue-700">最近30天活动活跃，无异常行为</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

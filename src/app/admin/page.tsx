// 后台管理系统仪表盘
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getAdminStats, getRecentConfessions, getRecentUsers, getTrendData } from '@/services/admin/adminService';
import { TrendChart } from './components/TrendChart';
import Image from 'next/image';

export default async function AdminDashboard() {
  // 获取系统统计数据、最近活动和趋势数据
  const [stats, recentConfessions, recentUsers, trendData] = await Promise.all([
    getAdminStats(),
    getRecentConfessions(5),
    getRecentUsers(5),
    getTrendData(7)
  ]);

  // 格式化相对时间
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  // 统计卡片数据
  const statCards = [
    {
      title: '用户总数',
      value: stats.totalUsers || 0,
      newCount: stats.newUsers || 0,
      icon: '👥',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      newText: '个新用户',
      index: 0,
      link: '/admin/users'
    },
    {
      title: '表白总数',
      value: stats.totalConfessions || 0,
      newCount: stats.newConfessions || 0,
      icon: '💬',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      newText: '条新表白',
      index: 1,
      link: '/admin/confessions'
    },
    {
      title: '评论总数',
      value: stats.totalComments || 0,
      newCount: stats.newComments || 0,
      icon: '💬',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      newText: '条新评论',
      index: 2,
      link: '/admin/comments'
    },
    {
      title: '消息总数',
      value: stats.totalMessages || 0,
      newCount: stats.newMessages || 0,
      icon: '💬',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      newText: '条新消息',
      index: 3,
      link: '/admin/messages'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">仪表盘</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">系统概览和最新活动</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.title}>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden cursor-pointer bg-white dark:bg-gray-800">
              <a href={card.link} className="block p-0">
                <CardContent className="p-0">
                  <div className="p-6">
                    {/* 卡片头部 */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{card.title}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${card.color} flex items-center justify-center text-white`}>
                        {card.icon}
                      </div>
                    </div>

                    {/* 卡片内容 */}
                    <div className="space-y-2">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-green-600 dark:text-green-400 font-medium">+{card.newCount}</span>
                        <span className="ml-1 text-gray-500 dark:text-gray-400">{card.newText}</span>
                      </div>
                    </div>
                  </div>

                  {/* 卡片底部装饰条 */}
                  <div className={`h-1 bg-gradient-to-r ${card.color}`}></div>
                </CardContent>
              </a>
            </Card>
          </div>
        ))}
      </div>

      {/* 数据趋势图表 */}
      <div>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2">📊</span>
              数据趋势（最近7天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} />
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近表白 */}
        <div>
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">💬</span>
                最近表白
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentConfessions.length > 0 ? (
                  recentConfessions.map((confession) => (
                    <div key={confession.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${confession.is_anonymous ? 'from-gray-400 to-gray-500' : 'from-blue-400 to-blue-500'} flex items-center justify-center text-white`}>
                          {confession.is_anonymous ? '👤' : '📝'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                            {confession.is_anonymous ? '匿名用户' : confession.user_id.substring(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {confession.content.substring(0, 30)}{confession.content.length > 30 ? '...' : ''}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatRelativeTime(confession.created_at)}
                          </p>
                        </div>
                      </div>
                      <span 
                        className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full"
                      >
                        新表白
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">暂无新表白</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 最近用户 */}
        <div>
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">👥</span>
                最近用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentUsers.length > 0 ? (
                  recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 overflow-hidden">
                          {user.avatar_url ? (
                            <Image 
                              src={user.avatar_url} 
                              alt={user.display_name || user.username} 
                              width={40}
                              height={40}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium">{(user.display_name || user.username).charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.display_name || user.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {user.username}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatRelativeTime(user.created_at)}
                          </p>
                        </div>
                      </div>
                      <span 
                        className={`text-xs px-3 py-1 rounded-full ${user.online_status === 'online' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : user.online_status === 'away' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
                      >
                        {user.online_status === 'online' ? '在线' : user.online_status === 'away' ? '离开' : '离线'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">暂无新用户</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 系统状态 */}
        <div>
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">🖥️</span>
                系统状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: '缓存状态', status: '正常', color: 'green', icon: '📦' },
                  { name: '数据库连接', status: '正常', color: 'green', icon: '🗄️' },
                  { name: 'API服务', status: '正常', color: 'green', icon: '🌐' },
                  { name: 'Redis连接', status: '正常', color: 'green', icon: '🔄' },
                  { name: '服务器负载', status: '低', color: 'green', icon: '⚡' },
                  { name: '磁盘使用率', status: '65%', color: 'yellow', icon: '💾' }
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full bg-${item.color}-100 dark:bg-${item.color}-900/30 flex items-center justify-center text-${item.color}-600 dark:text-${item.color}-300`}>
                        {item.icon}
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full bg-${item.color}-500 animate-pulse`}></div>
                      <span className={`text-sm font-medium text-${item.color}-700 dark:text-${item.color}-300`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// 用户管理列表页面
import { UsersContent } from './UsersContent';

export default async function UsersPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">用户管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理系统中的所有用户</p>
      </div>

      {/* 用户内容组件，集成搜索、筛选、列表和分页 */}
      <UsersContent />
    </div>
  );
}

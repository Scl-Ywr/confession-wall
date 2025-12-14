// 角色管理列表页面
import { RolesContent } from './RolesContent';

export default function RolesPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">角色管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理系统中的角色和权限</p>
      </div>

      {/* 角色内容组件，集成搜索、筛选和管理功能 */}
      <RolesContent />
    </div>
  );
}
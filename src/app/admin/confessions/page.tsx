// 表白墙管理列表页面
import { ConfessionsContent } from './ConfessionsContent';

export default async function ConfessionsPage() {
  // ConfessionsContent组件内部会自行加载数据

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">表白墙管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理系统中的所有表白</p>
      </div>

      {/* 表白内容组件，集成搜索、筛选、列表和分页 */}
      <ConfessionsContent />
    </div>
  );
}

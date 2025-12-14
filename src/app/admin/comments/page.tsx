// 评论管理列表页面
import { CommentsContent } from './CommentsContent';

export default async function CommentsPage() {
  // CommentsContent组件内部会自行加载数据

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">评论管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理系统中的所有评论</p>
      </div>

      {/* 评论内容组件，集成搜索、筛选、列表和分页 */}
      <CommentsContent />
    </div>
  );
}
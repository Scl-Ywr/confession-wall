// 角色管理主内容客户端组件，集成搜索、筛选和管理功能
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { RolesList } from './RolesList';
import { getRoles } from '@/services/admin/adminService';
import { Role } from '@/services/admin/adminService';

// 角色数据接口
interface RolesData {
  roles: Role[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 搜索参数接口
interface SearchParams {
  search: string;
}

export function RolesContent() {
  // 状态管理
  const [rolesData, setRolesData] = useState<RolesData>({
    roles: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [searchParams, setSearchParams] = useState<SearchParams>({
    search: ''
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 加载角色数据
  const loadRoles = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getRoles({
        page,
        pageSize: rolesData.pageSize,
        search: searchParams.search
      });

      setRolesData(result);
    } catch (err) {
      setError('加载角色数据失败，请重试');
      console.error('加载角色数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams.search, rolesData.pageSize]);

  // 初始加载数据
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // 处理搜索和筛选
  const handleSearch = (search: string) => {
    setSearchParams({
      search
    });
    loadRoles(1); // 搜索时重置到第一页
  };

  // 处理角色删除
  const handleRoleDeleted = () => {
    loadRoles(rolesData.page);
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= rolesData.totalPages) {
      loadRoles(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* 角色列表卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">角色列表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 角色列表 */}
          <RolesList
            roles={rolesData.roles}
            isLoading={isLoading}
            error={error}
            onRoleDeleted={handleRoleDeleted}
            total={rolesData.total}
            currentPage={rolesData.page}
            totalPages={rolesData.totalPages}
            onPageChange={handlePageChange}
            onSearch={handleSearch}
          />
        </CardContent>
      </Card>
    </div>
  );
}
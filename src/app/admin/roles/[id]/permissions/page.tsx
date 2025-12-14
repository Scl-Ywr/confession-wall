// 角色权限管理页面
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getRoleById, getPermissions, getRolePermissions, assignPermissionsToRole } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';
import { Role, Permission } from '@/services/admin/adminService';

export default function RolePermissionsPage() {
  const params = useParams();
  const roleId = params.id as string;

  // 状态管理
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 并行加载角色信息和权限列表
        const [roleData, permissionsData, rolePermissionsData] = await Promise.all([
          getRoleById(roleId),
          getPermissions(),
          getRolePermissions(roleId)
        ]);

        if (roleData) {
          setRole(roleData);
        } else {
          setError('角色不存在或已被删除');
        }

        setPermissions(permissionsData);
        setSelectedPermissions(rolePermissionsData);
      } catch (err) {
        setError('加载数据失败');
        console.error('加载数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (roleId) {
      loadData();
    }
  }, [roleId]);

  // 处理权限选择变化
  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      if (checked) {
        return [...prev, permissionId];
      } else {
        return prev.filter(id => id !== permissionId);
      }
    });
    setIsDirty(true);
  };

  // 处理全选/取消全选
  const handleToggleAll = () => {
    if (selectedPermissions.length === permissions.length) {
      // 取消全选
      setSelectedPermissions([]);
    } else {
      // 全选
      setSelectedPermissions(permissions.map(p => p.id));
    }
    setIsDirty(true);
  };

  // 保存权限分配
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await assignPermissionsToRole(roleId, selectedPermissions);
      if (result.success) {
        showSuccess('权限分配保存成功');
        setIsDirty(false);
      } else {
        showError(result.error || '保存失败');
      }
    } catch (err) {
      showError('保存失败，请重试');
      console.error('保存权限失败:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error || '角色不存在'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">角色权限管理</h1>
        <p className="text-gray-600 mt-1">为角色分配和管理权限</p>
      </div>

      {/* 角色基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">角色信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>角色名称:</strong> {role.name}
            </div>
            <div>
              <strong>角色描述:</strong> {role.description || '-'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 权限分配 */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-xl">权限分配</CardTitle>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`px-4 py-2 font-medium rounded-md transition-colors ${(!isDirty || isSaving) ? 'bg-primary-500 text-white cursor-not-allowed opacity-70' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
          >
            {isSaving ? '保存中...' : '保存权限'}
          </button>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <div className="text-gray-500">暂无可用权限</div>
          ) : (
            <div className="space-y-4">
              {/* 全选/取消全选 */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedPermissions.length === permissions.length}
                  onChange={() => handleToggleAll()}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  全选/取消全选
                </label>
              </div>

              {/* 权限列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`permission-${permission.id}`}
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                      disabled={isSaving}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                    />
                    <label
                      htmlFor={`permission-${permission.id}`}
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      {permission.name}
                    </label>
                    {permission.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        ({permission.description})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
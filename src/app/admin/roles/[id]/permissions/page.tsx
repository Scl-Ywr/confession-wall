// 角色权限管理页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getRoleById, getPermissions, getRolePermissions, assignPermissionsToRole, detectPermissionConflicts } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';
import { Role, Permission } from '@/services/admin/adminService';

export default function RolePermissionsPage() {
  const params = useParams();
  const roleId = params?.id as string | undefined;

  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionConflicts, setPermissionConflicts] = useState<Array<{ permission_id: string; conflict_type: string; message: string }>>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!roleId) {
        setError('无效的角色ID');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [roleData, permissionsData, rolePermsData] = await Promise.all([
          getRoleById(roleId),
          getPermissions(),
          getRolePermissions(roleId)
        ]);

        setRole(roleData);
        setPermissions(permissionsData);
        setSelectedPermissions(rolePermsData.map(p => p.id));
      } catch (err) {
        setError('加载数据失败');
        console.error('加载数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [roleId]);

  const loadUserPermissions = useCallback(async () => {
    if (!roleId) return;
    try {
      const userPermissions = await getRolePermissions(roleId);
      setSelectedPermissions(userPermissions.map(p => p.id));
    } catch (err) {
      console.error('加载权限失败:', err);
    }
  }, [roleId]);

  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  const handlePermissionToggle = async (permissionId: string) => {
    if (!roleId) return;

    const newSelected = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(id => id !== permissionId)
      : [...selectedPermissions, permissionId];

    setSelectedPermissions(newSelected);
    setIsDirty(true);

    try {
      const conflicts = await detectPermissionConflicts(roleId, newSelected);
      setPermissionConflicts(conflicts);
      setShowConflictWarning(conflicts.length > 0);
    } catch (err) {
      console.error('检测权限冲突失败:', err);
    }
  };

  const handleSave = async () => {
    if (!roleId || !isDirty) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await assignPermissionsToRole(roleId, selectedPermissions);
      
      if (result.success) {
        showSuccess('权限更新成功');
        setIsDirty(false);
        setShowConflictWarning(false);
      } else {
        setError(result.error || '保存失败');
        showError(result.error || '保存失败');
      }
    } catch (err) {
      setError('保存权限时发生错误');
      console.error('保存权限失败:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    loadUserPermissions();
    setIsDirty(false);
    setShowConflictWarning(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !role) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/admin/roles'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            返回角色列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">角色权限</h1>
          <p className="text-gray-600 mt-1">管理「{role?.name}」角色的权限</p>
        </div>
        <button
          onClick={() => window.location.href = '/admin/roles'}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          返回角色列表
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      {showConflictWarning && permissionConflicts.length > 0 && (
        <div className="px-4 py-3 bg-yellow-100 text-yellow-800 rounded-md">
          <p className="font-medium mb-2">检测到权限冲突：</p>
          <ul className="list-disc list-inside text-sm">
            {permissionConflicts.map((conflict, index) => (
              <li key={index}>{conflict.message}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>权限列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permissions.map(permission => (
              <div
                key={permission.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPermissions.includes(permission.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
                onClick={() => handlePermissionToggle(permission.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{permission.name}</p>
                      <p className="text-sm text-gray-500">{permission.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={handleCancel}
              disabled={!isDirty || isSaving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  保存中...
                </div>
              ) : (
                '保存更改'
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 用户角色分配页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getUserById, getRoles, getUserRoles, assignRolesToUser, getUserPermissions } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';
import { Role } from '@/services/admin/adminService';

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  online_status: string;
  created_at: string;
}

interface RolesResponse {
  roles: Role[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UserRolesPage() {
  const params = useParams();
  const userId = params?.id as string | undefined;

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  const loadUserPermissions = useCallback(async () => {
    if (!userId) return;
    try {
      const userPermissions = await getUserPermissions(userId);
      setPermissions(userPermissions as Permission[]);
    } catch (err) {
      console.error('加载权限失败:', err);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [userId]);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) {
        setError('无效的用户ID');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [userData, rolesData, userRolesData] = await Promise.all([
          getUserById(userId),
          getRoles({}),
          getUserRoles(userId)
        ]);

        setUser(userData);
        setRoles((rolesData as RolesResponse).roles);
        setSelectedRoles(userRolesData.map(r => r.id));
      } catch (err) {
        setError('加载数据失败');
        console.error('加载数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    loadUserPermissions();
  }, [userId, loadUserPermissions]);

  const handleRoleToggle = (roleId: string) => {
    const newSelected = selectedRoles.includes(roleId)
      ? selectedRoles.filter(id => id !== roleId)
      : [...selectedRoles, roleId];

    setSelectedRoles(newSelected);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!userId || !isDirty) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await assignRolesToUser(userId, selectedRoles);
      
      if (result.success) {
        showSuccess('角色更新成功');
        setIsDirty(false);
        loadUserPermissions();
      } else {
        setError(result.error || '保存失败');
        showError(result.error || '保存失败');
      }
    } catch (err) {
      setError('保存角色时发生错误');
      console.error('保存角色失败:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!userId) return;
    getUserRoles(userId).then(userRoles => {
      setSelectedRoles(userRoles.map(r => r.id));
    });
    setIsDirty(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/admin/users'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            返回用户列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">用户角色</h1>
          <p className="text-gray-600 mt-1">管理「{user?.display_name || user?.username || '用户'}」的角色分配</p>
        </div>
        <button
          onClick={() => window.location.href = '/admin/users'}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          返回用户列表
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>角色分配</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <div
                key={role.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedRoles.includes(role.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
                onClick={() => handleRoleToggle(role.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{role.name}</p>
                      <p className="text-sm text-gray-500">{role.description}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>用户权限</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPermissions ? (
            <div className="flex justify-center items-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : permissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.map(permission => (
                <div
                  key={permission.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{permission.name}</p>
                  <p className="text-sm text-gray-500">{permission.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">该用户暂无任何权限</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

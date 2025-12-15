// 用户角色分配页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getUserById, getRoles, getUserRoles, assignRolesToUser, getUserPermissions } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';
import { Role } from '@/services/admin/adminService';

// 权限接口
interface Permission {
  id: string;
  name: string;
  description: string;
}

// 用户接口
interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  online_status: string;
  created_at: string;
}

export default function UserRolesPage() {
  const params = useParams();
  const userId = params.id as string;

  // 状态管理
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // 加载用户权限
  const loadUserPermissions = useCallback(async () => {
    setIsLoadingPermissions(true);
    try {
      const userPermissions = await getUserPermissions(userId);
      setPermissions(userPermissions as Permission[]);
    } catch (err) {
      console.error('加载用户权限失败:', err);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [userId]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 并行加载用户信息、所有角色和用户已有角色
        const [userData, rolesData, userRolesData] = await Promise.all([
          getUserById(userId),
          getRoles({ page: 1, pageSize: 100 }),
          getUserRoles(userId)
        ]);

        if (userData) {
          setUser(userData);
        } else {
          setError('用户不存在或已被删除');
        }

        setRoles(rolesData.roles);
        setSelectedRoles(userRolesData);
      } catch (err) {
        setError('加载数据失败');
        console.error('加载数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadData();
      loadUserPermissions();
    }
  }, [userId, loadUserPermissions]);

  // 处理角色选择变化
  const handleRoleChange = (roleId: string, checked: boolean) => {
    setSelectedRoles(prev => {
      if (checked) {
        return [...prev, roleId];
      } else {
        return prev.filter(id => id !== roleId);
      }
    });
    setIsDirty(true);
  };

  // 处理全选/取消全选
  const handleToggleAll = () => {
    if (selectedRoles.length === roles.length) {
      // 取消全选
      setSelectedRoles([]);
    } else {
      // 全选
      setSelectedRoles(roles.map(r => r.id));
    }
    setIsDirty(true);
  };

  // 保存角色分配
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await assignRolesToUser(userId, selectedRoles);
      if (result.success) {
        showSuccess('角色分配保存成功');
        setIsDirty(false);
        // 角色分配成功后，重新加载用户权限
        await loadUserPermissions();
      } else {
        showError(result.error || '保存失败');
      }
    } catch (err) {
      showError('保存失败，请重试');
      console.error('保存角色失败:', err);
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

  if (error || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error || '用户不存在'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">用户角色分配</h1>
        <p className="text-gray-600 mt-1">为用户分配和管理系统角色</p>
      </div>

      {/* 用户基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">用户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>用户名:</strong> {user.username || '未设置'}
            </div>
            <div>
              <strong>邮箱:</strong> {user.email}
            </div>
            <div>
              <strong>显示名称:</strong> {user.display_name || '未设置'}
            </div>
            <div>
              <strong>注册时间:</strong> {new Date(user.created_at).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 角色分配 */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-xl">角色分配</CardTitle>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`px-6 py-3 font-black rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 text-base ${(
              (!isDirty || isSaving)
                ? 'bg-primary-500 text-black dark:text-white cursor-not-allowed opacity-90 shadow-sm'
                : 'bg-primary-600 hover:bg-primary-700 text-black dark:text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform hover:scale-105'
            )}`}
          >
            {isSaving ? '保存中...' : '保存角色'}
          </button>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-gray-500">暂无可用角色</div>
          ) : (
            <div className="space-y-4">
              {/* 全选/取消全选 */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="select-all-roles"
                  checked={selectedRoles.length === roles.length}
                  onChange={() => handleToggleAll()}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                />
                <label
                  htmlFor="select-all-roles"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  全选/取消全选
                </label>
              </div>

              {/* 角色列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.id)}
                      onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                      disabled={isSaving}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      {role.name}
                    </label>
                    {role.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        ({role.description})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 用户权限展示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">用户当前权限</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">以下是用户通过角色继承获得的所有权限：</p>
          {isLoadingPermissions ? (
            <div className="text-gray-500">加载中...</div>
          ) : permissions.length === 0 ? (
            <div className="text-gray-500">该用户目前没有任何权限</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="mt-1">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">{permission.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
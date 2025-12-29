// 角色编辑页面
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getRoleById, updateRole } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params?.id as string | undefined;

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    description: '',
    fetch: ''
  });

  useEffect(() => {
    const loadRoleData = async () => {
      if (!roleId) {
        setErrors(prev => ({ ...prev, fetch: '无效的角色ID' }));
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const role = await getRoleById(roleId);
        if (role) {
          setFormData({
            name: role.name,
            description: role.description
          });
        } else {
          setErrors(prev => ({ ...prev, fetch: '角色不存在或已被删除' }));
        }
      } catch (error) {
        setErrors(prev => ({ ...prev, fetch: '加载角色数据失败' }));
        console.error('加载角色数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoleData();
  }, [roleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleId) return;

    if (!formData.name.trim()) {
      setErrors(prev => ({ ...prev, name: '角色名称不能为空' }));
      return;
    }

    setIsSubmitting(true);
    setErrors(prev => ({ ...prev, name: '', description: '', fetch: '' }));

    try {
      const result = await updateRole(roleId, formData);
      
      if (result.success) {
        showSuccess('角色更新成功');
        setTimeout(() => {
          router.push('/admin/roles');
        }, 1500);
      } else {
        setErrors(prev => ({ ...prev, fetch: result.error || '更新失败' }));
        showError(result.error || '更新失败');
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, fetch: '更新角色时发生错误' }));
      console.error('更新角色失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (errors.fetch && !formData.name) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{errors.fetch}</p>
          <button
            onClick={() => router.push('/admin/roles')}
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">编辑角色</h1>
        <p className="text-gray-600 mt-1">修改角色的基本信息和权限</p>
      </div>

      {errors.fetch && (
        <div className="px-4 py-3 bg-red-100 text-red-800 rounded-md">
          {errors.fetch}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>角色信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入角色名称"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入角色描述"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/admin/roles')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    保存中...
                  </div>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

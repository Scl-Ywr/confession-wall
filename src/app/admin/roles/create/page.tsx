// 角色创建页面
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { createRole } from '@/services/admin/adminService';
import { showSuccess, showError } from '@/lib/notification';

export default function CreateRolePage() {
  const router = useRouter();

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // 加载状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 错误信息
  const [errors, setErrors] = useState({
    name: '',
    description: ''
  });

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 清除对应字段的错误
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // 表单验证
  const validateForm = () => {
    const newErrors: typeof errors = {
      name: '',
      description: ''
    };

    // 验证角色名称
    if (!formData.name.trim()) {
      newErrors.name = '角色名称不能为空';
    } else if (formData.name.length < 2) {
      newErrors.name = '角色名称至少需要2个字符';
    } else if (formData.name.length > 50) {
      newErrors.name = '角色名称不能超过50个字符';
    }

    // 验证描述
    if (formData.description.length > 200) {
      newErrors.description = '角色描述不能超过200个字符';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === '');
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createRole({
        name: formData.name.trim(),
        description: formData.description.trim()
      });

      if (result) {
        showSuccess('角色创建成功');
        router.push('/admin/roles');
      } else {
        showError('角色创建失败');
      }
    } catch (error) {
      showError('角色创建失败，请重试');
      console.error('创建角色失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">创建角色</h1>
        <p className="text-gray-600 mt-1">添加新的系统角色</p>
      </div>

      {/* 创建角色表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">角色信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 角色名称 */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="输入角色名称"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.name ? 'border-red-500' : 'border-gray-300 focus:border-transparent'}`}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* 角色描述 */}
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                角色描述
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="输入角色描述（可选）"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.description ? 'border-red-500' : 'border-gray-300 focus:border-transparent'}`}
                rows={4}
              ></textarea>
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
              <p className="text-xs text-gray-500">描述最多200个字符</p>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 font-black rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 text-base ${isSubmitting ? 'bg-primary-500 text-black dark:text-white cursor-not-allowed opacity-90 shadow-sm' : 'bg-primary-600 hover:bg-primary-700 text-black dark:text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform hover:scale-105'}`}
              >
                {isSubmitting ? '创建中...' : '创建角色'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/roles')}
                disabled={isSubmitting}
                className={`px-6 py-3 font-bold rounded-xl transition-all duration-300 ${isSubmitting ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-70' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 shadow-sm hover:shadow-md'}`}
              >
                取消
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
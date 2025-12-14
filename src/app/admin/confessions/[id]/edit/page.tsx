// 表白编辑页面
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getConfessionById, updateConfession } from '@/services/admin/adminService';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { validateConfessionContent } from '@/lib/validation';
import { showSuccess, showError } from '@/lib/notification';

interface ConfessionFormData {
  content: string;
  is_anonymous: boolean;
  is_published: boolean;
}

interface FormErrors {
  content?: string;
}

export default function EditConfessionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [formData, setFormData] = useState<ConfessionFormData>({
    content: '',
    is_anonymous: true,
    is_published: true
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // 获取表白详情数据
  useEffect(() => {
    const fetchConfession = async () => {
      try {
        setLoading(true);
        const confession = await getConfessionById(params.id);
        if (confession) {
          setFormData({
            content: confession.content || '',
            is_anonymous: confession.is_anonymous || true,
            is_published: confession.is_published || true
          });
        }
      } catch (err) {
        setError('获取表白数据失败，请重试');
        console.error('Failed to fetch confession:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfession();
  }, [params.id]);

  // 验证表单
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    // 验证表白内容
    const contentValidation = validateConfessionContent(formData.content);
    if (!contentValidation.isValid) {
      errors.content = contentValidation.message;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    
    // 使用类型守卫安全访问checked属性
    let fieldValue: string | boolean;
    if (e.target instanceof HTMLInputElement && type === 'checkbox') {
      fieldValue = e.target.checked;
    } else {
      fieldValue = e.target.value;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));
    
    // 实时验证
    if (name === 'content') {
      const validation = validateConfessionContent(fieldValue as string);
      setFormErrors(prev => ({
        ...prev,
        content: validation.isValid ? undefined : validation.message
      }));
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // 更新表白
      await updateConfession(params.id, formData);
      
      // 显示成功通知
      showSuccess('表白更新成功');
      
      // 3秒后跳转到详情页面
      setTimeout(() => {
        router.push(`/admin/confessions/${params.id}`);
      }, 3000);
    } catch (err) {
      const errorMessage = '更新表白失败，请重试';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Failed to update confession:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">编辑表白</h1>
          <Link
            href={`/admin/confessions/${params.id}`}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            返回详情
          </Link>
        </div>
        <p className="text-gray-600 mt-1">修改表白的信息</p>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="bg-red-100 text-red-800 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* 编辑表单 */}
      <Card>
        <CardHeader>
          <CardTitle>表白信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 表白内容 */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                表白内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                rows={6}
                value={formData.content}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.content ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入表白内容"
              />
              {formErrors.content && (
                <p className="mt-1 text-sm text-red-600">{formErrors.content}</p>
              )}
            </div>

            {/* 匿名状态 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_anonymous"
                name="is_anonymous"
                checked={formData.is_anonymous}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_anonymous" className="ml-2 block text-sm text-gray-700">
                匿名表白
              </label>
            </div>

            {/* 发布状态 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_published"
                name="is_published"
                checked={formData.is_published}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700">
                发布表白
              </label>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={submitting || Object.keys(formErrors).length > 0}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    保存中...
                  </div>
                ) : (
                  '保存修改'
                )}
              </button>
              <Link
                href={`/admin/confessions/${params.id}`}
                className="px-6 py-3 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                取消
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
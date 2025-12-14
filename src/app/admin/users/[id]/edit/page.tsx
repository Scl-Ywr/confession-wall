'use client';

// 用户编辑页面
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CustomSelect } from '@/components/CustomSelect';
import { getUserById, updateUser } from '@/services/admin/adminService';
import { validateUsername, validateDisplayName } from '@/lib/validation';
import { showSuccess, showError } from '@/lib/notification';
import { Profile, OnlineStatus } from '@/types/confession';

interface FormErrors {
  username?: string;
  display_name?: string;
  bio?: string;
}

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    online_status: 'online',
    is_admin: false
  });

  // 在线状态选项
  const onlineStatusOptions = [
    { value: 'online', label: '在线' },
    { value: 'away', label: '离开' },
    { value: 'offline', label: '离线' }
  ];

  // 获取用户数据
  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const userData = await getUserById(params.id);
        if (userData) {
          // Convert UserInfo to Profile type
          const profileData: Profile = {
            id: userData.id,
            display_name: userData.display_name,
            username: userData.username,
            email: userData.email || '',
            avatar_url: userData.avatar_url,
            online_status: (userData.online_status as OnlineStatus) || 'offline',
            last_seen: userData.last_seen,
            bio: userData.bio,
            created_at: userData.created_at,
            updated_at: userData.updated_at,
            is_admin: userData.is_admin
          };
          setUser(profileData);
          setFormData({
            username: userData.username || '',
            display_name: userData.display_name || '',
            bio: userData.bio || '',
            online_status: userData.online_status || 'online',
            is_admin: userData.is_admin || false
          });
        }
      } catch (err) {
        setError('获取用户数据失败');
        console.error('获取用户数据失败:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [params.id]);

  // 验证表单
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    // 验证用户名
    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.message;
    }
    
    // 验证显示名称
    const displayNameValidation = validateDisplayName(formData.display_name);
    if (!displayNameValidation.isValid) {
      errors.display_name = displayNameValidation.message;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');

      // 更新用户信息
      const result = await updateUser(params.id, formData);
      
      if (result.success) {
        // 显示成功通知
        showSuccess('用户信息更新成功');
        // 3秒后跳转到用户详情页
        setTimeout(() => {
          router.push(`/admin/users/${params.id}`);
        }, 3000);
      } else {
        throw new Error(result.error || '更新失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新失败';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value, type } = target;
    
    let fieldValue: string | boolean = value;
    
    // 使用类型守卫安全访问checked属性
    if (target instanceof HTMLInputElement && type === 'checkbox') {
      fieldValue = target.checked;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));
    
    // 实时验证（只验证文本字段）
    if (!(target instanceof HTMLInputElement && type === 'checkbox')) {
      if (name === 'username') {
        const validation = validateUsername(value);
        setFormErrors(prev => ({
          ...prev,
          username: validation.isValid ? undefined : validation.message
        }));
      } else if (name === 'display_name') {
        const validation = validateDisplayName(value);
        setFormErrors(prev => ({
          ...prev,
          display_name: validation.isValid ? undefined : validation.message
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="flex justify-center items-center h-screen">用户不存在</div>;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">编辑用户</h1>
        <p className="text-gray-600 mt-1">修改用户的基本信息</p>
      </div>

      {/* 全局错误信息 */}
      {error && (
        <div className="px-4 py-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      {/* 编辑表单 */}
      <Card>
        <CardHeader>
          <CardTitle>用户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.username ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入用户名"
                />
                {formErrors.username && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.username}</p>
                )}
              </div>

              {/* 显示名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.display_name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入显示名称"
                />
                {formErrors.display_name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.display_name}</p>
                )}
              </div>

              {/* 在线状态 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">在线状态</label>
                <CustomSelect
                  options={onlineStatusOptions}
                  value={formData.online_status}
                  onChange={(value) => handleChange({ 
                    target: { name: 'online_status', value, type: 'select' } 
                  } as unknown as React.ChangeEvent<HTMLSelectElement>)}
                />
              </div>

              {/* 管理员权限 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_admin"
                  checked={formData.is_admin}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-gray-700">管理员权限</label>
              </div>
            </div>

            {/* 个人简介 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.bio ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入个人简介"
              ></textarea>
              {formErrors.bio && (
                <p className="mt-1 text-sm text-red-600">{formErrors.bio}</p>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push(`/admin/users/${params.id}`)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting || Object.keys(formErrors).length > 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
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

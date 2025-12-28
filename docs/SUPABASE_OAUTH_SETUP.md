# Supabase Multi-Provider OAuth 配置指南

本文档说明如何为 Confession Wall 项目配置 Supabase Multi-Provider OAuth 认证系统。

## 前置要求

- Supabase 项目已配置（项目ID: ltbacrfoksjzfszpsmow）
- GitHub 开发者账号
- Google Cloud Platform 账号
- Next.js 应用（已有完整认证系统）

---

## 第一步：配置 GitHub OAuth 应用

### 1.1 创建 GitHub OAuth App

1. **访问 GitHub 开发者设置**
   - 登录 GitHub 账号
   - 访问 [GitHub Settings > Developer settings](https://github.com/settings/developers)
   - 点击 "New OAuth App"

2. **填写应用信息**
   ```
   Application name: Confession Wall
   Homepage URL: http://localhost:3000 (开发) 或 https://your-domain.com (生产)
   Authorization callback URL: https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback
   Application description: 表白墙应用的第三方登录
   ```

3. **生成客户端凭证**
   - 复制生成的 **Client ID**
   - 复制生成的 **Client Secret**（只显示一次，请妥善保存）

### 1.2 在 Supabase 中配置 GitHub Provider

1. **访问 Supabase Dashboard**
   - 登录 [Supabase Dashboard](https://supabase.com/dashboard)
   - 选择项目: "Scl-Ywr's Project"

2. **启用 GitHub Provider**
   - 进入 Authentication > Providers
   - 找到 GitHub 卡片，点击 Configure
   - 启用 "Enable GitHub provider"
   - 输入从 GitHub 获取的 Client ID 和 Client Secret
   - 保存配置

---

## 第二步：配置 Google OAuth 应用

### 2.1 创建 Google OAuth 客户端

1. **访问 Google Cloud Console**
   - 登录 Google 账号
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目

2. **启用 Google+ API**
   - 进入 APIs & Services > Library
   - 搜索 "Google+ API" 并启用

3. **配置 OAuth 同意屏幕**
   - 进入 APIs & Services > OAuth consent screen
   - 选择用户类型（内部/外部）
   - 填写应用信息：
     ```
     应用名称: Confession Wall
     用户支持电子邮件: your-email@example.com
     开发者联系信息: your-email@example.com
     ```

4. **创建 OAuth 2.0 客户端 ID**
   - 进入 APIs & Services > Credentials
   - 点击 "Create Credentials" > "OAuth 2.0 Client ID"
   - 选择应用类型: "Web application"
   - 配置授权重定向 URI：
     ```
     http://localhost:3000 (开发)
     https://your-domain.com (生产)
     https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback (Supabase 回调)
     ```
   - 复制生成的 Client ID 和 Client Secret

### 2.2 在 Supabase 中配置 Google Provider

1. **在 Supabase Dashboard 中启用 Google Provider**
   - 进入 Authentication > Providers
   - 找到 Google 卡片，点击 Configure
   - 启用 "Enable Google provider"
   - 输入从 Google Cloud Console 获取的 Client ID 和 Client Secret
   - 保存配置

---

## 第三步：更新环境变量

在 `.env.local` 文件中添加或更新以下变量：

```bash
# Supabase OAuth 配置（如果需要自定义）
NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT_URL=http://localhost:3000

# GitHub OAuth 应用信息（可选，用于本地开发）
# 注意：生产环境请在 Supabase Dashboard 中配置
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth 应用信息（可选，用于本地开发）
# 注意：生产环境请在 Supabase Dashboard 中配置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 第四步：更新认证代码

### 4.1 更新 SocialLoginButtons 组件

需要修改现有的社交登录组件，使其使用 Supabase 的原生 OAuth 功能：

```typescript
// 伪代码示例
import { supabase } from '@/lib/supabase/client';

export const signInWithProvider = async (provider: 'github' | 'google') => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) {
    throw error;
  }
  
  return data;
};
```

### 4.2 创建 OAuth 回调处理

创建 `src/app/auth/callback/page.tsx` 页面处理 OAuth 重定向：

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/auth/login?error=auth_failed');
          return;
        }
        
        if (data.session) {
          // 认证成功，跳转到首页
          router.push('/?welcome=true');
        } else {
          // 没有会话，跳转到登录页
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/auth/login?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
    </div>
  );
}
```

---

## 第五步：安全配置

### 5.1 配置回调 URL

确保以下回调 URL 在各个平台都已配置：

**GitHub OAuth App:**
```
https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback
```

**Google OAuth 客户端:**
```
https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback
```

**Supabase 项目设置:**
```
http://localhost:3000/auth/callback (开发)
https://your-domain.com/auth/callback (生产)
```

### 5.2 安全最佳实践

1. **使用 HTTPS**
   - 生产环境必须使用 HTTPS
   - 配置 HSTS 头

2. **限制作用域**
   - 只请求必要的权限
   - GitHub: `read:user` (默认)
   - Google: `openid email profile`

3. **配置 CORS**
   - 确保 Supabase 项目允许你的域名

---

## 第六步：测试配置

### 6.1 本地测试

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **访问登录页面**
   ```
   http://localhost:3000/auth/login
   ```

3. **测试 OAuth 登录**
   - 点击 "使用 GitHub 登录" 按钮
   - 完成授权后验证重定向
   - 检查用户信息是否正确显示

### 6.2 验证清单

- [ ] GitHub OAuth 应用已创建并配置
- [ ] Google OAuth 应用已创建并配置
- [ ] Supabase 中已启用并配置 OAuth 提供商
- [ ] 回调 URL 配置正确
- [ ] 社交登录按钮正常工作
- [ ] OAuth 回调处理正确
- [ ] 用户信息正确同步
- [ ] 与现有用户系统集成正常

---

## 第七步：生产环境部署

### 7.1 更新 OAuth 应用配置

在生产环境中更新各个 OAuth 应用的配置：

1. **更新回调 URL**
   - GitHub: `https://your-domain.com/auth/callback`
   - Google: `https://your-domain.com/auth/callback`

2. **更新应用主页 URL**
   - GitHub: `https://your-domain.com`
   - Google: `https://your-domain.com`

### 7.2 更新 Supabase 配置

在 Supabase Dashboard 中：
- 确保 OAuth 提供商在生产环境启用
- 检查回调 URL 配置

### 7.3 环境变量配置

在生产环境（如 Vercel、Netlify）中设置环境变量：
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ltbacrfoksjzfszpsmow.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 常见问题

### Q1: OAuth 登录后重定向到错误页面

**解决方案：**
1. 检查回调 URL 配置是否正确
2. 验证 Supabase 项目设置中的回调 URL
3. 确认 OAuth 应用中的授权重定向 URI

### Q2: 获取用户信息失败

**解决方案：**
1. 检查 OAuth 应用的作用域配置
2. 验证 Supabase 中用户表的 RLS 策略
3. 检查用户数据同步逻辑

### Q3: 跨域错误 (CORS)

**解决方案：**
1. 在 Supabase Dashboard 中配置允许的域名
2. 检查前端代码中的 origin 配置
3. 确保 HTTPS 配置正确

### Q4: OAuth 回调处理失败

**解决方案：**
1. 检查 `auth/callback` 页面是否正确实现
2. 验证 Supabase 客户端配置
3. 检查网络请求和响应

---

## 迁移说明

从 Logto 迁移到 Supabase Multi-Provider Auth：

1. **保留现有用户数据**
   - Supabase Auth 与现有用户系统兼容
   - OAuth 用户会自动关联到现有账号（基于邮箱）

2. **更新前端代码**
   - 替换 Logto 相关组件
   - 使用 Supabase 原生 OAuth 方法

3. **清理 Logto 依赖**
   - 删除 Logto 相关代码和配置
   - 移除 Logto 环境变量

---

**最后更新**: 2025-12-28
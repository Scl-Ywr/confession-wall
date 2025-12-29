# 🔧 Supabase OAuth 重定向问题诊断

## 🚨 当前问题
收到链接：`https://vercel.suchuanli.me/?code=...`
**说明 Supabase 没有正确处理授权码，而是直接重定向到了生产环境**

## 🎯 问题根源分析

### 可能的原因：

1. **GitHub OAuth App 的 Authorization callback URL 配置错误**
2. **Supabase 项目中的 Site URL 配置不正确**
3. **Supabase GitHub Provider 配置问题**
4. **redirect URL 不匹配**

## 🔧 诊断步骤

### 步骤1：检查 GitHub OAuth App 配置

访问：https://github.com/settings/developers

**必须确认的配置：**
- **Homepage URL**: `http://localhost:3000` 或 `https://vercel.suchuanli.me`
- **Authorization callback URL**: `https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback`

### 步骤2：检查 Supabase 项目配置

访问：https://supabase.com/dashboard
选择项目："Scl-Ywr's Project"

**检查以下配置：**

#### Authentication > Settings
- **Site URL**: `http://localhost:3000` (开发) 或 `https://vercel.suchuanli.me` (生产)
- **Redirect URLs**: 确保包含您的应用域名

#### Authentication > Providers > GitHub
- **Enable GitHub provider**: 已启用
- **Client ID**: 来自 GitHub OAuth App
- **Client Secret**: 来自 GitHub OAuth App
- **Additional redirect URLs**: 可选配置

## ✅ 正确的配置组合

### 开发环境配置：

**GitHub OAuth App:**
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback`

**Supabase Dashboard:**
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

### 生产环境配置：

**GitHub OAuth App:**
- Homepage URL: `https://vercel.suchuanli.me`
- Authorization callback URL: `https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback`

**Supabase Dashboard:**
- Site URL: `https://vercel.suchuanli.me`
- Redirect URLs: `https://vercel.suchuanli.me/**`

## 🧪 测试方法

1. **确保开发服务器运行**: `npm run dev`
2. **访问本地地址**: `http://localhost:3000/auth/login`
3. **点击 GitHub 登录**
4. **观察重定向路径**:
   - 应该：GitHub → Supabase → 本地应用
   - 错误：GitHub → 生产域名（说明配置不匹配）

## 🔍 调试信息

如果问题仍然存在，请检查：

1. **Supabase 项目日志**
   - Dashboard → Logs → Auth
   - 查看 OAuth 相关的错误信息

2. **浏览器开发者工具**
   - Network 标签页
   - 查看重定向请求的状态码和 URL

3. **GitHub OAuth App**
   - 确认 Authorization callback URL 确实是 Supabase 地址

## 🚨 紧急修复方案

如果以上配置都正确，但问题仍然存在：

1. **重新创建 GitHub OAuth App**
   - 删除现有应用
   - 重新创建，确保配置正确

2. **重置 Supabase GitHub Provider**
   - 禁用 GitHub provider
   - 重新启用并配置

3. **检查环境变量**
   - 确保 NEXT_PUBLIC_SUPABASE_URL 正确
   - 确保 Supabase 项目 ID 匹配

## 📞 如果需要进一步帮助

请提供：
1. GitHub OAuth App 的完整配置截图
2. Supabase Authentication 设置的截图
3. 浏览器开发者工具中的 Network 请求截图
# 🔧 OAuth 授权问题修复指南

## 🚨 当前问题

收到链接：`https://vercel.suchuanli.me/?code=...`

**问题原因**：GitHub OAuth App 的 Authorization callback URL 配置错误

## ✅ 立即修复步骤

### 步骤1：修改 GitHub OAuth App 配置

1. **访问 GitHub OAuth Apps**
   - 网址：https://github.com/settings/developers
   - 找到您的 "Confession Wall" 应用

2. **编辑应用配置**
   - 点击应用名称进入编辑页面

3. **修正以下字段**：

   | 字段 | 当前值（错误） | 应该设置的值 |
   |------|---------------|-------------|
   | Homepage URL | `https://vercel.suchuanli.me` | `http://localhost:3000` |
   | Authorization callback URL | `https://vercel.suchuanli.me/auth/callback` | `https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback` |

4. **保存配置**
   - 点击 "Update application"

### 步骤2：在 Supabase 中启用 GitHub Provider

1. **访问 Supabase Dashboard**
   - 网址：https://supabase.com/dashboard
   - 选择项目："Scl-Ywr's Project"

2. **启用 GitHub Provider**
   - 进入：Authentication → Providers
   - 找到：GitHub → Configure
   - 启用：Enable GitHub provider
   - 输入：从 GitHub 获取的 Client ID 和 Client Secret
   - 保存

### 步骤3：测试本地环境

1. **确保访问本地地址**
   ```
   http://localhost:3000/auth/login
   ```

2. **清除浏览器缓存**
   - Ctrl+Shift+Delete
   - 或使用隐私模式

3. **重新测试登录流程**

## 🎯 正确的 OAuth 流程

修复后的流程应该是：

```
1. 用户访问：http://localhost:3000/auth/login
2. 点击 "使用 GitHub 登录"
3. 重定向到：GitHub 授权页面
4. 用户授权
5. 重定向到：https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback
6. Supabase 处理授权码
7. 重定向到：http://localhost:3000/auth/callback
8. 显示登录成功页面
9. 重定向到：http://localhost:3000/
```

## ❌ 当前的错误流程

```
1. 用户访问：https://vercel.suchuanli.me/auth/login
2. 点击 "使用 GitHub 登录"
3. 重定向到：GitHub 授权页面
4. 用户授权
5. 重定向到：https://vercel.suchuanli.me/?code=...
6. 收到授权码，但无法处理（因为生产环境没有回调处理逻辑）
```

## 🔍 验证配置

修复后请验证：
- [ ] GitHub OAuth App Authorization callback URL 是 Supabase 地址
- [ ] Homepage URL 指向本地地址
- [ ] 访问 http://localhost:3000/auth/login 进行测试
- [ ] Supabase GitHub Provider 已启用

## 🚨 重要提醒

**确保您在本地环境 `http://localhost:3000` 测试，而不是生产环境！**

如果仍有问题，请检查：
1. 开发服务器是否正在运行：`npm run dev`
2. 浏览器缓存是否已清除
3. GitHub OAuth App 配置是否正确保存
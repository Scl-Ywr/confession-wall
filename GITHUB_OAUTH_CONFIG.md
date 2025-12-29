# GitHub OAuth 配置检查清单

## 当前问题
访问 `https://vercel.suchuanli.me/?code=...` 而不是跳转到 Supabase

## 需要检查的 GitHub OAuth App 配置

### ✅ 必须正确的配置项

1. **Application name**: Confession Wall
2. **Homepage URL**: `http://localhost:3000`
3. **Authorization callback URL**: `https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback`
4. **Application description**: 表白墙应用第三方登录

### ❌ 错误配置示例

如果出现以下情况会导致问题：
- Homepage URL 指向 `https://vercel.suchuanli.me`
- Authorization callback URL 指向 `https://vercel.suchuanli.me/auth/callback`

## 正确的 OAuth 流程

1. **用户点击**: http://localhost:3000/auth/login → "使用 GitHub 登录"
2. **重定向到**: GitHub 授权页面
3. **授权后重定向到**: https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback
4. **Supabase 处理**: 创建/关联用户
5. **最终重定向到**: http://localhost:3000/auth/callback

## 故障排除

### 如果仍然跳转到生产域名：

1. **检查浏览器地址栏**
   - 确保访问的是 `http://localhost:3000`
   - 不是 `https://vercel.suchuanli.me`

2. **清除浏览器缓存**
   - Ctrl+Shift+Delete
   - 或使用隐私模式

3. **重启开发服务器**
   ```bash
   npm run dev
   ```

4. **检查 GitHub OAuth App 配置**
   - 访问: https://github.com/settings/developers
   - 确认 Homepage URL 是 `http://localhost:3000`

## 验证步骤

1. 访问: http://localhost:3000/auth/login
2. 点击 "使用 GitHub 登录"
3. 应该跳转到 GitHub 授权页面
4. 授权后应该跳转到 Supabase 回调地址
5. 最后跳转到 http://localhost:3000/auth/callback

## 状态检查

- [ ] GitHub OAuth App Homepage URL 是 `http://localhost:3000`
- [ ] Authorization callback URL 是 `https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback`
- [ ] Supabase GitHub Provider 已启用
- [ ] 本地开发服务器正在运行
- [ ] 访问的是本地地址而不是生产地址
# 快速开始指南

## ✅ 已完成的配置

我已经为你完成了以下配置：

1. ✅ **创建 `.env.local` 文件** - 包含 Supabase 连接信息
2. ✅ **创建 `.env.example` 文件** - 环境变量模板
3. ✅ **更新 `.gitignore`** - 确保敏感信息不会被提交
4. ✅ **创建环境变量检查脚本** - `scripts/check-env.js`
5. ✅ **添加 `npm run check-env` 命令** - 快速检查环境变量配置

## 🚀 立即开始

### 步骤 1：检查环境变量

运行以下命令检查你的环境变量配置：

```bash
npm run check-env
```

如果看到 ✅ 绿色勾号，说明配置正确！

### 步骤 2：启动开发服务器

```bash
npm run dev
```

然后在浏览器中打开 http://localhost:3000

## ⚠️ 重要提示

### 需要你手动配置的变量

在 `.env.local` 文件中，以下变量需要从 Supabase Dashboard 获取：

```bash
# Supabase Service Role Key (必须)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Supabase JWT Secret (必须)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

### 如何获取这些密钥

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 复制以下值：
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
   - **JWT Secret** → `SUPABASE_JWT_SECRET`（点击 "Show" 按钮）

## 🔧 故障排除

### 问题 1：运行 `npm run dev` 时看到错误

**错误信息：**
```
Your project's URL and Key are required to create a Supabase client!
```

**解决方案：**
1. 检查 `.env.local` 文件是否存在
2. 确保以下变量已设置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 重启开发服务器

### 问题 2：Supabase 连接失败

**可能原因：**
- Service Role Key 或 JWT Secret 未设置
- 密钥格式不正确

**解决方案：**
1. 运行 `npm run check-env` 检查配置
2. 从 Supabase Dashboard 重新复制密钥
3. 确保 `.env.local` 文件中的密钥值正确

### 问题 3：环境变量不生效

**解决方案：**
1. 确保使用 `.env.local` 文件（而不是 `.env`）
2. 重启开发服务器
3. 检查 `.gitignore` 确认不会提交 `.env.local`

## 📚 详细文档

- **环境变量配置说明**: [ENV_SETUP.md](ENV_SETUP.md)
- **Vercel 部署环境变量**: [VERCEL_ENV_VARS.md](VERCEL_ENV_VARS.md)
- **Supabase OAuth 设置**: [docs/SUPABASE_OAUTH_SETUP.md](docs/SUPABASE_OAUTH_SETUP.md)

## 🎯 下一步

配置完成后，你可以：

1. ✅ 运行 `npm run dev` 启动开发服务器
2. ✅ 访问 http://localhost:3000 查看新的 Hero Section
3. ✅ 测试用户注册和登录功能
4. ✅ 部署到 Vercel（参考 VERCEL_ENV_VARS.md）

祝你开发顺利！🎉

---

**提示**: 如果你遇到任何问题，请先运行 `npm run check-env` 检查环境变量配置。

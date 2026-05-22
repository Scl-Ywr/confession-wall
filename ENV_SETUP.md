# 环境变量配置说明

## 已完成的配置

我已经为你创建了以下文件：

### 1. `.env.local` - 本地开发环境变量
这个文件已经配置了 Supabase 的连接信息，包括：
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名访问密钥

### 2. `.env.example` - 环境变量模板
这是一个模板文件，包含了所有可能需要的环境变量，方便你复制使用。

## ⚠️ 重要提示

### 需要你手动配置的变量

在 `.env.local` 文件中，以下变量需要你从 Supabase Dashboard 获取并替换：

```bash
# Supabase Service Role Key (必须)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Supabase JWT Secret (必须)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

## 如何获取 Supabase 密钥

### 方法 1：通过 Supabase Dashboard

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目（如果还没有项目，需要先创建）
3. 进入 **Settings** → **API**
4. 你会看到以下信息：
   - **Project URL**: 已经配置好了
   - **anon public**: 已经配置好了
   - **service_role**: 复制这个值到 `SUPABASE_SERVICE_ROLE_KEY`
   - **JWT Secret**: 点击 "Show" 按钮显示，然后复制到 `SUPABASE_JWT_SECRET`

### 方法 2：通过 Supabase CLI（已连接）

如果你已经通过 IDE 的 Supabase 集成连接到了项目，可以使用以下命令查看配置：

```bash
# 在项目根目录运行
supabase status
```

这会显示你的本地 Supabase 配置信息。

## 验证配置

配置完成后，你可以通过以下方式验证：

### 1. 检查环境变量

```bash
# Linux/Mac
echo $NEXT_PUBLIC_SUPABASE_URL

# Windows PowerShell
$env:NEXT_PUBLIC_SUPABASE_URL
```

### 2. 重启开发服务器

```bash
npm run dev
```

如果你看到类似以下的错误，说明某些环境变量缺失：

```
Your project's URL and Key are required to create a Supabase client!
```

### 3. 测试数据库连接

访问 http://localhost:3000，如果页面能正常加载，说明 Supabase 连接成功。

## 部署到 Vercel

在部署到 Vercel 时，你需要在 Vercel Dashboard 中设置环境变量：

1. 进入项目设置 → Environment Variables
2. 添加以下变量（标记为 Encryption）：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (加密)
   - `SUPABASE_JWT_SECRET` (加密)
   - `SECRET_KEY` (加密)
3. 根据需要添加其他可选变量
4. 重新部署项目

## 常见问题

### Q: 为什么会出现 "Your project's URL and Key are required" 错误？

A: 这是因为以下环境变量缺失或未正确设置：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

请确保这两个变量在 `.env.local` 文件中正确配置，并且你已经重启了开发服务器。

### Q: Supabase 密钥泄露了怎么办？

A: 如果密钥泄露，请立即：
1. 在 Supabase Dashboard 中撤销旧的密钥
2. 生成新的密钥
3. 更新你的环境变量
4. 重新部署应用
5. 检查是否有未授权的访问

### Q: 本地开发需要 Service Role Key 吗？

A: 严格来说不需要。`SERVICE_ROLE_KEY` 只有后端 API 路由需要。但是为了完整功能，建议配置它。

### Q: 如何区分 ANON_KEY 和 SERVICE_ROLE_KEY？

A:
- **ANON_KEY**: 可以安全暴露给前端，权限受限
- **SERVICE_ROLE_KEY**: 只能在后端使用，拥有完全权限，绝不能泄露

## 下一步

配置完环境变量后：

1. ✅ 确保所有必需的变量都已设置
2. ✅ 重启开发服务器：`npm run dev`
3. ✅ 访问 http://localhost:3000 测试应用
4. ✅ 检查浏览器控制台是否有错误

祝你开发顺利！🚀<tool_call>mcp_call_tool<arg_key>serverName</arg_key><arg_value>supabase

# Logto OAuth 集成设置指南

本文档说明如何为 Confession Wall 项目配置 Logto OAuth 认证系统。

## 前置要求

- Logto 账号（[Logto Cloud](https://cloud.logto.io) 或自托管实例）
- OAuth 提供商凭证（Google、GitHub、微信、QQ）

---

## 第一步：创建 Logto 应用

1. 登录 [Logto Console](https://cloud.logto.io)
2. 创建新应用
3. 选择应用类型：**Traditional Web App**
4. 记录以下信息：
   - **Endpoint URL**: 你的 Logto 租户终端地址（如 `https://your-tenant.logto.app`）
   - **App ID**: 应用 ID
   - **App Secret**: 应用密钥

---

## 第二步：配置 OAuth 连接器

### 2.1 Google OAuth

1. **创建 Google OAuth 客户端**
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 进入 **APIs & Services > Credentials**
   - 创建 OAuth 2.0 客户端 ID
   - 应用类型：Web 应用

2. **配置授权重定向 URI**
   ```
   https://your-tenant.logto.app/callback/google-universal
   ```

3. **在 Logto 中配置**
   - 进入 Logto Console > Connectors > Social connectors
   - 添加 "Google" 连接器
   - 输入 Google 的 Client ID 和 Client Secret
   - 保存配置

### 2.2 GitHub OAuth

1. **创建 GitHub OAuth App**
   - 访问 [GitHub Settings > Developer settings](https://github.com/settings/developers)
   - 点击 **New OAuth App**
   - 填写应用信息

2. **配置回调 URL**
   ```
   https://your-tenant.logto.app/callback/github-universal
   ```

3. **在 Logto 中配置**
   - 进入 Logto Console > Connectors > Social connectors
   - 添加 "GitHub" 连接器
   - 输入 GitHub 的 Client ID 和 Client Secret
   - 保存配置

4. **配置 Scopes**（GitHub connector 专属）

   在 Logto Console 的 GitHub connector 配置中，找到 "Scopes" 字段：

   **选项 A - 使用默认 scopes**（推荐用于基本登录）
   ```json
   {
     "scope": ""  // 留空，Logto 自动使用 read:user
   }
   ```
   - ✅ **本项目使用此配置**
   - 适用场景：仅需要用户基本信息（头像、昵称、邮箱）用于登录
   - 获取权限：`read:user`（GitHub 用户基本信息）
   - 无需额外配置，Logto 会自动处理

   **选项 B - 请求额外权限**（仅在需要访问 GitHub 数据时）
   ```json
   {
     "scope": "read:user user:email repo"
   }
   ```
   - 必须包含 `read:user`
   - 可选 scopes：
     - `user:email` - 读取用户邮箱地址
     - `repo` - 访问仓库数据
     - `read:org` - 读取组织信息
     - 更多 scopes：[GitHub OAuth Scopes 文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
   - ⚠️ 需要启用 Store tokens（见下方）

5. **Store Tokens 选项**

   在 Logto Console 的 GitHub connector 配置中：

   **是否启用 "Store tokens for persistent API access"？**

   **选项 A - 禁用**（推荐用于仅登录）
   - ✅ **本项目使用此配置**
   - 适用场景：仅用于 OAuth 登录认证
   - 优点：更简单，更安全，无需管理 tokens
   - 缺点：无法调用 GitHub API 获取用户数据

   **选项 B - 启用**（仅在需要调用 GitHub API 时）
   - 适用场景：需要调用 GitHub API（获取仓库、提交等）
   - Logto 会在 Secret Vault 中加密存储 access token
   - 注意：GitHub OAuth Apps 的 token 不会过期（除非用户手动撤销）
   - 无 refresh token（与 GitHub Apps 不同）

6. **Sync Profile 策略**

   在 Logto Console 的 GitHub connector 配置中：

   **Sync profile information at:**

   **选项 A - Only sync at sign-up**（推荐）
   - ✅ **本项目使用此配置**
   - 用户首次通过 GitHub 登录时获取头像和昵称
   - 之后登录不再更新（即使用户在 GitHub 修改了头像）
   - 优点：减少 API 调用，提升性能
   - 适合大多数应用场景

   **选项 B - Always sync at sign-in**
   - 用户每次登录都从 GitHub 获取最新信息
   - 优点：头像和昵称始终保持最新
   - 缺点：每次登录都调用 GitHub API
   - 适合需要实时同步用户信息的场景

7. **Device Flow 设置**

   在 GitHub OAuth App 配置页面：

   ⚠️ **建议不要启用 "Enable Device Flow"**

   原因：
   - Device Flow 用于无浏览器设备（如 CLI 工具、智能电视）
   - Web 应用不需要此功能
   - 启用后，移动端用户需要在 GitHub 移动 App 中确认登录
   - 大多数用户没有安装 GitHub 移动 App，会导致登录失败
   - 详情：[GitHub Device Flow 文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)

### 2.3 微信 (WeChat) OAuth

1. **注册微信开放平台账号**
   - 访问 [微信开放平台](https://open.weixin.qq.com/)
   - 完成企业认证（需要营业执照）
   - 创建网站应用

2. **获取凭证**
   - **AppID**（应用ID）
   - **AppSecret**（应用密钥）

3. **配置授权回调域名**
   ```
   your-tenant.logto.app
   ```

4. **在 Logto 中配置**
   - 进入 Logto Console > Connectors > Social connectors
   - 添加 "WeChat Web" 或 "WeChat Universal" 连接器
   - 输入微信的 AppID 和 AppSecret
   - 保存配置

### 2.4 QQ OAuth

1. **注册 QQ 互联账号**
   - 访问 [QQ 互联](https://connect.qq.com/)
   - 创建应用

2. **获取凭证**
   - **APP ID**
   - **APP Key**

3. **配置回调地址**
   ```
   https://your-tenant.logto.app/callback/qq
   ```

4. **在 Logto 中配置**
   - 进入 Logto Console > Connectors > Social connectors
   - 添加 "QQ" 连接器
   - 输入 QQ 的 APP ID 和 APP Key
   - 保存配置

---

## 第三步：配置环境变量

1. 复制 `.env.local.example` 为 `.env.local`：
   ```bash
   cp .env.local.example .env.local
   ```

2. 填写 Logto 相关环境变量：
   ```bash
   # Logto OAuth 认证
   NEXT_PUBLIC_LOGTO_ENDPOINT=https://your-tenant.logto.app
   NEXT_PUBLIC_LOGTO_APP_ID=your-logto-app-id
   LOGTO_APP_SECRET=your-logto-app-secret
   LOGTO_COOKIE_SECRET=complex_password_at_least_32_characters_long

   # 应用基础 URL（用于 OAuth 重定向）
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **生成安全的 Cookie Secret**：
   ```bash
   # 使用 Node.js 生成随机字符串
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

---

## 第四步：配置 Logto 重定向 URI

在 Logto Console 中配置应用的重定向 URI：

### 开发环境
```
http://localhost:3000/api/auth/logto/callback
```

### 生产环境
```
https://your-domain.com/api/auth/logto/callback
```

同时配置登出后重定向 URI：
```
http://localhost:3000/        # 开发环境
https://your-domain.com/      # 生产环境
```

---

## 第五步：运行数据库迁移

确保数据库迁移已应用：

```bash
# 使用 Supabase CLI
supabase db push

# 或在 Supabase Dashboard 中手动运行
# SQL Editor > 执行 supabase/migrations/20251228_add_logto_user_mapping.sql
```

验证迁移：
```sql
-- 检查表是否存在
SELECT * FROM information_schema.tables
WHERE table_name = 'user_identity_mapping';

-- 检查函数是否存在
SELECT proname FROM pg_proc
WHERE proname = 'find_or_create_user_identity';
```

---

## 第五步：验证 GitHub Connector 配置

在开始测试之前，请先验证所有配置是否正确：

### 5.1 验证 Logto Console 配置

登录 Logto Console 检查以下配置：

1. **Application 设置**（Logto Console > Applications > 你的应用）
   - [ ] Sign-in redirect URI: `http://localhost:3000/api/auth/logto/callback`
   - [ ] Post sign-out redirect URI: `http://localhost:3000/`
   - [ ] CORS allowed origins: `http://localhost:3000`（如需要）

2. **GitHub Connector 配置**（Logto Console > Connectors > Social connectors > GitHub）
   - [ ] Client ID 已填写（从 GitHub OAuth App 复制）
   - [ ] Client Secret 已填写（从 GitHub OAuth App 复制）
   - [ ] Scopes 字段：**留空**（使用默认 `read:user`）✅
   - [ ] Store tokens: **已禁用** ❌
   - [ ] Sync profile: **"Only sync at sign-up"** ✅

### 5.2 验证 GitHub OAuth App 配置

访问 GitHub Settings > Developer settings > OAuth Apps，检查你的应用：

1. **基本信息**
   - [ ] Application name: Confession Wall（或你的应用名称）
   - [ ] Homepage URL: https://your-domain.com（或 http://localhost:3000）
   - [ ] Authorization callback URL: `https://your-tenant.logto.app/callback/github-universal`
   - [ ] Enable Device Flow: **未勾选** ❌

2. **凭证已生成**
   - [ ] Client ID 已生成并复制到 Logto
   - [ ] Client Secret 已生成并安全保存

### 5.3 验证环境变量

检查 `.env.local` 文件：

```bash
# Logto 配置
NEXT_PUBLIC_LOGTO_ENDPOINT=https://your-tenant.logto.app  # ✅ 已设置
NEXT_PUBLIC_LOGTO_APP_ID=zaqciejjsm2ivvl8qhwgu           # ✅ 已设置
LOGTO_APP_SECRET=[your-secret]                             # ✅ 已设置
LOGTO_COOKIE_SECRET=[32+ characters]                       # ✅ 已设置

# 应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000                  # ✅ 已设置
```

验证要点：
- [ ] `LOGTO_COOKIE_SECRET` 至少 32 个字符
- [ ] `NEXT_PUBLIC_LOGTO_ENDPOINT` 以 `/` 结尾或不以 `/` 结尾都可以（代码会自动处理）
- [ ] `NEXT_PUBLIC_APP_URL` 与 Logto 的 redirect URI 匹配

### 5.4 验证代码配置

1. **Provider 映射**（`src/lib/logto/config.ts`）
   ```typescript
   export const logtoProviders = {
     github: 'social:github',  // ✅ 正确格式
   };
   ```

2. **API 路由**
   - [ ] `src/pages/api/auth/logto/sign-in.ts` 使用 `direct_sign_in` 参数
   - [ ] `src/pages/api/auth/logto/callback.ts` 正确处理回调

3. **数据库迁移**
   - [ ] `user_identity_mapping` 表已创建
   - [ ] `find_or_create_user_identity()` 函数已创建

   验证SQL：
   ```sql
   -- 检查表
   SELECT table_name FROM information_schema.tables
   WHERE table_name = 'user_identity_mapping';

   -- 检查函数
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'find_or_create_user_identity';
   ```

---

## 第六步：测试集成

### 本地测试

1. **启动开发服务器**：
   ```bash
   npm run dev
   ```

2. **访问登录页面**：
   ```
   http://localhost:3000/auth/login
   ```

3. **测试 OAuth 登录流程**：
   - 点击 "使用 Google 登录" 按钮
   - 完成 Google OAuth 授权
   - 验证是否成功重定向回应用并登录
   - 检查 URL 中**不应该**有任何 token 参数

4. **测试其他 OAuth 提供商**：
   - GitHub
   - 微信（需要微信扫码）
   - QQ

### 安全检查清单

- [ ] URL 中无 access_token 或 refresh_token 可见
- [ ] 浏览器历史记录中无 token
- [ ] 浏览器开发者工具 > Application > Cookies 中可以看到 `sb-access-token` 和 `sb-refresh-token`（带 HttpOnly 标志）
- [ ] 用户信息正确同步（头像、昵称）
- [ ] 相同邮箱的账号能正确关联

---

## 第七步：生产环境部署

### 更新环境变量

在生产环境（如 Vercel、Netlify）中设置：

```bash
NEXT_PUBLIC_LOGTO_ENDPOINT=https://your-tenant.logto.app
NEXT_PUBLIC_LOGTO_APP_ID=your-production-app-id
LOGTO_APP_SECRET=your-production-app-secret
LOGTO_COOKIE_SECRET=different_secret_from_development_at_least_32_chars
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 更新 OAuth 回调 URL

在每个 OAuth 提供商的控制台中：

1. **Google Cloud Console**
   - 添加生产环境回调 URL：`https://your-tenant.logto.app/callback/google-universal`

2. **GitHub Settings**
   - 添加生产环境回调 URL：`https://your-tenant.logto.app/callback/github-universal`

3. **微信开放平台**
   - 添加授权回调域名：`your-tenant.logto.app`

4. **QQ 互联**
   - 添加回调地址：`https://your-tenant.logto.app/callback/qq`

### 更新 Logto 应用配置

在 Logto Console 中：
- 将生产环境的重定向 URI 添加到允许列表
- 确保 CORS 设置正确

---

## GitHub Connector 完整配置检查清单

使用此清单确保所有配置步骤都已正确完成：

### Logto Console 配置

**Application 设置**（Logto Console > Applications）
- [ ] 应用已创建（类型：Traditional Web App）
- [ ] App ID 已复制到 `.env.local` 的 `NEXT_PUBLIC_LOGTO_APP_ID`
- [ ] App Secret 已复制到 `.env.local` 的 `LOGTO_APP_SECRET`
- [ ] Sign-in redirect URI: `http://localhost:3000/api/auth/logto/callback` 已添加
- [ ] Post sign-out redirect URI: `http://localhost:3000/` 已添加
- [ ] CORS allowed origins: `http://localhost:3000` 已添加（如需要）

**GitHub Connector 配置**（Logto Console > Connectors > Social connectors > GitHub）
- [ ] GitHub connector 已添加
- [ ] Client ID: [从 GitHub OAuth App 复制]
- [ ] Client Secret: [从 GitHub OAuth App 复制]
- [ ] Scopes 字段：**留空**（默认 `read:user`）✅
- [ ] Store tokens: **已禁用** ❌
- [ ] Sync profile: **"Only sync at sign-up"** ✅
- [ ] Connector 状态：**Enabled** ✅

### GitHub OAuth App 配置

**创建 OAuth App**（GitHub Settings > Developer settings > OAuth Apps）
- [ ] 访问 [GitHub Developer Settings](https://github.com/settings/developers)
- [ ] 点击 "New OAuth App" 创建应用
- [ ] Application name: Confession Wall（或你的应用名称）
- [ ] Homepage URL: `http://localhost:3000`（开发）或 `https://your-domain.com`（生产）
- [ ] Application description: (可选) 表白墙应用
- [ ] Authorization callback URL: `https://your-tenant.logto.app/callback/github-universal`
- [ ] Enable Device Flow: **未勾选** ❌
- [ ] 点击 "Register application"

**生成凭证**
- [ ] Client ID 已生成并复制到 Logto
- [ ] Client Secret 已生成并安全保存（⚠️ 只显示一次！）
- [ ] 凭证已在 Logto Console 中配置

### 代码和环境配置

**环境变量** (`.env.local`)
- [ ] 文件已创建（从 `.env.local.example` 复制）
- [ ] `NEXT_PUBLIC_LOGTO_ENDPOINT=https://your-tenant.logto.app` ✅
- [ ] `NEXT_PUBLIC_LOGTO_APP_ID=zaqciejjsm2ivvl8qhwgu` ✅
- [ ] `LOGTO_APP_SECRET=[your-secret]` ✅（至少 32 字符）
- [ ] `LOGTO_COOKIE_SECRET=[random-string]` ✅（至少 32 字符）
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000` ✅
- [ ] Cookie Secret 已使用随机生成器生成（推荐）

**代码配置**（无需修改，仅验证）
- [ ] `src/lib/logto/config.ts` 中 `github: 'social:github'` ✅
- [ ] `src/pages/api/auth/logto/sign-in.ts` 使用 `direct_sign_in` 参数 ✅
- [ ] `src/pages/api/auth/logto/callback.ts` 存在并正确实现 ✅

**数据库迁移**
- [ ] `user_identity_mapping` 表已创建
- [ ] `find_or_create_user_identity()` 函数已创建
- [ ] RLS policies 已启用
- [ ] 迁移文件：`supabase/migrations/20251228_add_logto_user_mapping.sql`

### 功能测试

**基本功能测试**
- [ ] 开发服务器启动成功：`npm run dev`
- [ ] 访问登录页面：`http://localhost:3000/auth/login`
- [ ] 点击"使用 GitHub 登录"按钮
- [ ] 跳转到 GitHub 授权页面（URL 包含 `github.com`）
- [ ] GitHub 授权页面显示正确的应用名称
- [ ] GitHub 授权页面请求的权限正确（基本用户信息）
- [ ] 点击 "Authorize" 授权
- [ ] 成功回调到应用（URL: `http://localhost:3000/`）
- [ ] 用户已登录（显示用户名和头像）
- [ ] URL 中**无** access_token 或 refresh_token 参数 ✅

**用户数据验证**
- [ ] 用户头像正确显示（来自 GitHub）
- [ ] 用户昵称正确显示（来自 GitHub）
- [ ] 用户邮箱正确（在数据库中）

**账号关联测试**
- [ ] 用相同邮箱注册 Supabase 账号
- [ ] 用该邮箱的 GitHub 账号登录
- [ ] 验证是否关联到现有账号（不创建新用户）
- [ ] 数据库中 `user_identity_mapping` 表有正确的映射记录

**Profile 同步测试**
- [ ] **新用户**：首次 GitHub 登录，头像和昵称正确同步
- [ ] **老用户**：修改 GitHub 头像后再次登录，头像**不变**（仅注册时同步）✅
- [ ] 数据库中 profiles 表的数据正确

**安全检查**
- [ ] 浏览器 URL 中无 token 暴露
- [ ] 浏览器历史记录中无 token
- [ ] DevTools > Application > Cookies
  - [ ] `sb-access-token` 存在且 HttpOnly = ✅
  - [ ] `sb-refresh-token` 存在且 HttpOnly = ✅
  - [ ] Cookies 设置了 Secure (生产环境) 或 不设置 (开发环境)
  - [ ] Cookies 设置了 SameSite = lax ✅
- [ ] 登出后 cookies 被清除
- [ ] 登出后访问受保护页面重定向到登录页

**错误处理测试**
- [ ] 在 GitHub 授权页面点击 "Cancel"
  - [ ] 正确返回登录页面
  - [ ] 显示错误消息（如果实现）
- [ ] 使用错误的 Client Secret（暂时修改）
  - [ ] 显示错误消息
  - [ ] 不会导致应用崩溃

### 生产环境准备（可选）

**生产环境配置**（部署到 Vercel/Netlify 等平台时）
- [ ] 生产环境变量已设置：
  - [ ] `NEXT_PUBLIC_LOGTO_ENDPOINT`
  - [ ] `NEXT_PUBLIC_LOGTO_APP_ID`
  - [ ] `LOGTO_APP_SECRET`（⚠️ 使用不同于开发环境的值）
  - [ ] `LOGTO_COOKIE_SECRET`（⚠️ 使用不同于开发环境的值）
  - [ ] `NEXT_PUBLIC_APP_URL=https://your-domain.com`
- [ ] GitHub OAuth App 添加生产回调 URL
- [ ] Logto Application 添加生产 redirect URI
- [ ] HTTPS 已启用（生产环境必须）
- [ ] 测试生产环境登录流程

---

## 常见问题

### Q1: OAuth 登录后重定向到错误的 URL

**解决方案**：检查 `NEXT_PUBLIC_APP_URL` 环境变量是否正确设置为应用的公开 URL。

### Q2: 提示 "redirect_uri_mismatch" 错误

**解决方案**：
1. 确认 OAuth 提供商控制台中的回调 URL 与 Logto 的回调 URL 完全一致
2. 注意 URL 末尾不要有斜杠 `/`

### Q3: 微信扫码后没有反应

**解决方案**：
1. 确认微信开放平台的应用已审核通过
2. 检查授权回调域名配置是否正确
3. 微信 OAuth 只能在网页端使用，不支持移动端浏览器

### Q4: 用户信息没有正确同步

**解决方案**：
1. 检查数据库迁移是否已应用
2. 查看 `user_identity_mapping` 表是否有正确的映射记录
3. 检查 Logto 连接器配置中的 scope 是否包含 `profile` 和 `email`

### Q5: Session 过期太快

**解决方案**：在 Supabase Dashboard 中调整 JWT 过期时间：
- Authentication > Settings > JWT expiry

---

## 账号关联说明

### 自动关联机制

当用户通过 OAuth 提供商登录时，系统会：

1. **检查邮箱是否已存在**
   - 如果邮箱已通过 Supabase 注册，自动关联到现有账号
   - 如果是新邮箱，创建新的用户账号

2. **创建身份映射**
   - 在 `user_identity_mapping` 表中记录 Logto 用户 ID 与 Supabase 用户 ID 的映射
   - 支持一个用户绑定多个 OAuth 提供商

3. **数据同步**
   - OAuth 登录时更新用户头像和昵称
   - 保持用户信息与 OAuth 提供商同步

---

## 安全最佳实践

1. **永不在客户端使用 Service Role Key**
2. **使用 HTTPS**（生产环境必须）
3. **定期轮换 LOGTO_COOKIE_SECRET**
4. **启用 Supabase Row Level Security (RLS)**
5. **监控异常登录活动**
6. **限制失败登录尝试次数**（已实现：5 次/15 分钟）

---

## 技术架构说明

### OAuth 流程

```
用户 → 点击社交登录按钮
     → /api/auth/logto/sign-in (Pages Router)
     → 重定向到 Logto
     → 重定向到 OAuth 提供商（Google/GitHub/微信/QQ）
     → 用户授权
     → 重定向回 Logto
     → 重定向到 /api/auth/logto/callback
     → 创建/关联 Supabase 用户
     → 创建会话（通过 HTTP-only cookies）
     → 重定向到首页（URL 中无 token）
```

### 混合认证架构

- **Supabase Auth**：处理邮箱密码注册/登录
- **Logto**：处理第三方 OAuth 登录
- **统一会话管理**：所有认证方式最终都创建 Supabase 会话

---

## 相关资源

- [Logto 官方文档](https://docs.logto.io/)
- [Logto GitHub 仓库](https://github.com/logto-io/logto)
- [Google OAuth 文档](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth 文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [微信开放平台文档](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [QQ 互联文档](https://wiki.connect.qq.com/)

---

## 获取帮助

如果遇到问题：

1. 查看浏览器控制台错误信息
2. 检查服务器日志（`console.error` 输出）
3. 验证所有环境变量已正确设置
4. 确认数据库迁移已应用
5. 在项目 GitHub Issues 中提问

---

**最后更新**: 2025-12-28

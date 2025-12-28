# Logto OAuth 集成测试指南

## 测试前准备

1. **配置环境变量**
   ```bash
   # 编辑 .env.local 文件，填写实际的 Logto 凭证
   NEXT_PUBLIC_LOGTO_ENDPOINT=https://your-tenant.logto.app
   NEXT_PUBLIC_LOGTO_APP_ID=your-app-id
   LOGTO_APP_SECRET=your-app-secret
   LOGTO_COOKIE_SECRET=complex_password_at_least_32_characters_long
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

## 测试步骤

### 1. 测试 OAuth 登录流程

1. 访问 `http://localhost:3000/auth/login`
2. 点击任一 OAuth 登录按钮（Google、GitHub、微信、QQ）
3. 验证是否正确重定向到 Logto OAuth 提供商
4. 完成登录流程
5. 验证是否正确重定向回应用并创建会话

### 2. 验证数据库映射

1. 登录后，在 Supabase SQL Editor 中运行：
   ```sql
   SELECT * FROM user_identity_mapping;
   ```
2. 验证是否创建了用户映射记录
3. 检查 profiles 表中是否创建了对应的用户记录

### 3. 测试账号关联

1. 使用相同邮箱的不同 OAuth 提供商登录
2. 验证是否关联到现有的 Supabase 用户账号
3. 检查 user_identity_mapping 表中是否有多个映射记录指向同一用户

### 4. 测试登出流程

1. 确认已登录状态
2. 点击登出按钮
3. 验证是否正确清除会话并重定向到首页

## 常见问题排查

### 登录失败

1. 检查环境变量是否正确配置
2. 确认 Logto 应用配置是否正确
3. 检查 OAuth 提供商配置是否正确

### 回调错误

1. 确认 Logto 中的回调 URI 配置是否正确
2. 检查 API 路由是否正确实现
3. 查看浏览器控制台和服务器日志

### 会话问题

1. 检查 cookies 是否正确设置
2. 验证 HTTP-only 属性是否生效
3. 确认会话创建逻辑是否正确

## 安全验证

1. **验证 Token 不出现在 URL 中**
   - 完成登录流程后，检查浏览器地址栏
   - 确认没有 access_token 或 refresh_token 出现在 URL 中

2. **验证 Cookies 设置**
   - 打开浏览器开发者工具
   - 检查 Application > Cookies
   - 确认 sb-access-token 和 sb-refresh-token 存在且标记为 HttpOnly

3. **验证 RLS 策略**
   - 尝试直接访问其他用户的数据
   - 确认只能访问自己的数据
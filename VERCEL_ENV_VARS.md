# Vercel 部署环境变量配置清单

## 1. Supabase 配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目 URL | `https://abcdefghijklmnopqrst.supabase.co` | 低 | 前端和后端共用，公开暴露 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名访问密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | 低 | 前端和后端共用，公开暴露 |
| SUPABASE_SERVICE_ROLE_KEY | Supabase 服务角色密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | 高 | 仅后端使用，拥有所有权限 |
| SUPABASE_JWT_SECRET | Supabase JWT 密钥 | `your-supabase-jwt-secret` | 高 | 用于验证 JWT 令牌 |
| SUPABASE_REFRESH_TOKEN_EXPIRY | 刷新令牌过期时间 | `604800000` | 中 | 单位：毫秒，默认 7 天 |

## 2. Redis 配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| REDIS_URL | Redis 连接 URL | `redis://default:password@redis.example.com:6379` | 高 | 完整的 Redis 连接字符串 |
| REDIS_HOST | Redis 主机名 | `redis.example.com` | 高 | Redis 服务器地址 |
| REDIS_PORT | Redis 端口 | `6379` | 中 | Redis 服务器端口 |
| REDIS_USERNAME | Redis 用户名 | `default` | 高 | Redis 访问用户名 |
| REDIS_PASSWORD | Redis 密码 | `your-redis-password` | 高 | Redis 访问密码 |
| REDIS_DB | Redis 数据库索引 | `0` | 中 | 默认使用数据库 0 |
| REDIS_CACHE_PREFIX | Redis 缓存键前缀 | `confession_wall:` | 低 | 用于区分不同应用的缓存 |
| REDIS_CACHE_VERSION | Redis 缓存版本 | `v1` | 低 | 用于缓存版本管理 |
| REDIS_CONNECTION_TIMEOUT | Redis 连接超时 | `5000` | 中 | 单位：毫秒 |
| REDIS_RETRY_ATTEMPTS | Redis 重试次数 | `3` | 中 | 连接失败时的重试次数 |
| REDIS_RETRY_DELAY | Redis 重试延迟 | `1000` | 中 | 单位：毫秒 |

## 3. 应用程序配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| NODE_ENV | 运行环境 | `production` | 低 | `development` 或 `production` |
| NEXT_PUBLIC_BASE_URL | 应用基础 URL | `https://confession-wall.vercel.app` | 低 | 用于生成绝对 URL |
| NEXT_PUBLIC_SITE_NAME | 站点名称 | `告白墙` | 低 | 显示在页面标题和导航中 |
| NEXT_PUBLIC_SITE_DESCRIPTION | 站点描述 | `一个匿名告白平台` | 低 | 用于 SEO 和社交媒体分享 |
| NEXT_PUBLIC_MAX_FILE_SIZE | 最大文件大小 | `5242880` | 低 | 单位：字节，默认 5MB |
| NEXT_PUBLIC_UPLOADS_BUCKET | 上传存储桶 | `confessions` | 低 | Supabase Storage 存储桶名称 |

## 4. 安全配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| SECRET_KEY | 应用密钥 | `your-secret-key-for-signing` | 高 | 用于加密和签名 |
| CORS_ORIGINS | 允许的 CORS 来源 | `https://confession-wall.vercel.app,http://localhost:3000` | 中 | 逗号分隔的域名列表 |
| RATE_LIMIT_ENABLED | 启用速率限制 | `true` | 低 | 防止 API 滥用 |
| RATE_LIMIT_MAX_REQUESTS | 最大请求数 | `100` | 低 | 单位时间内的最大请求数 |
| RATE_LIMIT_WINDOW | 速率限制窗口 | `60` | 低 | 单位：秒 |
| CACHE_MANAGEMENT_API_KEY | 缓存管理 API 密钥 | `your-cache-management-api-key` | 高 | 用于访问缓存管理 API |
| CACHE_CLEAR_API_KEY | 缓存清除 API 密钥 | `your-cache-clear-api-key` | 高 | 用于访问缓存清除 API |

## 5. 认证配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| NEXT_PUBLIC_AUTH_ENABLED | 启用认证 | `true` | 低 | 是否启用用户认证 |
| NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED | 邮箱验证必填 | `true` | 低 | 用户注册是否需要邮箱验证 |
| NEXT_PUBLIC_PASSWORD_MIN_LENGTH | 密码最小长度 | `8` | 低 | 用户密码的最小长度 |
| NEXT_PUBLIC_PASSWORD_REQUIRE_UPPERCASE | 需要大写字母 | `true` | 低 | 密码是否需要包含大写字母 |
| NEXT_PUBLIC_PASSWORD_REQUIRE_LOWERCASE | 需要小写字母 | `true` | 低 | 密码是否需要包含小写字母 |
| NEXT_PUBLIC_PASSWORD_REQUIRE_NUMBER | 需要数字 | `true` | 低 | 密码是否需要包含数字 |
| NEXT_PUBLIC_PASSWORD_REQUIRE_SPECIAL_CHAR | 需要特殊字符 | `true` | 低 | 密码是否需要包含特殊字符 |

## 6. 缓存配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| CACHE_ENABLED | 启用缓存 | `true` | 低 | 是否启用 Redis 缓存 |
| CACHE_EXPIRY_SHORT | 短期缓存过期时间 | `300000` | 低 | 单位：毫秒，默认 5 分钟 |
| CACHE_EXPIRY_MEDIUM | 中期缓存过期时间 | `3600000` | 低 | 单位：毫秒，默认 1 小时 |
| CACHE_EXPIRY_LONG | 长期缓存过期时间 | `604800000` | 低 | 单位：毫秒，默认 7 天 |
| CACHE_EXPIRY_FOREVER | 永久缓存标记 | `0` | 低 | 0 表示永不过期 |
| CACHE_STATISTICS_ENABLED | 启用缓存统计 | `true` | 低 | 是否收集缓存统计数据 |
| CACHE_PENETRATION_PROTECTION | 缓存穿透防护 | `true` | 低 | 防止缓存穿透攻击 |
| CACHE_BREAKDOWN_PROTECTION | 缓存击穿防护 | `true` | 低 | 防止缓存击穿攻击 |
| CACHE_AVALANCHE_PROTECTION | 缓存雪崩防护 | `true` | 低 | 防止缓存雪崩攻击 |

## 7. 日志配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| LOG_LEVEL | 日志级别 | `info` | 低 | 可选：`debug`, `info`, `warn`, `error` |
| LOG_ENABLE_CONSOLE | 启用控制台日志 | `true` | 低 | 是否在控制台输出日志 |
| LOG_ENABLE_FILE | 启用文件日志 | `false` | 低 | Vercel 环境下建议关闭 |
| LOG_MAX_SIZE | 日志文件最大大小 | `10485760` | 低 | 单位：字节，默认 10MB |
| LOG_MAX_FILES | 最大日志文件数 | `5` | 低 | 保留的日志文件数量 |

## 8. 实时通信配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| REALTIME_ENABLED | 启用实时通信 | `true` | 低 | 是否启用 Supabase Realtime |
| REALTIME_HEARTBEAT_INTERVAL | 心跳间隔 | `30000` | 低 | 单位：毫秒，默认 30 秒 |
| REALTIME_TIMEOUT | 实时连接超时 | `5000` | 低 | 单位：毫秒 |

## 9. 邮件配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| SMTP_HOST | SMTP 服务器 | `smtp.gmail.com` | 高 | 邮件发送服务器 |
| SMTP_PORT | SMTP 端口 | `587` | 中 | 邮件发送端口 |
| SMTP_USER | SMTP 用户名 | `your-email@gmail.com` | 高 | 邮件发送账号 |
| SMTP_PASSWORD | SMTP 密码 | `your-email-password` | 高 | 邮件发送密码 |
| SMTP_FROM_EMAIL | 发件人邮箱 | `noreply@confession-wall.com` | 中 | 显示的发件人邮箱 |
| SMTP_FROM_NAME | 发件人名称 | `告白墙` | 低 | 显示的发件人名称 |
| SMTP_SECURE | 使用 SSL/TLS | `true` | 中 | 是否使用加密连接 |

## 10. 分析和监控配置

| 变量名 | 用途 | 示例值 | 安全级别 | 备注 |
|-------|------|--------|----------|------|
| ANALYTICS_ENABLED | 启用分析 | `true` | 低 | 是否启用网站分析 |
| GOOGLE_ANALYTICS_ID | Google Analytics ID | `G-ABCDEFGHIJ` | 低 | Google Analytics 跟踪 ID |
| SENTRY_DSN | Sentry DSN | `https://abcdefghijklmnopqrst@o0.ingest.sentry.io/0` | 中 | Sentry 错误监控 DSN |
| SENTRY_ENVIRONMENT | Sentry 环境 | `production` | 低 | Sentry 监控环境 |

## 环境变量配置说明

### 安全级别定义
- **高**：包含敏感信息，如密钥、密码、令牌等，泄露会导致严重安全问题
- **中**：包含配置信息，泄露会导致功能异常但不会直接导致安全问题
- **低**：包含公开信息，可安全暴露给前端

### 配置建议
1. 所有高安全级别变量必须在 Vercel 控制台中设置为 "加密" 变量
2. 开发环境和生产环境应使用不同的环境变量值
3. 定期轮换高安全级别变量
4. 遵循最小权限原则，仅授予必要的权限
5. 敏感变量不应硬编码在代码中

### Vercel 配置步骤
1. 登录 Vercel 控制台
2. 选择你的项目
3. 进入 "Settings" → "Environment Variables"
4. 点击 "Add" 按钮添加环境变量
5. 选择变量类型（加密或非加密）
6. 选择适用的环境（开发、预览、生产）
7. 点击 "Save" 保存配置
8. 重新部署项目使配置生效

## 本地开发配置

在本地开发环境中，你可以创建一个 `.env.local` 文件来配置环境变量：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis 配置
REDIS_URL=redis://localhost:6379

# 应用程序配置
NODE_ENV=development
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 其他配置...
```

## 注意事项

1. 确保所有必需的环境变量都已正确配置
2. 环境变量值应符合预期格式（如 URL、数字、布尔值等）
3. 定期检查环境变量的有效性和安全性
4. 在 Vercel 部署时，确保所有环境变量都已正确同步
5. 对于敏感变量，建议使用 Vercel 的加密环境变量功能

## 常见问题

1. **环境变量不生效**：
   - 检查变量名是否拼写正确
   - 检查变量是否应用到了正确的环境
   - 尝试重新部署项目

2. **Redis 连接失败**：
   - 检查 REDIS_URL 格式是否正确
   - 确保 Redis 服务器允许外部连接
   - 检查 Redis 密码是否正确

3. **Supabase 认证失败**：
   - 检查 SUPABASE_SERVICE_ROLE_KEY 是否正确
   - 确保 JWT 密钥匹配
   - 检查权限设置

4. **邮件发送失败**：
   - 检查 SMTP 配置是否正确
   - 确保邮箱服务允许第三方客户端访问
   - 检查发件人邮箱是否已验证

通过正确配置这些环境变量，你可以确保告白墙应用在 Vercel 上安全、稳定地运行。
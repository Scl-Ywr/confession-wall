# 表白墙应用部署文档

## 1. 环境要求

- Node.js 18+ 或 Bun
- npm 或 yarn 或 pnpm

## 2. 部署前准备

### 2.1 Supabase 配置

1. 登录 [Supabase](https://supabase.com/) 并创建一个新项目
2. 在项目设置中获取以下信息：
   - `NEXT_PUBLIC_SUPABASE_URL`：项目的 API URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`：项目的匿名密钥

3. 配置认证：
   - 启用 Email/Password 认证
   - 设置允许的重定向 URL（例如：`http://localhost:3000`、`https://your-domain.com`）

4. 执行数据库迁移：
   - 在 Supabase 控制台的 SQL 编辑器中执行 `supabase/migrations/001_initial_schema.sql` 和 `supabase/migrations/002_likes_count_trigger.sql` 文件

### 2.2 环境变量配置

创建 `.env.local` 文件，并添加以下环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 3. 本地开发

### 3.1 安装依赖

```bash
npm install
```

### 3.2 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动

### 3.3 构建生产版本

```bash
npm run build
```

### 3.4 启动生产服务器

```bash
npm start
```

## 4. 部署到 Vercel

### 4.1 导入项目

1. 登录 [Vercel](https://vercel.com/) 并点击 "Add New Project"
2. 选择 "Import Git Repository"
3. 连接你的 GitHub/GitLab/Bitbucket 仓库
4. 选择要部署的分支（通常是 `main` 或 `master`）

### 4.2 配置项目

1. 选择框架为 "Next.js"
2. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`：你的 Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`：你的 Supabase 匿名密钥

### 4.3 部署

点击 "Deploy" 按钮，Vercel 将自动构建并部署你的应用

## 5. 部署到 Netlify

### 5.1 导入项目

1. 登录 [Netlify](https://www.netlify.com/) 并点击 "Add new site" → "Import an existing project"
2. 连接你的 GitHub/GitLab/Bitbucket 仓库
3. 选择要部署的分支

### 5.2 配置构建命令

- **Build command**: `npm run build`
- **Publish directory**: `.next`

### 5.3 配置环境变量

在 "Environment variables" 部分添加以下变量：
- `NEXT_PUBLIC_SUPABASE_URL`：你的 Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：你的 Supabase 匿名密钥

### 5.4 部署

点击 "Deploy site" 按钮，Netlify 将自动构建并部署你的应用

## 6. CI/CD 配置

### 6.1 GitHub Actions

创建 `.github/workflows/ci-cd.yml` 文件：

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js 18.x
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    - run: npm ci
    - run: npm run build
    - run: npm run lint
```

### 6.2 GitLab CI/CD

创建 `.gitlab-ci.yml` 文件：

```yaml
image: node:18

stages:
  - build
  - test

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - .next

lint:
  stage: test
  script:
    - npm run lint
```

## 7. 性能优化

### 7.1 图片优化

- 使用 Next.js 的 `Image` 组件优化图片加载
- 配置合适的图片尺寸和质量

### 7.2 代码分割

- 使用动态导入优化首屏加载时间
- 按需加载组件

### 7.3 缓存策略

- 配置合理的 HTTP 缓存头
- 使用 Next.js 的 ISR（增量静态再生）功能

## 8. SEO 优化

### 8.1 元标签配置

- 配置合适的 `title` 和 `description`
- 添加 `og:title`、`og:description` 等 Open Graph 标签
- 添加 `twitter:title`、`twitter:description` 等 Twitter 标签

### 8.2 结构化数据

- 添加 JSON-LD 结构化数据
- 优化页面标题和描述

### 8.3 站点地图

- 生成并提交站点地图到搜索引擎

## 9. 监控和日志

### 9.1 Vercel Analytics

- 启用 Vercel Analytics 监控页面访问和性能

### 9.2 Supabase 日志

- 在 Supabase 控制台查看 API 和数据库日志

### 9.3 错误监控

- 集成 Sentry 或其他错误监控服务

## 10. 安全配置

### 10.1 HTTPS

- 确保所有请求都使用 HTTPS
- 配置 HSTS 头

### 10.2 CORS

- 配置合适的 CORS 策略

### 10.3 内容安全策略 (CSP)

- 添加合适的 CSP 头，防止 XSS 攻击

## 11. 常见问题

### 11.1 部署后无法连接到 Supabase

- 检查环境变量是否正确配置
- 检查 Supabase 项目的 IP 访问限制

### 11.2 认证问题

- 检查认证配置是否正确
- 检查重定向 URL 是否在允许列表中

### 11.3 数据库连接问题

- 检查数据库迁移是否正确执行
- 检查 RLS 策略是否正确配置

## 12. 联系方式

如有问题，请联系项目维护者。

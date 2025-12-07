# Redis缓存有效性测试计划

## 测试目标
模拟真实用户访问网站，验证Redis缓存服务是否正常工作，包括缓存的设置、获取、过期和更新机制。

## 测试环境准备
1. 确保Redis服务已启动并运行
2. 确保Supabase服务已配置并可用
3. 启动开发服务器：`npm run dev`

## 测试步骤

### 1. 启动开发服务器
- 运行命令：`npm run dev`
- 确认服务器正常启动，监听在3000端口

### 2. 模拟用户访问首页
- 访问：`http://localhost:3000`
- 预期：
  - 首页加载告白列表
  - Redis缓存中应生成 `confession_wall:confession:list:1:10:v1` 等键
  - 缓存统计信息中 `misses` 计数增加

### 3. 验证缓存设置
- 使用Redis客户端或Redis Commander查看缓存键
- 运行命令：`redis-cli keys "confession_wall:*"`
- 预期：看到与告白列表相关的缓存键

### 4. 再次访问首页（测试缓存命中）
- 刷新首页
- 预期：
  - 页面加载速度更快
  - 缓存统计信息中 `hits` 计数增加
  - 查看日志，确认有 "Cache hit" 记录

### 5. 访问告白详情页
- 点击某个告白，进入详情页
- 预期：
  - 加载告白详情
  - Redis缓存中生成 `confession_wall:confession:detail:{id}:v1` 等键
  - 缓存统计信息中 `misses` 计数增加

### 6. 测试缓存统计API
- 访问：`http://localhost:3000/api/cache-statistics`
- 预期：返回缓存统计数据，包括hits、misses、requests和hitRate

### 7. 测试缓存清除API
- 访问：`http://localhost:3000/api/clear-cache`
- 预期：
  - 返回成功响应
  - Redis缓存中的数据被清除
  - 再次运行 `redis-cli keys "confession_wall:*"` 应看到键数量减少

### 8. 模拟用户登录
- 访问：`http://localhost:3000/auth/login`
- 使用测试账号登录
- 预期：
  - 登录成功
  - Redis缓存中生成用户相关缓存键，如 `confession_wall:user:profile:{id}:v1`

### 9. 测试聊天功能
- 进入聊天页面
- 发送一条消息
- 预期：
  - 消息发送成功
  - Redis缓存中生成聊天相关缓存键

### 10. 运行现有的Redis测试脚本
- 运行命令：`node update-redis-cache.js`
- 预期：
  - 脚本成功执行
  - 验证Supabase和Redis连接
  - 更新Redis缓存数据
  - 验证数据一致性

### 11. 测试缓存过期机制
- 访问首页，生成缓存
- 等待1分钟（根据配置，告白列表缓存过期时间为SHORT=5分钟，但可以调整测试时间）
- 再次访问首页
- 预期：
  - 首次访问生成缓存（miss）
  - 过期后再次访问重新生成缓存（miss）

## 验证方法

### 1. 日志验证
- 查看终端日志，确认有 "Cache hit" 和 "Cache miss" 记录
- 检查Redis连接日志，确认连接正常

### 2. Redis客户端验证
- 使用 `redis-cli` 命令行工具查看缓存键和值
- 命令：`redis-cli keys "confession_wall:*"`
- 命令：`redis-cli get "confession_wall:confession:list:1:10:v1"`

### 3. API验证
- 访问 `/api/cache-statistics` 查看缓存统计数据
- 访问 `/api/clear-cache` 测试缓存清除功能

### 4. 性能验证
- 观察页面加载速度，缓存命中时应更快
- 比较首次访问和再次访问的加载时间

## 预期结果

1. Redis服务正常连接
2. 用户访问时，Redis缓存被正确设置和获取
3. 缓存统计信息准确记录hits和misses
4. 缓存过期后自动更新
5. 缓存清除API能正常清除缓存
6. 现有的Redis测试脚本能成功执行

## 测试工具

1. 浏览器：用于模拟用户访问
2. Redis客户端：用于查看缓存键和值
3. 终端：用于查看日志和运行命令
4. Postman或curl：用于测试API端点

## 注意事项

1. 确保Redis服务已正确配置（HOST、PORT、PASSWORD等）
2. 确保Supabase服务已正确配置
3. 测试前清除所有现有缓存，避免干扰测试结果
4. 记录测试过程中的日志和数据，便于分析问题
5. 测试完成后，恢复原始配置和数据
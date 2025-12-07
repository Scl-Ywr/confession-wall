## 修复计划

### 问题分析
ESLint报告了5个错误，主要分为两类：
1. **禁止使用`any`类型**：3处使用了`any`类型，需要替换为正确的具体类型
2. **禁止使用`require()`导入**：2处使用了`require()`，需要替换为ES模块导入

### 修复方案

#### 1. 修复`client.ts`文件
- **第5行**：将`let redis: any;`替换为`let redis: Redis | undefined;`
- **第11行**：将`const Redis = require('ioredis').default;`替换为`import Redis from 'ioredis';`
- **第39行**：将`redis.on('error', (err: any) => {`替换为`redis.on('error', (err: Error) => {`

#### 2. 修复`cache.ts`文件
- **第2行**：将`let redis: any;`替换为`let redis: Redis | undefined;`
- **第9行**：将`const redisModule = require('./client');`替换为`import redisModule from './client';`

### 技术说明
- 使用`ioredis`包提供的`Redis`类型
- 项目已安装`@types/ioredis`类型定义
- Next.js 16支持ES模块导入
- TypeScript配置为严格模式，需要明确类型定义

### 预期结果
修复后，`npx eslint src/lib/redis/ --ext .ts`和`npx tsc --noEmit`命令都应该通过，无任何错误。
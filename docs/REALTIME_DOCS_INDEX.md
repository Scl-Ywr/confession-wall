# 实时订阅功能文档索引

## 📚 完整文档

### 1. [完整使用指南](./REALTIME_SUBSCRIPTION_GUIDE.md)
- **内容**: 详细的功能介绍和使用说明
- **适合**: 需要深入了解所有功能的开发者
- **包含**: 
  - 完整的 API 参考
  - 所有 Hooks 的使用示例
  - 高级功能说明
  - 性能优化建议
  - 调试技巧

### 2. [实现总结](./REALTIME_IMPLEMENTATION_SUMMARY.md)
- **内容**: 技术实现细节和架构说明
- **适合**: 想要了解系统如何工作的开发者
- **包含**:
  - 系统架构设计
  - 核心组件说明
  - 数据库配置
  - 测试指南
  - 故障排查
  - 未来优化方向

### 3. [快速参考](./REALTIME_QUICK_REFERENCE.md)
- **内容**: 快速查询的命令和代码片段
- **适合**: 需要快速实现功能的开发者
- **包含**:
  - 最常用的使用场景
  - Hooks 速查表
  - 常用操作命令
  - 最佳实践
  - 故障排查清单

## 🎯 使用场景快速导航

### 我想要...

#### 1. 监听表白更新
**文档**: [快速参考 - 基本使用](./REALTIME_QUICK_REFERENCE.md#基本使用)
**代码**:
```typescript
useConfessionRealtime({ onNewConfession: handler })
```

#### 2. 监听通知
**文档**: [快速参考 - 基本使用](./REALTIME_QUICK_REFERENCE.md#基本使用)
**代码**:
```typescript
useNotificationsRealtime({ userId, onNewNotification: handler })
```

#### 3. 监听私聊消息
**文档**: [快速参考 - 基本使用](./REALTIME_QUICK_REFERENCE.md#基本使用)
**代码**:
```typescript
usePrivateChatRealtime({ currentUserId, otherUserId, onNewMessage: handler })
```

#### 4. 监听群聊消息
**文档**: [快速参考 - 基本使用](./REALTIME_QUICK_REFERENCE.md#基本使用)
**代码**:
```typescript
useGroupChatRealtime({ currentUserId, groupId, onNewMessage: handler })
```

#### 5. 监听用户在线状态
**文档**: [完整使用指南 - 在线状态订阅](./REALTIME_SUBSCRIPTION_GUIDE.md#4-在线状态订阅)
**代码**:
```typescript
useOnlineStatusRealtime({ userIds, onStatusChange: handler })
```

#### 6. 监听好友请求
**文档**: [完整使用指南 - 好友请求订阅](./REALTIME_SUBSCRIPTION_GUIDE.md#4-好友请求订阅)
**代码**:
```typescript
useFriendRequestsRealtime({ userId, onNewRequest: handler })
```

## 🔧 配置和设置

### 数据库配置
**文档**: [完整使用指南 - 数据库配置](./REALTIME_SUBSCRIPTION_GUIDE.md#数据库配置)
**迁移文件**: `supabase/migrations/20250102000000_enable_realtime.sql`

### 应用集成
**文档**: [完整使用指南 - 应用集成](./REALTIME_SUBSCRIPTION_GUIDE.md#应用集成)
**示例**: `layout.tsx` (已配置)

## 🧪 测试

### 演示页面
**URL**: `/demo/realtime`
**功能**: 实时事件监控、连接状态显示、功能测试

## 🔍 调试和问题排查

### 快速检查
**文档**: [快速参考 - 调试命令](./REALTIME_QUICK_REFERENCE.md#调试命令)
**命令**:
```typescript
realtimeManager.getAllConnectionStates()
```

### 常见问题
**文档**: 
- [快速参考 - 故障排查](./REALTIME_QUICK_REFERENCE.md#故障排查)
- [实现总结 - 故障排查](./REALTIME_IMPLEMENTATION_SUMMARY.md#故障排查)

## 📖 学习路径

### 初学者
1. 从 [快速参考](./REALTIME_QUICK_REFERENCE.md) 开始
2. 查看 [演示页面](/demo/realtime)
3. 尝试基本的表白监听

### 中级开发者
1. 阅读 [完整使用指南](./REALTIME_SUBSCRIPTION_GUIDE.md)
2. 尝试所有类型的订阅
3. 实现通知和浏览器通知

### 高级开发者
1. 阅读 [实现总结](./REALTIME_IMPLEMENTATION_SUMMARY.md)
2. 了解架构设计
3. 自定义和扩展功能
4. 性能优化

## 📁 文件结构

```
docs/
├── REALTIME_IMPLEMENTATION_SUMMARY.md    # 实现总结
├── REALTIME_SUBSCRIPTION_GUIDE.md        # 完整使用指南
├── REALTIME_QUICK_REFERENCE.md           # 快速参考
└── REALTIME_DOCS_INDEX.md                # 本文档
```

## 🔗 相关资源

### 源代码
- 核心管理器: `src/lib/realtime/realtime-manager.ts`
- React Hooks: `src/hooks/useConfessionRealtime.ts`
- Context Provider: `src/context/RealtimeContext.tsx`
- 演示页面: `src/app/demo/realtime/page.tsx`

### 数据库迁移
- 启用实时: `supabase/migrations/20250102000000_enable_realtime.sql`

### API 路由
- 通知权限: `src/app/api/notifications/permission/route.ts`

## 💡 使用建议

1. **新手**: 从 [快速参考](./REALTIME_QUICK_REFERENCE.md) 开始
2. **实现功能**: 复制示例代码并修改
3. **遇到问题**: 查看 [故障排查](./REALTIME_QUICK_REFERENCE.md#故障排查)
4. **深入了解**: 阅读 [完整使用指南](./REALTIME_SUBSCRIPTION_GUIDE.md)
5. **架构设计**: 阅读 [实现总结](./REALTIME_IMPLEMENTATION_SUMMARY.md)

## 📞 获取帮助

1. **查看文档**: 优先查看本文档索引
2. **查看代码**: 参考演示页面 `src/app/demo/realtime/page.tsx`
3. **查看示例**: 查看文档中的完整示例
4. **查看日志**: 检查浏览器控制台日志

## 🎉 快速链接

- [完整使用指南](./REALTIME_SUBSCRIPTION_GUIDE.md) 📖
- [实现总结](./REALTIME_IMPLEMENTATION_SUMMARY.md) 📊
- [快速参考](./REALTIME_QUICK_REFERENCE.md) ⚡
- [演示页面](/demo/realtime) 🎯

## 📝 文档更新日志

- **v1.0** (2024-01-02): 初始版本
  - 实现了完整的实时订阅系统
  - 支持表白、通知、聊天、好友请求的实时订阅
  - 包含完整的文档和使用示例

## ⭐ 推荐阅读顺序

1. **[快速参考](./REALTIME_QUICK_REFERENCE.md)** - 5分钟快速上手
2. **[完整使用指南](./REALTIME_SUBSCRIPTION_GUIDE.md)** - 30分钟深入学习
3. **[实现总结](./REALTIME_IMPLEMENTATION_SUMMARY.md)** - 架构和高级主题
4. **演示页面** - 动手实践

---

**最后更新**: 2024-01-02  
**版本**: v1.0  
**状态**: ✅ 已完成

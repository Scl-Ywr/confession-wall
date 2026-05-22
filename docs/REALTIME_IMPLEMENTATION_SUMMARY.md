# 实时订阅功能实现总结

## 完成的工作

### 1. 核心架构

#### 1.1 RealtimeManager (实时订阅管理器)
**文件**: `src/lib/realtime/realtime-manager.ts`

**功能**:
- 统一的实时订阅管理
- 自动重连机制（最多5次，指数退避）
- 网络状态检测（online/offline）
- 连接状态监控
- 订阅生命周期管理

**主要方法**:
```typescript
- subscribe(config)       // 订阅实时事件
- unsubscribe(name)       // 取消订阅
- unsubscribeAll()        // 取消所有订阅
- getConnectionState()    // 获取连接状态
- reconnectAllChannels()  // 重连所有频道
- addConnectionListener() // 添加连接状态监听器
```

### 2. React Hooks

#### 2.1 表白实时订阅
**文件**: `src/hooks/useConfessionRealtime.ts`

**提供的 Hooks**:
- `useConfessionRealtime` - 表白创建/更新/删除事件
- `useLikesRealtime` - 点赞事件
- `useCommentsRealtime` - 评论事件

**特性**:
- 自动缓存失效（React Query）
- 可选的回调函数
- 连接状态监控
- 可控制的启用/禁用

#### 2.2 通知实时订阅
**文件**: `src/hooks/useNotificationsRealtime.ts`

**提供的 Hooks**:
- `useNotificationsRealtime` - 通知的接收和已读状态
- `useFriendRequestsRealtime` - 好友请求事件

**特性**:
- 未读计数管理
- 自动标记已读
- 浏览器通知支持
- 自定义事件派发

#### 2.3 聊天实时订阅
**文件**: `src/hooks/useChatRealtime.ts`

**提供的 Hooks**:
- `usePrivateChatRealtime` - 私聊消息
- `useGroupChatRealtime` - 群聊消息和成员变化
- `useOnlineStatusRealtime` - 用户在线状态

**特性**:
- 私聊和群聊消息实时推送
- 成员加入/离开通知
- 在线状态变化跟踪
- 自定义事件派发

### 3. Context Provider

**文件**: `src/context/RealtimeContext.tsx`

**功能**:
- 全局实时连接管理
- 统一的 Toast 通知
- 连接状态指示器
- 自动订阅管理

**提供的 Hooks**:
- `useRealtime()` - 获取全局连接状态和操作
- `useRealtimeConnection()` - 获取详细连接信息
- `useRealtimeActions()` - 获取连接操作（重连/断开）

### 4. UI 组件

#### 4.1 RealtimeStatusIndicator
**文件**: `src/components/RealtimeStatusIndicator.tsx`

**功能**:
- 实时显示连接状态
- 自动显示/隐藏
- 美观的视觉反馈
- 状态指示（连接/连接中/断开/错误）

### 5. 数据库配置

**文件**: `supabase/migrations/20250102000000_enable_realtime.sql`

**功能**:
- 启用所有表的实时发布
- 提供管理函数（enable/disable table realtime）
- 支持按需启用/禁用特定表的实时功能

### 6. API 路由

**文件**: `src/app/api/notifications/permission/route.ts`

**功能**:
- 请求浏览器通知权限
- 检查通知权限状态

### 7. 文档和使用示例

**文件**: 
- `docs/REALTIME_SUBSCRIPTION_GUIDE.md` - 详细使用指南
- `src/app/demo/realtime/page.tsx` - 功能演示页面

## 技术特点

### 1. 性能优化
- ✅ 使用 Map 存储订阅，避免重复订阅
- ✅ 自动清理过期订阅
- ✅ 批量连接状态更新
- ✅ 按需启用/禁用订阅

### 2. 错误处理
- ✅ 完整的错误捕获
- ✅ 自动重连机制
- ✅ 网络状态检测
- ✅ 详细的日志输出

### 3. 用户体验
- ✅ Toast 通知
- ✅ 浏览器通知支持
- ✅ 连接状态指示器
- ✅ 优雅的状态切换

### 4. 可扩展性
- ✅ 模块化设计
- ✅ 自定义事件系统
- ✅ 支持新表添加
- ✅ 灵活的过滤机制

## 集成到应用

### 在 layout.tsx 中启用
```typescript
import { RealtimeProvider } from '@/context/RealtimeContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 在组件中使用示例

#### 表白页面
```typescript
import { useConfessionRealtime } from '@/hooks/useConfessionRealtime';

function ConfessionsPage() {
  const { isConnected } = useConfessionRealtime({
    onNewConfession: (confession) => {
      toast.success('发现新的表白内容');
    },
  });

  return (
    <div>
      <ConfessionList />
    </div>
  );
}
```

#### 通知页面
```typescript
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';

function NotificationBell() {
  const { unreadCount, markAllAsRead } = useNotificationsRealtime({
    userId: currentUser.id,
    onNewNotification: (notification) => {
      new Notification('新通知', { body: notification.message });
    },
  });

  return (
    <div>
      <span>未读: {unreadCount}</span>
      <button onClick={markAllAsRead}>全部已读</button>
    </div>
  );
}
```

#### 聊天页面
```typescript
import { usePrivateChatRealtime, useGroupChatRealtime } from '@/hooks/useChatRealtime';

function ChatRoom() {
  const { isConnected } = usePrivateChatRealtime({
    currentUserId,
    otherUserId,
    onNewMessage: (message) => {
      playSound();
      scrollToBottom();
    },
  });

  return (
    <div>
      <ChatMessages />
      <ChatInput />
    </div>
  );
}
```

## 数据库启用

在 Supabase Dashboard 中运行以下 SQL：

```sql
-- 启用实时发布
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
```

或者使用迁移文件：
```bash
supabase db push
```

## 测试

访问 `/demo/realtime` 查看功能演示：
- 实时事件监控
- 连接状态显示
- 功能测试

## 监控和调试

### 查看连接状态
```typescript
import { realtimeManager } from '@/lib/realtime/realtime-manager';

const states = realtimeManager.getAllConnectionStates();
console.log(states);
```

### 手动重连
```typescript
import { useRealtimeActions } from '@/context/RealtimeContext';

const { reconnect } = useRealtimeActions();
reconnect();
```

### 查看日志
在浏览器控制台查看以下日志：
- `[RealtimeManager]` - 订阅管理日志
- `[useConfessionRealtime]` - 表白订阅日志
- `[useNotificationsRealtime]` - 通知订阅日志
- `[useChatRealtime]` - 聊天订阅日志

## 已知限制

1. **离线支持**: 当前不支持离线消息队列，重连后只会收到新消息
2. **消息顺序**: 不保证消息顺序，可能需要客户端排序
3. **带宽限制**: 大量订阅可能影响性能，建议按需订阅
4. **RLS 策略**: 确保 RLS 策略允许用户读取他们应该接收的数据

## 未来优化方向

1. **离线消息队列**: 支持离线时缓存消息，重连后同步
2. **消息加密**: 对敏感消息进行端到端加密
3. **批量更新**: 优化大量更新的处理
4. **消息压缩**: 减少网络传输
5. **历史消息**: 支持获取断开期间错过的消息
6. **用户状态**: 更详细的在线/离线/忙碌状态
7. **推送通知**: 支持移动端推送

## 故障排查

### 订阅不工作
1. 检查表是否启用了实时发布
2. 检查 RLS 策略
3. 查看浏览器控制台日志
4. 检查网络连接

### 性能问题
1. 减少不必要的订阅
2. 使用过滤条件
3. 优化回调函数（使用 useCallback）
4. 检查是否有内存泄漏

### 连接断开
1. 检查网络连接
2. 查看错误日志
3. 等待自动重连
4. 手动重连（如果需要）

## 贡献指南

添加新的实时订阅：

1. 在 `src/hooks/` 中创建新的 Hook
2. 使用 `realtimeManager.subscribe()` 订阅
3. 在 `RealtimeContext.tsx` 中集成
4. 添加文档说明
5. 编写测试用例

## 许可证

本功能是项目的一部分，遵循项目的开源许可证。

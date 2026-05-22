# 实时订阅快速参考

## 快速开始

### 1. 全局设置（已完成）
RealtimeProvider 已添加到 `layout.tsx`，无需额外配置。

### 2. 基本使用

#### 监听表白更新
```typescript
import { useConfessionRealtime } from '@/hooks/useConfessionRealtime';

const { isConnected } = useConfessionRealtime({
  onNewConfession: (confession) => {
    toast.success('发现新表白！');
  },
});
```

#### 监听通知
```typescript
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';

const { unreadCount, markAllAsRead } = useNotificationsRealtime({
  userId: currentUser.id,
  onNewNotification: (notification) => {
    toast.success('收到通知！');
  },
});
```

#### 监听私聊消息
```typescript
import { usePrivateChatRealtime } from '@/hooks/useChatRealtime';

const { isConnected } = usePrivateChatRealtime({
  currentUserId,
  otherUserId,
  onNewMessage: (message) => {
    playSound();
  },
});
```

#### 监听群聊消息
```typescript
import { useGroupChatRealtime } from '@/hooks/useChatRealtime';

const { isConnected } = useGroupChatRealtime({
  currentUserId,
  groupId,
  onNewMessage: (message) => {
    updateChatList(message);
  },
  onMemberJoined: (member) => {
    toast.info(`${member.user_name} 加入了群聊`);
  },
});
```

#### 监听用户在线状态
```typescript
import { useOnlineStatusRealtime } from '@/hooks/useChatRealtime';

const { isConnected } = useOnlineStatusRealtime({
  userIds: ['user1', 'user2'],
  onStatusChange: (userId, status) => {
    updateUserStatus(userId, status);
  },
});
```

## Hooks 速查表

| Hook | 用途 | 必需参数 |
|------|------|---------|
| `useConfessionRealtime` | 表白创建/更新/删除 | onNewConfession, onUpdateConfession, onDeleteConfession |
| `useLikesRealtime` | 点赞事件 | confessionId (可选) |
| `useCommentsRealtime` | 评论事件 | confessionId (可选) |
| `useNotificationsRealtime` | 通知接收 | userId, onNewNotification |
| `useFriendRequestsRealtime` | 好友请求 | userId |
| `usePrivateChatRealtime` | 私聊消息 | currentUserId, otherUserId |
| `useGroupChatRealtime` | 群聊消息 | currentUserId, groupId |
| `useOnlineStatusRealtime` | 用户状态 | userIds |

## 常用操作

### 获取连接状态
```typescript
import { useRealtime } from '@/context/RealtimeContext';

const { isConnected, connectionStatus, connectedChannels, totalChannels } = useRealtime();
```

### 手动重连
```typescript
import { useRealtimeActions } from '@/context/RealtimeContext';

const { reconnect } = useRealtimeActions();
reconnect();
```

### 断开所有连接
```typescript
const { disconnect } = useRealtimeActions();
disconnect();
```

## 数据库配置

在 Supabase SQL Editor 中运行：

```sql
-- 启用表白表实时
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;

-- 启用通知表实时
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 启用聊天表实时
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 启用群成员表实时
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- 启用用户表实时（用于在线状态）
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 启用点赞表实时
ALTER PUBLICATION supabase_realtime ADD TABLE likes;

-- 启用评论表实时
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- 启用好友请求表实时
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
```

## 调试命令

### 检查连接状态
```typescript
import { realtimeManager } from '@/lib/realtime/realtime-manager';

// 获取所有连接状态
realtimeManager.getAllConnectionStates();

// 检查特定频道
realtimeManager.isConnected('confessions');

// 获取统计
console.log(`Connected: ${realtimeManager.getConnectedChannelsCount()}/${realtimeManager.getTotalChannelsCount()}`);
```

## 事件类型

### 表白事件
- `confession:new` - 新表白发布
- `confession:update` - 表白被修改
- `confession:delete` - 表白被删除

### 通知事件
- `notification:new` - 新通知
- `notification:update` - 通知已读
- `friend-request:new` - 新好友请求
- `friend-request:accepted` - 请求被接受
- `friend-request:rejected` - 请求被拒绝

### 聊天事件
- `chat:message` - 新消息
- `chat:message-update` - 消息被修改
- `chat:message-delete` - 消息被删除
- `group:member-joined` - 成员加入
- `group:member-left` - 成员离开

### 用户状态事件
- `user:status-change` - 用户在线状态变化

## 最佳实践

### 1. 按需启用
```typescript
const { isConnected } = useConfessionRealtime({
  enabled: isLoggedIn, // 只有登录后才启用
});
```

### 2. 过滤数据
```typescript
const { isConnected } = useNotificationsRealtime({
  userId: currentUser.id, // 只接收发给当前用户的消息
});
```

### 3. 优化回调
```typescript
const handleNewMessage = useCallback((message) => {
  // 处理消息
}, []);

const { isConnected } = usePrivateChatRealtime({
  onNewMessage: handleNewMessage,
});
```

### 4. 处理错误
```typescript
const { isConnected, connectionStatus } = useRealtime();

if (connectionStatus === 'error') {
  // 显示错误提示
  toast.error('实时连接出错');
}
```

## 性能提示

1. **避免重复订阅**: 使用 `useCallback` 优化回调
2. **按需启用**: 只在需要时启用订阅
3. **过滤数据**: 使用过滤条件减少数据量
4. **批量处理**: 如果有大量更新，使用防抖

## 故障排查

### 订阅不工作
1. ✅ 检查表是否启用实时发布
2. ✅ 检查 RLS 策略
3. ✅ 查看浏览器控制台
4. ✅ 检查网络连接

### 看到旧数据
- 实时订阅只推送新数据
- 需要手动获取历史数据

### 性能问题
1. 减少订阅数量
2. 使用过滤条件
3. 优化回调函数

## 相关资源

- 📖 详细文档: `docs/REALTIME_SUBSCRIPTION_GUIDE.md`
- 📊 实现总结: `docs/REALTIME_IMPLEMENTATION_SUMMARY.md`
- 🎯 演示页面: `/demo/realtime`

## 技术支持

遇到问题？
1. 查看控制台日志
2. 检查数据库配置
3. 验证 RLS 策略
4. 查看详细文档

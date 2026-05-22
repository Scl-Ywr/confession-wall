# 实时订阅功能使用指南

## 概述

本项目实现了完整的实时订阅系统，包括表白、聊天、通知和好友请求的实时更新。

## 核心组件

### 1. RealtimeManager

全局实时连接管理器，负责管理所有实时订阅的生命周期。

**位置**: `src/lib/realtime/realtime-manager.ts`

**功能**:
- 统一管理所有实时订阅
- 自动重连机制（最多5次重试，指数退避）
- 网络状态检测（online/offline 事件）
- 连接状态监控

**使用示例**:

```typescript
import { realtimeManager } from '@/lib/realtime/realtime-manager';

// 订阅表白表的所有 INSERT 事件
realtimeManager.subscribe({
  channelName: 'confessions',
  table: 'confessions',
  event: 'INSERT',
  callback: (payload) => {
    console.log('New confession:', payload);
  },
});

// 取消订阅
realtimeManager.unsubscribe('confessions');

// 监听连接状态
const unsubscribe = realtimeManager.addConnectionListener('confessions', (state) => {
  console.log('Connection status:', state.status);
});

// 取消监听
unsubscribe();

// 断开所有连接
realtimeManager.disconnectAll();
```

### 2. React Hooks

#### 2.1 表白实时订阅

**位置**: `src/hooks/useConfessionRealtime.ts`

**功能**:
- `useConfessionRealtime`: 订阅表白列表的创建、更新、删除事件
- `useLikesRealtime`: 订阅点赞事件
- `useCommentsRealtime`: 订阅评论事件

**使用示例**:

```typescript
'use client';

import { useConfessionRealtime, useLikesRealtime, useCommentsRealtime } from '@/hooks/useConfessionRealtime';

function ConfessionPage() {
  const handleNewConfession = (confession) => {
    console.log('New confession:', confession);
    // 可以播放提示音
    // 可以滚动到新表白
  };

  const { isConnected } = useConfessionRealtime({
    onNewConfession: handleNewConfession,
    enabled: true,
  });

  const { isConnected: likesConnected } = useLikesRealtime({
    confessionId: '123',
    onLikeAdded: (like) => {
      console.log('Like added:', like);
    },
  });

  const { isConnected: commentsConnected } = useCommentsRealtime({
    confessionId: '123',
    onCommentAdded: (comment) => {
      console.log('New comment:', comment);
    },
  });

  return (
    <div>
      <p>表白实时连接: {isConnected ? '已连接' : '未连接'}</p>
      <p>点赞实时连接: {likesConnected ? '已连接' : '未连接'}</p>
      <p>评论实时连接: {commentsConnected ? '已连接' : '未连接'}</p>
    </div>
  );
}
```

#### 2.2 通知实时订阅

**位置**: `src/hooks/useNotificationsRealtime.ts`

**功能**:
- `useNotificationsRealtime`: 订阅通知的创建和状态更新
- `useFriendRequestsRealtime`: 订阅好友请求

**使用示例**:

```typescript
'use client';

import { useNotificationsRealtime, useFriendRequestsRealtime } from '@/hooks/useNotificationsRealtime';

function NotificationBell() {
  const {
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected,
  } = useNotificationsRealtime({
    userId: currentUser.id,
    onNewNotification: (notification) => {
      // 播放提示音
      playNotificationSound();
      // 显示浏览器通知
      showBrowserNotification(notification);
    },
    enabled: !!currentUser.id,
  });

  const { isConnected: friendRequestsConnected } = useFriendRequestsRealtime({
    userId: currentUser.id,
    onNewRequest: (request) => {
      toast.success('收到新的好友请求！');
    },
    onRequestAccepted: (request) => {
      toast.success('好友申请已通过！');
    },
  });

  return (
    <div>
      <span>未读通知: {unreadCount}</span>
      <button onClick={markAllAsRead}>全部标记为已读</button>
    </div>
  );
}
```

#### 2.3 聊天实时订阅

**位置**: `src/hooks/useChatRealtime.ts`

**功能**:
- `usePrivateChatRealtime`: 订阅私聊消息
- `useGroupChatRealtime`: 订阅群聊消息
- `useOnlineStatusRealtime`: 订阅用户在线状态

**使用示例**:

```typescript
'use client';

import { usePrivateChatRealtime, useGroupChatRealtime, useOnlineStatusRealtime } from '@/hooks/useChatRealtime';

function ChatPage({ currentUserId, otherUserId, groupId }) {
  const { isConnected } = usePrivateChatRealtime({
    currentUserId,
    otherUserId,
    onNewMessage: (message) => {
      console.log('New private message:', message);
      // 播放消息提示音
      playMessageSound();
      // 自动滚动到底部
      scrollToBottom();
    },
    onMessageDeleted: (messageId) => {
      console.log('Message deleted:', messageId);
    },
  });

  const { isConnected: groupConnected } = useGroupChatRealtime({
    currentUserId,
    groupId,
    onNewMessage: (message) => {
      console.log('New group message:', message);
      // 更新群消息列表
      updateGroupMessages(message);
    },
    onMemberJoined: (member) => {
      console.log('Member joined:', member);
      toast.info(`${member.user_name} 加入了群聊`);
    },
    onMemberLeft: (memberId) => {
      console.log('Member left:', memberId);
    },
  });

  const { isConnected: statusConnected } = useOnlineStatusRealtime({
    userIds: ['user1', 'user2', 'user3'],
    onStatusChange: (userId, status, lastSeen) => {
      console.log(`User ${userId} is now ${status}`);
      updateUserOnlineStatus(userId, status);
    },
  });

  return (
    <div>
      <p>私聊连接: {isConnected ? '已连接' : '未连接'}</p>
      <p>群聊连接: {groupConnected ? '已连接' : '未连接'}</p>
      <p>状态连接: {statusConnected ? '已连接' : '未连接'}</p>
    </div>
  );
}
```

### 3. RealtimeProvider

全局实时连接 Provider，自动管理所有实时订阅。

**位置**: `src/context/RealtimeContext.tsx`

**功能**:
- 自动订阅表白、通知和好友请求
- 提供连接状态指示器
- 统一的错误处理
- Toast 通知

**使用示例**:

```typescript
// 在 layout.tsx 中使用
import { RealtimeProvider } from '@/context/RealtimeContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <RealtimeProvider>
            {/* 你的应用内容 */}
            {children}
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

// 在组件中使用
import { useRealtime, useRealtimeConnection, useRealtimeActions } from '@/context/RealtimeContext';

function MyComponent() {
  const { isConnected, connectionStatus, connectedChannels, totalChannels } = useRealtime();
  const { reconnect, disconnect } = useRealtimeActions();

  return (
    <div>
      <p>连接状态: {connectionStatus}</p>
      <p>已连接频道: {connectedChannels}/{totalChannels}</p>
      <button onClick={reconnect}>重新连接</button>
      <button onClick={disconnect}>断开连接</button>
    </div>
  );
}
```

### 4. RealtimeStatusIndicator

实时连接状态指示器组件。

**位置**: `src/components/RealtimeStatusIndicator.tsx`

**功能**:
- 自动显示连接状态
- 仅在非正常状态时显示
- 自动隐藏

**使用示例**:

```typescript
// 已自动添加到 layout.tsx
// 无需手动使用
```

## 高级功能

### 1. 浏览器通知

配合实时订阅，可以显示浏览器通知：

```typescript
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'granted') {
    return true;
  }
  
  if ('Notification' in window && Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

function showBrowserNotification(notification: Notification) {
  if (Notification.permission === 'granted') {
    new Notification('表白墙', {
      body: notification.message,
      icon: '/icon.png',
      tag: notification.id,
    });
  }
}
```

### 2. 自定义事件

可以使用 CustomEvent 在组件间通信：

```typescript
// 监听自定义事件
window.addEventListener('notification:new', (event) => {
  const notification = event.detail;
  console.log('New notification:', notification);
});

// 在 hook 中触发
if (typeof window !== 'undefined') {
  window.dispatchEvent(new CustomEvent('notification:new', {
    detail: notification
  }));
}
```

### 3. 离线支持

实时订阅支持网络断开重连：

```typescript
// 自动检测网络状态
window.addEventListener('online', () => {
  console.log('Network online, reconnecting...');
  realtimeManager.reconnectAllChannels();
});

window.addEventListener('offline', () => {
  console.log('Network offline');
});
```

## 性能优化

### 1. 按需订阅

只在需要时启用订阅：

```typescript
const { isConnected } = useConfessionRealtime({
  enabled: shouldSubscribe, // 根据条件决定是否订阅
});
```

### 2. 过滤不必要的数据

使用过滤条件减少接收的数据量：

```typescript
const channel = realtimeManager.subscribe({
  channelName: 'my-channel',
  table: 'notifications',
  filter: 'recipient_id.eq.user123', // 只接收发送给 user123 的通知
  callback: handleNotification,
});
```

### 3. 批量更新

如果需要处理大量更新，可以批量处理：

```typescript
let pendingUpdates: any[] = [];
let updateTimeout: NodeJS.Timeout | null = null;

function handleUpdate(payload) {
  pendingUpdates.push(payload);
  
  if (!updateTimeout) {
    updateTimeout = setTimeout(() => {
      // 批量处理所有待处理的更新
      batchProcessUpdates(pendingUpdates);
      pendingUpdates = [];
      updateTimeout = null;
    }, 100);
  }
}
```

## 调试

### 1. 启用日志

所有实时订阅都会输出详细的日志：

```typescript
// 在控制台查看以下日志：
// [RealtimeManager] Creating new channel: ...
// [useConfessionRealtime] Setting up confession realtime subscription
// [useConfessionRealtime] Connection state changed: ...
// [useConfessionRealtime] New confession received: ...
```

### 2. 检查连接状态

```typescript
import { realtimeManager } from '@/lib/realtime/realtime-manager';

// 获取所有连接状态
const states = realtimeManager.getAllConnectionStates();
console.log('All connection states:', states);

// 检查特定频道
const isConnected = realtimeManager.isConnected('confessions');
console.log('Confessions channel connected:', isConnected);

// 获取统计信息
const connectedCount = realtimeManager.getConnectedChannelsCount();
const totalCount = realtimeManager.getTotalChannelsCount();
console.log(`Connected: ${connectedCount}/${totalCount}`);
```

## 数据库配置

确保在 Supabase 中启用了表的实时发布：

```sql
-- 在 Supabase SQL Editor 中运行
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
```

## 常见问题

### 1. 实时订阅不工作

检查清单：
- [ ] 表是否在 Supabase 中启用了实时发布
- [ ] RLS 策略是否允许用户读取数据
- [ ] 网络连接是否正常
- [ ] 检查浏览器控制台日志

### 2. 性能问题

如果遇到性能问题：
- [ ] 确保使用正确的过滤条件
- [ ] 避免订阅大量数据
- [ ] 使用 `useCallback` 和 `useMemo` 优化回调函数

### 3. 连接断开

实时连接可能因以下原因断开：
- 网络不稳定
- 服务器重启
- 长时间无活动

系统会自动尝试重连，如果重连失败，请检查网络连接。

## 下一步

- 添加更多表的实时订阅
- 实现消息加密
- 添加离线消息队列
- 优化批量更新处理

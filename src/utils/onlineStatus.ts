import { OnlineStatus } from '@/types/chat';

/**
 * 判断用户是否在线
 * @param onlineStatus 用户的在线状态字段
 * @param lastSeen 用户的最后活跃时间
 * @returns boolean 是否在线
 */
export const isUserOnline = (onlineStatus?: OnlineStatus, lastSeen?: string | Date): boolean => {
  // 1. 首先检查lastSeen是否存在，不存在则视为离线
  if (!lastSeen) return false;
  
  // 2. 确保lastSeen是有效的日期
  let lastSeenDate: Date;
  try {
    lastSeenDate = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);
    // 检查日期是否有效
    if (isNaN(lastSeenDate.getTime())) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Invalid lastSeen date:', lastSeen);
      }
      return false;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing lastSeen date:', error, lastSeen);
    }
    return false;
  }
  
  const now = new Date();
  const timeDiff = now.getTime() - lastSeenDate.getTime();
  
  // 3. 处理未来时间问题：如果last_seen是未来时间，计算时间差为负数，视为离线
  if (timeDiff < 0) return false;
  
  // 4. 检查onlineStatus字段，如果是明确的'offline'，直接返回false
  if (onlineStatus === 'offline') return false;
  
  // 5. 综合判断：
  // - 如果onlineStatus是'online'，但lastSeen超过5分钟，视为离线
  // - 如果onlineStatus是'away'或'busy'，基于lastSeen判断
  // - 否则，基于lastSeen判断
  const FIVE_MINUTES = 5 * 60 * 1000;
  return timeDiff < FIVE_MINUTES;
};

/**
 * 获取在线状态显示文本
 * @param onlineStatus 用户的在线状态字段
 * @param lastSeen 用户的最后活跃时间
 * @returns string 在线状态文本
 */
export const getOnlineStatusText = (onlineStatus?: OnlineStatus, lastSeen?: string | Date): string => {
  const isOnline = isUserOnline(onlineStatus, lastSeen);
  
  if (isOnline) {
    if (onlineStatus === 'online') return '在线';
    if (onlineStatus === 'away') return '离开';
    if (onlineStatus === 'busy') return '忙碌';
    return '在线';
  } else {
    return '离线';
  }
};

/**
 * 获取在线状态指示器颜色
 * @param onlineStatus 用户的在线状态字段
 * @param lastSeen 用户的最后活跃时间
 * @returns string CSS类名
 */
export const getOnlineStatusColor = (onlineStatus?: OnlineStatus, lastSeen?: string | Date): string => {
  const isOnline = isUserOnline(onlineStatus, lastSeen);
  
  if (isOnline) {
    if (onlineStatus === 'online') return 'bg-green-500';
    if (onlineStatus === 'away') return 'bg-yellow-500';
    if (onlineStatus === 'busy') return 'bg-red-500';
    return 'bg-green-500';
  } else {
    return 'bg-gray-500';
  }
};

/**
 * 获取在线状态文本颜色
 * @param onlineStatus 用户的在线状态字段
 * @param lastSeen 用户的最后活跃时间
 * @returns string CSS类名
 */
export const getOnlineStatusTextColor = (onlineStatus?: OnlineStatus, lastSeen?: string | Date): string => {
  const isOnline = isUserOnline(onlineStatus, lastSeen);
  
  if (isOnline) {
    if (onlineStatus === 'online') return 'text-green-500';
    if (onlineStatus === 'away') return 'text-yellow-500';
    if (onlineStatus === 'busy') return 'text-red-500';
    return 'text-green-500';
  } else {
    return 'text-gray-500';
  }
};

/**
 * 获取在线状态对象，包含所有相关信息
 * @param onlineStatus 用户的在线状态字段
 * @param lastSeen 用户的最后活跃时间
 * @returns object 包含在线状态的所有信息
 */
export const getOnlineStatusInfo = (onlineStatus?: OnlineStatus, lastSeen?: string | Date) => {
  return {
    isOnline: isUserOnline(onlineStatus, lastSeen),
    text: getOnlineStatusText(onlineStatus, lastSeen),
    color: getOnlineStatusColor(onlineStatus, lastSeen),
    textColor: getOnlineStatusTextColor(onlineStatus, lastSeen)
  };
};

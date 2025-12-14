// 用户统计相关类型定义

// 登录日志类型
export interface LoginLog {
  id: string;
  user_id: string;
  login_time: string;
  ip_address: string;
  user_agent: string;
}

// 在线会话类型
export interface OnlineSession {
  id: string;
  user_id: string;
  session_start: string;
  session_end?: string;
  duration: number;
  ip_address: string;
  user_agent: string;
}

// 用户积分类型
export interface UserPoints {
  id: string;
  user_id: string;
  points: number;
  updated_at: string;
}

// 用户统计数据类型
export interface UserStats {
  totalConfessions: number;
  totalLikes: number;
  totalComments: number;
  totalFriends: number;
  totalChatMessages: number;
  totalLogins: number;
  onlineDuration: string;
  systemPoints: number;
}

// 创建登录日志的输入类型
export interface CreateLoginLogInput {
  user_id: string;
  ip_address: string;
  user_agent: string;
}

// 创建在线会话的输入类型
export interface CreateOnlineSessionInput {
  user_id: string;
  ip_address: string;
  user_agent: string;
}

// 更新在线会话的输入类型
export interface UpdateOnlineSessionInput {
  session_end: string;
  duration: number;
}

// 更新用户积分的输入类型
export interface UpdateUserPointsInput {
  points: number;
}

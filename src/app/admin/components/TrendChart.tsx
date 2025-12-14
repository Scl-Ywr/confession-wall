'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TrendData {
  date: string;
  users: number;
  confessions: number;
  comments: number;
  messages: number;
}

interface TrendChartProps {
  data: TrendData[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="h-80 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(date) => {
              // 格式化日期，只显示月/日
              const [, month, day] = date.split('-');
              return `${month}/${day}`;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value) => [value, '数量']}
            labelFormatter={(label) => {
              // 格式化tooltip日期
              const [year, month, day] = label.split('-');
              return `${year}年${month}月${day}日`;
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="users" 
            stroke="#3b82f6" 
            name="新增用户" 
            strokeWidth={2} 
            dot={{ r: 3 }} 
            activeDot={{ r: 5 }} 
          />
          <Line 
            type="monotone" 
            dataKey="confessions" 
            stroke="#ec4899" 
            name="新增表白" 
            strokeWidth={2} 
            dot={{ r: 3 }} 
            activeDot={{ r: 5 }} 
          />
          <Line 
            type="monotone" 
            dataKey="comments" 
            stroke="#10b981" 
            name="新增评论" 
            strokeWidth={2} 
            dot={{ r: 3 }} 
            activeDot={{ r: 5 }} 
          />
          <Line 
            type="monotone" 
            dataKey="messages" 
            stroke="#f59e0b" 
            name="新增消息" 
            strokeWidth={2} 
            dot={{ r: 3 }} 
            activeDot={{ r: 5 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

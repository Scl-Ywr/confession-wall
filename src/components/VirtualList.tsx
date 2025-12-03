'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  onScroll
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 计算可见区域的项目数量
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // 额外渲染2个项目以避免空白
  
  // 计算滚动偏移量
  const offset = Math.floor(scrollTop / itemHeight);
  
  // 计算可见项目范围
  const startIndex = Math.max(0, offset - 1);
  const endIndex = Math.min(items.length, offset + visibleCount + 1);
  
  // 获取可见项目
  const visibleItems = items.slice(startIndex, endIndex);
  
  // 计算顶部填充高度
  const topPadding = startIndex * itemHeight;
  
  // 计算底部填充高度
  const bottomPadding = Math.max(0, items.length * itemHeight - endIndex * itemHeight);
  
  // 处理滚动事件
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
    if (onScroll) {
      onScroll(event);
    }
  };
  
  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: items.length * itemHeight,
          position: 'relative'
        }}
      >
        {/* 顶部填充 */}
        <div
          style={{
            height: topPadding,
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
        
        {/* 可见项目 */}
        <div
          style={{
            position: 'absolute',
            top: topPadding,
            left: 0,
            width: '100%'
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
        
        {/* 底部填充 */}
        <div
          style={{
            height: bottomPadding,
            width: '100%',
            position: 'absolute',
            top: (endIndex) * itemHeight,
            left: 0
          }}
        />
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';

interface MeteorProps {
  top: string;
  left: string;
  delay: string;
  duration: string;
}

interface MeteorShowerProps {
  number?: number;
  className?: string;
}

// 生成流星数据的辅助函数
const generateMeteors = (count: number): MeteorProps[] => {
  const meteors: MeteorProps[] = [];
  for (let i = 0; i < count; i++) {
    meteors.push({
      top: Math.floor(Math.random() * 100) + '%',
      left: Math.floor(Math.random() * 100) + '%',
      delay: Math.random() * (0.8 - 0.2) + 0.2 + 's',
      duration: Math.floor(Math.random() * (10 - 2) + 2) + 's',
    });
  }
  return meteors;
};

const MeteorShower: React.FC<MeteorShowerProps> = ({ number = 20, className = '' }) => {
  // 使用useState的初始值生成函数，只在组件初始化时生成一次随机数据
  const [meteors, setMeteors] = useState<MeteorProps[]>(() => generateMeteors(number));

  // 当number属性变化时，重新生成流星数据
  useEffect(() => {
    // 使用setTimeout将setState调用放入事件循环，避免级联渲染
    const timer = setTimeout(() => {
      setMeteors(generateMeteors(number));
    }, 0);

    return () => clearTimeout(timer);
  }, [number]);
  
  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      {meteors.map((meteor, idx) => (
        <span
          key={`${meteor.top}-${meteor.left}-${idx}`} // 使用更稳定的key
          className="absolute top-1/2 left-1/2 h-0.5 w-[100px] rounded-[9999px] bg-gradient-to-r from-slate-500 to-transparent shadow-[0_0_0_1px_#ffffff10] rotate-[215deg] animate-meteor opacity-0 dark:from-slate-200"
          style={{
            top: meteor.top,
            left: meteor.left,
            animationDelay: meteor.delay,
            animationDuration: meteor.duration,
          }}
        >
          {/* Meteor Head */}
          <div className="pointer-events-none absolute top-1/2 -z-10 h-[1px] w-[50px] -translate-y-1/2 bg-gradient-to-r from-primary-500 to-transparent" />
        </span>
      ))}
    </div>
  );
};

export default MeteorShower;

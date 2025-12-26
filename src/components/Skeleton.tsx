'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    rounded: 'rounded-lg',
  };

  const animationVariants = {
    pulse: {
      initial: { opacity: 1 },
      animate: { opacity: [0.6, 1, 0.6] },
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    wave: {
      initial: { x: '-100%' },
      animate: { x: '100%' },
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    none: {},
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      {...animationVariants[animation]}
    />
  );
};

export default Skeleton;

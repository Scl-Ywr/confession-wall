'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ConfessionCardSkeletonProps {
  count?: number;
}

const ConfessionCardSkeleton: React.FC<ConfessionCardSkeletonProps> = ({ count = 1 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="space-y-4">
      {skeletons.map((index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ 
            delay: index * 0.1, 
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1]
          }}
          className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 card-hover gpu-accelerated"
        >
          <div className="flex items-start gap-3">
            <motion.div 
              className="w-12 h-12 rounded-full skeleton-pulse"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <motion.div 
                  className="h-5 w-24 rounded skeleton-pulse"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div 
                  className="h-4 w-16 rounded skeleton-pulse"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
              </div>
              <div className="space-y-2">
                <motion.div 
                  className="h-4 w-full rounded skeleton-pulse"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                />
                <motion.div 
                  className="h-4 w-5/6 rounded skeleton-pulse"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div 
                  className="h-4 w-4/6 rounded skeleton-pulse"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <motion.div 
                  className="h-8 w-16 rounded-lg skeleton-pulse"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                />
                <motion.div 
                  className="h-8 w-16 rounded-lg skeleton-pulse"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ConfessionCardSkeleton;

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Skeleton from './Skeleton';

interface ProfileSkeletonProps {
  showStats?: boolean;
}

const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({ showStats = true }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto p-6"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-6 mb-6">
          <Skeleton variant="circular" width={120} height={120} />
          <div className="flex-1 space-y-3">
            <Skeleton variant="text" width={200} />
            <Skeleton variant="text" width={150} />
            <Skeleton variant="text" width={300} height={60} />
          </div>
        </div>

        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
              >
                <Skeleton variant="text" width={80} className="mx-auto mb-2" />
                <Skeleton variant="text" width={60} className="mx-auto" />
              </motion.div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <Skeleton variant="rectangular" width="100%" height={40} />
          <Skeleton variant="rectangular" width="100%" height={200} />
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileSkeleton;

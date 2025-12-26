'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BeatLoader, PulseLoader, ScaleLoader, GridLoader, ClimbingBoxLoader, MoonLoader, HashLoader, BarLoader, RingLoader, BounceLoader, SyncLoader } from 'react-spinners';

interface LoadingSpinnerProps {
  type?: 'beat' | 'pulse' | 'scale' | 'grid' | 'climbingBox' | 'moon' | 'hash' | 'bar' | 'ring' | 'bounce' | 'sync' | 'dots';
  size?: number;
  color?: string;
  className?: string;
  fullscreen?: boolean;
  message?: string;
  showMessage?: boolean;
  gradient?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  type = 'climbingBox',
  size = 15,
  color = '#f97316',
  className = '',
  fullscreen = false,
  message = '加载中...',
  showMessage = true,
  gradient = false,
}) => {
  const SpinnerComponent = {
    beat: BeatLoader,
    pulse: PulseLoader,
    scale: ScaleLoader,
    grid: GridLoader,
    climbingBox: ClimbingBoxLoader,
    moon: MoonLoader,
    hash: HashLoader,
    bar: BarLoader,
    ring: RingLoader,
    bounce: BounceLoader,
    sync: SyncLoader,
    dots: () => (
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    ),
  }[type];

  const spinnerProps = {
    color,
    size,
    margin: 2,
    speedMultiplier: 1,
    width: size / 2,
    height: size,
  };

  const gradientStyle = gradient ? {
    background: 'linear-gradient(135deg, #f97316 0%, #8b5cf6 50%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'gradient-animation 3s ease infinite',
  } as React.CSSProperties : {};

  const container = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <motion.div 
        style={gradientStyle}
        animate={{ 
          rotate: type === 'ring' || type === 'sync' ? 360 : 0,
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          rotate: { duration: 1, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.5, repeat: Infinity }
        }}
      >
        {type === 'dots' ? <SpinnerComponent /> : <SpinnerComponent {...spinnerProps} />}
      </motion.div>
      {showMessage && (
        <motion.p
          className="text-gray-500 dark:text-gray-300 text-sm font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {message}
        </motion.p>
      )}
      {fullscreen && (
        <style jsx>{`
          @keyframes gradient-animation {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}</style>
      )}
    </motion.div>
  );

  if (fullscreen) {
    return (
      <motion.div 
        className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-lg z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {container}
      </motion.div>
    );
  }

  return container;
};

export default LoadingSpinner;

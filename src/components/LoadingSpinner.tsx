'use client';

import React from 'react';
import { BeatLoader, PulseLoader, ScaleLoader, GridLoader, ClimbingBoxLoader } from 'react-spinners';

interface LoadingSpinnerProps {
  type?: 'beat' | 'pulse' | 'scale' | 'grid' | 'climbingBox';
  size?: number;
  color?: string;
  className?: string;
  fullscreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  type = 'beat',
  size = 15,
  color = '#f97316',
  className = '',
  fullscreen = false,
}) => {
  const SpinnerComponent = {
    beat: BeatLoader,
    pulse: PulseLoader,
    scale: ScaleLoader,
    grid: GridLoader,
    climbingBox: ClimbingBoxLoader,
  }[type];

  const spinnerProps = {
    color,
    size,
    margin: 2,
    speedMultiplier: 1,
  };

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
        <SpinnerComponent {...spinnerProps} />
      </div>
    );
  }

  return (
    <div className={className}>
      <SpinnerComponent {...spinnerProps} />
    </div>
  );
};

export default LoadingSpinner;

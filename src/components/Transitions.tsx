'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

const FadeIn: React.FC<FadeInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.4,
  direction = 'up',
}) => {
  const directionVariants = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    none: {},
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionVariants[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay,
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface FadeInStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  duration?: number;
}

export const FadeInStagger: React.FC<FadeInStaggerProps> = ({
  children,
  className = '',
  staggerDelay = 0.1,
  duration = 0.4,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
};

interface ScaleInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.3,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay,
        duration,
        ease: [0.34, 1.56, 0.64, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface SlideInProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  className = '',
  direction = 'right',
  delay = 0,
  duration = 0.4,
}) => {
  const directionVariants = {
    left: { x: -100 },
    right: { x: 100 },
    up: { y: 100 },
    down: { y: -100 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionVariants[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay,
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface FadeOutProps {
  children: React.ReactNode;
  show: boolean;
  className?: string;
  duration?: number;
}

export const FadeOut: React.FC<FadeOutProps> = ({
  children,
  show,
  className = '',
  duration = 0.3,
}) => {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface BounceInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const BounceIn: React.FC<BounceInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
}) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        delay,
        duration,
        ease: [0.34, 1.56, 0.64, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface RotateInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'clockwise' | 'counterClockwise';
}

export const RotateIn: React.FC<RotateInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  direction = 'clockwise',
}) => {
  return (
    <motion.div
      initial={{ rotate: direction === 'clockwise' ? -180 : 180, scale: 0, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{
        delay,
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface FlipInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'x' | 'y';
}

export const FlipIn: React.FC<FlipInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  direction = 'y',
}) => {
  const rotateValue = direction === 'y' ? 90 : 90;
  const rotateAxis = direction === 'y' ? 'rotateX' : 'rotateY';

  return (
    <motion.div
      initial={{ [rotateAxis]: rotateValue, opacity: 0 }}
      animate={{ [rotateAxis]: 0, opacity: 1 }}
      transition={{
        delay,
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }}
      style={{ perspective: 400 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface ZoomInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  from?: number;
}

export const ZoomIn: React.FC<ZoomInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.4,
  from = 0.8,
}) => {
  return (
    <motion.div
      initial={{ scale: from, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        delay,
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface ElasticInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const ElasticIn: React.FC<ElasticInProps> = ({
  children,
  className = '',
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        delay,
        type: 'spring',
        stiffness: 100,
        damping: 10,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface BlurInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const BlurIn: React.FC<BlurInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
}) => {
  return (
    <motion.div
      initial={{ filter: 'blur(10px)', opacity: 0 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      transition={{
        delay,
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface SlideUpStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  duration?: number;
}

export const SlideUpStagger: React.FC<SlideUpStaggerProps> = ({
  children,
  className = '',
  staggerDelay = 0.1,
  duration = 0.4,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1 as number,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
};

interface MorphProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const Morph: React.FC<MorphProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
}) => {
  return (
    <motion.div
      initial={{ scale: 0.8, borderRadius: '50%', opacity: 0 }}
      animate={{ scale: 1, borderRadius: '12px', opacity: 1 }}
      transition={{
        delay,
        duration,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;

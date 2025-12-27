'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
  threshold?: number;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  direction = 'up',
  threshold = 0.1,
  once = true,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once, 
    amount: threshold,
    margin: '-50px'
  });

  const directionVariants = {
    up: { y: 50, opacity: 0 },
    down: { y: -50, opacity: 0 },
    left: { x: -50, opacity: 0 },
    right: { x: 50, opacity: 0 },
    fade: { opacity: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={directionVariants[direction]}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : directionVariants[direction]}
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

interface StaggeredRevealProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

export const StaggeredReveal: React.FC<StaggeredRevealProps> = ({
  children,
  className = '',
  staggerDelay = 0.1,
  duration = 0.5,
  threshold = 0.1,
  once = true,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once, 
    amount: threshold,
    margin: '-50px'
  });

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
    hidden: { opacity: 0, y: 30 },
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
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
};

interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}

export const Parallax: React.FC<ParallaxProps> = ({
  children,
  className = '',
  speed = 0.5,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const elementTop = rect.top + scrollY;
        const windowHeight = window.innerHeight;
        
        if (elementTop < scrollY + windowHeight && elementTop + rect.height > scrollY) {
          const distance = (scrollY + windowHeight / 2 - elementTop) * speed;
          setOffsetY(distance);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <motion.div
      ref={ref}
      style={{ y: offsetY }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface ScaleOnScrollProps {
  children: React.ReactNode;
  className?: string;
  minScale?: number;
  maxScale?: number;
  threshold?: number;
  once?: boolean;
}

export const ScaleOnScroll: React.FC<ScaleOnScrollProps> = ({
  children,
  className = '',
  minScale = 0.8,
  maxScale = 1,
  threshold = 0.1,
  once = true,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once, 
    amount: threshold,
    margin: '-50px'
  });

  return (
    <motion.div
      ref={ref}
      initial={{ scale: minScale, opacity: 0 }}
      animate={isInView ? { scale: maxScale, opacity: 1 } : { scale: minScale, opacity: 0 }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface RotateOnScrollProps {
  children: React.ReactNode;
  className?: string;
  from?: number;
  to?: number;
  threshold?: number;
  once?: boolean;
}

export const RotateOnScroll: React.FC<RotateOnScrollProps> = ({
  children,
  className = '',
  from = -10,
  to = 0,
  threshold = 0.1,
  once = true,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once, 
    amount: threshold,
    margin: '-50px'
  });

  return (
    <motion.div
      ref={ref}
      initial={{ rotate: from, opacity: 0 }}
      animate={isInView ? { rotate: to, opacity: 1 } : { rotate: from, opacity: 0 }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
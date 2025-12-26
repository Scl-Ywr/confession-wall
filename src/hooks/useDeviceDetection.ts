'use client';

import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    orientation: 'landscape',
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const orientation = width > height ? 'landscape' : 'portrait';

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation,
      });
    };

    updateDeviceInfo();
    
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

export function useIsMobile() {
  const { isMobile } = useDeviceDetection();
  return isMobile;
}

export function useIsTablet() {
  const { isTablet } = useDeviceDetection();
  return isTablet;
}

export function useIsDesktop() {
  const { isDesktop } = useDeviceDetection();
  return isDesktop;
}

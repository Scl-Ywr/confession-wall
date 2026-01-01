'use client';

import { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

// 背景历史记录项接口
interface BackgroundHistoryItem {
  id: string;
  url: string;
  position: string;
  createdAt: number;
}

// 设备类型枚举
type DeviceType = 'desktop' | 'mobile';

interface BackgroundContextType {
  desktopBackgroundImage: string | null;
  desktopBackgroundPosition: string;
  mobileBackgroundImage: string | null;
  mobileBackgroundPosition: string;
  currentDeviceType: DeviceType;
  setBackgroundImage: (imageUrl: string | null, position?: string, deviceType?: DeviceType) => Promise<void>;
  setBackgroundPosition: (position: string, deviceType?: DeviceType) => Promise<void>;
  resetBackground: (deviceType?: DeviceType) => Promise<void>;
  backgroundHistory: BackgroundHistoryItem[];
  selectFromHistory: (item: BackgroundHistoryItem, deviceType?: DeviceType) => Promise<void>;
  addToHistory: (url: string, position: string) => void;
  removeFromHistory: (id: string) => void;
  isLoading: boolean;
  error: string | null;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

interface BackgroundProviderProps {
  children: ReactNode;
}

export const BackgroundProvider = ({ children }: BackgroundProviderProps) => {
  const { user } = useAuth();
  const { isMobile } = useDeviceDetection();
  
  // 初始化时从localStorage加载背景设置（仅客户端）
  const initializeBackground = () => {
    if (typeof window !== 'undefined') {
      const savedDesktopBackground = localStorage.getItem('customDesktopBackground');
      const savedDesktopPosition = localStorage.getItem('customDesktopBackgroundPosition');
      const savedMobileBackground = localStorage.getItem('customMobileBackground');
      const savedMobilePosition = localStorage.getItem('customMobileBackgroundPosition');
      return {
        desktopImage: savedDesktopBackground || null,
        desktopPosition: savedDesktopPosition || 'center center',
        mobileImage: savedMobileBackground || null,
        mobilePosition: savedMobilePosition || 'center center'
      };
    }
    return {
      desktopImage: null,
      desktopPosition: 'center center',
      mobileImage: null,
      mobilePosition: 'center center'
    };
  };

  // 初始化时从localStorage加载历史记录（仅客户端）
  const initializeHistory = () => {
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('backgroundHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    }
    return [];
  };

  // 状态管理
  const [desktopBackgroundImage, setDesktopBackgroundImage] = useState<string | null>(initializeBackground().desktopImage);
  const [desktopBackgroundPosition, setDesktopBackgroundPosition] = useState<string>(initializeBackground().desktopPosition);
  const [mobileBackgroundImage, setMobileBackgroundImage] = useState<string | null>(initializeBackground().mobileImage);
  const [mobileBackgroundPosition, setMobileBackgroundPosition] = useState<string>(initializeBackground().mobilePosition);
  const [backgroundHistory, setBackgroundHistory] = useState<BackgroundHistoryItem[]>(initializeHistory);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 保存背景设置到localStorage的useEffect（仅客户端）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (desktopBackgroundImage) {
        localStorage.setItem('customDesktopBackground', desktopBackgroundImage);
        localStorage.setItem('customDesktopBackgroundPosition', desktopBackgroundPosition);
      } else {
        localStorage.removeItem('customDesktopBackground');
        localStorage.removeItem('customDesktopBackgroundPosition');
      }
      
      if (mobileBackgroundImage) {
        localStorage.setItem('customMobileBackground', mobileBackgroundImage);
        localStorage.setItem('customMobileBackgroundPosition', mobileBackgroundPosition);
      } else {
        localStorage.removeItem('customMobileBackground');
        localStorage.removeItem('customMobileBackgroundPosition');
      }
    }
  }, [desktopBackgroundImage, desktopBackgroundPosition, mobileBackgroundImage, mobileBackgroundPosition]);
  
  // 保存历史记录到localStorage的useEffect（仅客户端）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('backgroundHistory', JSON.stringify(backgroundHistory));
    }
  }, [backgroundHistory]);

  // 从数据库加载用户背景设置
  const loadUserBackgroundFromDatabase = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_backgrounds')
        .select('image_url, position, device_type')
        .eq('user_id', user.id);
      
      if (error) {
        // 如果没有找到记录，忽略错误
        if (error.code !== 'PGRST116') {
          // 确保错误对象能够被正确序列化
          const errorDetails = {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          };
          throw errorDetails;
        }
        // 没有找到记录，继续执行，让 finally 块处理 isLoading 状态
      } else if (data && data.length > 0) {
        // 分离桌面和移动背景设置
        const desktopBackground = data.find(item => item.device_type === 'desktop') || null;
        const mobileBackground = data.find(item => item.device_type === 'mobile') || null;
        
        if (desktopBackground) {
          setDesktopBackgroundImage(desktopBackground.image_url);
          setDesktopBackgroundPosition(desktopBackground.position);
        }
        
        if (mobileBackground) {
          setMobileBackgroundImage(mobileBackground.image_url);
          setMobileBackgroundPosition(mobileBackground.position);
        }
      }
    } catch (err) {
      // 改进错误日志，确保错误信息能够被正确显示
      console.error('Error loading user background from database:', JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 当用户登录状态变化时，加载用户背景设置
  useEffect(() => {
    loadUserBackgroundFromDatabase();
  }, [user, loadUserBackgroundFromDatabase]);

  // 更新body的背景样式
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 更新body的背景样式
      const body = document.body;
      const isMobileDevice = isMobile;
      
      // 根据设备类型选择背景
      const currentBackgroundImage = isMobileDevice ? mobileBackgroundImage : desktopBackgroundImage;
      const currentBackgroundPosition = isMobileDevice ? mobileBackgroundPosition : desktopBackgroundPosition;
      
      if (currentBackgroundImage) {
        body.style.backgroundImage = `url('${currentBackgroundImage}')`;
        body.style.backgroundPosition = currentBackgroundPosition;
        body.style.backgroundRepeat = 'no-repeat';
        
        // 根据设备类型设置不同的背景样式
        if (isMobileDevice) {
          // 移动端：创建一个全屏容器来保持图片原始比例
          // 移除直接设置在body上的背景
          body.style.backgroundImage = '';
          body.style.backgroundSize = '';
          body.style.backgroundPosition = '';
          body.style.backgroundRepeat = '';
          body.style.backgroundAttachment = '';
          
          // 创建或更新背景容器
          let bgContainer = document.getElementById('mobile-background-container');
          if (!bgContainer) {
            bgContainer = document.createElement('div');
            bgContainer.id = 'mobile-background-container';
            bgContainer.style.position = 'fixed';
            bgContainer.style.top = '0';
            bgContainer.style.left = '0';
            bgContainer.style.width = '100%';
            bgContainer.style.height = '100%';
            bgContainer.style.zIndex = '-1';
            bgContainer.style.overflow = 'hidden';
            bgContainer.style.backgroundColor = '#1a1a1a';
            document.body.appendChild(bgContainer);
          }
          
          // 设置背景图片
          bgContainer.style.backgroundImage = `url('${currentBackgroundImage}')`;
          bgContainer.style.backgroundPosition = currentBackgroundPosition;
          bgContainer.style.backgroundRepeat = 'no-repeat';
          
          // 智能缩放策略：如果图片太窄，适当放大以填充屏幕
          // 创建临时图片对象来检测实际尺寸
          const img = new Image();
          img.onload = function() {
            const containerAspect = window.innerWidth / window.innerHeight;
            const imageAspect = img.width / img.height;
            
            console.log('图片尺寸检测:', {
              containerWidth: window.innerWidth,
              containerHeight: window.innerHeight,
              containerAspect: containerAspect.toFixed(2),
              imageWidth: img.width,
              imageHeight: img.height,
              imageAspect: imageAspect.toFixed(2),
              aspectDiff: Math.abs(containerAspect - imageAspect).toFixed(2)
            });
            
            // 更激进的策略：对于窄图片（宽高比小于0.7或大于1.5），直接使用cover模式
            if (imageAspect < 0.7 || imageAspect > 1.5) {
              console.log('检测到窄图片，使用cover模式放大图片');
              bgContainer.style.backgroundSize = 'cover';
            } else if (Math.abs(containerAspect - imageAspect) > 0.3) {
              console.log('图片与屏幕比例差异大，使用cover模式填充');
              bgContainer.style.backgroundSize = 'cover';
            } else {
              // 否则使用contain保持原始比例
              console.log('使用contain模式保持比例');
              bgContainer.style.backgroundSize = 'contain';
            }
          };
          
          // 添加错误处理
          img.onerror = function() {
            console.error('图片加载失败，使用默认contain模式');
            bgContainer.style.backgroundSize = 'contain';
          };
          
          img.src = currentBackgroundImage;
        } else {
          // 桌面端：保持比例，占满整个屏幕
          body.style.backgroundImage = `url('${currentBackgroundImage}')`;
          body.style.backgroundSize = 'cover';
          body.style.backgroundAttachment = 'fixed';
          body.style.backgroundPosition = currentBackgroundPosition;
          body.style.backgroundColor = '';
          
          // 移除移动端背景容器（如果存在）
          const bgContainer = document.getElementById('mobile-background-container');
          if (bgContainer) {
            bgContainer.remove();
          }
        }
      } else {
        // 重置为默认背景
        body.style.backgroundImage = '';
        body.style.backgroundSize = '';
        body.style.backgroundPosition = '';
        body.style.backgroundRepeat = '';
        body.style.backgroundAttachment = '';
        
        // 移除移动端背景容器（如果存在）
        const bgContainer = document.getElementById('mobile-background-container');
        if (bgContainer) {
          bgContainer.remove();
        }
      }
    }
  }, [desktopBackgroundImage, desktopBackgroundPosition, mobileBackgroundImage, mobileBackgroundPosition, isMobile]);
  
  // 处理移动端窗口大小变化的useEffect
  useEffect(() => {
    if (typeof window !== 'undefined' && isMobile) {
      // 处理窗口大小变化的函数
      const handleResize = () => {
        const currentBgImage = mobileBackgroundImage;
        if (currentBgImage) {
          const bgContainer = document.getElementById('mobile-background-container');
          if (bgContainer) {
            // 重新计算背景图片缩放
            const img = new Image();
            img.onload = function() {
              const containerAspect = window.innerWidth / window.innerHeight;
              const imageAspect = img.width / img.height;
              
              console.log('窗口大小变化 - 图片尺寸检测:', {
                containerWidth: window.innerWidth,
                containerHeight: window.innerHeight,
                containerAspect: containerAspect.toFixed(2),
                imageWidth: img.width,
                imageHeight: img.height,
                imageAspect: imageAspect.toFixed(2),
                aspectDiff: Math.abs(containerAspect - imageAspect).toFixed(2)
              });
              
              // 更激进的策略：对于窄图片（宽高比小于0.7或大于1.5），直接使用cover模式
              if (imageAspect < 0.7 || imageAspect > 1.5) {
                console.log('窗口大小变化 - 检测到窄图片，使用cover模式放大图片');
                bgContainer.style.backgroundSize = 'cover';
              } else if (Math.abs(containerAspect - imageAspect) > 0.3) {
                console.log('窗口大小变化 - 图片与屏幕比例差异大，使用cover模式填充');
                bgContainer.style.backgroundSize = 'cover';
              } else {
                // 否则使用contain保持原始比例
                console.log('窗口大小变化 - 使用contain模式保持比例');
                bgContainer.style.backgroundSize = 'contain';
              }
            };
            
            // 添加错误处理
            img.onerror = function() {
              console.error('窗口大小变化 - 图片加载失败，使用默认contain模式');
              bgContainer.style.backgroundSize = 'contain';
            };
            
            img.src = currentBgImage;
          }
        }
      };
      
      // 添加窗口大小变化监听
      window.addEventListener('resize', handleResize);
      
      // 初始执行一次
      handleResize();
      
      // 清理函数
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [mobileBackgroundImage, isMobile]);

  // 保存背景设置到数据库
  const saveBackgroundToDatabase = async (imageUrl: string | null, position: string, deviceType: DeviceType) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      let result;
      if (imageUrl) {
        // 有图片URL，保存或更新
        result = await supabase
          .from('user_backgrounds')
          .upsert({
            user_id: user.id,
            image_url: imageUrl,
            position,
            device_type: deviceType
          })
          .eq('user_id', user.id)
          .eq('device_type', deviceType);
      } else {
        // 没有图片URL，删除记录
        result = await supabase
          .from('user_backgrounds')
          .delete()
          .eq('user_id', user.id)
          .eq('device_type', deviceType);
      }
      
      if (result.error) {
        // 确保错误对象能够被正确序列化
        const errorDetails = {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint
        };
        throw errorDetails;
      }
    } catch (err) {
      // 改进错误日志，确保错误信息能够被正确显示
      console.error('Error saving background to database:', JSON.stringify(err, null, 2));
      setError('保存背景设置失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 设置背景图片
  const setBackgroundImageAsync = async (imageUrl: string | null, position?: string, deviceType?: DeviceType) => {
    const finalDeviceType = deviceType || (isMobile ? 'mobile' : 'desktop');
    const finalPosition = position || (finalDeviceType === 'mobile' ? mobileBackgroundPosition : desktopBackgroundPosition);
    
    if (finalDeviceType === 'mobile') {
      setMobileBackgroundImage(imageUrl);
      setMobileBackgroundPosition(finalPosition);
      await saveBackgroundToDatabase(imageUrl, finalPosition, 'mobile');
    } else {
      setDesktopBackgroundImage(imageUrl);
      setDesktopBackgroundPosition(finalPosition);
      await saveBackgroundToDatabase(imageUrl, finalPosition, 'desktop');
    }
  };

  // 设置背景位置
  const setBackgroundPositionAsync = async (position: string, deviceType?: DeviceType) => {
    const finalDeviceType = deviceType || (isMobile ? 'mobile' : 'desktop');
    
    if (finalDeviceType === 'mobile') {
      setMobileBackgroundPosition(position);
      await saveBackgroundToDatabase(mobileBackgroundImage, position, 'mobile');
    } else {
      setDesktopBackgroundPosition(position);
      await saveBackgroundToDatabase(desktopBackgroundImage, position, 'desktop');
    }
  };

  // 重置背景
  const resetBackgroundAsync = async (deviceType?: DeviceType) => {
    const finalDeviceType = deviceType || (isMobile ? 'mobile' : 'desktop');
    
    if (finalDeviceType === 'mobile') {
      setMobileBackgroundImage(null);
      setMobileBackgroundPosition('center center');
      await saveBackgroundToDatabase(null, 'center center', 'mobile');
    } else {
      setDesktopBackgroundImage(null);
      setDesktopBackgroundPosition('center center');
      await saveBackgroundToDatabase(null, 'center center', 'desktop');
    }
  };

  // 从历史记录中选择背景
  const selectFromHistoryAsync = async (item: BackgroundHistoryItem, deviceType?: DeviceType) => {
    const finalDeviceType = deviceType || (isMobile ? 'mobile' : 'desktop');
    
    if (finalDeviceType === 'mobile') {
      setMobileBackgroundImage(item.url);
      setMobileBackgroundPosition(item.position);
      await saveBackgroundToDatabase(item.url, item.position, 'mobile');
    } else {
      setDesktopBackgroundImage(item.url);
      setDesktopBackgroundPosition(item.position);
      await saveBackgroundToDatabase(item.url, item.position, 'desktop');
    }
  };

  // 添加到历史记录
  const addToHistory = (url: string, position: string) => {
    const newItem: BackgroundHistoryItem = {
      id: crypto.randomUUID(),
      url,
      position,
      createdAt: Date.now()
    };
    
    // 检查是否已存在相同URL的历史记录，如果存在则移除旧记录
    const updatedHistory = [
      newItem,
      ...backgroundHistory.filter(item => item.url !== url)
    ].slice(0, 10); // 最多保留10条历史记录
    
    setBackgroundHistory(updatedHistory);
  };

  // 从历史记录中移除
  const removeFromHistory = (id: string) => {
    setBackgroundHistory(backgroundHistory.filter(item => item.id !== id));
  };

  // 设备类型状态，实时更新
  const [currentDeviceType, setCurrentDeviceType] = useState<DeviceType>('desktop');

  // 初始化和监听窗口大小变化，更新设备类型
  useEffect(() => {
    const updateDeviceType = () => {
      if (typeof window !== 'undefined') {
        setCurrentDeviceType(window.innerWidth >= 1024 ? 'desktop' : 'mobile');
      }
    };

    // 初始化设备类型
    updateDeviceType();

    // 监听窗口大小变化
    window.addEventListener('resize', updateDeviceType);

    return () => {
      window.removeEventListener('resize', updateDeviceType);
    };
  }, []);

  return (
    <BackgroundContext.Provider 
      value={{ 
        desktopBackgroundImage,
        desktopBackgroundPosition,
        mobileBackgroundImage,
        mobileBackgroundPosition,
        currentDeviceType,
        setBackgroundImage: setBackgroundImageAsync,
        setBackgroundPosition: setBackgroundPositionAsync,
        resetBackground: resetBackgroundAsync,
        backgroundHistory,
        selectFromHistory: selectFromHistoryAsync,
        addToHistory,
        removeFromHistory,
        isLoading,
        error
      }}>
      {children}
    </BackgroundContext.Provider>
  );
};

// 自定义Hook
export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CloudArrowUpIcon, XMarkIcon, CheckIcon, LockClosedIcon } from '@heroicons/react/20/solid';
import { useBackground } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

interface BackgroundCustomizerProps {
  onClose: () => void;
}

export const BackgroundCustomizer = ({ onClose }: BackgroundCustomizerProps) => {
  const { user } = useAuth();
  const { 
    currentDeviceType, 
    setBackgroundImage, 
    resetBackground, 
    setBackgroundPosition, 
    addToHistory, 
    backgroundHistory, 
    selectFromHistory, 
    removeFromHistory, 
    isLoading 
  } = useBackground();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // 处理图片选择
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setSelectedImage(result);
        };
        reader.readAsDataURL(file);
      } else {
        alert('请选择图片文件');
      }
    }
  };

  // 处理设置背景
  const handleSetBackground = async () => {
    if (!user) {
      alert('请先登录再设置背景图片');
      return;
    }
    
    if (selectedImage) {
      setUploading(true);
      try {
        // 使用默认位置，不再让用户选择
        const defaultPosition = 'center center';
        await setBackgroundImage(selectedImage, defaultPosition, currentDeviceType);
        addToHistory(selectedImage, defaultPosition);
        onClose();
      } catch (error) {
        console.error('设置背景失败:', error);
        alert('设置背景失败，请重试');
      } finally {
        setUploading(false);
      }
    }
  };

  // 处理从历史记录选择
  const handleSelectFromHistory = async (item: { id: string; url: string; position: string; createdAt: number }) => {
    if (!user) {
      alert('请先登录再使用历史记录');
      return;
    }
    
    setUploading(true);
    try {
      await selectFromHistory(item, currentDeviceType);
      onClose();
    } catch (error) {
      console.error('从历史记录选择失败:', error);
      alert('从历史记录选择失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 处理重置背景
  const handleResetBackground = async () => {
    if (!user) {
      alert('请先登录再重置背景');
      return;
    }
    
    setUploading(true);
    try {
      await resetBackground(currentDeviceType);
      onClose();
    } catch (error) {
      console.error('重置背景失败:', error);
      alert('重置背景失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 处理取消选择
  const handleCancelSelection = () => {
    setSelectedImage(null);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="glass-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        initial={{ scale: 0.9, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: -20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              自定义背景
            </h2>
            <motion.button
              onClick={onClose}
              className="w-8 h-8 p-0 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-md"
              whileTap={{ scale: 0.9 }}
            >
              <XMarkIcon className="w-5 h-5 text-gray-900 dark:text-white" />
            </motion.button>
          </div>

          {/* 未登录提示 */}
          {!user && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
              <div className="flex items-start">
                <LockClosedIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">需要登录</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    请先登录，才能设置和保存背景图片
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* 历史记录切换按钮 */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm font-medium text-primary-500 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <span>{showHistory ? '隐藏历史记录' : '查看历史记录'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={`M${showHistory ? '19 14' : '5 10'}l-7 7m0 0l7 7m-7-7h18`} />
                </svg>
              </button>
            </div>
            
            {/* 历史记录区域 */}
            {showHistory && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">背景历史记录</h3>
                {backgroundHistory.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {backgroundHistory.map((item) => (
                      <div key={item.id} className="relative group">
                        <Image
                          src={item.url}
                          alt={`历史背景 ${item.createdAt}`}
                          width={100}
                          height={100}
                          className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-gray-200 dark:border-gray-700"
                          onClick={() => handleSelectFromHistory(item)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(item.id);
                          }}
                          className="absolute top-0 right-0 w-1 h-1 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-20 transform translate-x-1/4 -translate-y-1/4"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      还没有背景历史记录
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      设置一次背景图片后，历史记录会显示在这里
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* 设备特定通知 */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 mb-6 dark:bg-blue-900/30 dark:border-blue-800">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400">设备特定设置</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {/* 使用当前设备类型来判断 */}
                    {currentDeviceType === 'desktop' ? (
                      '当前为桌面模式，设置将仅应用于桌面设备。移动端设置需要在移动设备上单独配置。'
                    ) : (
                      '当前为移动模式，设置将仅应用于移动设备。桌面端设置需要在桌面设备上单独配置。'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 预览区域 */}
            <div className="relative border-2 border-dashed border-gray-400 dark:border-gray-500 rounded-xl p-6 flex items-center justify-center bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm">
              {selectedImage ? (
                <div className={`relative ${currentDeviceType === 'desktop' ? 'w-full aspect-video' : 'w-full aspect-[9/16]'}`}>
                  <Image
                    src={selectedImage}
                    alt="Preview"
                    fill
                    className="object-cover rounded-lg"
                    style={{ objectPosition: 'center center' }}
                    unoptimized
                  />
                  <motion.button
                    onClick={handleCancelSelection}
                    className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-gray-900/90 rounded-full shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-900 dark:text-white" />
                  </motion.button>
                </div>
              ) : (
                <div className="text-center">
                  <CloudArrowUpIcon className="w-12 h-12 mx-auto text-primary-500 dark:text-primary-400 mb-3" />
                  <p className="text-gray-900 dark:text-white mb-4 font-medium">
                    点击或拖拽图片到此处上传
                  </p>
                  <label className="inline-block px-4 py-2 bg-gradient-to-r from-gray-900 to-white text-white font-semibold text-base rounded-lg cursor-pointer hover:from-gray-800 hover:to-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg dark:text-gray-900 dark:bg-gradient-to-r dark:from-white dark:to-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-800">
                    选择图片
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              )}
            </div>
            


            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleResetBackground}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-white text-white font-semibold text-base rounded-lg transition-colors hover:bg-gradient-to-r hover:from-red-600 hover:to-gray-100 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-900 dark:bg-gradient-to-r dark:from-white dark:to-red-500 dark:hover:from-gray-100 dark:hover:to-red-600"
              >
                重置为默认
              </button>
              
              {selectedImage ? (
                <button
                  onClick={handleSetBackground}
                  disabled={uploading || isLoading || !user}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-900 to-white text-white font-semibold text-base rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-900 dark:bg-gradient-to-r dark:from-white dark:to-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-800"
                >
                  {(uploading || isLoading) ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>设置中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <CheckIcon className="w-5 h-5 text-gray-900 dark:text-white" />
                      <span>设置背景</span>
                    </div>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-900 to-white text-white font-semibold text-base rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md dark:text-gray-900 dark:bg-gradient-to-r dark:from-white dark:to-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-800"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CloudArrowUpIcon className="w-5 h-5 text-gray-900 dark:text-white" />
                    <span>上传图片</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

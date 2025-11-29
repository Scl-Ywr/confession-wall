'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, onClose }) => {
  // 处理键盘事件，按ESC键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 添加事件监听
    document.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // 点击背景关闭
  const handleBackgroundClick = () => {
    onClose();
  };

  // 点击图片本身不关闭
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
      onClick={handleBackgroundClick}
    >
      {/* 图片容器 - 合适的显示区域 */}
      <div 
        className="relative max-w-4xl max-h-[80vh] w-full mx-4 rounded-xl overflow-hidden shadow-2xl transform transition-all duration-300"
        onClick={handleImageClick}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black bg-opacity-50 text-white text-xl hover:bg-opacity-70 transition-colors duration-200 transform hover:scale-110 rounded-full w-8 h-8 flex items-center justify-center"
          aria-label="关闭"
        >
          ×
        </button>

        {/* 图片 */}
        <Image
          src={imageUrl}
          alt="放大查看"
          width={1200}
          height={900}
          className="w-full h-full object-contain"
          priority
        />
      </div>
    </div>
  );
};

export default ImageViewer;
'use client';

import React from 'react';
import { CropperRef, Cropper } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
  className?: string;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCrop,
  onCancel,
  className = '',
}) => {
  const cropperRef = React.useRef<CropperRef>(null);

  const handleCrop = () => {
    if (cropperRef.current) {
      const canvas = cropperRef.current.getCanvas();
      if (canvas) {
        onCrop(canvas.toDataURL('image/jpeg', 0.9));
      }
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="mb-4">
        <Cropper
          ref={cropperRef}
          src={imageSrc}
          className="border border-gray-200 dark:border-gray-700 rounded-lg"
        />
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          取消
        </button>
        <button
          onClick={handleCrop}
          className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl hover:from-pink-500 hover:to-purple-600 transition-all"
        >
          确认裁剪
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;

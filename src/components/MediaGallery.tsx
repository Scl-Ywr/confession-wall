'use client';

import Image from 'next/image';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import VideoPlayer from './VideoPlayer';
// 导入react-photo-view的样式
import 'react-photo-view/dist/react-photo-view.css';

interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
}

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
}

export function MediaGallery({ mediaFiles }: MediaGalleryProps) {
  // 如果没有媒体文件，返回提示信息
  if (mediaFiles.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500">暂无媒体文件</p>
      </div>
    );
  }

  return (
    <PhotoProvider>
      {/* 媒体文件列表 */}
      <div className="space-y-6">
        {mediaFiles.map((file) => (
          <div 
            key={file.id}
            className={`relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col lg:flex-row`}
          >
            {/* 图片显示 */}
            {file.type === 'image' ? (
              <div className="w-full lg:w-2/3 bg-gray-100 overflow-hidden">
                <PhotoView 
                  src={file.url} 
                  key={file.id}
                  // 设置触发事件为点击和双击
                  triggers={['onClick', 'onDoubleClick']}
                  // 自定义渲染节点尺寸
                  width={800}
                  height={800}
                >
                  <Image 
                    src={file.url} 
                    alt={file.name}
                    width={600}
                    height={600}
                    // 优化图片加载策略
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    // 优化图片加载性能
                    loading="lazy"
                    // 优化图片质量和格式
                    quality={80}
                    // 自动选择最优格式
                    priority={false}
                  />
                </PhotoView>
                {/* 图片类型标识 */}
                <div className="absolute top-2 left-2 bg-blue-500 bg-opacity-80 text-white text-xs px-2 py-0.5 rounded-full">
                  图片
                </div>
              </div>
            ) : (
              /* 视频显示区域 - 左侧 */
              <div className="w-full lg:w-2/3 bg-black overflow-hidden">
                <VideoPlayer 
                  videoUrl={file.url}
                  posterUrl={file.url}
                  className="w-full h-full object-contain"
                />
                {/* 视频类型标识 */}
                <div className="absolute top-2 left-2 bg-red-500 bg-opacity-80 text-white text-xs px-2 py-0.5 rounded-full">
                  视频
                </div>
              </div>
            )}
            
            {/* 媒体信息区域 - 右侧 */}
            <div className="w-full lg:w-1/3 bg-gray-50 p-4 border-t lg:border-t-0 lg:border-l">
              {/* 文件名 */}
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-700 mb-1">文件名</h3>
                <p className="text-sm text-gray-500 break-all">{file.name}</p>
              </div>
              
              {/* 资源地址 */}
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-700 mb-1">资源地址</h3>
                <p className="text-sm text-blue-600 break-all font-mono">{file.url}</p>
              </div>
              
              {/* 描述 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">描述</h3>
                <p className="text-sm text-gray-600">
                  {file.type === 'image' ? '这是一个图片资源，您可以点击查看大图。' : '这是一个视频资源，您可以在上方播放器中观看。'}
                  该资源的存储地址如上所示，您可以复制用于其他用途。
                </p>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-colors">
                <span className="text-gray-600">🔍</span>
              </button>
              <button className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-colors">
                <span className="text-gray-600">📥</span>
              </button>
              <button className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-colors">
                <span className="text-red-600">🗑️</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </PhotoProvider>
  );
}

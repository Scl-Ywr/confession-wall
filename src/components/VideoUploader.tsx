'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import LoadingSpinner from './LoadingSpinner';

interface VideoUploaderProps {
  onUploadSuccess?: (videoUrl: string, posterUrl?: string) => void;
}

type UploadState = 
  | 'idle' 
  | 'selecting' 
  | 'checking_size' 
  | 'size_exceeded' 
  | 'compressing' 
  | 'uploading' 
  | 'success' 
  | 'error';

export default function VideoUploader({ onUploadSuccess }: VideoUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSizeMB, setFileSizeMB] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [compressionOptions, setCompressionOptions] = useState({
    resolution: '720p',
    bitrate: '2M'
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Supported video formats
  const supportedFormats = ['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv'];
  const maxSizeMB = 50;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      setError(`不支持的视频格式。请上传 ${supportedFormats.join(', ')} 格式的视频。`);
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    const size = file.size;
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    setFileSizeMB(parseFloat(sizeMB));
    setUploadState('checking_size');

    // Check file size
    if (size > maxSizeBytes) {
      setUploadState('size_exceeded');
    } else {
      // 直接传递文件对象，避免依赖异步的setState更新
      handleUpload(file);
    }
  };

  // Handle compression options change
  const handleCompressionOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCompressionOptions(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Compress video
  // 直接上传视频，不进行压缩，避免损坏视频文件
  const handleVideoUpload = async () => {
    if (!selectedFile) return;
    
    // 直接上传原视频，不进行压缩
    await handleUpload(selectedFile);
  };

  // 视频压缩函数 - 基于浏览器MediaRecorder API
  const compressVideo = async () => {
    if (!selectedFile) return;

    setUploadState('compressing');
    setCompressionProgress(0);

    try {
      // 创建视频元素
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(selectedFile);
      videoElement.muted = true;
      videoElement.playsInline = true;
      
      // 等待视频加载完成
      await new Promise<void>((resolve, reject) => {
        videoElement.onloadedmetadata = () => resolve();
        videoElement.onerror = () => reject(new Error('Failed to load video'));
      });
      
      // 设置压缩参数
      const { bitrate } = compressionOptions;
      
      // 创建视频流
      videoElement.play();
      
      // 创建MediaRecorder实例
      // 使用HTMLMediaElement类型，captureStream方法在该接口上定义
      const mediaElement = videoElement as HTMLMediaElement & { 
        captureStream?: () => MediaStream; 
        mozCaptureStream?: () => MediaStream; 
        webkitCaptureStream?: () => MediaStream;
      };
      
      const stream = mediaElement.captureStream?.() || 
                    mediaElement.mozCaptureStream?.() || 
                    mediaElement.webkitCaptureStream?.();
      
      if (!stream) {
        throw new Error('Video capture stream not supported');
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/mp4; codecs=avc1',
        videoBitsPerSecond: parseInt(bitrate) * 1024 * 1024 // 将Mbps转换为bps
      });
      
      // 录制视频数据
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      // 模拟压缩进度
      const totalDuration = videoElement.duration;
      const startTime = Date.now();
      
      // 开始录制
      mediaRecorder.start();
      
      // 更新压缩进度
      const updateProgress = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
        setCompressionProgress(progress);
        
        if (mediaRecorder.state === 'recording') {
          requestAnimationFrame(updateProgress);
        }
      };
      
      // 开始更新进度
      updateProgress();
      
      // 等待录制完成
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
        
        // 视频播放结束后停止录制
        videoElement.onended = () => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        };
        
        // 设置超时，确保录制不会无限期进行
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, totalDuration * 1000 + 5000);
      });
      
      // 创建压缩后的视频Blob
      const compressedBlob = new Blob(chunks, { type: 'video/mp4' });
      
      // 创建压缩后的File对象
      const compressedFile = new File([compressedBlob], `compressed_${selectedFile.name}`, { type: 'video/mp4' });
      
      // 释放资源
      videoElement.pause();
      URL.revokeObjectURL(videoElement.src);
      
      console.log('Compression completed. Original size:', selectedFile.size, 'Compressed size:', compressedFile.size);
      
      // 上传压缩后的视频
      await handleUpload(compressedFile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '视频上传失败';
      console.error('Video compression error:', err);
      setError(`视频压缩失败: ${errorMessage}`);
      setUploadState('error');
    }
  };

  // 从视频中提取封面图
  const extractVideoPoster = async (videoElement: HTMLVideoElement): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取canvas上下文');
    }
    
    // 将视频当前帧绘制到canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // 将canvas转换为Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('无法创建封面图'));
        }
      }, 'image/jpeg', 0.8);
    });
  };

  // Upload video to Supabase Storage
  const handleUpload = async (file?: File) => {
    const uploadFile = file || selectedFile;
    if (!uploadFile) {
      setError('请选择一个视频文件');
      setUploadState('error');
      return;
    }

    // 检查文件大小，确保不超过Supabase Storage限制
    const maxUploadSizeMB = 100; // Supabase Storage默认限制是100MB
    const maxUploadSizeBytes = maxUploadSizeMB * 1024 * 1024;
    if (uploadFile.size > maxUploadSizeBytes) {
      setError(`文件大小超过限制。当前大小：${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB，最大允许：${maxUploadSizeMB} MB。请尝试更小的视频或使用视频编辑软件压缩后再上传。`);
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(0);

    try {
      // 使用与图片上传相同的路径格式，使用temp作为临时confessionId
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `temp/${Date.now()}.${fileExt}`;
      // 不要在filePath中包含bucket名称，因为from()已经指定了
      const filePath = fileName;

      // 模拟上传进度，提供用户反馈
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 10;
          if (progress >= 80) {
            clearInterval(interval);
          } else {
            setUploadProgress(progress);
          }
        }, 200);
        return interval;
      };
      
      const progressInterval = simulateProgress();
      
      // 上传视频文件
      const { error: uploadError } = await supabase.storage
        .from('confession_images')
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: `video/${fileExt}`
        });
      
      clearInterval(progressInterval);

      if (uploadError) {
        // 处理具体的上传错误
        if (uploadError.message.includes('size')) {
          throw new Error(`文件大小超过存储桶限制。请尝试更小的视频或使用视频编辑软件压缩后再上传。`);
        } else {
          throw uploadError;
        }
      }

      // 获取视频URL
      const { data: urlData } = supabase.storage
        .from('confession_images')
        .getPublicUrl(filePath);
      
      // 提取并上传视频封面图
      let posterUrl: string | undefined;
      try {
        // 创建临时视频元素来提取封面图
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        videoElement.src = URL.createObjectURL(uploadFile);
        
        await new Promise<void>((resolve) => {
          videoElement.onloadedmetadata = () => resolve();
        });
        
        // 设置视频位置到第1秒，获取一个有内容的帧作为封面
        videoElement.currentTime = 1;
        
        await new Promise<void>((resolve) => {
          videoElement.onseeked = () => resolve();
        });
        
        // 提取封面图
        const posterBlob = await extractVideoPoster(videoElement);
        const posterFileName = `temp/${Date.now()}_poster.jpg`;
        const posterFilePath = posterFileName; // 不要包含bucket名称
        
        // 模拟封面图上传进度
        setUploadProgress(85);
        
        // 上传封面图
        const { error: posterUploadError } = await supabase.storage
          .from('confession_images')
          .upload(posterFilePath, posterBlob, {
            cacheControl: '3600',
            upsert: false
          });
        
        // 设置封面图上传完成进度
        setUploadProgress(95);
        
        if (!posterUploadError) {
          const { data: posterUrlData } = supabase.storage
            .from('confession_images')
            .getPublicUrl(posterFilePath);
          posterUrl = posterUrlData.publicUrl;
        }
        
        // 释放临时URL
        URL.revokeObjectURL(videoElement.src);
      } catch (posterError) {
        console.error('Failed to extract video poster:', posterError);
        // 封面图提取失败不影响视频上传
      }

      // 设置上传完成
      setUploadProgress(100);
      
      setVideoUrl(urlData.publicUrl);
      setUploadState('success');
      if (onUploadSuccess) {
        onUploadSuccess(urlData.publicUrl, posterUrl);
      }
    } catch (err) {
      console.error('Video upload error:', JSON.stringify(err, null, 2));
      // 提供更明确的错误信息
      const errorMessage = err instanceof Error ? 
        `视频上传失败: ${err.message}。\n\n可能的原因：\n1. 存储桶策略不允许上传视频文件\n2. 文件大小超过限制\n3. 网络连接问题\n4. 文件格式不支持` : 
        '视频上传失败，请检查网络连接或文件格式';
      setError(errorMessage);
      setUploadState('error');
    }
  };

  // Reset upload state
  const resetUpload = () => {
    setUploadState('idle');
    setSelectedFile(null);
    setFileSizeMB(0);
    setCompressionProgress(0);
    setUploadProgress(0);
    setError(null);
    setVideoUrl(null);
  };

  // Render different states
  const renderState = () => {
    switch (uploadState) {
      case 'idle':
      case 'selecting':
        return (
          <div className="text-center">
            <label className="cursor-pointer inline-block">
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={handleFileChange}
              />
              <div className="glass-card rounded-2xl p-8 hover:shadow-xl transition-all duration-300">
                <div className="text-6xl mb-4">📹</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">选择视频文件</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  支持 MP4、AVI、MOV、WMV 等格式，最大 50MB
                </p>
                <div className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-all font-bold">
                  <span>浏览文件</span>
                </div>
              </div>
            </label>
          </div>
        );

      case 'checking_size':
        return (
          <div className="glass-card rounded-2xl p-8 text-center">
            <LoadingSpinner 
              type="moon" 
              size={40} 
              color="#f97316" 
              message="检测文件大小..."
              showMessage={false}
              gradient={true}
              className="mb-4"
            />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">检测文件大小...</h3>
          </div>
        );

      case 'size_exceeded':
        return (
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">文件过大</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              当前文件大小：<span className="font-bold text-red-600 dark:text-red-400">{fileSizeMB.toFixed(2)} MB</span>
              <br />
              最大允许大小：<span className="font-bold">50 MB</span>
              <br />
              超出：<span className="font-bold text-red-600 dark:text-red-400">{(fileSizeMB - 50).toFixed(2)} MB</span>
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white">压缩选项</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      分辨率
                    </label>
                    <select
                      name="resolution"
                      value={compressionOptions.resolution}
                      onChange={handleCompressionOptionChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                      <option value="480p">480p (低)</option>
                      <option value="720p">720p (中)</option>
                      <option value="1080p">1080p (高)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      比特率
                    </label>
                    <select
                      name="bitrate"
                      value={compressionOptions.bitrate}
                      onChange={handleCompressionOptionChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                      <option value="1M">1 Mbps (低)</option>
                      <option value="2M">2 Mbps (中)</option>
                      <option value="5M">5 Mbps (高)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={compressVideo}
                  className="flex-1 bg-primary-600 text-black px-6 py-3 rounded-xl border-2 border-primary-700 hover:bg-primary-700 transition-all font-bold"
                >
                  压缩后上传
                </button>
                <button
                  onClick={handleVideoUpload}
                  className="flex-1 bg-secondary-600 text-black px-6 py-3 rounded-xl border-2 border-secondary-700 hover:bg-secondary-700 transition-all font-bold"
                >
                  直接上传原视频
                </button>
                <button
                  onClick={resetUpload}
                  className="flex-1 border-2 border-gray-300 text-gray-900 dark:text-white dark:border-gray-700 px-6 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold"
                >
                  取消上传
                </button>
              </div>
            </div>
          </div>
        );

      case 'compressing':
        return (
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">视频压缩中...</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-gray-700 dark:text-gray-300">压缩进度</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">{Math.round(compressionProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="h-full rounded-full transition-all duration-300 shadow-md"
                    style={{ 
                      width: `${compressionProgress}%`,
                      background: `linear-gradient(90deg, #10b981 0%, #059669 100%)` 
                    }}
                  ></div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                正在压缩视频，请耐心等待...
              </p>
            </div>
          </div>
        );

      case 'uploading':
        return (
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">视频上传中...</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-gray-700 dark:text-gray-300">上传进度</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                  {/* 缓冲背景 */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-primary-600/30 via-primary-500/20 to-primary-600/30 animate-pulse h-4"
                  ></div>
                  {/* 实际进度条 - 使用渐变色设计 */}
                  <div 
                    className="relative h-full rounded-full transition-all duration-200 ease-out shadow-md"
                    style={{ 
                      width: `${uploadProgress}%`,
                      background: `linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)` 
                    }}
                  >
                    {/* 进度条指示器 - 增强视觉效果 */}
                    <div 
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-primary-600"
                      style={{ boxShadow: `0 0 0 2px rgba(59, 130, 246, 0.3)` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* 上传状态详情 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {uploadProgress < 80 ? '正在上传视频文件...' : '正在上传视频封面...'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">文件信息：</span>
                  {selectedFile?.name || '视频文件'}
                  <span className="mx-2">•</span>
                  {fileSizeMB.toFixed(2)} MB
                </div>
              </div>
              
              {/* 取消上传按钮 */}
              <button
                onClick={resetUpload}
                className="w-full border border-gray-300 text-gray-900 dark:text-white dark:border-gray-700 px-6 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold"
              >
                取消上传
              </button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="text-4xl">✅</div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">视频上传成功！</h3>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-8">
              <p className="max-w-md mx-auto">
                视频已成功上传到服务器，您可以继续下一步操作。
              </p>
              {selectedFile && (
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-xl inline-block">
                  <div className="text-sm font-medium">文件信息</div>
                  <div className="font-semibold">{selectedFile.name}</div>
                  <div className="text-xs mt-1">{fileSizeMB.toFixed(2)} MB</div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={resetUpload}
                className="px-8 py-3 bg-primary-600 text-black border-2 border-primary-700 rounded-xl hover:bg-primary-700 transition-all font-bold shadow-lg shadow-primary-500/20"
              >
                上传新视频
              </button>
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 border-2 border-gray-300 text-gray-900 dark:text-white dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold shadow-lg"
                >
                  查看视频
                </a>
              )}
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="text-4xl">❌</div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">上传失败</h3>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-8 max-w-md mx-auto">
              <p className="text-red-600 dark:text-red-400 font-medium whitespace-pre-line">{error || '未知错误'}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={resetUpload}
                className="px-8 py-3 bg-primary-600 text-black border-2 border-primary-700 rounded-xl hover:bg-primary-700 transition-all font-bold shadow-lg shadow-primary-500/20"
              >
                重试上传
              </button>
              <button
                onClick={resetUpload}
                className="px-8 py-3 border-2 border-gray-300 text-gray-900 dark:text-white dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold shadow-lg"
              >
                选择新文件
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">视频上传</h2>
      
      {/* Hidden video and canvas elements for compression */}
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} 
        muted 
        playsInline 
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {renderState()}
    </div>
  );
}
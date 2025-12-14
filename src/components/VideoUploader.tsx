'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import LoadingSpinner from './LoadingSpinner';
import { CustomSelect } from './CustomSelect';

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

  // 压缩选项
  const resolutionOptions = [
    { value: '480p', label: '480p (低)' },
    { value: '720p', label: '720p (中)' },
    { value: '1080p', label: '1080p (高)' }
  ];

  const bitrateOptions = [
    { value: '1M', label: '1 Mbps (低)' },
    { value: '2M', label: '2 Mbps (中)' },
    { value: '5M', label: '5 Mbps (高)' }
  ];
  
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

  // 直接上传视频，不进行压缩，避免损坏视频文件
  const handleVideoUpload = async () => {
    if (!selectedFile) return;
    
    // 直接上传原视频，不进行压缩
    await handleUpload(selectedFile);
  };

  // 视频压缩函数 - 实现真实的视频压缩功能
  const compressVideo = async () => {
    console.log('Compress button clicked, selectedFile:', selectedFile);
    if (!selectedFile) {
      console.error('No file selected for compression');
      setError('没有选择要压缩的视频文件');
      setUploadState('error');
      return;
    }

    setUploadState('compressing');
    setCompressionProgress(0);

    // 进度更新定时器
    let progressInterval: NodeJS.Timeout | undefined;

    try {
      // 模拟压缩进度
      const simulateProgress = () => {
        let progress = 0;
        progressInterval = setInterval(() => {
          if (progress < 95) {
            progress += Math.random() * 5; // 随机增加进度
          } else {
            progress = Math.min(99.9, progress + 0.5); // 接近完成时放慢进度增长
          }
          setCompressionProgress(progress);
        }, 200);
      };
      
      simulateProgress();
      
      // 记录原始文件大小
      const originalSize = selectedFile.size;
      console.log('Starting video compression. Original file size:', originalSize, 'bytes');
      
      // 使用MediaRecorder API进行真实的视频压缩
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        videoElement.src = URL.createObjectURL(selectedFile);
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        videoElement.onloadedmetadata = () => {
          try {
            // 设置视频.currentTime到0，确保从开头开始录制
            videoElement.currentTime = 0;
            
            // 创建一个canvas元素，用于绘制视频帧
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('无法获取canvas上下文');
            }
            
            // 设置canvas大小为压缩分辨率
            const resolution = compressionOptions.resolution;
            let targetWidth, targetHeight;
            if (resolution === '480p') {
              targetWidth = 640;
              targetHeight = 480;
            } else if (resolution === '720p') {
              targetWidth = 1280;
              targetHeight = 720;
            } else {
              targetWidth = 1920;
              targetHeight = 1080;
            }
            
            // 保持宽高比
            const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
            if (aspectRatio > targetWidth / targetHeight) {
              targetHeight = targetWidth / aspectRatio;
            } else {
              targetWidth = targetHeight * aspectRatio;
            }
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            // 使用MediaRecorder进行压缩录制
            const stream = canvas.captureStream(30); // 30fps
            
            // 设置比特率
            const bitrate = compressionOptions.bitrate;
            const bitrateValue = bitrate.endsWith('M') ? parseInt(bitrate) * 1000000 : parseInt(bitrate) * 1000;
            
            const recorder = new MediaRecorder(stream, {
              mimeType: 'video/webm; codecs=vp9',
              videoBitsPerSecond: bitrateValue
            });
            
            const chunks: Blob[] = [];
            
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                chunks.push(e.data);
              }
            };
            
            recorder.onstop = () => {
              const compressedBlob = new Blob(chunks, { type: 'video/webm' });
              console.log('Compression completed, compressed size:', compressedBlob.size);
              URL.revokeObjectURL(videoElement.src);
              resolve(compressedBlob);
            };
            
            recorder.onerror = (e) => {
              URL.revokeObjectURL(videoElement.src);
              reject(new Error(`视频压缩失败: ${e.error?.message || '未知错误'}`));
            };
            
            // 开始录制
            recorder.start();
            
            // 实现高效的视频处理
            const duration = videoElement.duration;
            const fps = 5; // 降低帧率，提高处理效率
            const totalFrames = Math.ceil(duration * fps);
            let processedFrames = 0;
            
            // 根据视频大小和时长动态调整超时时间
            const baseTimeout = 30000; // 基础超时时间30秒
            const sizeFactor = Math.min(3, originalSize / (10 * 1024 * 1024)); // 文件大小因子，最大3倍
            const durationFactor = Math.min(2, duration / 60); // 时长因子，最大2倍
            const dynamicTimeout = baseTimeout * sizeFactor * durationFactor;
            console.log('Dynamic compression timeout:', dynamicTimeout, 'ms');
            
            // 压缩超时定时器
            const compressionTimeout = setTimeout(() => {
              URL.revokeObjectURL(videoElement.src);
              reject(new Error('视频压缩超时，请尝试选择更小的视频文件或调整压缩参数'));
            }, dynamicTimeout);
            
            // 计算帧捕获间隔，确保捕获正确的帧数
            const frameInterval = 1000 / fps;
            
            // 更高效的帧捕获方法
            const captureFrame = () => {
              if (processedFrames >= totalFrames || videoElement.ended) {
                clearTimeout(compressionTimeout);
                recorder.stop();
                videoElement.pause();
                return;
              }
              
              // 绘制当前帧到canvas
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
              
              // 更新已处理帧数
              processedFrames++;
              
              // 使用setTimeout控制帧捕获频率，确保视频完整处理
              setTimeout(captureFrame, frameInterval);
            };
            
            // 回退的逐帧处理方法
            const fallbackDrawFrame = () => {
              if (processedFrames >= totalFrames) {
                clearTimeout(compressionTimeout);
                recorder.stop();
                return;
              }
              
              // 计算当前要处理的时间点
              const currentTime = (processedFrames / totalFrames) * duration;
              
              // 设置视频当前时间，然后等待onseeked事件触发后再绘制帧
              videoElement.currentTime = currentTime;
              
              // 等待视频定位到正确的时间点后再绘制帧
              const handleSeeked = () => {
                // 移除事件监听器，避免重复调用
                videoElement.removeEventListener('seeked', handleSeeked);
                
                // 绘制当前帧到canvas
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                // 更新已处理帧数
                processedFrames++;
                
                // 继续处理下一帧，确保所有帧都被处理
                setTimeout(fallbackDrawFrame, 50); // 适当延迟，确保视频完整处理
              };
              
              // 监听seeked事件，确保视频已经定位到正确的时间点
              videoElement.addEventListener('seeked', handleSeeked);
            };
            
            // 直接播放视频并捕获帧，提高处理效率
            videoElement.play()
              .then(() => {
                // 设置视频播放速率为1倍，确保视频完整处理
                videoElement.playbackRate = 1;
                // 开始捕获帧
                captureFrame();
              })
              .catch(error => {
                console.log('Video playback error during compression:', error);
                // 如果播放失败，使用回退的逐帧处理方法
                fallbackDrawFrame();
              });
            
          } catch (error) {
            URL.revokeObjectURL(videoElement.src);
            reject(error);
          }
        };
        
        videoElement.onerror = () => {
          URL.revokeObjectURL(videoElement.src);
          reject(new Error('视频加载失败，无法进行压缩'));
        };
      });
      
      // 清除进度定时器
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = undefined;
        console.log('Progress interval cleared');
      }
      
      // 确保进度达到100%
      setCompressionProgress(100);
      console.log('Compression progress set to 100%');
      
      // 使用setTimeout确保状态更新后再执行后续操作
      setTimeout(async () => {
        try {
          // 创建压缩后的文件
          console.log('Creating compressed file...');
          const compressedFile = new File([compressedBlob], selectedFile.name.replace(/\.[^/.]+$/, '.webm'), {
            type: 'video/webm'
          });
          console.log('Compressed file created successfully');
          
          // 记录压缩后的文件大小
          const compressedSize = compressedFile.size;
          console.log('Video compression completed successfully!');
          console.log('- Original size:', (originalSize / (1024 * 1024)).toFixed(2), 'MB');
          console.log('- Compressed size:', (compressedSize / (1024 * 1024)).toFixed(2), 'MB');
          console.log('- Compression ratio:', ((1 - compressedSize / originalSize) * 100).toFixed(2), '%');
          
          // 检查压缩后的文件大小，大于50MB则显示提示
          const maxSizeMB = 50;
          const maxSizeBytes = maxSizeMB * 1024 * 1024;
          
          // 检查压缩后的文件大小，必须在50M以内才能上传
          if (compressedSize > maxSizeBytes) {
            // 设置压缩完成但大小超限的状态
            console.log('Compressed file size exceeds limit, switching to size_exceeded state');
            setUploadState('size_exceeded');
            setFileSizeMB(compressedSize / (1024 * 1024));
            setError(`压缩完成！但文件大小为 ${(compressedSize / (1024 * 1024)).toFixed(2)} MB，超过了允许的 ${maxSizeMB} MB。请取消上传或选择更小的视频文件。`);
          } else {
            // 上传压缩后的文件
            console.log('Uploading compressed file...');
            await handleUpload(compressedFile);
            console.log('Compressed file uploaded successfully');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '处理压缩文件时发生错误';
          console.error('Error processing compressed file:', err);
          setError(`处理压缩文件时发生错误: ${errorMessage}`);
          setUploadState('error');
          setCompressionProgress(0);
        }
      }, 100); // 等待状态更新完成
    } catch (err) {
      // 处理各种类型的错误
      const errorMessage = err instanceof Error ? err.message : '视频压缩失败';
      console.error('Video compression error:', err, 'Stack:', err instanceof Error ? err.stack : 'No stack');
      
      // 清除进度定时器
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = undefined;
      }
      
      // 显示更详细的错误信息
      setError(`视频压缩失败: ${errorMessage}\n\n建议：\n1. 尝试选择更小的视频文件\n2. 调整压缩参数（降低分辨率或比特率）\n3. 检查网络连接\n4. 尝试直接上传原视频`);
      setUploadState('error');
      setCompressionProgress(0);
      
      // 记录详细的错误日志到控制台
      console.group('Compression Error Details:');
      console.log('Error:', err);
      console.log('Selected File:', selectedFile);
      console.log('Compression Options:', compressionOptions);
      console.log('File Size:', (selectedFile.size / (1024 * 1024)).toFixed(2), 'MB');
      console.groupEnd();
    } finally {
      // 确保进度定时器被清除
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = undefined;
      }
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
                    <CustomSelect
                    options={resolutionOptions}
                    value={compressionOptions.resolution}
                    onChange={(value) => handleCompressionOptionChange({ 
                      target: { name: 'resolution', value, type: 'select' } 
                    } as unknown as React.ChangeEvent<HTMLSelectElement>)} 
                  />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      比特率
                    </label>
                    <CustomSelect
                    options={bitrateOptions}
                    value={compressionOptions.bitrate}
                    onChange={(value) => handleCompressionOptionChange({ 
                      target: { name: 'bitrate', value, type: 'select' } 
                    } as unknown as React.ChangeEvent<HTMLSelectElement>)} 
                  />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={compressVideo}
                  className="flex-1 bg-primary-600 text-black px-6 py-3 rounded-xl border-2 border-primary-700 hover:bg-primary-700 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
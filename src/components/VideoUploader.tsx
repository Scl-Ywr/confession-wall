'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface VideoUploaderProps {
  onUploadSuccess?: (videoUrl: string) => void;
  user: { id: string; email?: string } | null;
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

export default function VideoUploader({ onUploadSuccess, user }: VideoUploaderProps) {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
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
    setFileSize(size);
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
  const compressVideo = async () => {
    if (!selectedFile || !videoRef.current || !canvasRef.current) return;

    setUploadState('compressing');
    setCompressionProgress(0);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas resolution based on compression options
      const resolution = compressionOptions.resolution;
      let width, height;
      switch (resolution) {
        case '480p':
          width = 854;
          height = 480;
          break;
        case '720p':
          width = 1280;
          height = 720;
          break;
        case '1080p':
          width = 1920;
          height = 1080;
          break;
        default:
          width = 1280;
          height = 720;
      }
      canvas.width = width;
      canvas.height = height;

      // Load video
      const videoUrl = URL.createObjectURL(selectedFile);
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = reject;
        video.src = videoUrl;
      });

      // Set up MediaRecorder for compression
      video.play();
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: parseInt(compressionOptions.bitrate) * 1000 * 1000
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const compressedVideoPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(compressedBlob);
        };
      });

      recorder.start();

      // Draw video frames to canvas for compression
      const duration = video.duration;
      let currentTime = 0;
      const frameRate = 30;
      const frameInterval = 1 / frameRate;

      const drawFrame = () => {
        if (currentTime >= duration) {
          recorder.stop();
          return;
        }

        video.currentTime = currentTime;
        ctx.drawImage(video, 0, 0, width, height);
        currentTime += frameInterval;
        setCompressionProgress(Math.min(100, Math.round((currentTime / duration) * 100)));
        requestAnimationFrame(drawFrame);
      };

      drawFrame();

      // Get compressed video
      const compressedBlob = await compressedVideoPromise;
      const compressedFile = new File([compressedBlob], selectedFile.name.replace(/\.[^/.]+$/, '.webm'), {
        type: 'video/webm'
      });

      // Check if compressed video is still too large
      if (compressedFile.size > maxSizeBytes) {
        throw new Error('压缩后的视频仍然超过50MB，请尝试更低的分辨率或比特率。');
      }

      setSelectedFile(compressedFile);
      setFileSize(compressedFile.size);
      setFileSizeMB((compressedFile.size / (1024 * 1024)).toFixed(2) as unknown as number);
      setCompressionProgress(100);

      // Upload compressed video
      await handleUpload(compressedFile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '视频压缩失败';
      setError(errorMessage);
      setUploadState('error');
    }
  };

  // Upload video to Supabase Storage
  const handleUpload = async (file?: File) => {
    const uploadFile = file || selectedFile;
    if (!uploadFile) {
      setError('请选择一个视频文件');
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(0);

    try {
      // 使用与图片上传相同的路径格式，使用temp作为临时confessionId
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `temp/${Date.now()}.${fileExt}`;
      const filePath = `confession_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('confession_images')
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('confession_images')
        .getPublicUrl(filePath);

      setVideoUrl(urlData.publicUrl);
      setUploadState('success');
      if (onUploadSuccess) {
        onUploadSuccess(urlData.publicUrl);
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
    setFileSize(0);
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
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
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-all font-bold"
                >
                  压缩后上传
                </button>
                <button
                  onClick={resetUpload}
                  className="flex-1 border border-gray-300 text-gray-900 dark:text-white dark:border-gray-700 px-6 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold"
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
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">压缩进度</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">{compressionProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${compressionProgress}%` }}
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
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">上传进度</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                正在上传视频，请不要关闭页面...
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">视频上传成功！</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              视频已成功上传到服务器
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={resetUpload}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold"
              >
                上传新视频
              </button>
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-gray-300 text-gray-900 dark:text-white dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold"
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
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">上传失败</h3>
            <p className="text-red-600 dark:text-red-400 mb-6">{error || '未知错误'}</p>
            <button
              onClick={resetUpload}
              className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold"
            >
              重试
            </button>
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
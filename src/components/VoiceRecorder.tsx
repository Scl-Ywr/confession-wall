'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Square, Send, Trash2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { showToast } from '@/utils/toast';
import Alert from './Alert';

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob) => Promise<void>;
  isSending?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceMessage, isSending = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // 清理函数
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // 开始录制
  const startRecording = async () => {
    try {
      // 检查浏览器是否支持MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast.error('您的浏览器不支持录音功能，请使用Chrome、Firefox或Safari浏览器');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 检查MediaRecorder支持的mimeType
      const supportedMimeTypes = [
        'audio/webm',
        'audio/ogg',
        'audio/wav',
        'audio/mp4'
      ];
      
      let selectedMimeType = supportedMimeTypes[0];
      for (const mimeType of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      // 创建MediaRecorder实例
      const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);
      startTimeRef.current = Date.now();
      
      // 确保ondataavailable事件正确触发
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // 确保至少有一个音频块
        if (audioChunksRef.current.length === 0) {
          showToast.error('录音失败，请重试');
          // 清理资源
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      };
      
      // 监听MediaRecorder的错误事件
      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        showToast.error('录音过程中发生错误，请重试');
        // 清理资源
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      // 先设置isRecording为true，确保UI状态正确
      setIsRecording(true);
      
      // 使用默认时间片（某些浏览器可能不支持自定义时间片）
      mediaRecorder.start();
      
      // 开始更新录制时长，使用独立的计时器逻辑，不依赖mediaRecorderRef
      timerRef.current = setInterval(() => {
        const currentTime = Date.now();
        const duration = Math.floor((currentTime - startTimeRef.current) / 1000);
        
        if (duration >= 60) {
          // 达到最大录制时长，自动停止录制
          stopRecording();
        } else {
          setRecordingDuration(duration);
        }
      }, 1000);
      
    } catch (error: unknown) {
      // 将unknown类型转换为DOMException以访问name属性
      const domError = error as DOMException;
      // 只在开发环境下打印错误
      if (process.env.NODE_ENV === 'development') {
        console.error('Error starting recording:', error);
      }
      
      // 处理权限错误
      if (domError.name === 'NotAllowedError') {
        // 权限被拒绝，显示自定义Alert
        setShowPermissionAlert(true);
      } else if (domError.name === 'NotFoundError') {
        showToast.error('未检测到麦克风设备');
      } else if (domError.name === 'NotReadableError') {
        showToast.error('麦克风被占用，请关闭其他占用麦克风的应用');
      } else if (domError.name === 'OverconstrainedError') {
        showToast.error('麦克风无法满足录制要求，请检查麦克风设置');
      } else if (domError.name === 'NotSupportedError') {
        showToast.error('您的浏览器不支持录音功能');
      } else {
        // 使用自定义toast提示代替alert
        showToast.error('无法访问麦克风，请检查权限设置');
      }
      
      // 确保状态正确重置
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // 停止录制
  const stopRecording = () => {
    try {
      // 停止MediaRecorder，不管isRecording状态如何，确保资源被正确释放
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping recorder:', error);
    } finally {
      // 确保状态正确更新
      setIsRecording(false);
      
      // 确保计时器被清理
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // 监听audioUrl变化，更新音频元素的src
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      // 重置audioRef，确保使用新的audioUrl
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, [audioUrl]);

  // 播放录音
  const playRecording = async () => {
    if (!audioUrl || isSending) return;
    
    try {
      if (isPlaying) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
      } else {
        // 每次播放前重新创建音频元素，确保使用最新的audioUrl
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        const newAudio = new Audio(audioUrl);
        newAudio.onended = () => setIsPlaying(false);
        audioRef.current = newAudio;
        
        await newAudio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing recording:', error);
      setIsPlaying(false);
      // 清理audioRef以确保下次可以重新创建
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      showToast.error('播放录音失败，请重试');
    }
  };

  // 重新录制
  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingDuration(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // 发送语音消息
  const handleSend = async () => {
    if (!audioBlob || isSending) return;
    
    try {
      setIsUploading(true);
      await onSendVoiceMessage(audioBlob);
      // 只有在成功发送后才重置录音
      resetRecording();
    } catch (error) {
      // 捕获并显示错误，不重置录音以便用户可以重试
      console.error('Error in handleSend:', error);
      showToast.error('发送语音消息失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  // 格式化时长显示
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理权限Alert的确认
  const handlePermissionAlertConfirm = () => {
    // 关闭Alert
    setShowPermissionAlert(false);
    // 引导用户去浏览器设置
    if (typeof navigator === 'object' && typeof navigator.permissions === 'object') {
      // 对于支持permissions API的浏览器，请求权限
      navigator.permissions.query({ name: 'microphone' }).then(permissionStatus => {
        console.log('Microphone permission status:', permissionStatus.state);
        // 权限状态变化时重新请求
        permissionStatus.addEventListener('change', () => {
          console.log('Microphone permission changed to:', permissionStatus.state);
        });
      });
    }
    // 尝试打开浏览器设置（某些浏览器支持）
    window.open('chrome://settings/content/microphone', '_blank');
  };

  return (
    <div className="voice-recorder">
      {/* 录制控制 */}
      {!audioUrl ? (
        <div className="flex items-center gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSending}
            className={`p-3 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'} text-white transition-colors duration-200 min-w-12 min-h-12 flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={isRecording ? '停止录制' : '开始录制'}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-red-500">
                {formatDuration(recordingDuration)}
              </div>
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          {/* 播放控制 */}
          <button
            onClick={playRecording}
            disabled={isSending || isUploading}
            className={`p-2 rounded-full ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'} text-white transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={isPlaying ? '停止播放' : '播放录音'}
          >
            {isPlaying ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          
          {/* 录音时长 */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDuration(recordingDuration)}
          </div>
          
          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={isSending || isUploading}
            className={`ml-auto p-2 rounded-full ${isUploading ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'} text-white transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="发送语音消息"
          >
            {isUploading ? (
              <LoadingSpinner type="bar" size={16} color="white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
          
          {/* 重新录制按钮 */}
          <button
            onClick={resetRecording}
            disabled={isSending || isUploading}
            className="p-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="重新录制"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} />
      
      {/* 自定义权限Alert */}
      <Alert
        isOpen={showPermissionAlert}
        onClose={() => setShowPermissionAlert(false)}
        onConfirm={handlePermissionAlertConfirm}
        title="麦克风权限"
        message="无法访问麦克风，请允许授予麦克风权限。是否去浏览器设置中修改？"
        confirmText="去设置"
        cancelText="取消"
      />
    </div>
  );
};

export default VoiceRecorder;

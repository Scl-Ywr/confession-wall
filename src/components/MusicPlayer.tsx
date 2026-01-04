'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion} from 'framer-motion';
import Image from 'next/image';
import { Volume2, VolumeX, Pause, Play, Music, ChevronUp, ChevronDown, Search, X, GripVertical, SkipBack, SkipForward, Settings } from 'lucide-react';
import { musicService, MusicSearchItem, MusicSource, ALL_MUSIC_SOURCES } from '@/services/musicService';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  src: string;
  source?: string;
  album: string;
  coverUrl: string;
  lyric: string;
  tlyric?: string;
}

interface MusicPlayerProps {
  // 可以在这里添加从父组件传递的props
  className?: string;
}

const MusicPlayer: React.FC<MusicPlayerProps> = () => {
  // 初始为空的播放列表
  const [tracks, setTracks] = useState<MusicTrack[]>([]);

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<MusicSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState<string | null>(null); // 记录正在添加的歌曲ID

  // 音乐源选择相关状态
  const [selectedSources, setSelectedSources] = useState<MusicSource[]>(['netease']); // 默认选择网易云音乐
  const [showSourceSettings, setShowSourceSettings] = useState(false); // 是否显示音乐源设置面板
  const [searchMode, setSearchMode] = useState<'single' | 'multiple'>('single'); // 搜索模式：单源或多源

  // 状态管理 - 使用静态默认值，避免在服务器渲染时依赖客户端API
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showTrackList, setShowTrackList] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.5);
  const [isVisible, setIsVisible] = useState(false); // 默认隐藏
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  // 从localStorage加载状态 - 在客户端水合后执行
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // 检查是否为移动端设备
        const isMobile = window.innerWidth < 768;
        const saved = localStorage.getItem('musicPlayer');
        if (saved) {
          const parsed = JSON.parse(saved);
          
          // 只有在移动端时重置位置，避免hydration不匹配
          const position = isMobile ? { x: 0, y: 0 } : (parsed.buttonPosition || { x: 0, y: 0 });
          const playerPos = isMobile ? { x: 0, y: 0 } : (parsed.playerPosition || { x: 0, y: 0 });
          
          // 更新状态
          setIsPlaying(parsed.isPlaying || false);
          setCurrentTrackIndex(parsed.currentTrackIndex || 0);
          setVolume(parsed.volume || 0.5);
          setIsMuted(parsed.isMuted || false);
          setPrevVolume(parsed.prevVolume || 0.5);
          setIsVisible(parsed.isVisible !== undefined ? parsed.isVisible : false);
          setHasPlayed(parsed.hasPlayed || false);
          setButtonPosition(position);
          setPlayerPosition(playerPos);
        }
      } catch (e) {
        console.error('Failed to parse music player state:', e);
      }
    }
  }, []);

  // 移除了复杂的 motion values 实现，使用更简单的状态管理方式

  // 获取窗口尺寸
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // 初始设置
    updateWindowSize();

    // 监听窗口大小变化
    window.addEventListener('resize', updateWindowSize);

    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);
  // 进度条相关状态
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isSeekingRef = useRef(false); // 用于在事件处理函数中访问最新值
  
  // 歌词相关状态
  const [lyrics, setLyrics] = useState<Array<{time: number, text: string}>>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const lyricContainerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef(lyrics); // 使用ref存储最新的歌词数组
  
  // 监听歌词变化，更新ref值
  useEffect(() => {
    lyricsRef.current = lyrics;
  }, [lyrics]);
  
  // 解析LRC格式歌词
  const parseLyric = (lrcText: string): Array<{time: number, text: string}> => {
    if (!lrcText) return [];
    
    const lines = lrcText.split('\n');
    const result: Array<{time: number, text: string}> = [];
    
    // 正则表达式匹配时间标签和歌词内容
    const lyricRegex = /\[([\d:.]+)\](.*)/;
    
    for (const line of lines) {
      const match = line.match(lyricRegex);
      if (match && match[1] && match[2]) {
        // 解析时间标签
        const timeParts = match[1].split(':');
        const minutes = parseInt(timeParts[0]);
        const seconds = parseFloat(timeParts[1]);
        const time = minutes * 60 + seconds;
        
        // 解析歌词内容
        const text = match[2].trim();
        if (text) {
          result.push({time, text});
        }
      }
    }
    
    // 按时间排序
    return result.sort((a, b) => a.time - b.time);
  };
  
  // 监听当前播放时间，同步歌词
  useEffect(() => {
    const currentLyrics = lyricsRef.current;
    if (currentLyrics.length === 0) return;
    
    // 找到当前时间对应的歌词索引
    const index = currentLyrics.findIndex(lyric => lyric.time > currentTime) - 1;
    if (index >= 0 && index < currentLyrics.length && index !== currentLyricIndex) {
      setCurrentLyricIndex(index);
      
      // 平滑滚动到当前歌词行
      if (lyricContainerRef.current) {
        const containerHeight = lyricContainerRef.current.clientHeight;
        // 使用响应式行高
        const lineHeight = windowSize.width < 768 ? 28 : 24;
        // 计算滚动位置，确保当前歌词居中显示
        const scrollPosition = Math.max(0, index * lineHeight - containerHeight / 2 + lineHeight / 2);
        
        lyricContainerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, currentLyricIndex, windowSize]); // 依赖项数组大小稳定，不再依赖整个lyrics数组
  
  // 监听当前曲目变化，更新歌词
  useEffect(() => {
    if (tracks.length === 0 || currentTrackIndex >= tracks.length) {
      setLyrics([]);
      setCurrentLyricIndex(0);
      return;
    }
    
    const track = tracks[currentTrackIndex];
    // 解析歌词
    const parsedLyrics = parseLyric(track.lyric || '');
    setLyrics(parsedLyrics);
    setCurrentLyricIndex(0);
    
    // 重置滚动位置
    if (lyricContainerRef.current) {
      lyricContainerRef.current.scrollTop = 0;
    }
  }, [currentTrackIndex, tracks]);

  // 音频元素引用
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 保存状态到localStorage - 使用useCallback确保引用稳定
  const saveStateToLocalStorage = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicPlayer', JSON.stringify({
        isPlaying,
        currentTrackIndex,
        volume,
        isMuted,
        prevVolume,
        isVisible,
        hasPlayed,
        buttonPosition,
        playerPosition
      }));
    }
  }, [isPlaying, currentTrackIndex, volume, isMuted, prevVolume, isVisible, hasPlayed, buttonPosition, playerPosition]);

  // 初始化音频元素 - 使用useEffect处理组件挂载和卸载
  // 注意：这个useEffect已经被监听当前曲目变化的useEffect替代，所以我们可以简化它
  useEffect(() => {
    // 组件卸载时的清理
    return () => {
      // 清理函数，确保组件卸载时停止播放
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', () => {});
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.removeEventListener('canplaythrough', () => {});
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // 监听音量变化 - 直接更新音频音量，不需要保存到localStorage
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // 定期保存状态到localStorage（避免频繁保存）
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      saveStateToLocalStorage();
    }, 1000); // 延迟1秒保存

    return () => clearTimeout(saveTimer);
  }, [isPlaying, currentTrackIndex, volume, isMuted, prevVolume, isVisible, hasPlayed, buttonPosition, playerPosition, saveStateToLocalStorage]);

  // 获取当前曲目ID，用于useEffect依赖
  const currentTrackId = React.useMemo(() => {
    if (tracks.length === 0 || currentTrackIndex >= tracks.length) return '';
    return tracks[currentTrackIndex].id;
  }, [tracks, currentTrackIndex]);

  // 确保currentTrackIndex始终在有效范围内
  useEffect(() => {
    if (tracks.length > 0 && currentTrackIndex >= tracks.length) {
      setCurrentTrackIndex(tracks.length - 1);
    }
  }, [tracks.length, currentTrackIndex]);

  // 播放下一首 - 使用useCallback确保引用稳定
  const handleNextTrack = React.useCallback(() => {
    if (tracks.length > 0) {
      setCurrentTrackIndex((prev: number) => (prev + 1) % tracks.length);
    }
  }, [tracks.length]);

  // 播放上一首 - 使用useCallback确保引用稳定
  const handlePrevTrack = React.useCallback(() => {
    if (tracks.length > 0) {
      setCurrentTrackIndex((prev: number) => (prev - 1 + tracks.length) % tracks.length);
    }
  }, [tracks.length]);

  // 处理进度条拖动
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // 阻止事件冒泡，防止触发父容器拖拽
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    // 实时更新音频播放位置
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // 处理进度条开始拖动
  const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，防止触发父容器拖拽
    isSeekingRef.current = true;
  };

  // 处理进度条结束拖动
  const handleSeekEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
    }
    isSeekingRef.current = false;
  };

  // 监听当前曲目变化
  useEffect(() => {
    if (tracks.length === 0 || currentTrackIndex >= tracks.length) return;

    // 创建新的音频实例，而不是修改现有实例的src
    const newAudio = new Audio(tracks[currentTrackIndex].src);
    newAudio.volume = volume;

    // 重置进度
    setCurrentTime(0);
    setDuration(0);

    const wasPlaying = isPlaying;

    // 监听音频时间更新
    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(newAudio.currentTime);
        setDuration(newAudio.duration);
      }
    };
    
    // 监听音频元数据加载完成
    const handleLoadedMetadata = () => {
      setDuration(newAudio.duration);
    };
    
    // 监听音频数据加载完成
    const handleLoadedData = () => {
      setDuration(newAudio.duration);
    };
    
    // 监听播放结束
    const handleEnded = () => {
      // 播放下一首
      handleNextTrack();
    };
    
    // 监听canplaythrough事件，确保音频可以播放
    const handleCanPlayThrough = () => {
      if (wasPlaying) {
        newAudio.play().catch(error => {
          console.error('播放失败:', error);
          setIsPlaying(false);
        });
      }
    };
    
    newAudio.addEventListener('timeupdate', handleTimeUpdate);
    newAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    newAudio.addEventListener('loadeddata', handleLoadedData);
    newAudio.addEventListener('ended', handleEnded);
    newAudio.addEventListener('canplaythrough', handleCanPlayThrough);

    // 替换旧的音频实例
    const oldAudio = audioRef.current;
    audioRef.current = newAudio;

    // 清理旧的音频实例
    if (oldAudio) {
      oldAudio.pause();
      oldAudio.removeEventListener('timeupdate', handleTimeUpdate);
      oldAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      oldAudio.removeEventListener('loadeddata', handleLoadedData);
      oldAudio.removeEventListener('ended', handleEnded);
      oldAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
      oldAudio.src = '';
    }
    
    // 清理事件监听器
    return () => {
      newAudio.pause();
      newAudio.removeEventListener('timeupdate', handleTimeUpdate);
      newAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      newAudio.removeEventListener('loadeddata', handleLoadedData);
      newAudio.removeEventListener('ended', handleEnded);
      newAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
      newAudio.src = '';
      if (audioRef.current === newAudio) {
        audioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex, tracks.length, currentTrackId]);

  // 从播放列表中删除歌曲
  const removeFromPlaylist = (index: number) => {
    const newTracks = [...tracks];
    newTracks.splice(index, 1);
    setTracks(newTracks);
    
    // 如果删除的是当前播放的歌曲，需要处理
    if (index === currentTrackIndex) {
      if (newTracks.length > 0) {
        // 如果还有歌曲，播放下一首
        setCurrentTrackIndex((prev: number) => prev % newTracks.length);
      } else {
        // 如果没有歌曲了，停止播放
        setIsPlaying(false);
      }
    } else if (index < currentTrackIndex) {
      // 如果删除的是当前播放歌曲之前的歌曲，调整索引
      setCurrentTrackIndex((prev: number) => prev - 1);
    }
  };

  // 播放/暂停切换
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      // 暂停时保持hasPlayed为true，避免播放组件关闭
    } else {
      // 检查音频是否可以播放
      if (audioRef.current.readyState >= audioRef.current.HAVE_FUTURE_DATA) {
        // 如果音频已经准备好，直接播放
        audioRef.current.play().catch(error => {
          console.error('播放失败:', error);
          setIsPlaying(false);
        });
        setIsPlaying(true);
        setHasPlayed(true);
      } else {
        // 如果音频还没准备好，等待canplaythrough事件
        const handleCanPlayThrough = () => {
          audioRef.current?.play().catch(error => {
            console.error('播放失败:', error);
            setIsPlaying(false);
          });
          setIsPlaying(true);
          setHasPlayed(true);
          // 移除事件监听器
          audioRef.current?.removeEventListener('canplaythrough', handleCanPlayThrough);
        };
        
        // 添加事件监听器
        audioRef.current.addEventListener('canplaythrough', handleCanPlayThrough);
      }
    }
  };

  // 切换静音
  const toggleMute = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      // 取消静音，恢复之前的音量
      const restoredVolume = prevVolume || 0.5;
      setVolume(restoredVolume);
      setIsMuted(false);
      if (audioRef.current) {
        audioRef.current.volume = restoredVolume;
      }
    } else {
      // 静音，保存当前音量
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    }
  };

  // 调整音量
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    // 实时更新音频音量
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    } else if (newVolume === 0 && !isMuted) {
      setIsMuted(true);
    }
  };

  // 选择曲目
  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    if (isPlaying) {
      // 如果当前正在播放，切换曲目后继续播放
      audioRef.current?.play().catch(error => {
        console.error('播放失败:', error);
        setIsPlaying(false);
      });
    }
  };

  // 格式化时间 - 使用useCallback确保引用稳定
  const formatTime = React.useCallback((seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 切换曲目列表显示 - 使用useCallback确保引用稳定
  const toggleTrackList = React.useCallback(() => {
    setShowTrackList(prev => !prev);
    // 关闭搜索结果
    setShowSearchResults(false);
  }, []);

  // 音乐源中文名称映射
  const musicSourceNames: Record<MusicSource, string> = {
    netease: '网易云',
    kuwo: '酷我',
    joox: 'Joox',
    tencent: 'QQ音乐',
    tidal: 'Tidal',
    spotify: 'Spotify',
    ytmusic: 'YouTube',
    qobuz: 'Qobuz',
    deezer: 'Deezer',
    migu: '咪咕',
    kugou: '酷狗',
    ximalaya: '喜马拉雅',
    apple: 'Apple Music'
  };

  // 切换音乐源选择 - 使用useCallback确保引用稳定
  const toggleSource = React.useCallback((source: MusicSource) => {
    if (searchMode === 'single') {
      // 单选模式：只能选择一个音乐源
      setSelectedSources([source]);
    } else {
      // 多选模式：可以选择多个音乐源
      setSelectedSources(prev => {
        if (prev.includes(source)) {
          // 如果已选中，则取消选择（但至少保留一个）
          return prev.length > 1 ? prev.filter(s => s !== source) : prev;
        } else {
          // 如果未选中，则添加
          return [...prev, source];
        }
      });
    }
  }, [searchMode]);

  // 切换搜索模式 - 使用useCallback确保引用稳定
  const toggleSearchMode = React.useCallback(() => {
    setSearchMode(prev => {
      const newMode = prev === 'single' ? 'multiple' : 'single';
      if (newMode === 'single' && selectedSources.length > 1) {
        // 切换到单选模式时，只保留第一个选中的音乐源
        setSelectedSources([selectedSources[0]]);
      }
      return newMode;
    });
  }, [selectedSources]);

  // 搜索音乐 - 使用useCallback确保引用稳定
  const handleSearch = React.useCallback(async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);

      // 根据搜索模式和选中的音乐源数量进行搜索
      let results: MusicSearchItem[];

      if (searchMode === 'multiple' || selectedSources.length > 1) {
        // 多源搜索
        musicService.setSources(selectedSources);
        results = await musicService.searchMultiple(searchKeyword.trim());
      } else {
        // 单源搜索
        musicService.setSource(selectedSources[0]);
        results = await musicService.search(searchKeyword.trim());
      }

      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('搜索音乐失败:', error);
      // 搜索失败时保持原有结果
    } finally {
      setIsSearching(false);
    }
  }, [searchKeyword, searchMode, selectedSources]);

  // 添加搜索结果到播放列表 - 使用useCallback确保引用稳定
  const addToPlaylist = React.useCallback(async (item: MusicSearchItem) => {
    // 防止重复添加
    if (isAddingToPlaylist === item.id) return;

    try {
      setIsAddingToPlaylist(item.id);

      // 第一步：先获取音乐URL（最关键的）
      const musicUrl = await musicService.getUrl(item.id, 320, item.source);

      if (!musicUrl.url) {
        console.error('添加到播放列表失败: 无法获取音乐URL');
        alert('无法获取音乐播放链接，请尝试其他歌曲');
        setIsAddingToPlaylist(null);
        return;
      }

      // 第二步：立即创建曲目并添加到播放列表（使用临时封面和空歌词）
      const tempTrack: MusicTrack = {
        id: item.id,
        title: item.name,
        artist: item.artist.join(', '),
        src: musicUrl.url,
        source: item.source,
        album: item.album,
        coverUrl: 'https://via.placeholder.com/500x500?text=Loading...', // 临时封面
        lyric: '', // 临时空歌词
        tlyric: undefined
      };

      // 添加到播放列表并立即开始播放
      setTracks(prev => {
        const newTracks = [...prev, tempTrack];
        setCurrentTrackIndex(newTracks.length - 1);
        setIsPlaying(true);
        setHasPlayed(true); // 确保播放组件显示
        return newTracks;
      });

      // 关闭搜索结果
      setShowSearchResults(false);
      setSearchKeyword('');
      setIsAddingToPlaylist(null);

      // 第三步：在后台异步获取歌词和封面图片
      Promise.allSettled([
        musicService.getLyric(item.id, item.source),
        musicService.getAlbumPic(item.pic_id, 500, item.source)
      ]).then(results => {
        const lyricData = results[0].status === 'fulfilled' ? results[0].value : { lyric: '', tlyric: undefined };
        const picData = results[1].status === 'fulfilled' ? results[1].value : { url: 'https://via.placeholder.com/500x500?text=No+Cover' };

        // 更新曲目信息
        setTracks(prevTracks => {
          return prevTracks.map(track => {
            if (track.id === item.id) {
              return {
                ...track,
                coverUrl: picData.url,
                lyric: lyricData.lyric,
                tlyric: lyricData.tlyric
              };
            }
            return track;
          });
        });
      }).catch(error => {
        console.error('获取歌词或封面失败:', error);
        // 不影响播放，只是没有歌词或封面
      });

    } catch (error) {
      console.error('添加到播放列表失败:', error);
      alert('添加歌曲失败，请稍后重试');
      setIsAddingToPlaylist(null);
    }
  }, [isAddingToPlaylist]);

  // 处理搜索输入变化 - 使用useCallback确保引用稳定
  const handleSearchInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  }, []);

  // 处理搜索提交 - 使用useCallback确保引用稳定
  const handleSearchSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  }, [handleSearch]);

  // 清除搜索 - 使用useCallback确保引用稳定
  const clearSearch = React.useCallback(() => {
    setSearchKeyword('');
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  return (
    <>
      {/* 显示/隐藏切换按钮 - 始终可见，位于最上层 */}
      <button
        onClick={() => {
          setIsVisible(!isVisible);
          setShowSearchBox(!isVisible);
        }}
        aria-label={isVisible ? '隐藏音乐播放器' : '显示音乐播放器'}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, #f87a43, #e66330)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(248, 122, 67, 0.3), 0 16px 32px rgba(0, 0, 0, 0.15)',
          fontSize: '24px',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 1,
          visibility: 'visible',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'none',
          outline: 'none',
          // 确保点击区域不小于44×44px
          minWidth: '60px',
          minHeight: '60px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(248, 122, 67, 0.4), 0 20px 40px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(248, 122, 67, 0.3), 0 16px 32px rgba(0, 0, 0, 0.15)';
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(248, 122, 67, 0.5)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(248, 122, 67, 0.3), 0 16px 32px rgba(0, 0, 0, 0.15)';
        }}
      >
        <Music size={30} />
      </button>

      {/* 音乐播放器主体 - 可拖拽容器 */}
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed z-50"
          style={{
            bottom: windowSize.width < 768 ? '90px' : '20px', // 移动端时，将播放器主体放在音乐按钮上方（音乐按钮高度60px + 间距10px = 70px，再加20px额外间距）
            right: windowSize.width < 768 ? '16px' : '100px',
            left: windowSize.width < 768 ? '16px' : 'auto',
            x: windowSize.width < 768 ? 0 : playerPosition.x,
            y: windowSize.width < 768 ? 0 : playerPosition.y,
            width: windowSize.width < 768 ? 'calc(100vw - 32px)' : 'auto',
            cursor: windowSize.width >= 768 ? 'grab' : 'default',
            borderRadius: windowSize.width < 768 ? '24px' : '16px',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)'
          }}
          drag={windowSize.width >= 768}
          dragConstraints={windowSize.width >= 768 ? {
            top: -windowSize.height + 100,
            left: -windowSize.width + 50,
            right: windowSize.width - 350,
            bottom: windowSize.height - 100
          } : {}}
          dragElastic={0}
          dragMomentum={false}
          whileTap={{ cursor: 'grabbing' }}
          onDragEnd={(_event, info) => {
            if (windowSize.width >= 768) {
              setPlayerPosition({
                x: info.offset.x,
                y: info.offset.y
              });
            }
          }}
        >
          {/* 拖拽手柄 - 提示用户可以拖拽整个组件（仅桌面端显示） */}
          {windowSize.width >= 768 && (
            <motion.div
              className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing bg-opacity-50 rounded-t-lg"
              style={{
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-surface)'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95, cursor: 'grabbing' }}
            >
              <GripVertical size={20} />
            </motion.div>
          )}
          {/* 搜索输入框 - 只有当showSearchBox为true时显示 */}
          {showSearchBox && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="shadow-lg border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)',
                minWidth: '320px',
                borderBottom: 'none',
                borderTopLeftRadius: windowSize.width < 768 ? '24px' : '16px',
                borderTopRightRadius: windowSize.width < 768 ? '24px' : '16px',
                width: windowSize.width < 768 ? '100%' : 'auto'
              }}
              onPointerDown={(e) => e.stopPropagation()} // 阻止拖拽
              onMouseDown={(e) => e.stopPropagation()} // 阻止拖拽
              onTouchStart={(e) => e.stopPropagation()} // 阻止拖拽
            >
              {/* 搜索框 */}
              <div className="p-3">
                <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 flex-1 flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <input
                      type="text"
                      placeholder="搜索音乐..."
                      value={searchKeyword}
                      onChange={handleSearchInputChange}
                      onFocus={() => searchKeyword && setShowSearchResults(true)}
                      className="w-full pl-12 pr-12 py-3 rounded-full border focus:outline-none input-focus-ring"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderColor: 'rgba(248, 122, 67, 0.3)',
                        color: 'var(--color-text)',
                        fontSize: windowSize.width < 768 ? '16px' : '14px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 8px rgba(248, 122, 67, 0.1)',
                        // 确保触控区域大小
                        minHeight: '48px'
                      }}
                    />
                    <Search size={windowSize.width < 768 ? 20 : 16} className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: '#f87a43' }} />
                    {searchKeyword && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:text-red-500 transition-colors"
                        style={{ 
                          color: 'var(--color-text-secondary)',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center' 
                        }}
                      >
                        <X size={windowSize.width < 768 ? 20 : 16} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: 'linear-gradient(180deg, #f87a43, #e66330)',
                        color: '#ffffff',
                        opacity: isSearching ? 0.7 : 1,
                        cursor: isSearching ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 8px rgba(248, 122, 67, 0.3)',
                        // 确保触控区域大小
                        minWidth: '48px',
                        minHeight: '48px'
                      }}
                    >
                      {isSearching ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Search size={windowSize.width < 768 ? 20 : 16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSourceSettings(!showSourceSettings)}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: showSourceSettings ? '#f87a43' : 'var(--color-surface)',
                        color: showSourceSettings ? '#ffffff' : 'var(--color-text-secondary)',
                        border: `1px solid ${showSourceSettings ? '#f87a43' : 'var(--color-border)'}`,
                        boxShadow: showSourceSettings ? '0 4px 8px rgba(248, 122, 67, 0.3)' : 'none',
                        // 确保触控区域大小
                        minWidth: '48px',
                        minHeight: '48px'
                      }}
                      title="音乐源设置"
                    >
                      <Settings size={windowSize.width < 768 ? 20 : 16} />
                    </button>
                  </div>
                </form>
              </div>

              {/* 音乐源设置面板 */}
              {showSourceSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 pb-3 border-t overflow-y-auto"
                  style={{
                    borderColor: 'var(--color-border)',
                    maxHeight: windowSize.width < 768 ? '320px' : '250px',
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  {/* 搜索模式切换 */}
                  <div className="flex items-center justify-between py-3 sticky top-0 z-10" style={{ backgroundColor: 'var(--color-surface)' }}>
                    <span className={windowSize.width < 768 ? "text-base font-medium" : "text-sm"} style={{ color: 'var(--color-text)' }}>搜索模式:</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={toggleSearchMode}
                        className={windowSize.width < 768 ? "px-5 py-3 rounded-full text-sm font-medium transition-all" : "px-3 py-1 rounded-full text-xs transition-colors"}
                        style={{
                          backgroundColor: searchMode === 'single' ? '#f87a43' : 'var(--color-surface)',
                          color: searchMode === 'single' ? '#ffffff' : 'var(--color-text-secondary)',
                          border: `1px solid ${searchMode === 'single' ? '#f87a43' : 'var(--color-border)'}`,
                          boxShadow: searchMode === 'single' ? '0 4px 8px rgba(248, 122, 67, 0.3)' : 'none',
                          // 确保触控区域大小
                          minWidth: '80px',
                          minHeight: '44px'
                        }}
                      >
                        单源
                      </button>
                      <button
                        onClick={toggleSearchMode}
                        className={windowSize.width < 768 ? "px-5 py-3 rounded-full text-sm font-medium transition-all" : "px-3 py-1 rounded-full text-xs transition-colors"}
                        style={{
                          backgroundColor: searchMode === 'multiple' ? '#f87a43' : 'var(--color-surface)',
                          color: searchMode === 'multiple' ? '#ffffff' : 'var(--color-text-secondary)',
                          border: `1px solid ${searchMode === 'multiple' ? '#f87a43' : 'var(--color-border)'}`,
                          boxShadow: searchMode === 'multiple' ? '0 4px 8px rgba(248, 122, 67, 0.3)' : 'none',
                          // 确保触控区域大小
                          minWidth: '80px',
                          minHeight: '44px'
                        }}
                      >
                        多源
                      </button>
                    </div>
                  </div>

                  {/* 音乐源选择 */}
                  <div className={windowSize.width < 768 ? "text-base mb-3 font-medium" : "text-sm mb-2"} style={{ color: 'var(--color-text-secondary)' }}>
                    {searchMode === 'single' ? '选择一个音乐源:' : '选择多个音乐源:'}
                  </div>
                  <div className={windowSize.width < 768 ? "grid grid-cols-2 gap-3 pb-3" : "grid grid-cols-3 gap-2 pb-2"}>
                    {ALL_MUSIC_SOURCES.map((source: MusicSource) => (
                      <button
                        key={source}
                        onClick={() => toggleSource(source)}
                        className={windowSize.width < 768 ? "px-4 py-3 rounded-lg text-sm transition-all font-medium" : "px-2 py-1 rounded text-xs transition-all"}
                        style={{
                          backgroundColor: selectedSources.includes(source) ? '#f87a43' : 'var(--color-surface)',
                          color: selectedSources.includes(source) ? '#ffffff' : 'var(--color-text-secondary)',
                          border: `1px solid ${selectedSources.includes(source) ? '#f87a43' : 'var(--color-border)'}`,
                          opacity: selectedSources.includes(source) ? 1 : 0.7,
                          boxShadow: selectedSources.includes(source) ? '0 4px 8px rgba(248, 122, 67, 0.2)' : 'none',
                          // 确保触控区域大小
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {musicSourceNames[source]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 播放控制区域 - 只有当有曲目且（正在播放或已经播放过）时显示 */}
          {tracks.length > 0 && (isPlaying || hasPlayed) && (
            <div>
              {/* 进度条 - 当有曲目且（正在播放或已经播放过）时显示 */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
                className="p-3 border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  boxShadow: windowSize.width < 768 ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'var(--effect-shadow)',
                  minWidth: '320px',
                  touchAction: 'none',
                  borderTopLeftRadius: windowSize.width < 768 ? '24px' : '16px',
                  borderTopRightRadius: windowSize.width < 768 ? '24px' : '16px'
                }}
                onPointerDownCapture={(e) => e.stopPropagation()}
                onMouseDownCapture={(e) => e.stopPropagation()}
                onTouchStartCapture={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="relative w-full" style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="0"
                    max={duration || 1}
                    value={currentTime}
                    onChange={handleSeek}
                    onMouseDown={(e) => { e.stopPropagation(); handleSeekStart(e); }}
                    onMouseUp={(e) => { e.stopPropagation(); handleSeekEnd(e); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleSeekStart(e); }}
                    onTouchEnd={(e) => { e.stopPropagation(); handleSeekEnd(e); }}
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onPointerMoveCapture={(e) => e.stopPropagation()}
                    onPointerUpCapture={(e) => e.stopPropagation()}
                    className="w-full h-4 rounded-full appearance-none cursor-pointer transition-all duration-200"
                    style={{
                      WebkitAppearance: 'none',
                      backgroundColor: 'rgba(248, 122, 67, 0.2)',
                      outline: 'none',
                      touchAction: 'none',
                      // 确保触控区域大小
                      minHeight: '40px',
                      width: '100%'
                    }}
                  />
                </div>
              </motion.div>

              {/* 播放控制区域 - 包含封面、歌词和控制按钮 */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.2, ease: 'easeOut' }}
                className="rounded-b-xl shadow-lg p-4 border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  boxShadow: windowSize.width < 768 ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'var(--effect-shadow)',
                  minWidth: '320px',
                  borderBottomLeftRadius: windowSize.width < 768 ? '24px' : '16px',
                  borderBottomRightRadius: windowSize.width < 768 ? '24px' : '16px'
                }}
                onPointerDown={(e) => e.stopPropagation()} // 阻止拖拽
                onMouseDown={(e) => e.stopPropagation()} // 阻止拖拽
                onTouchStart={(e) => e.stopPropagation()} // 阻止拖拽
              >
                {/* 封面图片和歌曲信息 */}
                {tracks.length > 0 && currentTrackIndex < tracks.length && (
                  <div className={windowSize.width < 768 ? "flex items-start space-x-4 mb-5" : "flex items-start space-x-4 mb-4"}>
                    {/* 封面图片 - 添加旋转动画和双击播放/暂停 */}
                    <motion.div
                      className={windowSize.width < 768 ? "w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 relative shadow-xl" : "w-20 h-20 rounded-md overflow-hidden flex-shrink-0 relative shadow-lg"}
                      style={{
                        borderRadius: windowSize.width < 768 ? '16px' : '12px',
                        boxShadow: windowSize.width < 768 ? '0 12px 32px rgba(248, 122, 67, 0.3)' : '0 8px 24px rgba(248, 122, 67, 0.25)'
                      }}
                      animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear',
                        repeatType: 'loop'
                      }}
                      whileHover={windowSize.width >= 768 ? { scale: 1.05 } : {}}
                      whileTap={windowSize.width >= 768 ? { scale: 0.95 } : {}}
                      onDoubleClick={togglePlayPause}
                      aria-label="双击播放/暂停"
                    >
                      <Image
                        src={tracks[currentTrackIndex].coverUrl || `https://via.placeholder.com/${windowSize.width < 768 ? '280x280' : '200x200'}?text=No+Cover`}
                        alt={tracks[currentTrackIndex].title}
                        fill
                        className="object-cover"
                        priority
                        quality={80}
                      />
                    </motion.div>

                    {/* 歌曲信息和歌词 - 添加滑动切换歌曲手势 */}
                    <motion.div 
                      className="flex-1 min-w-0"
                      drag="x"
                      dragConstraints={{
                        left: 0,
                        right: 0
                      }}
                      dragElastic={0.3}
                      onDragEnd={(event, info) => {
                        // 左右滑动切换歌曲
                        if (Math.abs(info.velocity.x) > 0.5) {
                          if (info.velocity.x > 0) {
                            // 向右滑动，播放上一曲
                            handlePrevTrack();
                          } else {
                            // 向左滑动，播放下一曲
                            handleNextTrack();
                          }
                        }
                      }}
                    >
                      {/* 歌曲标题和歌手 */}
                      <div className={windowSize.width < 768 ? "text-lg font-bold truncate" : "text-sm font-medium truncate"} style={{ color: 'var(--color-text)' }}>
                        {tracks[currentTrackIndex].title}
                      </div>
                      <div className={windowSize.width < 768 ? "text-base truncate mt-1" : "text-xs truncate"} style={{ color: 'var(--color-text-secondary)' }}>
                        {tracks[currentTrackIndex].artist}
                      </div>

                      {/* 歌词显示区域 - 固定显示10行 */}
                      <div
                        ref={lyricContainerRef}
                        className={windowSize.width < 768 ? "mt-4 h-[220px] overflow-y-auto overflow-x-hidden" : "mt-2 h-[240px] overflow-y-auto overflow-x-hidden"}
                        style={{
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                          scrollbarGutter: 'stable',
                          borderRadius: '8px',
                          padding: windowSize.width < 768 ? '12px' : '8px',
                          backgroundColor: windowSize.width < 768 ? 'rgba(248, 122, 67, 0.05)' : 'transparent'
                        }}
                      >
                        <div className={windowSize.width < 768 ? "text-base text-center space-y-3 px-2" : "text-sm text-center space-y-2 px-4"}>
                          {lyrics.length > 0 ? (
                            lyrics.map((lyric, index) => (
                              <div
                                key={index}
                                onClick={() => {
                                  // 点击歌词跳转到对应时间
                                  if (audioRef.current) {
                                    audioRef.current.currentTime = lyric.time;
                                    setCurrentTime(lyric.time);
                                  }
                                  setCurrentLyricIndex(index);

                                  // 立即滚动到当前歌词，确保居中显示
                                  if (lyricContainerRef.current) {
                                    const containerHeight = lyricContainerRef.current.clientHeight;
                                    const lineHeight = windowSize.width < 768 ? 32 : 24; // 移动端行高更大
                                    const scrollPosition = Math.max(0, index * lineHeight - containerHeight / 2 + lineHeight / 2);

                                    lyricContainerRef.current.scrollTo({
                                      top: scrollPosition,
                                      behavior: 'smooth'
                                    });
                                  }
                                }}
                                className={`transition-all duration-300 ease-in-out cursor-pointer hover:opacity-100 ${index === currentLyricIndex ? 'text-primary font-medium scale-105' : 'text-gray-600 opacity-60 hover:opacity-80'}`}
                                style={{
                                  color: index === currentLyricIndex ? '#f87a43' : 'var(--color-text-secondary)',
                                  fontSize: windowSize.width < 768
                                    ? (index === currentLyricIndex ? '18px' : '16px')
                                    : (index === currentLyricIndex ? '15px' : '14px'),
                                  fontWeight: index === currentLyricIndex ? '600' : '400',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  lineHeight: windowSize.width < 768 ? '32px' : '24px',
                                  padding: windowSize.width < 768 ? '4px 12px' : '2px 8px',
                                  borderRadius: '8px'
                                }}
                              >
                                {lyric.text}
                              </div>
                            ))
                          ) : (
                            <div className={windowSize.width < 768 ? "text-gray-500 py-12 text-base" : "text-gray-500 py-8"}>
                              暂无歌词
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* 播放控制按钮 */}
                <div className={windowSize.width < 768 
                  ? "flex items-center justify-around mt-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl"
                  : "flex items-center space-x-2 justify-between mt-4"}
                  style={{ 
                    boxShadow: windowSize.width < 768 
                      ? 'inset 0 2px 8px rgba(0, 0, 0, 0.08)' 
                      : 'none',
                    borderRadius: windowSize.width < 768 ? '20px' : '8px',
                    // 移动端增加内边距，提高触摸舒适度
                    paddingLeft: windowSize.width < 768 ? '12px' : '0',
                    paddingRight: windowSize.width < 768 ? '12px' : '0'
                  }}
                >
                  {/* 左侧控制按钮组 */}
                  <div className={windowSize.width < 768 ? "flex items-center space-x-4" : "flex items-center space-x-2"}>
                    {/* 上一曲按钮 */}
                    <motion.button
                      onClick={handlePrevTrack}
                      className={windowSize.width < 768
                        ? "w-18 h-18 rounded-full flex items-center justify-center transition-all relative"
                        : "w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-gray-800"}
                      style={{
                        backgroundColor: windowSize.width < 768 
                          ? 'var(--color-surface)' 
                          : 'var(--color-surface)',
                        color: windowSize.width < 768 
                          ? '#f87a43' 
                          : 'var(--color-text-secondary)',
                        border: windowSize.width < 768 
                          ? '1px solid rgba(248, 122, 67, 0.2)' 
                          : '1px solid var(--color-border)',
                        boxShadow: windowSize.width < 768 
                          ? '0 8px 20px rgba(248, 122, 67, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1)' 
                          : 'none',
                        borderRadius: '50%',
                        // 确保触控区域大小，符合移动端最佳实践
                        minWidth: '72px',
                        minHeight: '72px'
                      }}
                      disabled={tracks.length === 0}
                      whileHover={tracks.length > 0 ? {
                        scale: 1.15,
                        backgroundColor: windowSize.width < 768 ? '#fef3c7' : '#fef3c7',
                        color: '#f87a43',
                        boxShadow: windowSize.width < 768 ? '0 10px 28px rgba(248, 122, 67, 0.3), 0 6px 16px rgba(0, 0, 0, 0.12)' : '0 4px 12px rgba(0, 0, 0, 0.08)'
                      } : {}}
                      whileTap={tracks.length > 0 ? { 
                        scale: 0.9,
                        boxShadow: windowSize.width < 768 ? '0 4px 16px rgba(248, 122, 67, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                      } : {}}
                      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                      aria-label="上一曲"
                    >
                      <SkipBack size={windowSize.width < 768 ? 32 : 16} className="ml-1" />
                      
                      {/* 点击反馈效果 */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        whileTap={{ 
                          opacity: [0, 0.4, 0],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                          background: 'radial-gradient(circle, rgba(248, 122, 67, 0.3) 0%, transparent 70%)',
                          pointerEvents: 'none'
                        }}
                      />
                    </motion.button>

                    {/* 播放/暂停按钮 - 突出显示 */}
                    <motion.button
                      onClick={togglePlayPause}
                      className={windowSize.width < 768
                        ? "w-28 h-28 rounded-full flex items-center justify-center transition-all relative"
                        : "w-12 h-12 rounded-full flex items-center justify-center transition-colors hover-glow shadow-lg"}
                      style={{
                        background: 'linear-gradient(135deg, #f87a43, #e66330)',
                        color: '#ffffff',
                        boxShadow: windowSize.width < 768 
                          ? '0 14px 40px rgba(248, 122, 67, 0.5), 0 8px 24px rgba(248, 122, 67, 0.35)' 
                          : '0 4px 6px -1px rgba(248, 122, 67, 0.2), 0 10px 15px -3px rgba(248, 122, 67, 0.1)',
                        // 确保触控区域大小，符合移动端最佳实践
                        minWidth: '112px',
                        minHeight: '112px',
                        borderRadius: '50%',
                        // 增加z-index，确保播放按钮在最上层
                        zIndex: 10
                      }}
                      disabled={tracks.length === 0}
                      whileHover={tracks.length > 0 ? {
                        scale: 1.15,
                        boxShadow: windowSize.width < 768 
                          ? '0 18px 50px rgba(248, 122, 67, 0.65), 0 12px 32px rgba(248, 122, 67, 0.45)' 
                          : '0 8px 15px -3px rgba(248, 122, 67, 0.3)',
                        filter: windowSize.width < 768 ? 'brightness(1.1)' : 'brightness(1)'
                      } : {}}
                      whileTap={tracks.length > 0 ? {
                        scale: 0.92,
                        boxShadow: windowSize.width < 768 
                          ? '0 8px 30px rgba(248, 122, 67, 0.45), 0 6px 20px rgba(248, 122, 67, 0.35)' 
                          : '0 4px 8px -1px rgba(248, 122, 67, 0.2)'
                      } : {}}
                      transition={{ 
                        type: 'spring', 
                        stiffness: 350, 
                        damping: 15,
                        scale: { type: 'spring', stiffness: 250, damping: 25 }
                      }}
                      aria-label={isPlaying ? "暂停" : "播放"}
                    >
                      {/* 播放/暂停图标 */}
                      {isPlaying ? 
                        <Pause size={windowSize.width < 768 ? 44 : 24} className="ml-2" /> 
                        : <Play size={windowSize.width < 768 ? 44 : 24} className="ml-3" />}
                      
                      {/* 脉冲背景效果 - 增强视觉反馈 */}
                      {windowSize.width < 768 && tracks.length > 0 && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ 
                            opacity: [0, 0.25, 0],
                            scale: [1, 1.15, 1.3]
                          }}
                          transition={{ 
                            duration: 1.8,
                            repeat: Infinity,
                            repeatDelay: 1.2
                          }}
                          style={{
                            background: 'radial-gradient(circle, rgba(248, 122, 67, 0.4) 0%, transparent 70%)',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                      
                      {/* 点击反馈效果 */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        whileTap={{ 
                          opacity: [0, 0.5, 0],
                          scale: [1, 1.15, 1.3]
                        }}
                        transition={{ duration: 0.4 }}
                        style={{
                          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                          pointerEvents: 'none'
                        }}
                      />
                    </motion.button>

                    {/* 下一曲按钮 */}
                    <motion.button
                      onClick={handleNextTrack}
                      className={windowSize.width < 768
                        ? "w-18 h-18 rounded-full flex items-center justify-center transition-all relative"
                        : "w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-gray-800"}
                      style={{
                        backgroundColor: windowSize.width < 768 
                          ? 'var(--color-surface)' 
                          : 'var(--color-surface)',
                        color: windowSize.width < 768 
                          ? '#f87a43' 
                          : 'var(--color-text-secondary)',
                        border: windowSize.width < 768 
                          ? '1px solid rgba(248, 122, 67, 0.2)' 
                          : '1px solid var(--color-border)',
                        boxShadow: windowSize.width < 768 
                          ? '0 8px 20px rgba(248, 122, 67, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1)' 
                          : 'none',
                        borderRadius: '50%',
                        // 确保触控区域大小，符合移动端最佳实践
                        minWidth: '72px',
                        minHeight: '72px'
                      }}
                      disabled={tracks.length === 0}
                      whileHover={tracks.length > 0 ? {
                        scale: 1.15,
                        backgroundColor: windowSize.width < 768 ? '#fef3c7' : '#fef3c7',
                        color: '#f87a43',
                        boxShadow: windowSize.width < 768 ? '0 10px 28px rgba(248, 122, 67, 0.25), 0 6px 16px rgba(0, 0, 0, 0.12)' : '0 4px 12px rgba(0, 0, 0, 0.08)'
                      } : {}}
                      whileTap={tracks.length > 0 ? { 
                        scale: 0.9,
                        boxShadow: windowSize.width < 768 ? '0 4px 16px rgba(248, 122, 67, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                      } : {}}
                      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                      aria-label="下一曲"
                    >
                      <SkipForward size={windowSize.width < 768 ? 32 : 16} className="mr-1" />
                      
                      {/* 点击反馈效果 */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        whileTap={{ 
                          opacity: [0, 0.4, 0],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                          background: 'radial-gradient(circle, rgba(248, 122, 67, 0.3) 0%, transparent 70%)',
                          pointerEvents: 'none'
                        }}
                      />
                    </motion.button>
                  </div>

                  {/* 右侧控制按钮组 - 移动端优化布局 */}
                  <div className={windowSize.width < 768 
                    ? "flex items-center space-x-5"
                    : "flex items-center space-x-3 flex-1 justify-end"}>
                    {/* 音量控制 - 简化为按钮 */}
                    <motion.button
                      onClick={toggleMute}
                      className={windowSize.width < 768
                        ? "w-14 h-14 rounded-full flex items-center justify-center transition-all relative"
                        : "transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"}
                      style={{
                        backgroundColor: windowSize.width < 768 
                          ? 'var(--color-surface)' 
                          : 'transparent',
                        color: windowSize.width < 768 
                          ? 'var(--color-text-secondary)' 
                          : 'var(--color-text-secondary)',
                        border: windowSize.width < 768 
                          ? '1px solid rgba(248, 122, 67, 0.15)' 
                          : 'none',
                        boxShadow: windowSize.width < 768 
                          ? '0 6px 16px rgba(0, 0, 0, 0.12)' 
                          : 'none',
                        borderRadius: '50%',
                        // 确保触控区域大小
                        minWidth: '56px',
                        minHeight: '56px'
                      }}
                      whileHover={{
                        scale: 1.2,
                        color: '#f87a43',
                        backgroundColor: windowSize.width < 768 ? '#fef3c7' : 'transparent',
                        boxShadow: windowSize.width < 768 ? '0 8px 20px rgba(248, 122, 67, 0.2)' : 'none'
                      }}
                      whileTap={{ 
                        scale: 0.85,
                        boxShadow: windowSize.width < 768 ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none'
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                      aria-label={isMuted ? "取消静音" : "静音"}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={windowSize.width < 768 ? 26 : 20} /> : <Volume2 size={windowSize.width < 768 ? 26 : 20} />}
                      
                      {/* 点击反馈效果 */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        whileTap={{ 
                          opacity: [0, 0.3, 0],
                          scale: [1, 1.15, 1]
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                          background: 'radial-gradient(circle, rgba(248, 122, 67, 0.3) 0%, transparent 70%)',
                          pointerEvents: 'none'
                        }}
                      />
                    </motion.button>

                    {/* 曲目列表切换按钮 */}
                    <motion.button
                      onClick={toggleTrackList}
                      className={windowSize.width < 768
                        ? "w-14 h-14 rounded-full flex items-center justify-center transition-all relative"
                        : "p-3 transition-colors ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"}
                      style={{
                        backgroundColor: windowSize.width < 768 
                          ? 'var(--color-surface)' 
                          : 'transparent',
                        color: windowSize.width < 768 
                          ? 'var(--color-text-secondary)' 
                          : 'var(--color-text-secondary)',
                        border: windowSize.width < 768 
                          ? '1px solid rgba(248, 122, 67, 0.15)' 
                          : 'none',
                        boxShadow: windowSize.width < 768 
                          ? '0 6px 16px rgba(0, 0, 0, 0.12)' 
                          : 'none',
                        borderRadius: '50%',
                        // 确保触控区域大小
                        minWidth: '56px',
                        minHeight: '56px'
                      }}
                      whileHover={{
                        scale: 1.2,
                        color: '#f87a43',
                        backgroundColor: windowSize.width < 768 ? '#fef3c7' : 'transparent',
                        boxShadow: windowSize.width < 768 ? '0 8px 20px rgba(248, 122, 67, 0.2)' : 'none'
                      }}
                      whileTap={{ 
                        scale: 0.85,
                        boxShadow: windowSize.width < 768 ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none'
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                      title={showTrackList ? "隐藏播放列表" : "显示播放列表"}
                      aria-label={showTrackList ? "隐藏播放列表" : "显示播放列表"}
                    >
                      {showTrackList ? <ChevronDown size={windowSize.width < 768 ? 28 : 20} /> : <ChevronUp size={windowSize.width < 768 ? 28 : 20} />}
                      
                      {/* 点击反馈效果 */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        whileTap={{ 
                          opacity: [0, 0.3, 0],
                          scale: [1, 1.15, 1]
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                          background: 'radial-gradient(circle, rgba(248, 122, 67, 0.3) 0%, transparent 70%)',
                          pointerEvents: 'none'
                        }}
                      />
                    </motion.button>

                    {/* 隐藏播放器按钮 */}
                    <motion.button
                      onClick={() => {
                        setIsVisible(false);
                        setShowSearchBox(false);
                      }}
                      className={windowSize.width < 768
                        ? "w-14 h-14 rounded-full flex items-center justify-center transition-all relative"
                        : "p-3 transition-colors ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"}
                      style={{
                        backgroundColor: windowSize.width < 768 
                          ? 'var(--color-surface)' 
                          : 'transparent',
                        color: windowSize.width < 768 
                          ? '#ff4757' 
                          : 'var(--color-text-secondary)',
                        border: windowSize.width < 768 
                          ? '1px solid rgba(255, 71, 87, 0.2)' 
                          : 'none',
                        boxShadow: windowSize.width < 768 
                          ? '0 6px 16px rgba(255, 71, 87, 0.2)' 
                          : 'none',
                        borderRadius: '50%',
                        // 确保触控区域大小
                        minWidth: '56px',
                        minHeight: '56px'
                      }}
                      whileHover={{
                        scale: 1.2,
                        color: '#ff4757',
                        backgroundColor: windowSize.width < 768 ? '#ffebee' : 'transparent',
                        boxShadow: windowSize.width < 768 ? '0 8px 20px rgba(255, 71, 87, 0.3)' : 'none'
                      }}
                      whileTap={{ 
                        scale: 0.85,
                        boxShadow: windowSize.width < 768 ? '0 4px 12px rgba(255, 71, 87, 0.25)' : 'none'
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                      title="关闭播放器"
                      aria-label="关闭播放器"
                    >
                      <X size={windowSize.width < 768 ? 28 : 20} />
                      
                      {/* 点击反馈效果 */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        whileTap={{ 
                          opacity: [0, 0.4, 0],
                          scale: [1, 1.15, 1]
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                          background: 'radial-gradient(circle, rgba(255, 71, 87, 0.4) 0%, transparent 70%)',
                          pointerEvents: 'none'
                        }}
                      />
                    </motion.button>

                    {/* 桌面端显示音量滑块 */}
                    {windowSize.width >= 768 && (
                      <motion.input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        onMouseDown={(e) => e.stopPropagation()} // 阻止拖拽
                        onTouchStart={(e) => e.stopPropagation()} // 阻止拖拽
                        className="w-20 h-3 rounded-full appearance-none cursor-pointer transition-all duration-200"
                        style={{
                          WebkitAppearance: 'none',
                          backgroundColor: 'rgba(248, 122, 67, 0.2)',
                          outline: 'none',
                          // 确保触控区域大小
                          minHeight: '40px'
                        }}
                        whileHover={{ scale: 1.05 }}
                        aria-label="音量控制"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* 搜索结果 */}
          {showSearchResults && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute -bottom-10 left-0 right-0 z-50 rounded-lg shadow-lg p-3 max-h-72 overflow-y-auto border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                minWidth: '320px',
                maxWidth: windowSize.width < 768 ? 'calc(100vw - 32px)' : '500px',
                width: windowSize.width < 768 ? 'calc(100vw - 32px)' : 'auto',
                transform: windowSize.width < 768 ? 'translateY(-100%)' : 'translateY(-100%)'
              }}
            >
              <h4 className={windowSize.width < 768 ? "text-base font-semibold mb-3" : "text-sm font-semibold mb-2"} style={{ color: 'var(--color-text)' }}>
                搜索结果 {searchResults.length > 0 && `(${searchResults.length})`}
              </h4>
              {searchResults.length > 0 ? (
                <div className={windowSize.width < 768 ? "space-y-3" : "space-y-2"}>
                  {searchResults.map((item, index) => (
                    <div
                      key={`${item.id}-${item.source}-${index}`}
                      className={windowSize.width < 768
                        ? "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-300 hover:bg-primary-100 dark:hover:bg-primary-900/30"
                        : "flex items-center justify-between p-3 rounded-md cursor-pointer transition-all duration-300 hover:bg-primary-100 dark:hover:bg-primary-900/30"}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={windowSize.width < 768 ? "text-base font-medium" : "text-sm font-medium"} style={{ color: 'var(--color-text)' }}>
                            {item.name}
                          </div>
                          {/* 音乐源徽章 */}
                          <span
                            className={windowSize.width < 768 ? "px-2 py-1 rounded-full text-xs font-medium" : "px-2 py-0.5 rounded-full text-xs font-medium"}
                            style={{
                              backgroundColor: 'rgba(248, 122, 67, 0.1)',
                              color: '#f87a43',
                              border: '1px solid rgba(248, 122, 67, 0.3)'
                            }}
                            title={`来源: ${musicSourceNames[item.source]}`}
                          >
                            {musicSourceNames[item.source]}
                          </span>
                        </div>
                        <div className={windowSize.width < 768 ? "text-sm mt-1" : "text-xs"} style={{ color: 'var(--color-text-secondary)' }}>
                          {item.artist.join(', ')}
                        </div>
                        <div className={windowSize.width < 768 ? "text-sm text-gray-500 mt-1" : "text-xs text-gray-500 mt-1"}>
                          {item.album}
                        </div>
                      </div>
                      <button
                        onClick={() => addToPlaylist(item)}
                        disabled={isAddingToPlaylist === item.id}
                        className={windowSize.width < 768 ? "ml-3 p-3 rounded-full transition-colors" : "ml-2 p-2 rounded-full transition-colors"}
                        style={{
                          backgroundColor: isAddingToPlaylist === item.id ? '#ccc' : 'var(--color-primary)',
                          color: '#ffffff',
                          cursor: isAddingToPlaylist === item.id ? 'not-allowed' : 'pointer',
                          opacity: isAddingToPlaylist === item.id ? 0.7 : 1
                        }}
                        title={isAddingToPlaylist === item.id ? "正在添加..." : "添加到播放列表"}
                      >
                        {isAddingToPlaylist === item.id ? (
                          <div className={windowSize.width < 768 ? "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" : "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"}></div>
                        ) : (
                          <Music size={windowSize.width < 768 ? 20 : 16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={windowSize.width < 768 ? "text-center py-10" : "text-center py-8"} style={{ color: 'var(--color-text-secondary)' }}>
                  {isSearching ? (
                    <div className="flex flex-col items-center">
                      <div className={windowSize.width < 768 ? "w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" : "w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-2"}></div>
                      <p className={windowSize.width < 768 ? "text-base" : ""}>搜索中...</p>
                    </div>
                  ) : searchKeyword ? (
                    <p className={windowSize.width < 768 ? "text-base" : ""}>未找到匹配的音乐</p>
                  ) : (
                    <p className={windowSize.width < 768 ? "text-base" : ""}>输入关键词开始搜索</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* 曲目列表 - 只有当播放器可见且showTrackList为true时显示 */}
          {showTrackList && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute -top-80 left-0 right-0 z-50 rounded-lg shadow-lg p-3 max-h-72 overflow-y-auto border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--effect-shadow)',
                minWidth: '320px',
                width: windowSize.width < 768 ? 'calc(100vw - 40px)' : 'auto'
              }}
            >
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>播放列表</h4>
              {tracks.length > 0 ? (
                <div className="space-y-2">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between p-3 rounded-md transition-all duration-300 ${index === currentTrackIndex ? 'bg-primary-100 dark:bg-primary-900/30' : 'hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer'}`}
                    >
                      <div className="flex-1" onClick={() => selectTrack(index)}>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          {track.title}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {track.artist}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {index === currentTrackIndex && (
                          <div style={{ color: 'var(--color-primary)' }}>
                            <Music size={16} />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 阻止事件冒泡，避免触发播放
                            removeFromPlaylist(index);
                          }}
                          className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          style={{
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                  <p>播放列表为空</p>
                  <p className="text-xs mt-2">搜索音乐并添加到播放列表</p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </>
  );
};

export default MusicPlayer;
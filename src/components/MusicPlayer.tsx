'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Volume2, VolumeX, Pause, Play, Music, Search, X,
  SkipBack, SkipForward, List, Shuffle, Repeat, Repeat1,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { musicService, MusicSearchItem } from '@/services/musicService';

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
  className?: string;
}

type RepeatMode = 'off' | 'all' | 'one';

const MusicPlayer: React.FC<MusicPlayerProps> = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSeekingRef = useRef(false);
  const lyricContainerRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  // Data states
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<MusicSearchItem[]>([]);
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState<string | null>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffled, setIsShuffled] = useState(false);

  // UI states
  const [isVisible, setIsVisible] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showTrackList, setShowTrackList] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Lyrics states
  const [lyrics, setLyrics] = useState<Array<{time: number, text: string}>>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);

  const isMobile = windowSize.width < 768;

  // Window size tracking
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Parse LRC lyrics
  const parseLyric = (lrcText: string): Array<{time: number, text: string}> => {
    if (!lrcText) {
      return [{ time: 0, text: '暂无歌词' }];
    }
    const lines = lrcText.split('\n');
    const result: Array<{time: number, text: string}> = [];
    const lyricRegex = /\[([\d:.]+)\](.*)/;

    for (const line of lines) {
      const match = line.match(lyricRegex);
      if (match && match[1] && match[2]) {
        const timeParts = match[1].split(':');
        const minutes = parseInt(timeParts[0]);
        const seconds = parseFloat(timeParts[1]);
        const time = minutes * 60 + seconds;
        const text = match[2].trim();
        if (text) result.push({time, text});
      }
    }

    if (result.length === 0) {
      return [{ time: 0, text: '暂无歌词' }];
    }

    return result.sort((a, b) => a.time - b.time);
  };

  // Update lyrics when track changes
  useEffect(() => {
    if (tracks.length === 0 || currentTrackIndex >= tracks.length) {
      setLyrics([]);
      setCurrentLyricIndex(0);
      return;
    }
    const track = tracks[currentTrackIndex];
    const parsedLyrics = parseLyric(track.lyric || '');
    setLyrics(parsedLyrics);
    setCurrentLyricIndex(0);
    setShowLyrics(true); // 默认显示歌词
    if (lyricContainerRef.current) {
      lyricContainerRef.current.scrollTop = 0;
    }
  }, [currentTrackIndex, tracks]);

  // Sync lyrics with current time
  useEffect(() => {
    if (lyrics.length === 0) return;

    // 查找下一句歌词的索引
    const nextIndex = lyrics.findIndex(lyric => lyric.time > currentTime);

    // 如果找不到下一句（nextIndex === -1），说明当前是最后一句
    // 否则当前歌词索引是下一句的前一句
    const index = nextIndex === -1 ? lyrics.length - 1 : nextIndex - 1;

    // 确保索引有效且不是当前已选中的歌词
    if (index >= 0 && index < lyrics.length && index !== currentLyricIndex) {
      setCurrentLyricIndex(index);
      // 使用 scrollIntoView 确保当前歌词完美居中
      if (lyricRefs.current[index] && lyricContainerRef.current) {
        lyricRefs.current[index]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [currentTime, lyrics, currentLyricIndex]);

  const currentTrackId = React.useMemo(() => {
    if (tracks.length === 0 || currentTrackIndex >= tracks.length) return '';
    return tracks[currentTrackIndex].id;
  }, [tracks, currentTrackIndex]);

  // Ensure currentTrackIndex is valid
  useEffect(() => {
    if (tracks.length > 0 && currentTrackIndex >= tracks.length) {
      setCurrentTrackIndex(tracks.length - 1);
    }
  }, [tracks.length, currentTrackIndex]);

  // Seek to lyric time
  const seekToLyric = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('播放失败:', error);
        });
        setIsPlaying(true);
        setHasPlayed(true);
      }
    }
  };

  // Toggle repeat mode
  const toggleRepeatMode = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // Toggle shuffle
  const toggleShuffle = () => {
    setIsShuffled(prev => !prev);
  };

  // Next track with repeat/shuffle logic
  const handleNextTrack = React.useCallback(() => {
    if (tracks.length === 0) return;

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (isShuffled) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(randomIndex);
    } else {
      setCurrentTrackIndex((prev: number) => {
        const nextIndex = prev + 1;
        if (nextIndex >= tracks.length) {
          return repeatMode === 'all' ? 0 : prev;
        }
        return nextIndex;
      });
    }
  }, [tracks.length, repeatMode, isShuffled]);

  // Previous track
  const handlePrevTrack = React.useCallback(() => {
    if (tracks.length === 0) return;

    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      return;
    }

    setCurrentTrackIndex((prev: number) => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length, currentTime]);

  // Seek handling
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isSeekingRef.current = true;
  };

  const handleSeekEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
    }
    isSeekingRef.current = false;
  };

  // Audio element management
  useEffect(() => {
    if (tracks.length === 0 || currentTrackIndex >= tracks.length) return;

    const newAudio = new Audio(tracks[currentTrackIndex].src);
    newAudio.volume = volume;
    setCurrentTime(0);
    setDuration(0);
    const wasPlaying = isPlaying;

    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(newAudio.currentTime);
        setDuration(newAudio.duration);
      }
    };

    const handleLoadedMetadata = () => setDuration(newAudio.duration);
    const handleLoadedData = () => setDuration(newAudio.duration);
    const handleEnded = () => handleNextTrack();
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

    const oldAudio = audioRef.current;
    audioRef.current = newAudio;

    if (oldAudio) {
      oldAudio.pause();
      oldAudio.removeEventListener('timeupdate', handleTimeUpdate);
      oldAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      oldAudio.removeEventListener('loadeddata', handleLoadedData);
      oldAudio.removeEventListener('ended', handleEnded);
      oldAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
      oldAudio.src = '';
    }

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

  // Play/pause toggle
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.readyState >= audioRef.current.HAVE_FUTURE_DATA) {
        audioRef.current.play().catch(error => {
          console.error('播放失败:', error);
          setIsPlaying(false);
        });
        setIsPlaying(true);
        setHasPlayed(true);
      } else {
        const handleCanPlayThrough = () => {
          audioRef.current?.play().catch(error => {
            console.error('播放失败:', error);
            setIsPlaying(false);
          });
          setIsPlaying(true);
          setHasPlayed(true);
          audioRef.current?.removeEventListener('canplaythrough', handleCanPlayThrough);
        };
        audioRef.current.addEventListener('canplaythrough', handleCanPlayThrough);
      }
    }
  };

  // Mute toggle
  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      const restoredVolume = prevVolume || 0.5;
      setVolume(restoredVolume);
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = restoredVolume;
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) setIsMuted(false);
    else if (newVolume === 0 && !isMuted) setIsMuted(true);
  };

  // Select track
  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    if (isPlaying) {
      audioRef.current?.play().catch(error => {
        console.error('播放失败:', error);
        setIsPlaying(false);
      });
    }
  };

  // Remove from playlist
  const removeFromPlaylist = (index: number) => {
    const newTracks = [...tracks];
    newTracks.splice(index, 1);
    setTracks(newTracks);
    if (index === currentTrackIndex) {
      if (newTracks.length > 0) {
        setCurrentTrackIndex((prev: number) => prev % newTracks.length);
      } else {
        setIsPlaying(false);
      }
    } else if (index < currentTrackIndex) {
      setCurrentTrackIndex((prev: number) => prev - 1);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Search music
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    try {
      const results = await musicService.search(searchKeyword.trim());
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error('搜索音乐失败:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Add to playlist
  const addToPlaylist = async (item: MusicSearchItem) => {
    if (isAddingToPlaylist === item.id) return;
    try {
      setIsAddingToPlaylist(item.id);
      const musicUrl = await musicService.getUrl(item.id, 320, item.source);
      if (!musicUrl.url) {
        alert('无法获取音乐播放链接，请尝试其他歌曲');
        setIsAddingToPlaylist(null);
        return;
      }

      const tempTrack: MusicTrack = {
        id: item.id,
        title: item.name,
        artist: item.artist.join(', '),
        src: musicUrl.url,
        source: item.source,
        album: item.album,
        coverUrl: 'https://via.placeholder.com/500x500?text=Loading...',
        lyric: '',
        tlyric: undefined
      };

      setTracks(prev => {
        const newTracks = [...prev, tempTrack];
        setCurrentTrackIndex(newTracks.length - 1);
        setIsPlaying(true);
        setHasPlayed(true);
        return newTracks;
      });

      setShowSearchResults(false);
      setSearchKeyword('');
      setIsAddingToPlaylist(null);

      Promise.allSettled([
        musicService.getLyric(item.id, item.source),
        musicService.getAlbumPic(item.pic_id, 500, item.source)
      ]).then(results => {
        const lyricData = results[0].status === 'fulfilled' ? results[0].value : { lyric: '', tlyric: undefined };
        const picData = results[1].status === 'fulfilled' ? results[1].value : { url: 'https://via.placeholder.com/500x500?text=No+Cover' };
        setTracks(prevTracks => {
          return prevTracks.map(track => {
            if (track.id === item.id) {
              return { ...track, coverUrl: picData.url, lyric: lyricData.lyric, tlyric: lyricData.tlyric };
            }
            return track;
          });
        });
      });
    } catch (error) {
      console.error('添加到播放列表失败:', error);
      alert('添加歌曲失败，请稍后重试');
      setIsAddingToPlaylist(null);
    }
  };

  return (
    <>
      {/* Floating Music Button */}
      <motion.button
        onClick={() => {
          setIsVisible(!isVisible);
          if (!isVisible) setShowSearchBox(true);
        }}
        className="fixed z-[9999] flex items-center justify-center shadow-2xl cursor-pointer"
        style={{
          bottom: isMobile ? '20px' : '24px',
          right: isMobile ? '20px' : '24px',
          width: isMobile ? '64px' : '60px',
          height: isMobile ? '64px' : '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f87a43 0%, #f4728e 100%)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 12px rgba(248, 122, 67, 0.4)',
        }}
        whileHover={{ scale: 1.05, boxShadow: '0 6px 20px rgba(244, 114, 142, 0.5)' }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Music size={isMobile ? 28 : 26} color="#ffffff" />
      </motion.button>

      {/* Main Player */}
      <AnimatePresence>
        {isVisible && (
          <>
            {isMobile ? (
              /* Mobile: Bottom Sheet */
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                  onClick={() => setIsVisible(false)}
                />

                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-[9999] overflow-hidden"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255, 248, 246, 0.95) 0%, rgba(254, 243, 239, 0.98) 100%)',
                    maxHeight: '90vh',
                    borderTopLeftRadius: '32px',
                    borderTopRightRadius: '32px',
                    boxShadow: '0 -8px 32px rgba(248, 122, 67, 0.2)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* Drag Indicator */}
                  <div className="flex justify-center py-4 cursor-pointer" onClick={() => setIsVisible(false)}>
                    <div className="w-12 h-1.5 rounded-full bg-orange-300/40" />
                  </div>

                  {/* Search Box */}
                  {showSearchBox && (
                    <div className="px-5 pb-4">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="搜索音乐..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                            className="w-full pl-12 pr-12 py-4 rounded-2xl text-base text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 border border-orange-200 dark:border-orange-900/30 focus:border-orange-400 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/50"
                            style={{
                              background: 'rgba(255, 255, 255, 0.8)',
                              backdropFilter: 'blur(10px)',
                            }}
                          />
                          <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500" />
                          {searchKeyword && (
                            <button
                              type="button"
                              onClick={() => { setSearchKeyword(''); setSearchResults([]); setShowSearchResults(false); }}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2"
                            >
                              <X size={20} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400" />
                            </button>
                          )}
                        </div>
                        <motion.button
                          type="button"
                          onClick={handleSearch}
                          className="px-6 py-4 rounded-2xl font-medium text-white shadow-lg transition-all duration-200"
                          style={{
                            background: 'linear-gradient(135deg, #f87a43 0%, #f4728e 100%)',
                            boxShadow: '0 4px 12px rgba(248, 122, 67, 0.4)',
                          }}
                          whileHover={{ scale: 1.05, boxShadow: '0 6px 16px rgba(248, 122, 67, 0.5)' }}
                          whileTap={{ scale: 0.95 }}
                        >
                          搜索
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  <AnimatePresence>
                    {showSearchResults && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="px-5 pb-4 max-h-64 overflow-y-auto"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">搜索结果 ({searchResults.length})</h4>
                          <button
                            onClick={() => setShowSearchResults(false)}
                            className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium"
                          >
                            收起
                          </button>
                        </div>
                        <div className="space-y-2">
                          {searchResults.map((item, index) => (
                            <motion.div
                              key={`${item.id}-${index}`}
                              className="glass-card flex items-center justify-between p-3 rounded-xl cursor-pointer"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate text-gray-800 dark:text-gray-100">{item.name}</div>
                                <div className="text-xs truncate text-gray-500 dark:text-gray-400">{item.artist.join(', ')}</div>
                              </div>
                              <button
                                onClick={() => addToPlaylist(item)}
                                disabled={isAddingToPlaylist === item.id}
                                className="ml-3 p-3 rounded-full transition-all duration-200"
                                style={{
                                  background: 'linear-gradient(135deg, #f87a43 0%, #f4728e 100%)',
                                  boxShadow: '0 2px 8px rgba(248, 122, 67, 0.3)',
                                }}
                              >
                                {isAddingToPlaylist === item.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Music size={16} color="#fff" />
                                )}
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Player Content */}
                  {tracks.length > 0 && (isPlaying || hasPlayed) && currentTrackIndex < tracks.length && (
                    <div className="px-5 pb-8">
                      {/* Album Cover */}
                      <motion.div
                        className="w-48 h-48 mx-auto rounded-3xl overflow-hidden shadow-2xl mb-6 cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, rgba(248, 122, 67, 0.1), rgba(244, 114, 142, 0.1))',
                          backdropFilter: 'blur(10px)',
                          border: '2px solid rgba(248, 122, 67, 0.2)',
                        }}
                        animate={isPlaying ? {
                          boxShadow: [
                            '0 8px 32px rgba(248, 122, 67, 0.3)',
                            '0 8px 32px rgba(244, 114, 142, 0.3)',
                            '0 8px 32px rgba(248, 122, 67, 0.3)',
                          ],
                          rotate: 360
                        } : {
                          rotate: 0
                        }}
                        transition={isPlaying ? {
                          duration: 15,
                          repeat: Infinity,
                          ease: 'linear',
                          boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                        } : {
                          duration: 0.5
                        }}
                        onClick={() => setShowLyrics(!showLyrics)}
                      >
                        <Image
                          src={tracks[currentTrackIndex].coverUrl}
                          alt={tracks[currentTrackIndex].title}
                          width={192}
                          height={192}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      </motion.div>

                      {/* Track Info */}
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 truncate">
                          {tracks[currentTrackIndex].title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {tracks[currentTrackIndex].artist}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs mb-2 text-gray-600 dark:text-gray-400">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div className="relative h-2 rounded-full bg-gray-200/50 dark:bg-gray-700/50">
                          <motion.div
                            className="absolute h-full rounded-full"
                            style={{
                              background: 'linear-gradient(90deg, #f87a43 0%, #f4728e 100%)',
                              width: `${(currentTime / (duration || 1)) * 100}%`,
                            }}
                            transition={{ duration: 0.1 }}
                          />
                          <input
                            type="range"
                            min="0"
                            max={duration || 1}
                            value={currentTime}
                            onChange={handleSeek}
                            onMouseDown={handleSeekStart}
                            onMouseUp={handleSeekEnd}
                            onTouchStart={handleSeekStart}
                            onTouchEnd={handleSeekEnd}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Control Buttons */}
                      <div className="flex items-center justify-center gap-4 mb-6">
                        <motion.button
                          onClick={toggleShuffle}
                          className="p-3 rounded-full glass-card transition-all duration-200"
                          style={{
                            background: isShuffled ? 'rgba(248, 122, 67, 0.15)' : 'rgba(255, 255, 255, 0.8)',
                          }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Shuffle size={20} color={isShuffled ? '#f87a43' : '#6b7280'} />
                        </motion.button>

                        <motion.button
                          onClick={handlePrevTrack}
                          className="p-4 rounded-full glass-card"
                          whileTap={{ scale: 0.9 }}
                        >
                          <SkipBack size={24} color="#6b7280" />
                        </motion.button>

                        <motion.button
                          onClick={togglePlayPause}
                          className="p-6 rounded-full shadow-2xl"
                          style={{
                            background: 'linear-gradient(135deg, #f87a43 0%, #f4728e 100%)',
                            boxShadow: '0 8px 24px rgba(248, 122, 67, 0.4)',
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isPlaying ? <Pause size={32} color="#ffffff" /> : <Play size={32} color="#ffffff" />}
                        </motion.button>

                        <motion.button
                          onClick={handleNextTrack}
                          className="p-4 rounded-full glass-card"
                          whileTap={{ scale: 0.9 }}
                        >
                          <SkipForward size={24} color="#6b7280" />
                        </motion.button>

                        <motion.button
                          onClick={toggleRepeatMode}
                          className="p-3 rounded-full glass-card transition-all duration-200"
                          style={{
                            background: repeatMode !== 'off' ? 'rgba(248, 122, 67, 0.15)' : 'rgba(255, 255, 255, 0.8)',
                          }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {repeatMode === 'one' ? (
                            <Repeat1 size={20} color="#f87a43" />
                          ) : (
                            <Repeat size={20} color={repeatMode === 'all' ? '#f87a43' : '#6b7280'} />
                          )}
                        </motion.button>
                      </div>

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={toggleMute}
                            whileTap={{ scale: 0.9 }}
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX size={20} color="#6b7280" />
                            ) : (
                              <Volume2 size={20} color="#6b7280" />
                            )}
                          </motion.button>
                          <div className="w-20 h-1 rounded-full bg-gray-200/50 dark:bg-gray-700/50 relative">
                            <div
                              className="absolute h-full rounded-full"
                              style={{
                                background: 'linear-gradient(90deg, #f87a43 0%, #f4728e 100%)',
                                width: `${volume * 100}%`,
                              }}
                            />
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={volume}
                              onChange={handleVolumeChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {lyrics.length > 0 && (
                            <motion.button
                              onClick={() => setShowLyrics(!showLyrics)}
                              whileTap={{ scale: 0.9 }}
                              className="p-2"
                            >
                              {showLyrics ? (
                                <ChevronDown size={20} color="#f87a43" />
                              ) : (
                                <ChevronUp size={20} color="#6b7280" />
                              )}
                            </motion.button>
                          )}

                          <motion.button
                            onClick={() => setShowTrackList(!showTrackList)}
                            whileTap={{ scale: 0.9 }}
                          >
                            <List size={20} color="#6b7280" />
                          </motion.button>
                        </div>
                      </div>

                      {/* Lyrics Display */}
                      <AnimatePresence>
                        {showLyrics && lyrics.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="glass-card rounded-2xl overflow-hidden relative"
                          >
                            {/* 渐变遮罩 - 顶部 */}
                            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white/90 dark:from-gray-800/90 to-transparent pointer-events-none z-10" />

                            {/* 渐变遮罩 - 底部 */}
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/90 dark:from-gray-800/90 to-transparent pointer-events-none z-10" />

                            <div
                              ref={lyricContainerRef}
                              className="max-h-64 overflow-y-auto p-4 scroll-smooth"
                              style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                              }}
                            >
                              {lyrics.map((lyric, index) => (
                                <motion.p
                                  key={index}
                                  ref={(el) => { lyricRefs.current[index] = el; }}
                                  onClick={() => seekToLyric(lyric.time)}
                                  className={`text-center py-2 px-4 rounded-lg cursor-pointer transition-all duration-300 ${
                                index === currentLyricIndex
                                  ? 'text-gray-800 dark:text-white font-semibold text-sm scale-102'
                                  : 'text-gray-400 dark:text-gray-500 text-sm hover:text-gray-600 dark:hover:text-gray-400'
                              }`}
                                  style={{
                                    background: index === currentLyricIndex
                                      ? 'linear-gradient(90deg, rgba(248, 122, 67, 0.15), rgba(244, 114, 142, 0.15))'
                                      : 'transparent',
                                    boxShadow: index === currentLyricIndex
                                      ? '0 2px 8px rgba(248, 122, 67, 0.25)'
                                      : 'none'
                                  }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{
                                    opacity: index === currentLyricIndex ? 1 : (Math.abs(index - currentLyricIndex) <= 2 ? 0.8 : 0.5),
                                    y: 0,
                                    scale: index === currentLyricIndex ? 1.05 : 1
                                  }}
                                  transition={{ duration: 0.5, ease: 'easeOut' }}
                                  whileHover={{ scale: index === currentLyricIndex ? 1.08 : 1.03 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {lyric.text}
                                </motion.p>
                              ))}
                            </div>

                            <style jsx>{`
                              div::-webkit-scrollbar {
                                display: none;
                              }
                            `}</style>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              </>
            ) : (
              /* Desktop: Compact Player with Lyrics */
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="glass fixed z-[9998] rounded-3xl overflow-visible shadow-2xl"
                style={{
                  bottom: '100px',
                  right: '24px',
                  width: '420px',
                }}
              >
                {/* Search Box */}
                {showSearchBox && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="搜索音乐..."
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 border border-orange-200 dark:border-orange-900/30 focus:border-orange-400 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/50"
                          style={{
                            background: 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(10px)',
                          }}
                        />
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500" />
                        {searchKeyword && (
                          <button
                            type="button"
                            onClick={() => { setSearchKeyword(''); setSearchResults([]); setShowSearchResults(false); }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            <X size={16} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400" />
                          </button>
                        )}
                      </div>
                      <motion.button
                        type="button"
                        onClick={handleSearch}
                        className="px-4 py-2.5 rounded-xl font-medium text-sm text-white shadow-md transition-all duration-200"
                        style={{
                          background: 'linear-gradient(135deg, #f87a43 0%, #f4728e 100%)',
                          boxShadow: '0 2px 8px rgba(248, 122, 67, 0.3)',
                        }}
                        whileHover={{ scale: 1.05, boxShadow: '0 4px 12px rgba(248, 122, 67, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        搜索
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Search Results */}
                <AnimatePresence>
                  {showSearchResults && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="glass absolute bottom-full left-0 right-0 mb-2 rounded-2xl shadow-2xl p-3 max-h-80 overflow-y-auto"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">搜索结果 ({searchResults.length})</h4>
                        <button
                          onClick={() => setShowSearchResults(false)}
                          className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium"
                        >
                          收起
                        </button>
                      </div>
                      {searchResults.map((item, index) => (
                        <motion.div
                          key={`${item.id}-${index}`}
                          className="glass-card flex items-center justify-between p-2 mb-1 rounded-lg cursor-pointer"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate text-gray-800 dark:text-gray-100">{item.name}</div>
                            <div className="text-xs truncate text-gray-500 dark:text-gray-400">{item.artist.join(', ')}</div>
                          </div>
                          <button
                            onClick={() => addToPlaylist(item)}
                            disabled={isAddingToPlaylist === item.id}
                            className="ml-2 p-2 rounded-full"
                            style={{
                              background: 'linear-gradient(135deg, #f87a43 0%, #f4728e 100%)',
                              boxShadow: '0 2px 8px rgba(248, 122, 67, 0.3)',
                            }}
                          >
                            {isAddingToPlaylist === item.id ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Music size={14} color="#fff" />
                            )}
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Player Content */}
                {tracks.length > 0 && (isPlaying || hasPlayed) && currentTrackIndex < tracks.length && (
                  <div className="p-5">
                    {/* Track Info with Cover */}
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div
                        className="w-16 h-16 rounded-xl overflow-hidden shadow-lg cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, rgba(248, 122, 67, 0.1), rgba(244, 114, 142, 0.1))',
                          border: '1px solid rgba(248, 122, 67, 0.2)',
                        }}
                        animate={isPlaying ? {
                          boxShadow: [
                            '0 4px 16px rgba(248, 122, 67, 0.3)',
                            '0 4px 16px rgba(244, 114, 142, 0.3)',
                            '0 4px 16px rgba(248, 122, 67, 0.3)',
                          ],
                          rotate: 360
                        } : {
                          rotate: 0
                        }}
                        transition={isPlaying ? {
                          duration: 5,
                          repeat: Infinity,
                          ease: 'linear',
                          boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                        } : {
                          duration: 0.5
                        }}
                        onClick={() => setShowLyrics(!showLyrics)}
                      >
                        <Image
                          src={tracks[currentTrackIndex].coverUrl}
                          alt={tracks[currentTrackIndex].title}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {tracks[currentTrackIndex].title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {tracks[currentTrackIndex].artist}
                        </p>
                      </div>
                      <motion.button
                        onClick={() => setIsVisible(false)}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={18} color="#6b7280" />
                      </motion.button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5 text-gray-600 dark:text-gray-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-gray-200/50 dark:bg-gray-700/50">
                        <motion.div
                          className="absolute h-full rounded-full"
                          style={{
                            background: 'linear-gradient(90deg, #f87a43 0%, #f4728e 100%)',
                            width: `${(currentTime / (duration || 1)) * 100}%`,
                          }}
                          transition={{ duration: 0.1 }}
                        />
                        <input
                          type="range"
                          min="0"
                          max={duration || 1}
                          value={currentTime}
                          onChange={handleSeek}
                          onMouseDown={handleSeekStart}
                          onMouseUp={handleSeekEnd}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <motion.button onClick={toggleShuffle} whileTap={{ scale: 0.9 }}>
                          <Shuffle size={16} color={isShuffled ? '#f87a43' : '#6b7280'} opacity={isShuffled ? 1 : 0.6} />
                        </motion.button>
                        <motion.button onClick={handlePrevTrack} whileTap={{ scale: 0.9 }}>
                          <SkipBack size={18} color="#6b7280" />
                        </motion.button>
                      </div>

                      <motion.button
                        onClick={togglePlayPause}
                        className="p-3 rounded-full shadow-lg"
                        style={{
                          background: 'linear-gradient(135deg, #f87a43 0%, #f4728e 100%)',
                          boxShadow: '0 4px 16px rgba(248, 122, 67, 0.3)',
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isPlaying ? <Pause size={20} color="#ffffff" /> : <Play size={20} color="#ffffff" />}
                      </motion.button>

                      <div className="flex items-center gap-2">
                        <motion.button onClick={handleNextTrack} whileTap={{ scale: 0.9 }}>
                          <SkipForward size={18} color="#6b7280" />
                        </motion.button>
                        <motion.button onClick={toggleRepeatMode} whileTap={{ scale: 0.9 }}>
                          {repeatMode === 'one' ? (
                            <Repeat1 size={16} color="#f87a43" />
                          ) : (
                            <Repeat size={16} color={repeatMode === 'all' ? '#f87a43' : '#6b7280'} opacity={repeatMode === 'all' ? 1 : 0.6} />
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Volume & List */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <motion.button onClick={toggleMute} whileTap={{ scale: 0.9 }}>
                          {isMuted || volume === 0 ? (
                            <VolumeX size={16} color="#6b7280" opacity={0.6} />
                          ) : (
                            <Volume2 size={16} color="#6b7280" opacity={0.6} />
                          )}
                        </motion.button>
                        <div className="w-16 h-1 rounded-full bg-gray-200/50 dark:bg-gray-700/50 relative">
                          <div
                            className="absolute h-full rounded-full"
                            style={{
                              background: 'linear-gradient(90deg, #f87a43 0%, #f4728e 100%)',
                              width: `${volume * 100}%`,
                            }}
                          />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {lyrics.length > 0 && (
                          <motion.button
                            onClick={() => setShowLyrics(!showLyrics)}
                            whileTap={{ scale: 0.9 }}
                            className="p-1"
                          >
                            {showLyrics ? (
                              <ChevronDown size={16} color="#f87a43" />
                            ) : (
                              <ChevronUp size={16} color="#6b7280" />
                            )}
                          </motion.button>
                        )}
                        <motion.button
                          onClick={() => setShowTrackList(!showTrackList)}
                          whileTap={{ scale: 0.9 }}
                        >
                          <List size={16} color="#6b7280" opacity={0.6} />
                        </motion.button>
                      </div>
                    </div>

                    {/* Desktop Lyrics Display */}
                    <AnimatePresence>
                      {showLyrics && lyrics.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                        >
                          <div className="glass-card rounded-xl overflow-hidden relative">
                            {/* 渐变遮罩 - 顶部 */}
                            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/90 dark:from-gray-800/90 to-transparent pointer-events-none z-10" />

                            {/* 渐变遮罩 - 底部 */}
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/90 dark:from-gray-800/90 to-transparent pointer-events-none z-10" />

                            <div
                              ref={lyricContainerRef}
                              className="max-h-48 overflow-y-auto p-3 scroll-smooth"
                              style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                              }}
                            >
                              {lyrics.map((lyric, index) => (
                                <motion.p
                                  key={index}
                                  ref={(el) => { lyricRefs.current[index] = el; }}
                                  onClick={() => seekToLyric(lyric.time)}
                                  className={`text-center py-1.5 px-3 rounded-lg cursor-pointer transition-all duration-500 ${
                                    index === currentLyricIndex
                                      ? 'text-gray-800 dark:text-white font-semibold text-sm scale-110'
                                      : 'text-gray-400 dark:text-gray-500 text-xs hover:text-gray-600 dark:hover:text-gray-400'
                                  }`}
                                  style={{
                                    background: index === currentLyricIndex
                                      ? 'linear-gradient(90deg, rgba(248, 122, 67, 0.15), rgba(244, 114, 142, 0.15))'
                                      : 'transparent',
                                    boxShadow: index === currentLyricIndex
                                      ? '0 2px 8px rgba(248, 122, 67, 0.25)'
                                      : 'none'
                                  }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{
                                    opacity: index === currentLyricIndex ? 1 : (Math.abs(index - currentLyricIndex) <= 2 ? 0.8 : 0.5),
                                    y: 0,
                                    scale: index === currentLyricIndex ? 1.05 : 1
                                  }}
                                  transition={{ duration: 0.5, ease: 'easeOut' }}
                                  whileHover={{ scale: index === currentLyricIndex ? 1.08 : 1.03 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {lyric.text}
                                </motion.p>
                              ))}
                            </div>

                            <style jsx>{`
                              div::-webkit-scrollbar {
                                display: none;
                              }
                            `}</style>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Playlist Modal */}
      <AnimatePresence>
        {showTrackList && tracks.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9997]"
              onClick={() => setShowTrackList(false)}
            />
            <motion.div
              initial={{ y: isMobile ? '100%' : 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: isMobile ? '100%' : 20, opacity: 0 }}
              className={`glass fixed z-[9998] rounded-2xl shadow-2xl p-5 ${
                isMobile ? 'bottom-0 left-0 right-0 max-h-[70vh]' : 'bottom-24 right-24 w-96 max-h-96'
              }`}
            >
              <h4 className="text-base font-bold mb-4 text-gray-800 dark:text-gray-100">播放列表 ({tracks.length})</h4>
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: isMobile ? 'calc(70vh - 80px)' : '320px' }}>
                {tracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    onClick={() => { selectTrack(index); setShowTrackList(false); }}
                    className="glass-card flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      background: index === currentTrackIndex
                        ? 'rgba(248, 122, 67, 0.15)'
                        : 'rgba(255, 255, 255, 0.5)',
                      border: `1px solid ${index === currentTrackIndex ? 'rgba(248, 122, 67, 0.3)' : 'rgba(209, 213, 219, 0.3)'}`,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        index === currentTrackIndex ? 'text-orange-600 dark:text-orange-400' : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {track.title}
                      </div>
                      <div className="text-xs truncate text-gray-600 dark:text-gray-400">{track.artist}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromPlaylist(index); }}
                      className="ml-2 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                    >
                      <X size={16} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicPlayer;

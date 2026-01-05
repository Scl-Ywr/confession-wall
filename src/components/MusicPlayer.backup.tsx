"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  Music,
  Search,
  X,
  GripVertical,
  SkipBack,
  SkipForward,
  Minimize2,
  List as ListMusic,
  ChevronDown,
} from "lucide-react";
import {
  musicService,
  MusicSearchItem,
  MusicSource,
  ALL_MUSIC_SOURCES,
} from "@/services/musicService";

// --- Interfaces ---

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

// --- Constants & Helpers ---

const MUSIC_SOURCE_NAMES: Record<MusicSource, string> = {
  netease: "网易云",
  kuwo: "酷我",
  joox: "Joox",
  tencent: "QQ音乐",
  tidal: "Tidal",
  spotify: "Spotify",
  ytmusic: "YouTube",
  qobuz: "Qobuz",
  deezer: "Deezer",
  migu: "咪咕",
  kugou: "酷狗",
  ximalaya: "喜马拉雅",
  apple: "Apple Music",
};

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// --- Component ---

const MusicPlayer: React.FC<MusicPlayerProps> = () => {
  // --- State: Data ---
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // --- State: Playback ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [prevVolume, setPrevVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // --- State: UI & Layout ---
  const [isVisible, setIsVisible] = useState(false); // Master visibility switch (desktop toggle button)
  const [isMobile, setIsMobile] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isMobileExpanded, setIsMobileExpanded] = useState(false); // Mobile full screen
  const [showPlaylist, setShowPlaylist] = useState(false); // Desktop playlist/lyrics toggle
  const [desktopPosition, setDesktopPosition] = useState({ x: 0, y: 0 }); // Relative to initial bottom-right

  // --- State: Search ---
  const [showSearch, setShowSearch] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<MusicSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState<string | null>(
    null
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchMode, _setSearchMode] = useState<"single" | "multiple">("single");
  const [selectedSources, setSelectedSources] = useState<MusicSource[]>([ALL_MUSIC_SOURCES[0]]);
  const [showSourceSettings, setShowSourceSettings] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_hasPlayed, setHasPlayed] = useState(false);

  // --- State: Lyrics ---
  const [lyrics, setLyrics] = useState<Array<{ time: number; text: string }>>(
    []
  );
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricScrollRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef(lyrics); // Keep fresh for closure

  // --- Effects: Initialization & Resize ---
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowSize({ width, height });
      setIsMobile(width < 768);
    };

    // Initial check
    handleResize();

    // Load persisted state
    try {
      const saved = localStorage.getItem("musicPlayer_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        setVolume(parsed.volume ?? 0.5);
        setIsMuted(parsed.isMuted ?? false);
        setTracks(parsed.tracks ?? []);
        setCurrentTrackIndex(parsed.currentTrackIndex ?? 0);
        // Don't auto-play, just load state
        if (parsed.desktopPosition) setDesktopPosition(parsed.desktopPosition);
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Effects: Persistence ---
  useEffect(() => {
    // Debounce save? Or distinct saves.
    const stateToSave = {
      volume,
      isMuted,
      tracks: tracks.map((t) => ({ ...t, src: t.src })), // Basic clone
      currentTrackIndex,
      desktopPosition,
    };
    localStorage.setItem("musicPlayer_v2", JSON.stringify(stateToSave));
  }, [volume, isMuted, tracks, currentTrackIndex, desktopPosition]);

  // --- Effects: Audio ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Track Change & Audio Setup
  useEffect(() => {
    if (tracks.length === 0) return;

    // Bounds check
    if (currentTrackIndex >= tracks.length) {
      setCurrentTrackIndex(0);
      return;
    }

    const track = tracks[currentTrackIndex];
    if (!track) return;

    // Parse Lyrics
    const parseLrc = (lrc: string) => {
      if (!lrc) return [];
      const lines = lrc.split("\n");
      const result = [];
      const regex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;
      for (const line of lines) {
        const match = line.match(regex);
        if (match) {
          const min = parseInt(match[1]);
          const sec = parseFloat(match[2]);
          const text = match[3].trim();
          if (text) result.push({ time: min * 60 + sec, text });
        }
      }
      return result.sort((a, b) => a.time - b.time);
    };
    setLyrics(parseLrc(track.lyric));

    // Audio Object
    const newAudio = new Audio(track.src);
    newAudio.volume = isMuted ? 0 : volume;

    // Event Handlers
    const onTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(newAudio.currentTime);
        setDuration(newAudio.duration || 0);
      }
    };

    const onEnded = () => {
      handleNextTrack();
    };

    const onError = (e: Event) => {
      console.error("Audio error", e);
      // Maybe auto skip?
      // handleNextTrack();
    };

    newAudio.addEventListener("timeupdate", onTimeUpdate);
    newAudio.addEventListener("ended", onEnded);
    newAudio.addEventListener("error", onError);
    newAudio.addEventListener("loadedmetadata", () =>
      setDuration(newAudio.duration)
    );

    // cleanup old
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    audioRef.current = newAudio;

    if (isPlaying) {
      newAudio.play().catch((e) => {
        console.error("Autoplay failed", e);
        setIsPlaying(false);
      });
    }

    return () => {
      newAudio.pause();
      newAudio.removeEventListener("timeupdate", onTimeUpdate);
      newAudio.removeEventListener("ended", onEnded);
      newAudio.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex, tracks]); // Don't depend on isPlaying to avoid re-creation

  // Play/Pause toggle effect
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Lyric Sync
  useEffect(() => {
    lyricsRef.current = lyrics;
  }, [lyrics]);

  useEffect(() => {
    if (!lyricsRef.current.length) return;
    // Find active lyric
    const index = lyricsRef.current.findIndex((l) => l.time > currentTime) - 1;
    if (index >= 0 && index !== currentLyricIndex) {
      setCurrentLyricIndex(index);
      // Scroll functionality
      if (lyricScrollRef.current) {
        // Only auto scroll if we aren't manually browsing?
        // For simplicity, always center active lyric
        const el = lyricScrollRef.current.children[index] as HTMLElement;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [currentTime, currentLyricIndex]);

  // --- Handlers ---

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    setHasPlayed(true);
  };

  const handleNextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true); // Auto play next
  }, [tracks.length]);

  const handlePrevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }, [tracks.length]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolume || 0.5);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Search Logic (copied from original mostly)
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setIsSearching(true);
    try {
      let results: MusicSearchItem[];
      if (searchMode === "multiple" || selectedSources.length > 1) {
        musicService.setSources(selectedSources);
        results = await musicService.searchMultiple(searchKeyword.trim());
      } else {
        musicService.setSource(selectedSources[0]);
        results = await musicService.search(searchKeyword.trim());
      }
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const addToPlaylist = async (item: MusicSearchItem) => {
    if (isAddingToPlaylist) return;
    setIsAddingToPlaylist(item.id);
    try {
      const urlRes = await musicService.getUrl(item.id, 320, item.source);
      if (!urlRes.url) {
        alert("无法获取播放链接");
        return;
      }

      const newTrack: MusicTrack = {
        id: item.id,
        title: item.name,
        artist: item.artist.join(", "),
        src: urlRes.url,
        source: item.source,
        album: item.album,
        coverUrl: "https://via.placeholder.com/500?text=Loading",
        lyric: "",
      };

      setTracks((prev) => [...prev, newTrack]);
      setCurrentTrackIndex(tracks.length); // It will be the last one
      setIsPlaying(true);
      setHasPlayed(true);
      setShowSearch(false);
      setSearchKeyword("");

      // Async fetch details
      Promise.all([
        musicService.getAlbumPic(item.pic_id, 500, item.source),
        musicService.getLyric(item.id, item.source),
      ]).then(([pic, lrc]) => {
        setTracks((prev) =>
          prev.map((t) => {
            if (t.id === item.id) {
              return {
                ...t,
                coverUrl: pic.url || t.coverUrl,
                lyric: lrc.lyric || "",
              };
            }
            return t;
          })
        );
      });
    } catch (e) {
      console.error(e);
      alert("添加失败");
    } finally {
      setIsAddingToPlaylist(null);
    }
  };

  // --- Renders ---

  // 1. Desktop Widget
  const renderDesktopWidget = () => (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={{
        left: -windowSize.width + 350,
        right: 0,
        top: -windowSize.height + 100,
        bottom: 0,
      }}
      onDragEnd={(_, info) => {
        setDesktopPosition((p) => ({
          x: p.x + info.offset.x,
          y: p.y + info.offset.y,
        }));
      }}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, x: desktopPosition.x, y: desktopPosition.y }}  
      className="fixed bottom-8 right-8 z-[9999]"
    >
      <div className="relative group">
        {/* Toggle / Main Button (if player hidden or empty) */}
        {!isVisible || tracks.length === 0 ? (
          <button
            onClick={() => {
              setIsVisible(true);
              setShowSearch(true);
            }}
            className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
          >
            <Music size={24} />
          </button>
        ) : (
          <motion.div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden w-[320px] pointer-events-auto">
            {/* Header / Drag Handle */}
            <div className="h-8 bg-gradient-to-r from-orange-500/10 to-red-500/10 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing">
              <GripVertical size={14} className="text-gray-400" />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className="text-gray-500 hover:text-orange-500"
                >
                  <ListMusic size={14} />
                </button>
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="text-gray-500 hover:text-orange-500"
                >
                  <Search size={14} />
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <Minimize2 size={14} />
                </button>
              </div>
            </div>

            {/* Now Playing Info */}
            <div className="p-4 flex gap-4">
              <div
                className={`content-center relative w-16 h-16 rounded-lg overflow-hidden shadow-md flex-shrink-0 ${
                  isPlaying ? "animate-[spin_8s_linear_infinite]" : ""
                }`}
                style={{ animationPlayState: isPlaying ? "running" : "paused" }}
              >
                <Image
                  src={
                    tracks[currentTrackIndex]?.coverUrl ||
                    "https://via.placeholder.com/200"
                  }
                  alt="cover"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm">
                  {tracks[currentTrackIndex]?.title || "未播放"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {tracks[currentTrackIndex]?.artist || "..."}
                </p>
              </div>
            </div>

            {/* Lyric Snippet (Desktop Compact) */}
            <div className="px-4 pb-2 h-8 text-center">
              <p className="text-xs text-orange-500 truncate font-medium">
                {lyrics[currentLyricIndex]?.text || "..."}
              </p>
            </div>

            {/* Controls */}
            <div className="px-4 pb-4">
              {/* Progress */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-gray-400 w-8 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full relative group/seek">
                  <div
                    className="absolute top-0 left-0 h-full bg-orange-500 rounded-full"
                    style={{
                      width: `${(currentTime / (duration || 1)) * 100}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-gray-400 w-8">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePrevTrack}
                    className="hover:text-orange-500 transition-colors"
                  >
                    <SkipBack size={20} />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-orange-600 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause size={20} className="fill-current" />
                    ) : (
                      <Play size={20} className="fill-current ml-1" />
                    )}
                  </button>
                  <button
                    onClick={handleNextTrack}
                    className="hover:text-orange-500 transition-colors"
                  >
                    <SkipForward size={20} />
                  </button>
                </div>
                {/* Volume slider popover could go here, for now just simple */}
                <div className="w-4" />
              </div>
            </div>

            {/* Expandable Playlist / Search Area */}
            <AnimatePresence>
              {(showPlaylist || showSearch) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 320 }}
                  exit={{ height: 0 }}
                  className="bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-white/5"
                >
                  {showSearch ? (
                    <div className="p-3 h-full flex flex-col">
                      <div className="flex gap-2 mb-2">
                        <input
                          className="flex-1 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm border border-transparent focus:border-orange-500 outline-none"
                          placeholder="搜索音乐..."
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <button
                          onClick={handleSearch}
                          disabled={isSearching}
                          className="p-1.5 bg-orange-500 text-white rounded-lg"
                        >
                          <Search size={16} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                        {searchResults.map((item) => (
                          <div
                            key={`${item.source}-${item.id}`}
                            className="flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">
                                {item.name}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {item.artist.join(", ")}
                              </div>
                            </div>
                            <button
                              onClick={() => addToPlaylist(item)}
                              className="p-1 text-orange-500 opacity-0 group-hover:opacity-100"
                            >
                              <Play size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2 flex justify-between text-xs text-gray-400">
                        <button
                          onClick={() => setShowSearch(false)}
                          className="hover:text-gray-600"
                        >
                          返回
                        </button>
                        <button
                          onClick={() =>
                            setShowSourceSettings(!showSourceSettings)
                          }
                          className="hover:text-gray-600"
                        >
                          源设置
                        </button>
                      </div>

                      {showSourceSettings && (
                        <div className="mt-2 grid grid-cols-4 gap-1">
                          {ALL_MUSIC_SOURCES.slice(0, 8).map((src) => (
                            <button
                              key={src}
                              onClick={() => {
                                setSelectedSources([src]);
                              }}
                              className={`text-[10px] px-1 py-0.5 rounded ${
                                selectedSources.includes(src)
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {MUSIC_SOURCE_NAMES[src]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      <div className="flex p-2 border-b border-gray-100 dark:border-white/5 text-xs text-secondary">
                        <button className="flex-1 font-bold text-orange-500">
                          播放列表 ({tracks.length})
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {tracks.map((track, idx) => (
                          <div
                            key={track.id + idx}
                            onClick={() => setCurrentTrackIndex(idx)}
                            className={`flex items-center justify-between p-2 hover:bg-black/5 cursor-pointer text-xs ${
                              currentTrackIndex === idx
                                ? "bg-orange-50 text-orange-600"
                                : "text-gray-600"
                            }`}
                          >
                            <div className="flex-1 truncate pr-2">
                              <span className="font-medium">{track.title}</span>{" "}
                              - {track.artist}
                            </div>
                            {currentTrackIndex === idx && (
                              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  // 2. Mobile Bottom Bar
  const renderMobileMiniPlayer = () => (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4"
    >
      <div
        onClick={() => setIsMobileExpanded(true)}
        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl p-2 flex items-center gap-3"
      >
        <div
          className={`relative w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0 ${
            isPlaying ? "animate-[spin_10s_linear_infinite]" : ""
          }`}
          style={{ animationPlayState: isPlaying ? "running" : "paused" }}
        >
          <Image
            src={
              tracks[currentTrackIndex]?.coverUrl ||
              "https://via.placeholder.com/100"
            }
            alt="art"
            fill
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">
            {tracks[currentTrackIndex]?.title || "点击播放音乐"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {tracks[currentTrackIndex]?.artist || "未选择"}
          </div>
        </div>

        <div className="flex items-center gap-3 pr-2">
          {tracks.length > 0 ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                {isPlaying ? (
                  <Pause size={20} className="fill-current" />
                ) : (
                  <Play size={20} className="fill-current ml-1" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextTrack();
                }}
                className="text-gray-500"
              >
                <SkipForward size={24} />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileExpanded(true);
                setShowSearch(true);
              }}
              className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-full font-medium"
            >
              搜索
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // 3. Mobile Full Screen Player
  const renderMobileFullPlayer = () => (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col"
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src={
            tracks[currentTrackIndex]?.coverUrl ||
            "https://via.placeholder.com/500"
          }
          alt="bg"
          fill
          className="object-cover opacity-30 blur-3xl scale-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/80 to-white dark:from-black/20 dark:via-black/80 dark:to-black" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-8">
        <button
          onClick={() => setIsMobileExpanded(false)}
          className="p-2 text-gray-600 dark:text-gray-300"
        >
          <ChevronDown size={32} />
        </button>
        <div className="text-center">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">
            Now Playing
          </div>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          className="p-2 text-gray-600 dark:text-gray-300"
        >
          <Search size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pb-8">
        {/* Artwork Area */}
        <div className="flex-1 flex items-center justify-center py-6 min-h-[300px]">
          <motion.div
            className="relative w-[300px] h-[300px] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            animate={{ scale: isPlaying ? 1 : 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src={
                tracks[currentTrackIndex]?.coverUrl ||
                "https://via.placeholder.com/500"
              }
              alt="art"
              fill
              className="object-cover"
            />
          </motion.div>
        </div>

        {/* Info & Lyrics */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {tracks[currentTrackIndex]?.title || "未选择曲目"}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 truncate">
                {tracks[currentTrackIndex]?.artist || "请先搜索添加音乐"}
              </p>
            </div>
            {/* Like button could go here */}
          </div>

          {/* Lyrics Viewer (Small window) */}
          <div className="h-16 mt-2 overflow-hidden relative mask-image-gradient">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              <motion.div
                key={currentLyricIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="text-center text-orange-500 font-medium text-lg leading-8"
              >
                {lyrics[currentLyricIndex]?.text || "..."}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full mb-2">
            <div
              className="absolute top-0 left-0 h-full bg-orange-500 rounded-full"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
            <input
              type="range"
              className="absolute inset-0 w-full opacity-0 z-20"
              min={0}
              max={duration || 1}
              value={currentTime}
              onChange={handleSeek}
              onTouchStart={() => setIsSeeking(true)}
              onTouchEnd={() => setIsSeeking(false)}
            />
          </div>
          <div className="flex justify-between text-xs font-medium text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-2">
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => {
              /* Shuffle */
            }}
          >
            <Music size={24} />
          </button>
          <button
            onClick={handlePrevTrack}
            className="text-gray-800 dark:text-white p-2"
          >
            <SkipBack size={32} className="fill-current" />
          </button>
          <button
            onClick={togglePlayPause}
            className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_rgba(249,115,22,0.4)]"
          >
            {isPlaying ? (
              <Pause size={36} className="fill-current" />
            ) : (
              <Play size={36} className="fill-current ml-2" />
            )}
          </button>
          <button
            onClick={handleNextTrack}
            className="text-gray-800 dark:text-white p-2"
          >
            <SkipForward size={32} className="fill-current" />
          </button>
          <button
            onClick={() => setShowPlaylist(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            <ListMusic size={24} />
          </button>
        </div>
      </div>

      {/* Overlay: Search (Mobile) */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-50 bg-white dark:bg-gray-950 p-4 pt-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setShowSearch(false)} className="p-2">
                <X size={24} />
              </button>
              <div className="flex-1 relative">
                <input
                  className="w-full bg-gray-100 dark:bg-gray-900 rounded-2xl px-5 py-3 pl-12 shadow-inner focus:ring-2 ring-orange-500 outline-none"
                  placeholder="搜索歌曲、歌手..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  autoFocus
                />
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
              <button
                onClick={handleSearch}
                className="bg-orange-500 text-white px-4 py-2 rounded-xl font-medium"
                disabled={isSearching}
              >
                搜索
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {isSearching && (
                <div className="text-center py-10 text-gray-500">搜索中...</div>
              )}
              {!isSearching && searchResults.length === 0 && searchKeyword && (
                <div className="text-center py-10 text-gray-500">暂无结果</div>
              )}

              <div className="space-y-2">
                {searchResults.map((item, i) => (
                  <motion.div
                    key={item.id + i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => addToPlaylist(item)}
                    className="flex items-center gap-4 p-3 rounded-2xl active:scale-95 transition-transform bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                  >
                    <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 font-bold text-xs">
                      {item.source.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {item.artist.join(" / ")}
                      </div>
                    </div>
                    <div className="p-2 rounded-full border border-orange-500 text-orange-500">
                      <Play size={16} className="fill-current" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay: Playlist (Mobile) */}
      <AnimatePresence>
        {showPlaylist && (
          <motion.div
            initial={{ opacity: 0, y: "50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setShowPlaylist(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-900 rounded-t-[32px] h-[60vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  播放列表 ({tracks.length})
                </h3>
                <button
                  onClick={() => setTracks([])}
                  className="text-red-500 text-sm"
                >
                  清空
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {tracks.map((track, i) => (
                  <div
                    key={track.id + i}
                    onClick={() => {
                      setCurrentTrackIndex(i);
                      setIsPlaying(true);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      currentTrackIndex === i
                        ? "bg-orange-50 dark:bg-orange-900/20"
                        : ""
                    }`}
                  >
                    {currentTrackIndex === i && (
                      <div className="w-1.5 h-10 bg-orange-500 rounded-full" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium truncate ${
                          currentTrackIndex === i
                            ? "text-orange-600 dark:text-orange-400"
                            : ""
                        }`}
                      >
                        {track.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (!windowSize.width) return null; // Wait for hydrate

  return (
    <>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
      `}</style>

      {isMobile ? (
        <AnimatePresence>
          {tracks.length > 0 && !isMobileExpanded && renderMobileMiniPlayer()}
          {isMobileExpanded && renderMobileFullPlayer()}
          {/* Always show a floating action button if playlist is empty on mobile and no player is shown? */}
          {!isMobileExpanded && tracks.length === 0 && (
            <motion.button
              onClick={() => {
                setIsMobileExpanded(true);
                setShowSearch(true);
              }}
              className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-full shadow-xl flex items-center justify-center text-white z-40"
              whileTap={{ scale: 0.9 }}
            >
              <Music size={28} />
            </motion.button>
          )}
        </AnimatePresence>
      ) : (
        renderDesktopWidget()
      )}
    </>
  );
};

export default MusicPlayer;

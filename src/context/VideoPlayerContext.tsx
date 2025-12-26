'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface VideoPlayerContextType {
  currentlyPlayingId: string | null;
  setCurrentlyPlayingId: (id: string | null) => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const VideoPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  return (
    <VideoPlayerContext.Provider value={{ currentlyPlayingId, setCurrentlyPlayingId }}>
      {children}
    </VideoPlayerContext.Provider>
  );
};

export const useVideoPlayerContext = () => {
  const context = useContext(VideoPlayerContext);
  if (context === undefined) {
    throw new Error('useVideoPlayerContext must be used within a VideoPlayerProvider');
  }
  return context;
};
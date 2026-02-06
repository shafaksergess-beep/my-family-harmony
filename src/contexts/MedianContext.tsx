import React, { createContext, useContext, ReactNode } from 'react';
import { useMedian, UseMedianReturn } from '@/hooks/useMedian';

const MedianContext = createContext<UseMedianReturn | null>(null);

interface MedianProviderProps {
  children: ReactNode;
}

export function MedianProvider({ children }: MedianProviderProps) {
  const median = useMedian();
  
  return (
    <MedianContext.Provider value={median}>
      {children}
    </MedianContext.Provider>
  );
}

export function useMedianContext(): UseMedianReturn {
  const context = useContext(MedianContext);
  if (!context) {
    throw new Error('useMedianContext must be used within a MedianProvider');
  }
  return context;
}

export default MedianContext;

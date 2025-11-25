/**
 * Achievement Context
 * 
 * Global context for managing achievement popup notifications.
 * Provides a queue system to handle multiple achievements unlocking at once.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import AchievementPopup, { LevelUpPopup } from '../components/AchievementPopup';
import type { Achievement } from '../types/user';

interface AchievementContextType {
  showAchievement: (achievement: Achievement) => void;
  showLevelUp: (newLevel: number) => void;
  showAchievements: (achievements: Achievement[]) => void;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [currentLevelUp, setCurrentLevelUp] = useState<number | null>(null);
  const achievementQueue = useRef<Achievement[]>([]);
  const isShowingAchievement = useRef(false);

  const processQueue = useCallback(() => {
    if (achievementQueue.current.length > 0 && !isShowingAchievement.current) {
      isShowingAchievement.current = true;
      const nextAchievement = achievementQueue.current.shift()!;
      setCurrentAchievement(nextAchievement);
    }
  }, []);

  const handleAchievementDismiss = useCallback(() => {
    setCurrentAchievement(null);
    isShowingAchievement.current = false;
    // Process next in queue after a small delay
    setTimeout(processQueue, 300);
  }, [processQueue]);

  const handleLevelUpDismiss = useCallback(() => {
    setCurrentLevelUp(null);
  }, []);

  const showAchievement = useCallback((achievement: Achievement) => {
    achievementQueue.current.push(achievement);
    processQueue();
  }, [processQueue]);

  const showAchievements = useCallback((achievements: Achievement[]) => {
    achievementQueue.current.push(...achievements);
    processQueue();
  }, [processQueue]);

  const showLevelUp = useCallback((newLevel: number) => {
    setCurrentLevelUp(newLevel);
  }, []);

  return (
    <AchievementContext.Provider value={{ showAchievement, showLevelUp, showAchievements }}>
      {children}
      <AchievementPopup 
        achievement={currentAchievement} 
        onDismiss={handleAchievementDismiss} 
      />
      <LevelUpPopup 
        newLevel={currentLevelUp} 
        onDismiss={handleLevelUpDismiss} 
      />
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (context === undefined) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
}


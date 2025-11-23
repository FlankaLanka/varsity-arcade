/**
 * Mock Daily Quest Data
 * 
 * Daily quests refresh every day and provide bonus XP.
 * In production, this would be generated server-side and stored in Firestore.
 */

import type { DailyQuest } from '../types/user';

export const mockDailyQuests: DailyQuest[] = [
  {
    id: 'daily-play-3',
    name: 'Daily Grind',
    description: 'Play 3 games today',
    xpReward: 50,
    progress: 2,
    maxProgress: 3,
    completed: false,
  },
  {
    id: 'daily-score-5k',
    name: 'Score Chaser',
    description: 'Score 5,000+ points in a single game',
    xpReward: 100,
    progress: 3200,
    maxProgress: 5000,
    completed: false,
  },
  {
    id: 'daily-variety',
    name: 'Variety Player',
    description: 'Play all three game types today',
    xpReward: 150,
    progress: 2,
    maxProgress: 3,
    completed: false,
  },
  {
    id: 'daily-math',
    name: 'Math Whiz',
    description: 'Answer 10 math problems correctly in Pac-Man',
    xpReward: 75,
    progress: 10,
    maxProgress: 10,
    completed: true,
  },
];

/**
 * Get active (incomplete) daily quests
 */
export function getActiveDailyQuests(): DailyQuest[] {
  return mockDailyQuests.filter(q => !q.completed);
}

/**
 * Get completed daily quests
 */
export function getCompletedDailyQuests(): DailyQuest[] {
  return mockDailyQuests.filter(q => q.completed);
}

/**
 * Get daily quest completion stats
 */
export function getDailyQuestStats(): {
  completed: number;
  total: number;
  totalXPEarned: number;
  totalXPAvailable: number;
} {
  const completed = mockDailyQuests.filter(q => q.completed).length;
  const total = mockDailyQuests.length;
  const totalXPEarned = mockDailyQuests
    .filter(q => q.completed)
    .reduce((sum, q) => sum + q.xpReward, 0);
  const totalXPAvailable = mockDailyQuests.reduce((sum, q) => sum + q.xpReward, 0);
  
  return {
    completed,
    total,
    totalXPEarned,
    totalXPAvailable,
  };
}

/**
 * Calculate quest progress percentage
 */
export function getQuestProgressPercentage(quest: DailyQuest): number {
  return Math.min(100, (quest.progress / quest.maxProgress) * 100);
}


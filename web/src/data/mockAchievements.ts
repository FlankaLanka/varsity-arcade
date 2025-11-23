/**
 * Mock Achievement Data
 * 
 * Defines all available achievements in the game.
 * In production, this would come from Firestore.
 */

import type { Achievement } from '../types/user';

export const mockAchievements: Achievement[] = [
  // First Game Achievements
  {
    id: 'first-game',
    name: 'First Steps',
    description: 'Complete your first game',
    icon: '🎮',
    xpReward: 100,
    unlockedAt: new Date('2024-01-15'),
    isUnlocked: true,
  },
  
  // Score Milestone Achievements
  {
    id: 'score-1000',
    name: 'Getting Started',
    description: 'Reach a score of 1,000 in any game',
    icon: '⭐',
    xpReward: 200,
    unlockedAt: new Date('2024-01-16'),
    isUnlocked: true,
  },
  {
    id: 'score-5000',
    name: 'Rising Star',
    description: 'Reach a score of 5,000 in any game',
    icon: '🌟',
    xpReward: 200,
    unlockedAt: new Date('2024-01-20'),
    isUnlocked: true,
  },
  {
    id: 'score-10000',
    name: 'High Scorer',
    description: 'Reach a score of 10,000 in any game',
    icon: '💫',
    xpReward: 200,
    isUnlocked: false,
  },
  {
    id: 'score-25000',
    name: 'Legendary',
    description: 'Reach a score of 25,000 in any game',
    icon: '👑',
    xpReward: 200,
    isUnlocked: false,
  },
  
  // Streak Achievements
  {
    id: 'streak-3',
    name: 'Committed',
    description: 'Play 3 days in a row',
    icon: '🔥',
    xpReward: 300,
    unlockedAt: new Date('2024-01-18'),
    isUnlocked: true,
  },
  {
    id: 'streak-7',
    name: 'Dedicated',
    description: 'Play 7 days in a row',
    icon: '🔥',
    xpReward: 300,
    isUnlocked: false,
  },
  {
    id: 'streak-30',
    name: 'Unstoppable',
    description: 'Play 30 days in a row',
    icon: '🔥',
    xpReward: 300,
    isUnlocked: false,
  },
  
  // Game-Specific Achievements
  {
    id: 'asteroids-master',
    name: 'Asteroid Master',
    description: 'Score 5,000+ in Asteroids',
    icon: '☄️',
    xpReward: 150,
    isUnlocked: false,
  },
  {
    id: 'math-genius',
    name: 'Math Genius',
    description: 'Answer 20 questions correctly in Pac-Man',
    icon: '🧮',
    xpReward: 150,
    unlockedAt: new Date('2024-01-19'),
    isUnlocked: true,
  },
  {
    id: 'ph-master',
    name: 'pH Master',
    description: 'Maintain neutral pH for 30+ seconds in pH Invaders',
    icon: '🧪',
    xpReward: 150,
    isUnlocked: false,
  },
  {
    id: 'chemistry-expert',
    name: 'Chemistry Expert',
    description: 'Correctly identify 15 compounds in pH Invaders',
    icon: '⚗️',
    xpReward: 150,
    isUnlocked: false,
  },
  
  // Total Score Achievements
  {
    id: 'total-score-50k',
    name: 'Veteran Player',
    description: 'Earn 50,000 total points across all games',
    icon: '🏆',
    xpReward: 200,
    isUnlocked: false,
  },
  {
    id: 'total-score-100k',
    name: 'Elite Gamer',
    description: 'Earn 100,000 total points across all games',
    icon: '🏆',
    xpReward: 200,
    isUnlocked: false,
  },
  
  // Games Played Achievements
  {
    id: 'games-10',
    name: 'Regular',
    description: 'Play 10 games',
    icon: '🎯',
    xpReward: 150,
    unlockedAt: new Date('2024-01-21'),
    isUnlocked: true,
  },
  {
    id: 'games-50',
    name: 'Enthusiast',
    description: 'Play 50 games',
    icon: '🎯',
    xpReward: 150,
    isUnlocked: false,
  },
  {
    id: 'games-100',
    name: 'Addict',
    description: 'Play 100 games',
    icon: '🎯',
    xpReward: 150,
    isUnlocked: false,
  },
];

/**
 * Get recent achievements (unlocked, sorted by date)
 */
export function getRecentAchievements(count: number = 3): Achievement[] {
  return mockAchievements
    .filter(a => a.isUnlocked)
    .sort((a, b) => {
      if (!a.unlockedAt || !b.unlockedAt) return 0;
      return b.unlockedAt.getTime() - a.unlockedAt.getTime();
    })
    .slice(0, count);
}

/**
 * Get locked achievements (not yet unlocked)
 */
export function getLockedAchievements(): Achievement[] {
  return mockAchievements.filter(a => !a.isUnlocked);
}

/**
 * Get achievement completion stats
 */
export function getAchievementStats(): {
  unlocked: number;
  total: number;
  percentage: number;
} {
  const unlocked = mockAchievements.filter(a => a.isUnlocked).length;
  const total = mockAchievements.length;
  
  return {
    unlocked,
    total,
    percentage: (unlocked / total) * 100,
  };
}


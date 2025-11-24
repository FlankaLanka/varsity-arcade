/**
 * Mock User Profile Data
 * 
 * Mock user data for testing and development.
 * In production, this would come from Firebase Auth + Firestore.
 */

import type { UserProfile } from '../types/user';
import { mockAchievements } from './mockAchievements';
import { mockDailyQuests } from './mockDailyQuests';
import { mockFriends } from './mockFriendsData';

export const mockUserProfile: UserProfile = {
  id: 'user-123',
  username: 'quantum_nerd',
  displayName: 'Quantum Nerd',
  avatar: undefined, // Will use default pixel art avatar
  totalXP: 2202,
  level: 8,
  currentStreak: 5,
  gamesPlayed: 23,
  totalScore: 47850,
  gamesCompleted: 18,
  achievements: mockAchievements,
  dailyQuests: mockDailyQuests,
  friends: mockFriends,
  gameStats: {
    'asteroids': {
      highScore: 7200,
      gamesPlayed: 8,
      bestStreak: 3,
      totalXP: 640,
    },
    'pacman-math': {
      highScore: 11200,
      gamesPlayed: 10,
      bestStreak: 4,
      totalXP: 980,
    },
    'ph-invaders': {
      highScore: 9100,
      gamesPlayed: 5,
      bestStreak: 2,
      totalXP: 582,
    },
  },
  activityHistory: [
    {
      id: 'activity-1',
      type: 'game',
      description: 'Scored 9,100 in pH Invaders',
      date: new Date(Date.now() - 1000 * 60 * 15),
      icon: '🧪',
      meta: { score: 9100, game: 'pH Invaders' },
    },
    {
      id: 'activity-2',
      type: 'achievement',
      description: 'Unlocked "Math Genius"',
      date: new Date(Date.now() - 1000 * 60 * 60 * 3),
      icon: '🧮',
      meta: { achievementId: 'math-genius' },
    },
    {
      id: 'activity-3',
      type: 'xp',
      description: 'Earned 150 XP from daily quests',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24),
      icon: '⚡',
      meta: { amount: 150 },
    },
    {
      id: 'activity-4',
      type: 'level',
      description: 'Reached Level 8',
      date: new Date(Date.now() - 1000 * 60 * 60 * 48),
      icon: '🚀',
      meta: { level: 8 },
    },
  ],
};

/**
 * Get current user profile (mock)
 * In production, this would fetch from Firebase
 */
export function getCurrentUserProfile(): UserProfile {
  return mockUserProfile;
}

/**
 * Update user profile (mock)
 * In production, this would update Firebase Firestore
 */
export function updateUserProfile(updates: Partial<UserProfile>): UserProfile {
  return {
    ...mockUserProfile,
    ...updates,
  };
}


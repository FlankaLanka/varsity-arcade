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


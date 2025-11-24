import type { Achievement, ActivityEntry, GameStatSummary, GameType } from '../types/user';
import { mockAchievements } from './mockAchievements';

export interface FriendProfileDetails {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  totalXP: number;
  level: number;
  gamesPlayed: number;
  totalScore: number;
  achievements: Achievement[];
  gameStats: Record<GameType, GameStatSummary>;
  activityHistory: ActivityEntry[];
}

const baseGameStats = (): Record<GameType, GameStatSummary> => ({
  'asteroids': { highScore: 5000, gamesPlayed: 5, bestStreak: 2, totalXP: 420 },
  'pacman-math': { highScore: 9000, gamesPlayed: 7, bestStreak: 3, totalXP: 610 },
  'ph-invaders': { highScore: 6800, gamesPlayed: 4, bestStreak: 2, totalXP: 480 },
});

const friendProfiles: Record<string, FriendProfileDetails> = {
  'friend-1': {
    id: 'friend-1',
    username: 'nova_star',
    displayName: 'Nova Star',
    totalXP: 1950,
    level: 7,
    gamesPlayed: 20,
    totalScore: 41000,
    achievements: mockAchievements.slice(0, 6),
    gameStats: {
      ...baseGameStats(),
      'asteroids': { highScore: 8400, gamesPlayed: 9, bestStreak: 3, totalXP: 720 },
    },
    activityHistory: [
      {
        id: 'nova-1',
        type: 'game',
        description: 'Destroyed 42 asteroids',
        date: new Date(Date.now() - 1000 * 60 * 45),
        icon: '☄️',
        meta: { score: 7800, game: 'Asteroids' },
      },
      {
        id: 'nova-2',
        type: 'achievement',
        description: 'Unlocked "Asteroid Master"',
        date: new Date(Date.now() - 1000 * 60 * 60 * 12),
        icon: '🏅',
      },
    ],
  },
  'friend-3': {
    id: 'friend-3',
    username: 'astro_pilot',
    displayName: 'Astro Pilot',
    totalXP: 2400,
    level: 9,
    gamesPlayed: 28,
    totalScore: 52000,
    achievements: mockAchievements.slice(0, 8),
    gameStats: {
      ...baseGameStats(),
      'ph-invaders': { highScore: 10200, gamesPlayed: 12, bestStreak: 4, totalXP: 850 },
    },
    activityHistory: [
      {
        id: 'astro-1',
        type: 'game',
        description: 'Kept pH neutral for 45s',
        date: new Date(Date.now() - 1000 * 60 * 25),
        icon: '🧪',
        meta: { score: 10200 },
      },
      {
        id: 'astro-2',
        type: 'xp',
        description: 'Earned 200 XP streak bonus',
        date: new Date(Date.now() - 1000 * 60 * 90),
        icon: '⚡',
        meta: { amount: 200 },
      },
    ],
  },
  'friend-4': {
    id: 'friend-4',
    username: 'chem_wizard',
    displayName: 'Chem Wizard',
    totalXP: 1750,
    level: 6,
    gamesPlayed: 18,
    totalScore: 36000,
    achievements: mockAchievements.slice(2, 7),
    gameStats: {
      ...baseGameStats(),
      'pacman-math': { highScore: 9800, gamesPlayed: 11, bestStreak: 4, totalXP: 720 },
    },
    activityHistory: [
      {
        id: 'chem-1',
        type: 'game',
        description: 'Solved 15 equations in Pac-Man',
        date: new Date(Date.now() - 1000 * 60 * 10),
        icon: '👻',
      },
      {
        id: 'chem-2',
        type: 'level',
        description: 'Reached Level 6',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        icon: '🚀',
        meta: { level: 6 },
      },
    ],
  },
};

export function getFriendProfile(friendId: string): FriendProfileDetails | null {
  return friendProfiles[friendId] ?? null;
}


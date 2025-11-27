/**
 * User Profile and Progression Types
 * 
 * These types define the structure for user data, achievements, quests, and friends.
 * Currently using mock data, structured for easy Firebase integration later.
 */

export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  gamesPlayed: number;
  totalScore: number;
  gamesCompleted: number;
  achievements: Achievement[];
  dailyQuests: DailyQuest[];
  friends: Friend[];
  gameStats: Record<GameType, GameStatSummary>;
  activityHistory: ActivityEntry[];
  notifications: Notification[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: Date;
  isUnlocked: boolean;
}

export interface DailyQuest {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
}

export interface Friend {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  currentActivity: 'asteroids' | 'pacman-math' | 'ph-invaders' | 'online' | 'offline';
  lastSeen: Date;
}

export type GameType = 'asteroids' | 'pacman-math' | 'ph-invaders' | 'pong-arithmetic';
export type AchievementType = 'first-game' | 'score-milestone' | 'streak-milestone' | 'game-specific' | 'cohort' | 'social' | 'level' | 'variety';
export type QuestType = 'play-games' | 'score-milestone' | 'complete-variety' | 'maintain-streak';

export interface Notification {
  id: string;
  type: 'challenge' | 'achievement' | 'friend-request' | 'system';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  actionUrl?: string;
  meta?: {
    challengeId?: string;
    challengerId?: string;
    challengerUsername?: string;
    gameType?: GameType;
    scoreToBeat?: number;
    requesterId?: string;
    requesterUsername?: string;
  };
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengerUsername: string;
  challengedId: string;
  gameType: GameType;
  scoreToBeat: number;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  completedAt?: Date;
  challengerScore?: number;
}

export interface GameStatSummary {
  highScore: number;
  gamesPlayed: number;
  bestStreak: number;
  totalXP: number;
}

export type ActivityType = 'game' | 'achievement' | 'xp' | 'level' | 'cohort-solve' | 'cohort-battle';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  description: string;
  date: Date;
  meta?: Record<string, string | number>;
  icon?: string;
}


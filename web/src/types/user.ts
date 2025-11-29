/**
 * User Profile and Progression Types
 * 
 * These types define the structure for user data, achievements, quests, and friends.
 * Currently using mock data, structured for easy Firebase integration later.
 */

export type AccountType = 'student' | 'teacher';

/**
 * Teacher-specific profile information
 */
export interface TeacherProfile {
  yearsOfExperience: number;
  subjects: string[];
  bio?: string;
  educationCredentials?: string[];
}

/**
 * Base user profile fields shared by both students and teachers
 */
export interface BaseUserProfile {
  id: string;
  username: string;
  avatar?: string;
  accountType: AccountType;
  friends: Friend[];
  notifications: Notification[];
}

/**
 * Student-specific profile fields
 */
export interface StudentProfile extends BaseUserProfile {
  accountType: 'student';
  totalXP: number;
  level: number;
  currentStreak: number;
  gamesPlayed: number;
  totalScore: number;
  gamesCompleted: number;
  achievements: Achievement[];
  dailyQuests: DailyQuest[];
  gameStats: Record<GameType, GameStatSummary>;
  activityHistory: ActivityEntry[];
}

/**
 * Teacher user profile
 */
export interface TeacherUserProfile extends BaseUserProfile {
  accountType: 'teacher';
  teacherProfile: TeacherProfile;
}

/**
 * Union type for all user profiles
 * Use type guards (isStudent, isTeacher) to narrow the type
 */
export type UserProfile = StudentProfile | TeacherUserProfile;

/**
 * Type guard to check if user is a student
 */
export function isStudent(user: UserProfile): user is StudentProfile {
  return user.accountType === 'student';
}

/**
 * Type guard to check if user is a teacher
 */
export function isTeacher(user: UserProfile): user is TeacherUserProfile {
  return user.accountType === 'teacher';
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


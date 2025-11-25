/**
 * Achievement Definitions
 * 
 * Master list of all achievements with their unlock conditions.
 * Each achievement has a checkCondition function that takes a UserProfile
 * and returns true if the achievement should be unlocked.
 */

import type { UserProfile, Achievement } from '../types/user';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: 'first-game' | 'score-milestone' | 'streak-milestone' | 'game-specific' | 'cohort' | 'social' | 'level' | 'variety';
  checkCondition: (profile: UserProfile, context?: AchievementContext) => boolean;
}

export interface AchievementContext {
  gameType?: string;
  score?: number;
  cohortSolves?: number;
  battleWins?: number;
  friendsCount?: number;
}

/**
 * All available achievements
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ============ First Game Achievements ============
  {
    id: 'first-asteroids',
    name: 'Space Cadet',
    description: 'Complete your first Asteroids game',
    icon: '☄️',
    xpReward: 100,
    category: 'first-game',
    checkCondition: (profile) => profile.gameStats['asteroids']?.gamesPlayed >= 1,
  },
  {
    id: 'first-pacman',
    name: 'Maze Runner',
    description: 'Complete your first Pac-Man: Math Blitz game',
    icon: '👻',
    xpReward: 100,
    category: 'first-game',
    checkCondition: (profile) => profile.gameStats['pacman-math']?.gamesPlayed >= 1,
  },
  {
    id: 'first-ph-invaders',
    name: 'Chemistry Initiate',
    description: 'Complete your first pH Invaders game',
    icon: '🧪',
    xpReward: 100,
    category: 'first-game',
    checkCondition: (profile) => profile.gameStats['ph-invaders']?.gamesPlayed >= 1,
  },
  {
    id: 'first-pong',
    name: 'Paddle Master',
    description: 'Complete your first Pong Arithmetic game',
    icon: '🏓',
    xpReward: 100,
    category: 'first-game',
    checkCondition: (profile) => profile.gameStats['pong-arithmetic']?.gamesPlayed >= 1,
  },

  // ============ Score Milestone Achievements ============
  {
    id: 'score-1k',
    name: 'Rising Star',
    description: 'Reach 1,000 total score across all games',
    icon: '⭐',
    xpReward: 150,
    category: 'score-milestone',
    checkCondition: (profile) => profile.totalScore >= 1000,
  },
  {
    id: 'score-5k',
    name: 'Point Collector',
    description: 'Reach 5,000 total score across all games',
    icon: '🌟',
    xpReward: 200,
    category: 'score-milestone',
    checkCondition: (profile) => profile.totalScore >= 5000,
  },
  {
    id: 'score-10k',
    name: 'Score Hunter',
    description: 'Reach 10,000 total score across all games',
    icon: '💫',
    xpReward: 300,
    category: 'score-milestone',
    checkCondition: (profile) => profile.totalScore >= 10000,
  },
  {
    id: 'score-25k',
    name: 'High Roller',
    description: 'Reach 25,000 total score across all games',
    icon: '🏆',
    xpReward: 400,
    category: 'score-milestone',
    checkCondition: (profile) => profile.totalScore >= 25000,
  },
  {
    id: 'score-50k',
    name: 'Score Legend',
    description: 'Reach 50,000 total score across all games',
    icon: '👑',
    xpReward: 500,
    category: 'score-milestone',
    checkCondition: (profile) => profile.totalScore >= 50000,
  },

  // ============ Streak Milestone Achievements ============
  {
    id: 'streak-3',
    name: 'Getting Started',
    description: 'Maintain a 3-day playing streak',
    icon: '🔥',
    xpReward: 100,
    category: 'streak-milestone',
    checkCondition: (profile) => profile.currentStreak >= 3,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day playing streak',
    icon: '🔥',
    xpReward: 200,
    category: 'streak-milestone',
    checkCondition: (profile) => profile.currentStreak >= 7,
  },
  {
    id: 'streak-14',
    name: 'Dedicated Player',
    description: 'Maintain a 14-day playing streak',
    icon: '🔥',
    xpReward: 300,
    category: 'streak-milestone',
    checkCondition: (profile) => profile.currentStreak >= 14,
  },
  {
    id: 'streak-30',
    name: 'Unstoppable',
    description: 'Maintain a 30-day playing streak',
    icon: '💎',
    xpReward: 500,
    category: 'streak-milestone',
    checkCondition: (profile) => profile.currentStreak >= 30,
  },

  // ============ Games Played Achievements ============
  {
    id: 'games-10',
    name: 'Getting Warmed Up',
    description: 'Play 10 games total',
    icon: '🎮',
    xpReward: 100,
    category: 'game-specific',
    checkCondition: (profile) => profile.gamesPlayed >= 10,
  },
  {
    id: 'games-25',
    name: 'Regular Player',
    description: 'Play 25 games total',
    icon: '🎯',
    xpReward: 200,
    category: 'game-specific',
    checkCondition: (profile) => profile.gamesPlayed >= 25,
  },
  {
    id: 'games-50',
    name: 'Arcade Veteran',
    description: 'Play 50 games total',
    icon: '🕹️',
    xpReward: 300,
    category: 'game-specific',
    checkCondition: (profile) => profile.gamesPlayed >= 50,
  },
  {
    id: 'games-100',
    name: 'Arcade Master',
    description: 'Play 100 games total',
    icon: '🏅',
    xpReward: 500,
    category: 'game-specific',
    checkCondition: (profile) => profile.gamesPlayed >= 100,
  },

  // ============ Cohort Achievements ============
  {
    id: 'first-cohort-solve',
    name: 'Problem Solver',
    description: 'Solve your first problem in a cohort room',
    icon: '✅',
    xpReward: 100,
    category: 'cohort',
    checkCondition: (profile, context) => (context?.cohortSolves || 0) >= 1,
  },
  {
    id: 'first-battle-win',
    name: 'Battle Victor',
    description: 'Win your first cohort battle',
    icon: '⚔️',
    xpReward: 150,
    category: 'cohort',
    checkCondition: (profile, context) => (context?.battleWins || 0) >= 1,
  },
  {
    id: 'cohort-solves-10',
    name: 'Study Group Star',
    description: 'Solve 10 problems in cohort rooms',
    icon: '📚',
    xpReward: 250,
    category: 'cohort',
    checkCondition: (profile, context) => (context?.cohortSolves || 0) >= 10,
  },
  {
    id: 'battle-wins-5',
    name: 'Battle Champion',
    description: 'Win 5 cohort battles',
    icon: '🛡️',
    xpReward: 300,
    category: 'cohort',
    checkCondition: (profile, context) => (context?.battleWins || 0) >= 5,
  },
  {
    id: 'cohort-solves-25',
    name: 'Knowledge Seeker',
    description: 'Solve 25 problems in cohort rooms',
    icon: '🧠',
    xpReward: 400,
    category: 'cohort',
    checkCondition: (profile, context) => (context?.cohortSolves || 0) >= 25,
  },
  {
    id: 'battle-wins-10',
    name: 'Legendary Warrior',
    description: 'Win 10 cohort battles',
    icon: '⚔️',
    xpReward: 500,
    category: 'cohort',
    checkCondition: (profile, context) => (context?.battleWins || 0) >= 10,
  },

  // ============ Social Achievements ============
  {
    id: 'first-friend',
    name: 'Social Butterfly',
    description: 'Add your first friend',
    icon: '🤝',
    xpReward: 50,
    category: 'social',
    checkCondition: (profile) => (profile.friends?.length || 0) >= 1,
  },
  {
    id: 'friends-5',
    name: 'Squad Goals',
    description: 'Add 5 friends',
    icon: '👥',
    xpReward: 100,
    category: 'social',
    checkCondition: (profile) => (profile.friends?.length || 0) >= 5,
  },
  {
    id: 'friends-10',
    name: 'Popular Player',
    description: 'Add 10 friends',
    icon: '🌟',
    xpReward: 200,
    category: 'social',
    checkCondition: (profile) => (profile.friends?.length || 0) >= 10,
  },

  // ============ Level Achievements ============
  {
    id: 'level-5',
    name: 'Rookie No More',
    description: 'Reach Level 5',
    icon: '📈',
    xpReward: 100,
    category: 'level',
    checkCondition: (profile) => profile.level >= 5,
  },
  {
    id: 'level-10',
    name: 'Double Digits',
    description: 'Reach Level 10',
    icon: '🔟',
    xpReward: 200,
    category: 'level',
    checkCondition: (profile) => profile.level >= 10,
  },
  {
    id: 'level-25',
    name: 'Quarter Century',
    description: 'Reach Level 25',
    icon: '🎖️',
    xpReward: 400,
    category: 'level',
    checkCondition: (profile) => profile.level >= 25,
  },
  {
    id: 'level-50',
    name: 'Half Century Hero',
    description: 'Reach Level 50',
    icon: '🏆',
    xpReward: 750,
    category: 'level',
    checkCondition: (profile) => profile.level >= 50,
  },

  // ============ Variety Achievements ============
  {
    id: 'try-all-games',
    name: 'Explorer',
    description: 'Play all 4 different games at least once',
    icon: '🗺️',
    xpReward: 200,
    category: 'variety',
    checkCondition: (profile) => 
      (profile.gameStats['asteroids']?.gamesPlayed || 0) >= 1 &&
      (profile.gameStats['pacman-math']?.gamesPlayed || 0) >= 1 &&
      (profile.gameStats['ph-invaders']?.gamesPlayed || 0) >= 1 &&
      (profile.gameStats['pong-arithmetic']?.gamesPlayed || 0) >= 1,
  },
  {
    id: 'master-all-games',
    name: 'Jack of All Trades',
    description: 'Play each game at least 10 times',
    icon: '🎭',
    xpReward: 500,
    category: 'variety',
    checkCondition: (profile) => 
      (profile.gameStats['asteroids']?.gamesPlayed || 0) >= 10 &&
      (profile.gameStats['pacman-math']?.gamesPlayed || 0) >= 10 &&
      (profile.gameStats['ph-invaders']?.gamesPlayed || 0) >= 10 &&
      (profile.gameStats['pong-arithmetic']?.gamesPlayed || 0) >= 10,
  },

  // ============ Game-Specific High Score Achievements ============
  {
    id: 'asteroids-highscore-1k',
    name: 'Space Ace',
    description: 'Score 1,000+ points in a single Asteroids game',
    icon: '🚀',
    xpReward: 150,
    category: 'game-specific',
    checkCondition: (profile) => (profile.gameStats['asteroids']?.highScore || 0) >= 1000,
  },
  {
    id: 'asteroids-highscore-5k',
    name: 'Asteroid Destroyer',
    description: 'Score 5,000+ points in a single Asteroids game',
    icon: '💥',
    xpReward: 300,
    category: 'game-specific',
    checkCondition: (profile) => (profile.gameStats['asteroids']?.highScore || 0) >= 5000,
  },
  {
    id: 'pacman-highscore-1k',
    name: 'Math Muncher',
    description: 'Score 1,000+ points in a single Pac-Man game',
    icon: '🟡',
    xpReward: 150,
    category: 'game-specific',
    checkCondition: (profile) => (profile.gameStats['pacman-math']?.highScore || 0) >= 1000,
  },
  {
    id: 'pacman-highscore-5k',
    name: 'Pac-Man Pro',
    description: 'Score 5,000+ points in a single Pac-Man game',
    icon: '👾',
    xpReward: 300,
    category: 'game-specific',
    checkCondition: (profile) => (profile.gameStats['pacman-math']?.highScore || 0) >= 5000,
  },
  {
    id: 'ph-highscore-1k',
    name: 'Acid Apprentice',
    description: 'Score 1,000+ points in a single pH Invaders game',
    icon: '⚗️',
    xpReward: 150,
    category: 'game-specific',
    checkCondition: (profile) => (profile.gameStats['ph-invaders']?.highScore || 0) >= 1000,
  },
  {
    id: 'ph-highscore-5k',
    name: 'Chemistry King',
    description: 'Score 5,000+ points in a single pH Invaders game',
    icon: '🔬',
    xpReward: 300,
    category: 'game-specific',
    checkCondition: (profile) => (profile.gameStats['ph-invaders']?.highScore || 0) >= 5000,
  },
  {
    id: 'pong-highscore-1k',
    name: 'Math Bouncer',
    description: 'Score 1,000+ points in a single Pong Arithmetic game',
    icon: '🏸',
    xpReward: 150,
    category: 'game-specific',
    checkCondition: (profile) => (profile.gameStats['pong-arithmetic']?.highScore || 0) >= 1000,
  },
  {
    id: 'pong-highscore-5k',
    name: 'Pong Perfectionist',
    description: 'Score 5,000+ points in a single Pong Arithmetic game',
    icon: '🎾',
    xpReward: 300,
    category: 'game-specific',
    checkCondition: (profile) => (profile.gameStats['pong-arithmetic']?.highScore || 0) >= 5000,
  },

  // ============ XP Milestone Achievements ============
  {
    id: 'xp-1000',
    name: 'XP Hunter',
    description: 'Earn 1,000 total XP',
    icon: '✨',
    xpReward: 100,
    category: 'score-milestone',
    checkCondition: (profile) => profile.totalXP >= 1000,
  },
  {
    id: 'xp-5000',
    name: 'XP Collector',
    description: 'Earn 5,000 total XP',
    icon: '💎',
    xpReward: 250,
    category: 'score-milestone',
    checkCondition: (profile) => profile.totalXP >= 5000,
  },
  {
    id: 'xp-10000',
    name: 'XP Master',
    description: 'Earn 10,000 total XP',
    icon: '🌠',
    xpReward: 500,
    category: 'score-milestone',
    checkCondition: (profile) => profile.totalXP >= 10000,
  },
];

/**
 * Get an achievement definition by ID
 */
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * Convert an AchievementDefinition to an Achievement (for user profile)
 */
export function definitionToAchievement(def: AchievementDefinition, isUnlocked: boolean, unlockedAt?: Date): Achievement {
  const achievement: Achievement = {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    xpReward: def.xpReward,
    isUnlocked,
  };
  
  // Only include unlockedAt if it's defined (Firestore doesn't accept undefined)
  if (unlockedAt) {
    achievement.unlockedAt = unlockedAt;
  }
  
  return achievement;
}

/**
 * Get all achievements as Achievement objects (for initializing new users)
 */
export function getAllAchievementsLocked(): Achievement[] {
  return ACHIEVEMENTS.map(def => definitionToAchievement(def, false));
}


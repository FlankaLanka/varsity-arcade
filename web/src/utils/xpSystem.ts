/**
 * XP and Leveling System
 * 
 * Handles all XP calculations, level progression, and rewards.
 * Uses an exponential curve for leveling to create a sense of progression.
 */

import type { GameType, AchievementType, QuestType, DailyQuest } from '../types/user';

/**
 * Calculate XP earned from a game score
 * Different games have different XP rates based on difficulty
 */
export function calculateXPFromScore(score: number, gameType: GameType): number {
  const xpRates: Record<GameType, number> = {
    'asteroids': 0.01,        // 100 points = 1 XP
    'pacman-math': 0.015,     // 100 points = 1.5 XP (slightly higher for math)
    'ph-invaders': 0.012,     // 100 points = 1.2 XP
    'pong-arithmetic': 0.015, // 100 points = 1.5 XP (educational game)
  };

  const rate = xpRates[gameType] || 0.01;
  return Math.floor(score * rate);
}

/**
 * Calculate bonus XP for completing a game session
 * Completion bonus encourages finishing games rather than quitting
 */
export function calculateXPFromCompletion(gameType: GameType): number {
  const completionBonuses: Record<GameType, number> = {
    'asteroids': 50,
    'pacman-math': 75,     // Higher bonus for educational games
    'ph-invaders': 75,
    'pong-arithmetic': 75, // Higher bonus for educational games
  };

  return completionBonuses[gameType] || 50;
}

/**
 * Calculate XP reward for unlocking an achievement
 */
export function calculateXPFromAchievement(achievementType: AchievementType): number {
  const achievementRewards: Record<AchievementType, number> = {
    'first-game': 100,
    'score-milestone': 200,
    'streak-milestone': 300,
    'game-specific': 150,
    'cohort': 150,
    'social': 75,
    'level': 200,
    'variety': 250,
  };

  return achievementRewards[achievementType] || 100;
}

/**
 * Calculate XP reward for completing a daily quest
 */
export function calculateXPFromDailyQuest(questType: QuestType): number {
  const questRewards = {
    'play-games': 50,
    'score-milestone': 100,
    'complete-variety': 150,
    'maintain-streak': 75,
  };

  return questRewards[questType] || 50;
}

/**
 * Calculate player level based on total XP
 * Uses exponential curve: XP needed = 100 * (level ^ 1.5)
 * 
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 283 XP
 * Level 4: 500 XP
 * Level 5: 750 XP
 * Level 10: 3,162 XP
 * Level 20: 8,944 XP
 * Level 50: 35,355 XP
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP < 0) return 1;
  
  // Binary search for level
  let level = 1;
  while (getXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  
  return level;
}

/**
 * Get the total XP required to reach a specific level
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.5));
}

/**
 * Get XP progress information for display
 * Returns current XP in level, XP needed for next level, and progress percentage
 */
export function getXPProgress(currentXP: number, currentLevel: number): {
  current: number;
  next: number;
  progress: number;
} {
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = getXPForLevel(currentLevel + 1);
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const xpInCurrentLevel = currentXP - xpForCurrentLevel;
  
  return {
    current: xpInCurrentLevel,
    next: xpNeededForNextLevel,
    progress: Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100),
  };
}

/**
 * Calculate streak bonus multiplier
 * Rewards players for maintaining daily streaks
 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays < 3) return 1.0;
  if (streakDays < 7) return 1.1;   // 10% bonus for 3-6 day streak
  if (streakDays < 14) return 1.25; // 25% bonus for 7-13 day streak
  if (streakDays < 30) return 1.5;  // 50% bonus for 14-29 day streak
  return 2.0;                        // 100% bonus for 30+ day streak
}

/**
 * Calculate total XP earned from a game session
 * Combines score XP, completion bonus, and streak multiplier
 */
export function calculateTotalGameXP(
  score: number,
  gameType: GameType,
  streakDays: number,
  completed: boolean
): number {
  let totalXP = calculateXPFromScore(score, gameType);
  
  if (completed) {
    totalXP += calculateXPFromCompletion(gameType);
  }
  
  const multiplier = getStreakMultiplier(streakDays);
  return Math.floor(totalXP * multiplier);
}

/**
 * Calculate progress percentage for a daily quest
 */
export const getQuestProgressPercentage = (quest: DailyQuest): number => {
  return (quest.progress / quest.maxProgress) * 100;
};

/**
 * Calculate XP for solving a problem in a cohort room
 * Base XP + bonus for streak
 */
export function calculateCohortSolveXP(streakDays: number = 0): number {
  const baseXP = 100; // Base XP for solving a problem
  const multiplier = getStreakMultiplier(streakDays);
  return Math.floor(baseXP * multiplier);
}

/**
 * Calculate XP for winning a battle in a cohort room
 * Base XP + bonus for streak
 */
export function calculateBattleWinXP(streakDays: number = 0): number {
  const baseXP = 150; // Base XP for winning a battle
  const multiplier = getStreakMultiplier(streakDays);
  return Math.floor(baseXP * multiplier);
}

/**
 * Achievement Service
 * 
 * Handles checking and unlocking achievements for users.
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ACHIEVEMENTS, type AchievementDefinition, type AchievementContext } from '../data/achievements';
import type { UserProfile, Achievement } from '../types/user';
import { calculateLevel } from '../utils/xpSystem';

/**
 * Check which achievements a user has newly unlocked
 * Returns array of newly unlocked achievement definitions
 */
export function checkNewAchievements(
  profile: UserProfile,
  context?: AchievementContext
): AchievementDefinition[] {
  const unlockedIds = new Set(
    profile.achievements
      .filter(a => a.isUnlocked)
      .map(a => a.id)
  );

  const newlyUnlocked: AchievementDefinition[] = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (unlockedIds.has(achievement.id)) continue;

    // Check if condition is now met
    if (achievement.checkCondition(profile, context)) {
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

/**
 * Unlock an achievement for a user and grant XP
 * Updates Firestore with the unlocked achievement
 */
export async function unlockAchievement(
  userId: string,
  achievementDef: AchievementDefinition
): Promise<{ xpGranted: number; newLevel?: number }> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data() as UserProfile;
  
  // Check if already unlocked
  const existingAchievement = userData.achievements.find(a => a.id === achievementDef.id);
  if (existingAchievement?.isUnlocked) {
    return { xpGranted: 0 };
  }
  
  const now = new Date();
  const xpReward = achievementDef.xpReward;
  const newTotalXP = userData.totalXP + xpReward;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > userData.level;
  
  // Create the unlocked achievement object
  const unlockedAchievement: Achievement = {
    id: achievementDef.id,
    name: achievementDef.name,
    description: achievementDef.description,
    icon: achievementDef.icon,
    xpReward: achievementDef.xpReward,
    isUnlocked: true,
    unlockedAt: now,
  };
  
  // Update or add achievement in the array
  const updatedAchievements = existingAchievement
    ? userData.achievements.map(a => a.id === achievementDef.id ? unlockedAchievement : a)
    : [...userData.achievements, unlockedAchievement];
  
  await updateDoc(userRef, {
    achievements: updatedAchievements,
    totalXP: newTotalXP,
    level: newLevel,
  });
  
  return { 
    xpGranted: xpReward, 
    newLevel: leveledUp ? newLevel : undefined 
  };
}

/**
 * Unlock multiple achievements at once
 * Returns total XP granted and any level up info
 */
export async function unlockAchievements(
  userId: string,
  achievementDefs: AchievementDefinition[]
): Promise<{ totalXpGranted: number; newLevel?: number; unlockedAchievements: Achievement[] }> {
  if (achievementDefs.length === 0) {
    return { totalXpGranted: 0, unlockedAchievements: [] };
  }
  
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data() as UserProfile;
  const now = new Date();
  
  let totalXpGranted = 0;
  const unlockedAchievements: Achievement[] = [];
  const unlockedIds = new Set(userData.achievements.filter(a => a.isUnlocked).map(a => a.id));
  
  // Process each achievement
  for (const def of achievementDefs) {
    // Skip if already unlocked
    if (unlockedIds.has(def.id)) continue;
    
    const unlockedAchievement: Achievement = {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      xpReward: def.xpReward,
      isUnlocked: true,
      unlockedAt: now,
    };
    
    unlockedAchievements.push(unlockedAchievement);
    totalXpGranted += def.xpReward;
    unlockedIds.add(def.id);
  }
  
  if (unlockedAchievements.length === 0) {
    return { totalXpGranted: 0, unlockedAchievements: [] };
  }
  
  // Merge with existing achievements
  const existingIds = new Set(userData.achievements.map(a => a.id));
  const updatedAchievements = [
    ...userData.achievements.map(a => {
      const unlocked = unlockedAchievements.find(u => u.id === a.id);
      return unlocked || a;
    }),
    ...unlockedAchievements.filter(u => !existingIds.has(u.id))
  ];
  
  const newTotalXP = userData.totalXP + totalXpGranted;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > userData.level;
  
  await updateDoc(userRef, {
    achievements: updatedAchievements,
    totalXP: newTotalXP,
    level: newLevel,
  });
  
  return { 
    totalXpGranted, 
    newLevel: leveledUp ? newLevel : undefined,
    unlockedAchievements
  };
}

/**
 * Initialize achievements for a new user (all locked)
 */
export function getInitialAchievements(): Achievement[] {
  return ACHIEVEMENTS.map(def => ({
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    xpReward: def.xpReward,
    isUnlocked: false,
  }));
}


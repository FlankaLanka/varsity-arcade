/**
 * useGameCompletion Hook
 * 
 * Handles game completion logic: updating stats, checking achievements, and showing popups.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAchievements } from '../context/AchievementContext';
import { updateUserStats, addActivityEntry } from '../services/firestore';
import { checkNewAchievements, unlockAchievements } from '../services/achievements';
import { calculateTotalGameXP } from '../utils/xpSystem';
import type { GameType } from '../types/user';

interface GameCompletionOptions {
  gameType: GameType;
  gameName: string;
}

export function useGameCompletion({ gameType, gameName }: GameCompletionOptions) {
  const navigate = useNavigate();
  const { user, firebaseUser, refreshUser } = useAuth();
  const { showAchievements, showLevelUp } = useAchievements();

  const completeGame = useCallback(async (score: number) => {
    if (!user || !firebaseUser) {
      // Not authenticated, just navigate to results
      navigate('/results', { state: { score, game: gameName, gameType } });
      return;
    }

    try {
      // Calculate XP
      const xp = calculateTotalGameXP(score, gameType, user.currentStreak, true);

      // Update user stats in Firestore
      const updatedProfile = await updateUserStats(firebaseUser.uid, gameType, score, xp);

      if (updatedProfile) {
        // Check for level up
        if (updatedProfile.level > user.level) {
          showLevelUp(updatedProfile.level);
        }

        // Check for new achievements (include friends count for social achievements)
        const newAchievements = checkNewAchievements(updatedProfile, {
          friendsCount: updatedProfile.friends?.length || 0
        });
        
        if (newAchievements.length > 0) {
          // Unlock achievements in Firestore
          const { unlockedAchievements } = await unlockAchievements(
            firebaseUser.uid, 
            newAchievements
          );
          
          // Show achievement popups
          if (unlockedAchievements.length > 0) {
            showAchievements(unlockedAchievements);
          }
        }

        // Add activity entry
        await addActivityEntry(firebaseUser.uid, {
          type: 'game',
          description: `Completed ${gameName} with score ${score.toLocaleString()}`,
          date: new Date(),
          icon: getGameIcon(gameType),
          meta: { score, xp, game: gameType }
        });

        // Refresh user profile to update local state
        await refreshUser();
      }
    } catch (error) {
      console.error('Error completing game:', error);
    }

    // Navigate to results
    navigate('/results', { state: { score, game: gameName, gameType } });
  }, [user, firebaseUser, gameType, gameName, navigate, showAchievements, showLevelUp, refreshUser]);

  return { completeGame };
}

function getGameIcon(gameType: GameType): string {
  const icons: Record<GameType, string> = {
    'asteroids': '☄️',
    'pacman-math': '👻',
    'ph-invaders': '🧪',
    'pong-arithmetic': '🏓',
  };
  return icons[gameType] || '🎮';
}


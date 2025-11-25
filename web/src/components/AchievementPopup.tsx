/**
 * Achievement Popup Component
 * 
 * Pixel-style notification that appears when an achievement is unlocked.
 * Slides in from top-right, displays for 4 seconds, then fades out.
 */

import React, { useEffect, useState } from 'react';
import type { Achievement } from '../types/user';

interface AchievementPopupProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export default function AchievementPopup({ achievement, onDismiss }: AchievementPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (achievement) {
      // Trigger entrance animation
      setIsVisible(true);
      setIsExiting(false);

      // Start exit after 4 seconds
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 4000);

      // Fully dismiss after exit animation completes
      const dismissTimer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 4500);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(dismissTimer);
      };
    } else {
      setIsVisible(false);
      setIsExiting(false);
    }
  }, [achievement, onDismiss]);

  if (!achievement || !isVisible) return null;

  return (
    <div
      className={`
        fixed top-4 right-4 z-[9999]
        transform transition-all duration-500 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-neon-yellow/30 blur-xl rounded-xl animate-pulse" />
        
        {/* Main popup */}
        <div className="relative bg-gray-900 border-4 border-neon-yellow rounded-xl p-4 min-w-[300px] shadow-[0_0_30px_rgba(255,215,0,0.5)]">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 border-b border-neon-yellow/30 pb-2">
            <span className="text-neon-yellow text-lg">🏆</span>
            <span className="font-['Press_Start_2P'] text-[10px] text-neon-yellow tracking-wider animate-pulse">
              ACHIEVEMENT UNLOCKED!
            </span>
          </div>

          {/* Content */}
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="w-16 h-16 bg-neon-yellow/20 border-2 border-neon-yellow rounded-lg flex items-center justify-center text-3xl animate-bounce">
              {achievement.icon}
            </div>

            {/* Details */}
            <div className="flex-1">
              <h3 className="font-['Press_Start_2P'] text-white text-xs mb-1">
                {achievement.name}
              </h3>
              <p className="text-gray-400 text-[10px] mb-2">
                {achievement.description}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-neon-green font-['Press_Start_2P'] text-[10px]">
                  +{achievement.xpReward} XP
                </span>
              </div>
            </div>
          </div>

          {/* Pixel corners decoration */}
          <div className="absolute top-0 left-0 w-2 h-2 bg-neon-yellow" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-neon-yellow" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-neon-yellow" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-neon-yellow" />

          {/* Sparkle effects */}
          <div className="absolute -top-1 -right-1 text-neon-yellow text-sm animate-ping">✨</div>
          <div className="absolute -bottom-1 -left-1 text-neon-yellow text-sm animate-ping animation-delay-200">✨</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Level Up Popup - shown when user levels up
 */
export function LevelUpPopup({ 
  newLevel, 
  onDismiss 
}: { 
  newLevel: number | null; 
  onDismiss: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (newLevel) {
      setIsVisible(true);
      setIsExiting(false);

      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 3000);

      const dismissTimer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 3500);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(dismissTimer);
      };
    } else {
      setIsVisible(false);
      setIsExiting(false);
    }
  }, [newLevel, onDismiss]);

  if (!newLevel || !isVisible) return null;

  return (
    <div
      className={`
        fixed top-24 right-4 z-[9998]
        transform transition-all duration-500 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-neon-cyan/30 blur-xl rounded-xl animate-pulse" />
        
        {/* Main popup */}
        <div className="relative bg-gray-900 border-4 border-neon-cyan rounded-xl p-4 min-w-[250px] shadow-[0_0_30px_rgba(0,255,255,0.5)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neon-cyan/20 border-2 border-neon-cyan rounded-lg flex items-center justify-center text-2xl animate-bounce">
              ⬆️
            </div>
            <div>
              <span className="font-['Press_Start_2P'] text-[10px] text-neon-cyan block mb-1">
                LEVEL UP!
              </span>
              <span className="font-['Press_Start_2P'] text-white text-lg">
                Level {newLevel}
              </span>
            </div>
          </div>

          {/* Pixel corners */}
          <div className="absolute top-0 left-0 w-2 h-2 bg-neon-cyan" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-neon-cyan" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-neon-cyan" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-neon-cyan" />
        </div>
      </div>
    </div>
  );
}


/**
 * Achievement Badge Component
 * 
 * Displays an achievement with icon, name, and unlock status.
 * Features pixel art styling with hover tooltips.
 */

import type { Achievement } from '../types/user';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

export default function AchievementBadge({ 
  achievement, 
  size = 'medium',
  showTooltip = true 
}: AchievementBadgeProps) {
  const sizeClasses = {
    small: 'w-10 h-10 text-lg',
    medium: 'w-14 h-14 text-2xl',
    large: 'w-20 h-20 text-4xl',
  };

  const borderColor = achievement.isUnlocked ? 'border-neon-yellow' : 'border-gray-700';
  const bgColor = achievement.isUnlocked ? 'bg-neon-yellow/10' : 'bg-gray-900';
  const iconOpacity = achievement.isUnlocked ? 'opacity-100' : 'opacity-30 grayscale';

  // Convert Firestore Timestamp to Date if needed
  const getUnlockedDate = (): Date | null => {
    if (!achievement.unlockedAt) return null;
    
    if (achievement.unlockedAt instanceof Date) {
      return achievement.unlockedAt;
    }
    
    // Handle Firestore Timestamp with toMillis method
    if (achievement.unlockedAt.toMillis && typeof achievement.unlockedAt.toMillis === 'function') {
      return new Date(achievement.unlockedAt.toMillis());
    }
    
    // Handle Firestore Timestamp with seconds property
    if (achievement.unlockedAt.seconds && typeof achievement.unlockedAt.seconds === 'number') {
      return new Date(achievement.unlockedAt.seconds * 1000);
    }
    
    // Try to convert to Date
    try {
      const date = new Date(achievement.unlockedAt as any);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  const unlockedDate = getUnlockedDate();

  return (
    <div className="group relative" style={{ zIndex: 'auto' }}>
      {/* Badge */}
      <div 
        className={`
          ${sizeClasses[size]}
          ${bgColor}
          ${borderColor}
          border-2 rounded-lg
          flex items-center justify-center
          transition-all duration-300
          ${achievement.isUnlocked ? 'hover:scale-110 hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]' : 'cursor-not-allowed'}
        `}
      >
        <span className={`${iconOpacity} transition-all duration-300`}>
          {achievement.icon}
        </span>

        {/* Glow Effect (Unlocked Only) */}
        {achievement.isUnlocked && (
          <div className="absolute inset-0 bg-neon-yellow/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" 
          style={{ zIndex: 10000, position: 'absolute' }}
        >
          <div className="bg-gray-900 border-2 border-neon-cyan rounded-lg p-3 whitespace-nowrap shadow-xl">
            <div className="text-xs font-['Press_Start_2P'] text-neon-cyan mb-1">
              {achievement.name}
            </div>
            <div className="text-xs text-gray-300 max-w-xs whitespace-normal">
              {achievement.description}
            </div>
            <div className="text-xs text-neon-yellow mt-1">
              +{achievement.xpReward} XP
            </div>
            {achievement.isUnlocked && unlockedDate && (
              <div className="text-xs text-gray-500 mt-1">
                Unlocked {unlockedDate.toLocaleDateString()}
              </div>
            )}
            {!achievement.isUnlocked && (
              <div className="text-xs text-gray-500 mt-1 italic">
                🔒 Locked
              </div>
            )}
          </div>
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-gray-900 border-r-2 border-b-2 border-neon-cyan rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}


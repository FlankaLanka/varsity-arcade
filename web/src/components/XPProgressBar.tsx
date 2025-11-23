/**
 * XP Progress Bar Component
 * 
 * Displays player's current level and progress to next level.
 * Features retro pixel art styling with neon glow effects.
 */

import { getXPProgress } from '../utils/xpSystem';

interface XPProgressBarProps {
  currentXP: number;
  currentLevel: number;
  compact?: boolean;
}

export default function XPProgressBar({ currentXP, currentLevel, compact = false }: XPProgressBarProps) {
  const { current, next, progress } = getXPProgress(currentXP, currentLevel);

  return (
    <div className={`${compact ? 'space-y-1' : 'space-y-2'}`}>
      {/* Level Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-neon-cyan/20 border border-neon-cyan rounded">
            <span className="text-xs font-['Press_Start_2P'] text-neon-cyan">
              LVL {currentLevel}
            </span>
          </div>
          {!compact && (
            <span className="text-xs text-gray-400">
              {current} / {next} XP
            </span>
          )}
        </div>
        <span className="text-xs font-['Press_Start_2P'] text-neon-pink">
          {Math.floor(progress)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-4 bg-gray-900 border-2 border-neon-cyan/50 rounded overflow-hidden">
        {/* Background Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0, 255, 255, 0.3) 4px, rgba(0, 255, 255, 0.3) 5px)',
          }}
        />
        
        {/* Fill Bar */}
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-cyan via-neon-pink to-neon-yellow transition-all duration-500 ease-out"
          style={{ 
            width: `${progress}%`,
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
          }}
        >
          {/* Shine Effect */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
          />
        </div>

        {/* Scanline Effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.2) 2px, rgba(0, 0, 0, 0.2) 4px)',
          }}
        />
      </div>

      {/* XP Text (Compact Mode) */}
      {compact && (
        <div className="text-center">
          <span className="text-xs text-gray-400">
            {current} / {next} XP
          </span>
        </div>
      )}
    </div>
  );
}


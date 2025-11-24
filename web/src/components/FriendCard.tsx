/**
 * Friend Card Component
 * 
 * Displays a friend with avatar, username, online status, and current activity.
 * Features pixel art styling consistent with the arcade theme.
 */

import type { KeyboardEvent } from 'react';
import type { Friend } from '../types/user';
import { formatActivityText } from '../data/mockFriendsData';

interface FriendCardProps {
  friend: Friend;
  onClick?: (friend: Friend) => void;
}

export default function FriendCard({ friend, onClick }: FriendCardProps) {
  const statusColor = friend.isOnline ? 'bg-neon-green' : 'bg-gray-600';
  const statusGlow = friend.isOnline ? 'shadow-[0_0_10px_rgba(0,255,0,0.5)]' : '';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(friend);
    }
  };

  // Default pixel art avatar (8x8 grid pattern)
  const defaultAvatar = (
    <svg width="32" height="32" viewBox="0 0 8 8" className="pixelated">
      <rect x="2" y="1" width="4" height="1" fill="#00ffff" />
      <rect x="1" y="2" width="6" height="3" fill="#00ffff" />
      <rect x="2" y="3" width="1" height="1" fill="#000000" />
      <rect x="5" y="3" width="1" height="1" fill="#000000" />
      <rect x="3" y="4" width="2" height="1" fill="#ff006e" />
      <rect x="1" y="5" width="2" height="2" fill="#00ffff" />
      <rect x="5" y="5" width="2" height="2" fill="#00ffff" />
      <rect x="3" y="6" width="2" height="2" fill="#00ffff" />
    </svg>
  );

  // Activity-specific colors
  const activityColors = {
    'asteroids': 'text-purple-400',
    'pacman-math': 'text-yellow-400',
    'ph-invaders': 'text-green-400',
    'online': 'text-gray-400',
    'offline': 'text-gray-600',
  };

  return (
    <div 
      className={`
        flex items-center gap-3 p-3 
        bg-gray-900/50 border border-gray-700
        rounded-lg
        transition-all duration-200
        ${onClick ? 'hover:bg-gray-800/70 hover:border-neon-cyan cursor-pointer' : ''}
      `}
      onClick={() => onClick?.(friend)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Avatar with Status Indicator */}
      <div className="relative flex-shrink-0">
        {/* Avatar */}
        <div className="w-10 h-10 bg-gray-800 border-2 border-neon-cyan rounded-lg overflow-hidden flex items-center justify-center">
          {friend.avatar ? (
            <img 
              src={friend.avatar} 
              alt={friend.displayName}
              className="w-full h-full object-cover pixelated"
            />
          ) : (
            defaultAvatar
          )}
        </div>

        {/* Online Status Indicator */}
        <div 
          className={`
            absolute -bottom-1 -right-1
            w-3 h-3 rounded-full border-2 border-gray-900
            ${statusColor} ${statusGlow}
            ${friend.isOnline ? 'animate-pulse' : ''}
          `}
        />
      </div>

      {/* Friend Info */}
      <div className="flex-1 min-w-0">
        {/* Username */}
        <div className="text-sm font-['Press_Start_2P'] text-white truncate">
          {friend.displayName}
        </div>

        {/* Activity */}
        <div className={`text-xs ${activityColors[friend.currentActivity]} truncate mt-1`}>
          {formatActivityText(friend.currentActivity)}
        </div>
      </div>

      {/* Activity Icon */}
      {friend.currentActivity !== 'offline' && friend.currentActivity !== 'online' && (
        <div className="flex-shrink-0">
          <div className="w-6 h-6 flex items-center justify-center">
            {friend.currentActivity === 'asteroids' && '☄️'}
            {friend.currentActivity === 'pacman-math' && '👻'}
            {friend.currentActivity === 'ph-invaders' && '🧪'}
          </div>
        </div>
      )}
    </div>
  );
}


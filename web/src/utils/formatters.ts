import type { Friend } from '../types/user';

export const formatActivityText = (friend: Friend): string => {
  if (!friend.isOnline) return 'Offline';
  
  switch (friend.currentActivity) {
    case 'asteroids': return 'Playing Asteroids';
    case 'pacman-math': return 'Playing Pac-Man Math';
    case 'ph-invaders': return 'Playing pH Invaders';
    case 'online': return 'Online';
    default: return 'Online';
  }
};

export const formatLastSeen = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};


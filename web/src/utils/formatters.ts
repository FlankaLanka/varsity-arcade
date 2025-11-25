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

export const formatLastSeen = (date: Date | any): string => {
  // Convert Firestore Timestamp to Date if needed
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (date?.toMillis && typeof date.toMillis === 'function') {
    // Firestore Timestamp with toMillis method
    dateObj = new Date(date.toMillis());
  } else if (date?.toDate && typeof date.toDate === 'function') {
    // Firestore Timestamp with toDate method
    dateObj = date.toDate();
  } else if (date?.seconds && typeof date.seconds === 'number') {
    // Firestore Timestamp with seconds property
    dateObj = new Date(date.seconds * 1000);
  } else {
    // Try to convert to Date
    try {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Unknown';
      }
    } catch {
      return 'Unknown';
    }
  }
  
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

/**
 * Generates a consistent random color for a user based on their ID.
 * Uses a simple hash function to ensure the same user always gets the same color.
 */
export const getUserColor = (userId: string): string => {
  // Simple hash function to convert userId to a number
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate RGB values with good saturation and brightness
  // Use modulo to ensure values are in valid range
  const r = Math.abs(hash) % 200 + 55; // 55-255 for good visibility
  const g = Math.abs(hash * 7) % 200 + 55;
  const b = Math.abs(hash * 13) % 200 + 55;
  
  // Convert to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};


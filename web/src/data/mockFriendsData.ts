/**
 * Mock Friends Data
 * 
 * Mock friend list with online status and current activity.
 * In production, this would come from Firebase Realtime DB with presence detection.
 */

import type { Friend } from '../types/user';

export const mockFriends: Friend[] = [
  {
    id: 'friend-1',
    username: 'nova_star',
    displayName: 'Nova Star',
    avatar: undefined, // Will use default
    isOnline: true,
    currentActivity: 'pacman-math',
    lastSeen: new Date(),
  },
  {
    id: 'friend-2',
    username: 'cosmic_ace',
    displayName: 'Cosmic Ace',
    avatar: undefined,
    isOnline: true,
    currentActivity: 'online',
    lastSeen: new Date(),
  },
  {
    id: 'friend-3',
    username: 'astro_pilot',
    displayName: 'Astro Pilot',
    avatar: undefined,
    isOnline: true,
    currentActivity: 'asteroids',
    lastSeen: new Date(),
  },
  {
    id: 'friend-4',
    username: 'chem_wizard',
    displayName: 'Chem Wizard',
    avatar: undefined,
    isOnline: true,
    currentActivity: 'ph-invaders',
    lastSeen: new Date(),
  },
  {
    id: 'friend-5',
    username: 'pixel_ghost',
    displayName: 'Pixel Ghost',
    avatar: undefined,
    isOnline: false,
    currentActivity: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: 'friend-6',
    username: 'galaxy_brain',
    displayName: 'Galaxy Brain',
    avatar: undefined,
    isOnline: false,
    currentActivity: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: 'friend-7',
    username: 'space_cadet',
    displayName: 'Space Cadet',
    avatar: undefined,
    isOnline: true,
    currentActivity: 'online',
    lastSeen: new Date(),
  },
];

/**
 * Get online friends
 */
export function getOnlineFriends(): Friend[] {
  return mockFriends.filter(f => f.isOnline);
}

/**
 * Get offline friends
 */
export function getOfflineFriends(): Friend[] {
  return mockFriends.filter(f => !f.isOnline);
}

/**
 * Get friends playing a specific game
 */
export function getFriendsPlayingGame(gameType: 'asteroids' | 'pacman-math' | 'ph-invaders'): Friend[] {
  return mockFriends.filter(f => f.currentActivity === gameType);
}

/**
 * Format activity text for display
 */
export function formatActivityText(activity: Friend['currentActivity']): string {
  switch (activity) {
    case 'asteroids':
      return 'Playing Asteroids';
    case 'pacman-math':
      return 'Playing Pac-Man: Math Blitz';
    case 'ph-invaders':
      return 'Playing pH Invaders';
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
}

/**
 * Format last seen time
 */
export function formatLastSeen(lastSeen: Date): string {
  const now = Date.now();
  const diff = now - lastSeen.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}


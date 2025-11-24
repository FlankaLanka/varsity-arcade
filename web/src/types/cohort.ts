export type CohortPrivacy = 'public' | 'friends' | 'private';

export interface Cohort {
  id: string;
  title: string;
  privacy: CohortPrivacy;
  ownerId: string;
  memberIds: string[];
  inviteCode?: string;
  createdAt: Date;
  description?: string;
  settings?: {
    maxMembers?: number;
  };
}

export interface CohortMember {
  userId: string;
  displayName: string;
  avatar?: string;
  joinedAt: Date;
  isOnline: boolean;
  position?: {
    x: number;
    y: number;
  }; // For whiteboard display
}

export interface WhiteboardDrawing {
  id: string;
  path: { x: number; y: number }[]; // Array of points
  color: string;
  brushSize: number;
  timestamp: number;
  type: 'path'; // extensible for shapes later
}

// Battle Mode Types

export interface PhysicsObject {
  id: string;
  bodyId: number; // matter.js body id
  originalDrawingId: string;
  type: 'static' | 'dynamic';
}

export interface Player {
  id: string; // userId
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  angle: number;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  score: number;
  color: string;
  lastShotTime: number;
}

export interface Projectile {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  radius: number;
  damage: number;
  ownerId: string;
  color: string;
}

export interface VoiceChatState {
  userId: string;
  isMuted: boolean;
  isSpeaking: boolean;
  volume: number; // 0-100
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}


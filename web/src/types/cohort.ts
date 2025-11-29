export type CohortPrivacy = 'public' | 'friends' | 'private';

export interface Cohort {
  id: string;
  title: string;
  privacy: CohortPrivacy;
  ownerId: string;
  inviteCode?: string;
  createdAt: Date;
  description?: string;
  subjectCategory: string;
  subjectSubcategory: string;
  settings?: {
    maxMembers?: number;
  };
}

export interface CohortProblem {
  id: string;
  question: string;
  category: string;
  subcategory: string;
  hint?: string;
  answer?: string; // The correct answer for verification
}

export interface CohortMember {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: Date;
  accountType?: 'student' | 'teacher'; // Account type for member list display
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
  userId?: string; // User who created this drawing (for undo/redo)
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
  userId?: string; // For user messages
  username?: string; // For user messages
  imageUrl?: string; // Optional image URL for AI messages with whiteboard preview
}

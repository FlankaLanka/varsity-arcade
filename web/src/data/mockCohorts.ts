import type { Cohort, CohortMember, CohortPrivacy } from '../types/cohort';
import { mockUserProfile } from './mockUserData';
import { mockFriends } from './mockFriendsData';

// Mock initial data
const INITIAL_COHORTS: Cohort[] = [
  {
    id: 'c1',
    title: 'Algebra Study Session',
    privacy: 'public',
    ownerId: 'u2', // Someone else
    memberIds: ['u2', 'u3', 'u4'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    description: 'Working on quadratic equations and polynomials.',
    settings: { maxMembers: 10 }
  },
  {
    id: 'c2',
    title: 'Physics Lab Prep',
    privacy: 'friends',
    ownerId: 'f1', // A friend
    memberIds: ['f1', 'f2'],
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    description: 'Preparing for the upcoming mechanics lab.',
    settings: { maxMembers: 5 }
  },
  {
    id: 'c3',
    title: 'Calculus Cram',
    privacy: 'public',
    ownerId: 'u5',
    memberIds: ['u5', 'u6'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    description: 'Derivatives and integrals practice.',
    settings: { maxMembers: 8 }
  },
  {
    id: 'c4',
    title: 'Chemistry Group',
    privacy: 'private',
    ownerId: 'u1', // Current user
    memberIds: ['u1', 'f3'],
    inviteCode: 'CHEM2025',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    description: 'Private study group for chemistry test.',
    settings: { maxMembers: 4 }
  }
];

// Mock members data map (simplified)
const MOCK_MEMBERS: Record<string, CohortMember> = {
  'u1': {
    userId: 'u1',
    displayName: mockUserProfile.displayName,
    avatar: mockUserProfile.avatar,
    joinedAt: new Date(),
    isOnline: true
  },
  'f1': {
    userId: 'f1',
    displayName: 'Alex Chen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    joinedAt: new Date(),
    isOnline: true
  },
  'f2': {
    userId: 'f2',
    displayName: 'Sarah Jones',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    joinedAt: new Date(),
    isOnline: false
  },
  // Add more mock members as needed
};

// In-memory store
let cohorts = [...INITIAL_COHORTS];

// Helpers

export const getPublicCohorts = (): Cohort[] => {
  return cohorts.filter(c => c.privacy === 'public');
};

export const getFriendsCohorts = (): Cohort[] => {
  const friendIds = mockFriends.map(f => f.id);
  // Returns cohorts where owner is a friend or contains friends
  return cohorts.filter(c => 
    c.privacy !== 'private' && 
    (friendIds.includes(c.ownerId) || c.memberIds.some(id => friendIds.includes(id)))
  );
};

export const getCohortById = (id: string): Cohort | undefined => {
  return cohorts.find(c => c.id === id);
};

export const createCohort = (
  title: string, 
  privacy: CohortPrivacy, 
  description?: string
): Cohort => {
  const newCohort: Cohort = {
    id: `c${Date.now()}`,
    title,
    privacy,
    ownerId: mockUserProfile.id,
    memberIds: [mockUserProfile.id],
    createdAt: new Date(),
    description,
    inviteCode: privacy === 'private' ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
    settings: { maxMembers: 10 }
  };
  
  cohorts.push(newCohort);
  return newCohort;
};

export const joinCohort = (cohortId: string): boolean => {
  const cohort = cohorts.find(c => c.id === cohortId);
  if (!cohort) return false;
  
  if (!cohort.memberIds.includes(mockUserProfile.id)) {
    cohort.memberIds.push(mockUserProfile.id);
    return true;
  }
  return false;
};

export const getCohortMembers = (cohortId: string): CohortMember[] => {
  const cohort = getCohortById(cohortId);
  if (!cohort) return [];
  
  return cohort.memberIds.map(id => {
    // Return mock member or generate one if missing
    return MOCK_MEMBERS[id] || {
      userId: id,
      displayName: `User ${id}`,
      joinedAt: new Date(),
      isOnline: Math.random() > 0.5
    };
  });
};


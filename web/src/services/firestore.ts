import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  addDoc,
  query, 
  where, 
  arrayUnion,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, rtdb } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import type { UserProfile, GameType, ActivityEntry } from '../types/user';
import type { Cohort, CohortMember, CohortPrivacy } from '../types/cohort';
import { calculateLevel, calculateCohortSolveXP, calculateBattleWinXP } from '../utils/xpSystem';

// --- User Services ---

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
};

export const updateUserStats = async (
  userId: string, 
  gameType: GameType, 
  score: number, 
  xp: number
): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', userId);
  
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return null;
  
  const userData = userDoc.data() as UserProfile;
  const currentStats = userData.gameStats[gameType] || { highScore: 0, gamesPlayed: 0, totalXP: 0, bestStreak: 0 };
  
  const newStats = {
    highScore: Math.max(currentStats.highScore, score),
    gamesPlayed: currentStats.gamesPlayed + 1,
    totalXP: currentStats.totalXP + xp,
    bestStreak: currentStats.bestStreak // Streak logic needs more context, keeping as is
  };

  const newTotalXP = userData.totalXP + xp;
  const newLevel = calculateLevel(newTotalXP);
  const newGamesPlayed = userData.gamesPlayed + 1;
  const newGamesCompleted = userData.gamesCompleted + 1;

  await updateDoc(userRef, {
    [`gameStats.${gameType}`]: newStats,
    totalScore: userData.totalScore + score,
    totalXP: newTotalXP,
    level: newLevel,
    gamesPlayed: newGamesPlayed,
    gamesCompleted: newGamesCompleted
  });

  // Return updated profile
  return {
    ...userData,
    gameStats: { ...userData.gameStats, [gameType]: newStats },
    totalScore: userData.totalScore + score,
    totalXP: newTotalXP,
    level: newLevel,
    gamesPlayed: newGamesPlayed,
    gamesCompleted: newGamesCompleted
  };
};

// --- Cohort Services ---

export const createCohort = async (
  title: string, 
  privacy: CohortPrivacy, 
  ownerId: string,
  maxMembers: number,
  subjectCategory: string,
  subjectSubcategory: string,
  description?: string
): Promise<Cohort> => {
  const cohortData: any = {
    title,
    privacy,
    ownerId,
    subjectCategory,
    subjectSubcategory,
    createdAt: Timestamp.now(),
    settings: { maxMembers: Math.min(5, Math.max(1, maxMembers)) } // Clamp between 1-5
  };

  if (description) {
    cohortData.description = description;
  }

  if (privacy === 'private') {
    cohortData.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  const docRef = await addDoc(collection(db, 'cohorts'), cohortData);
  
  // Update the doc with its own ID
  await updateDoc(docRef, { id: docRef.id });
  
  // Return with converted date
  const cohortSnap = await getDoc(docRef);
  const data = cohortSnap.data();
  return {
    ...data,
    id: docRef.id,
    createdAt: data?.createdAt?.toDate() || new Date()
  } as Cohort;
};

export const getPublicCohorts = async (): Promise<Cohort[]> => {
  const q = query(collection(db, 'cohorts'), where('privacy', '==', 'public'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date())
    } as Cohort;
  });
};

export const getCohortById = async (cohortId: string): Promise<Cohort | null> => {
  const docRef = doc(db, 'cohorts', cohortId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date())
  } as Cohort;
};

// No-op: Joining is now just entering the room (handled by RTDB presence)
export const joinCohort = async (_cohortId: string, _userId: string): Promise<boolean> => {
  return true;
};

// No-op: Leaving is now just disconnecting/removing presence
export const leaveCohort = async (_cohortId: string, _userId: string): Promise<boolean> => {
  return true;
};

export const deleteCohort = async (cohortId: string, userId: string): Promise<boolean> => {
  const cohortRef = doc(db, 'cohorts', cohortId);
  const cohortSnap = await getDoc(cohortRef);
  
  if (!cohortSnap.exists()) return false;
  
  const cohort = cohortSnap.data() as Cohort;
  
  // Only owner can delete
  if (cohort.ownerId !== userId) {
    throw new Error('Only the cohort owner can delete this cohort');
  }
  
  await deleteDoc(cohortRef);
  
  return true;
};

export const getCohortMembers = async (cohortId: string): Promise<CohortMember[]> => {
  // Read members from RTDB presence
  const presenceRef = ref(rtdb, `cohorts/${cohortId}/presence`);
  const snapshot = await get(presenceRef);
  const presenceData = snapshot.val();
  
  if (!presenceData) return [];
  
  const memberIds = Object.keys(presenceData);
  const members: CohortMember[] = [];
  
  for (const id of memberIds) {
    const userProfile = await getUserProfile(id);
    if (userProfile) {
      members.push({
        userId: userProfile.id,
        username: userProfile.username,
        avatar: userProfile.avatar,
        joinedAt: new Date() // Current session join time
      });
    }
  }
  
  return members;
};

// --- Friend Services ---

/**
 * Search for users by username (case-insensitive partial match)
 */
export const searchUsersByUsername = async (searchTerm: string, currentUserId: string): Promise<UserProfile[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  // Firestore doesn't support case-insensitive search natively
  // We'll do a range query and filter client-side for partial matches
  const usersRef = collection(db, 'users');
  const q = query(usersRef);
  const querySnapshot = await getDocs(q);
  
  const searchLower = searchTerm.toLowerCase();
  const results: UserProfile[] = [];
  
  querySnapshot.docs.forEach(docSnap => {
    const data = docSnap.data() as UserProfile;
    // Skip current user
    if (data.id === currentUserId) return;
    
    // Case-insensitive partial match
    if (data.username.toLowerCase().includes(searchLower)) {
      results.push(data);
    }
  });
  
  return results.slice(0, 10); // Limit to 10 results
};

/**
 * Add a friend to user's friends list
 */
export const addFriend = async (userId: string, friendId: string): Promise<boolean> => {
  // This updates the 'friends' array in the user document
  
  // Fetch friend profile to store summary
  const friendProfile = await getUserProfile(friendId);
  if (!friendProfile) return false;

  // Check if already friends
  const userProfile = await getUserProfile(userId);
  if (userProfile?.friends?.some(f => f.id === friendId)) {
    return false; // Already friends
  }

  const friendSummary: Friend = {
    id: friendProfile.id,
    username: friendProfile.username,
    ...(friendProfile.avatar && { avatar: friendProfile.avatar }), // Only include avatar if it exists
    isOnline: false,
    currentActivity: 'offline',
    lastSeen: new Date()
  };

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    friends: arrayUnion(friendSummary)
  });
  
  return true;
};

/**
 * Remove a friend from user's friends list
 */
export const removeFriend = async (userId: string, friendId: string): Promise<boolean> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data() as UserProfile;
  const updatedFriends = userData.friends?.filter(f => f.id !== friendId) || [];
  
  await updateDoc(userRef, {
    friends: updatedFriends
  });
  
  return true;
};

// --- Activity History Services ---

/**
 * Add an activity entry to user's activity history
 */
export const addActivityEntry = async (
  userId: string,
  entry: Omit<ActivityEntry, 'id'>
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  
  // Filter out undefined values to avoid Firestore errors
  const activityEntry: ActivityEntry = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: entry.type,
    description: entry.description,
    date: entry.date,
    ...(entry.icon && { icon: entry.icon }),
    ...(entry.meta && { meta: entry.meta }),
  };
  
  await updateDoc(userRef, {
    activityHistory: arrayUnion(activityEntry)
  });
};

/**
 * Grant XP for solving a problem in a cohort room
 */
export const grantCohortSolveXP = async (
  userId: string
): Promise<{ xpGranted: number; newLevel?: number; updatedProfile: UserProfile | null }> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    return { xpGranted: 0, updatedProfile: null };
  }
  
  const userData = userDoc.data() as UserProfile;
  const xpGranted = calculateCohortSolveXP(userData.currentStreak);
  const newTotalXP = userData.totalXP + xpGranted;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > userData.level;
  
  await updateDoc(userRef, {
    totalXP: newTotalXP,
    level: newLevel
  });
  
  // Add activity entry
  await addActivityEntry(userId, {
    type: 'cohort-solve',
    description: 'Solved a problem in cohort room',
    date: new Date(),
    icon: '✅',
    meta: { xp: xpGranted }
  });
  
  const updatedProfile = {
    ...userData,
    totalXP: newTotalXP,
    level: newLevel
  };
  
  return { 
    xpGranted, 
    newLevel: leveledUp ? newLevel : undefined,
    updatedProfile
  };
};

/**
 * Grant XP for winning a battle in a cohort room
 */
export const grantBattleWinXP = async (
  userId: string
): Promise<{ xpGranted: number; newLevel?: number; updatedProfile: UserProfile | null }> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    return { xpGranted: 0, updatedProfile: null };
  }
  
  const userData = userDoc.data() as UserProfile;
  const xpGranted = calculateBattleWinXP(userData.currentStreak);
  const newTotalXP = userData.totalXP + xpGranted;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > userData.level;
  
  await updateDoc(userRef, {
    totalXP: newTotalXP,
    level: newLevel
  });
  
  // Add activity entry
  await addActivityEntry(userId, {
    type: 'cohort-battle',
    description: 'Won a cohort battle',
    date: new Date(),
    icon: '⚔️',
    meta: { xp: xpGranted }
  });
  
  const updatedProfile = {
    ...userData,
    totalXP: newTotalXP,
    level: newLevel
  };
  
  return { 
    xpGranted, 
    newLevel: leveledUp ? newLevel : undefined,
    updatedProfile
  };
};

/**
 * Get user's cohort statistics (for achievement checking)
 */
export const getUserCohortStats = async (userId: string): Promise<{ solves: number; battleWins: number }> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    return { solves: 0, battleWins: 0 };
  }
  
  const userData = userDoc.data() as UserProfile;
  
  // Count from activity history
  const solves = userData.activityHistory?.filter(a => a.type === 'cohort-solve').length || 0;
  const battleWins = userData.activityHistory?.filter(a => a.type === 'cohort-battle').length || 0;
  
  return { solves, battleWins };
};

/**
 * Get leaderboard data for a specific game type
 */
export const getLeaderboard = async (
  gameType: GameType,
  limit: number = 50
): Promise<Array<{ userId: string; username: string; score: number; avatar?: string }>> => {
  const usersRef = collection(db, 'users');
  const usersSnapshot = await getDocs(usersRef);
  
  const leaderboard: Array<{ userId: string; username: string; score: number; avatar?: string }> = [];
  
  usersSnapshot.forEach((doc) => {
    const userData = doc.data() as UserProfile;
    const gameStats = userData.gameStats?.[gameType];
    
    if (gameStats && gameStats.highScore > 0) {
      leaderboard.push({
        userId: doc.id,
        username: userData.username,
        score: gameStats.highScore,
        avatar: userData.avatar,
      });
    }
  });
  
  // Sort by score descending
  leaderboard.sort((a, b) => b.score - a.score);
  
  // Return top N entries
  return leaderboard.slice(0, limit);
};

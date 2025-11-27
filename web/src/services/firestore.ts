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
  arrayRemove,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, rtdb } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import type { UserProfile, GameType, ActivityEntry, Notification, Challenge } from '../types/user';
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
 * Send a friend request (creates notification instead of directly adding)
 */
export const sendFriendRequest = async (requesterId: string, requestedId: string): Promise<boolean> => {
  // Fetch both profiles
  const requesterProfile = await getUserProfile(requesterId);
  const requestedProfile = await getUserProfile(requestedId);
  
  if (!requesterProfile || !requestedProfile) return false;

  // Check if already friends (both directions)
  if (requesterProfile.friends?.some(f => f.id === requestedId) ||
      requestedProfile.friends?.some(f => f.id === requesterId)) {
    return false; // Already friends
  }

  // Check if there's already a pending friend request (both directions)
  const requestedUserNotifications = requestedProfile.notifications || [];
  const requesterUserNotifications = requesterProfile.notifications || [];
  
  const hasPendingRequestToThem = requestedUserNotifications.some(
    n => n.type === 'friend-request' && 
         n.meta?.requesterId === requesterId && 
         !n.read
  );
  
  const hasPendingRequestFromThem = requesterUserNotifications.some(
    n => n.type === 'friend-request' && 
         n.meta?.requesterId === requestedId && 
         !n.read
  );
  
  if (hasPendingRequestToThem || hasPendingRequestFromThem) {
    return false; // Request already pending in either direction
  }

  // Send friend request notification
  await sendNotification(requestedId, {
    type: 'friend-request',
    title: 'Friend Request',
    message: `${requesterProfile.username} wants to be your friend`,
    meta: {
      requesterId: requesterId,
      requesterUsername: requesterProfile.username,
    },
  });
  
  return true;
};

/**
 * Accept a friend request (adds both users to each other's friends list)
 */
export const acceptFriendRequest = async (userId: string, requesterId: string, notificationId?: string): Promise<boolean> => {
  // Fetch both profiles
  const userProfile = await getUserProfile(userId);
  const requesterProfile = await getUserProfile(requesterId);
  
  if (!userProfile || !requesterProfile) return false;

  // Check if already friends
  if (userProfile.friends?.some(f => f.id === requesterId)) {
    return false; // Already friends
  }

  // Create friend summaries
  const requesterFriendSummary: Friend = {
    id: requesterProfile.id,
    username: requesterProfile.username,
    ...(requesterProfile.avatar && { avatar: requesterProfile.avatar }),
    isOnline: false,
    currentActivity: 'offline',
    lastSeen: new Date()
  };

  const userFriendSummary: Friend = {
    id: userProfile.id,
    username: userProfile.username,
    ...(userProfile.avatar && { avatar: userProfile.avatar }),
    isOnline: false,
    currentActivity: 'offline',
    lastSeen: new Date()
  };

  // Add to both users' friends lists
  const userRef = doc(db, 'users', userId);
  const requesterRef = doc(db, 'users', requesterId);
  
  // Remove the notification if notificationId is provided
  const userNotifications = userProfile.notifications || [];
  const notificationToRemove = notificationId ? userNotifications.find(n => n.id === notificationId) : null;
  
  const updates: any = {
    friends: arrayUnion(requesterFriendSummary)
  };
  
  if (notificationToRemove) {
    // Remove the specific notification
    updates.notifications = userNotifications.filter(n => n.id !== notificationId);
  }
  
  await updateDoc(userRef, updates);
  
  await updateDoc(requesterRef, {
    friends: arrayUnion(userFriendSummary)
  });
  
  // Send notification to requester that their friend request was accepted
  await sendNotification(requesterId, {
    type: 'system',
    title: 'Friend Request Accepted',
    message: `${userProfile.username} accepted your friend request`,
  });
  
  return true;
};

/**
 * Reject a friend request (just removes the notification)
 */
export const rejectFriendRequest = async (userId: string, notificationId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return;
  
  const userData = userDoc.data() as UserProfile;
  const notifications = userData.notifications || [];
  
  // Remove the notification
  const updatedNotifications = notifications.filter(n => n.id !== notificationId);
  
  await updateDoc(userRef, {
    notifications: updatedNotifications
  });
};

/**
 * Add a friend to user's friends list (legacy - kept for backwards compatibility)
 * @deprecated Use sendFriendRequest and acceptFriendRequest instead
 */
export const addFriend = async (userId: string, friendId: string): Promise<boolean> => {
  // This is now just an alias for sendFriendRequest for backwards compatibility
  return await sendFriendRequest(userId, friendId);
};

/**
 * Remove a friend from user's friends list (two-way removal)
 */
export const removeFriend = async (userId: string, friendId: string): Promise<boolean> => {
  const userRef = doc(db, 'users', userId);
  const friendRef = doc(db, 'users', friendId);
  
  const userDoc = await getDoc(userRef);
  const friendDoc = await getDoc(friendRef);
  
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data() as UserProfile;
  const updatedUserFriends = userData.friends?.filter(f => f.id !== friendId) || [];
  
  // Remove from current user's friends list
  await updateDoc(userRef, {
    friends: updatedUserFriends
  });
  
  // Remove from friend's friends list (two-way removal)
  if (friendDoc.exists()) {
    const friendData = friendDoc.data() as UserProfile;
    const updatedFriendFriends = friendData.friends?.filter(f => f.id !== userId) || [];
    
    await updateDoc(friendRef, {
      friends: updatedFriendFriends
    });
  }
  
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

// --- Notification Services ---

/**
 * Send a notification to a user
 */
export const sendNotification = async (
  userId: string,
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  
  const notificationData: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...notification,
    createdAt: new Date(),
    read: false,
  };
  
  await updateDoc(userRef, {
    notifications: arrayUnion(notificationData)
  });
};

/**
 * Get user's notifications
 */
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return [];
  
  const userData = userDoc.data() as UserProfile;
  const notifications = userData.notifications || [];
  
  // Convert Firestore Timestamps to Dates
  return notifications.map(notif => ({
    ...notif,
    createdAt: notif.createdAt instanceof Date 
      ? notif.createdAt 
      : (notif.createdAt as any)?.toDate?.() || new Date(notif.createdAt as any),
  }));
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return;
  
  const userData = userDoc.data() as UserProfile;
  const notifications = userData.notifications || [];
  
  const updatedNotifications = notifications.map(notif => 
    notif.id === notificationId ? { ...notif, read: true } : notif
  );
  
  await updateDoc(userRef, {
    notifications: updatedNotifications
  });
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return;
  
  const userData = userDoc.data() as UserProfile;
  const notifications = userData.notifications || [];
  
  const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
  
  await updateDoc(userRef, {
    notifications: updatedNotifications
  });
};

// --- Challenge Services ---

/**
 * Create a challenge and send notification to challenged user
 */
export const createChallenge = async (
  challengerId: string,
  challengedId: string,
  gameType: GameType,
  scoreToBeat: number
): Promise<Challenge> => {
  // Get challenger profile for username
  const challengerProfile = await getUserProfile(challengerId);
  if (!challengerProfile) {
    throw new Error('Challenger profile not found');
  }
  
  // Create challenge document
  const challengeData: Omit<Challenge, 'id' | 'createdAt'> = {
    challengerId,
    challengerUsername: challengerProfile.username,
    challengedId,
    gameType,
    scoreToBeat,
    status: 'pending',
  };
  
  const challengeRef = await addDoc(collection(db, 'challenges'), {
    ...challengeData,
    createdAt: Timestamp.now(),
  });
  
  // Update challenge with its ID
  await updateDoc(challengeRef, { id: challengeRef.id });
  
  const challenge: Challenge = {
    id: challengeRef.id,
    ...challengeData,
    createdAt: new Date(),
  };
  
  // Send notification to challenged user
  await sendNotification(challengedId, {
    type: 'challenge',
    title: 'New Challenge!',
    message: `${challengerProfile.username} challenged you to beat their score of ${scoreToBeat.toLocaleString()} in ${gameType}`,
    meta: {
      challengeId: challengeRef.id,
      challengerId,
      challengerUsername: challengerProfile.username,
      gameType,
      scoreToBeat,
    },
  });
  
  return challenge;
};

/**
 * Get challenge by ID
 */
export const getChallengeById = async (challengeId: string): Promise<Challenge | null> => {
  const challengeRef = doc(db, 'challenges', challengeId);
  const challengeDoc = await getDoc(challengeRef);
  
  if (!challengeDoc.exists()) return null;
  
  const data = challengeDoc.data();
  return {
    id: challengeDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : undefined),
  } as Challenge;
};

/**
 * Update challenge status
 */
export const updateChallengeStatus = async (
  challengeId: string,
  status: Challenge['status'],
  challengerScore?: number
): Promise<void> => {
  const challengeRef = doc(db, 'challenges', challengeId);
  const updateData: any = { status };
  
  if (status === 'completed' || status === 'expired') {
    updateData.completedAt = Timestamp.now();
  }
  
  if (challengerScore !== undefined) {
    updateData.challengerScore = challengerScore;
  }
  
  await updateDoc(challengeRef, updateData);
};

/**
 * Get user's pending challenges (where they are the challenged user)
 */
export const getUserPendingChallenges = async (userId: string): Promise<Challenge[]> => {
  const q = query(
    collection(db, 'challenges'),
    where('challengedId', '==', userId),
    where('status', '==', 'pending')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    } as Challenge;
  });
};

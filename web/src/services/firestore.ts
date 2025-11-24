import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  arrayUnion,
  arrayRemove,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, rtdb } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import type { UserProfile, GameType } from '../types/user';
import type { Cohort, CohortMember, CohortPrivacy } from '../types/cohort';

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
) => {
  const userRef = doc(db, 'users', userId);
  // Note: Deep updates in Firestore can be tricky with dot notation.
  // For simpler implementations, fetching, updating object, and saving back is easier but less atomic.
  // Here we use atomic updates where possible.
  
  // This is a simplified update. In a real app, we'd need to read current stats to calculate new totals
  // or use a cloud function/transaction for atomic increments.
  
  // For now, we will fetch-update-write for simplicity in this migration
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return;
  
  const userData = userDoc.data() as UserProfile;
  const currentStats = userData.gameStats[gameType];
  
  const newStats = {
    highScore: Math.max(currentStats.highScore, score),
    gamesPlayed: currentStats.gamesPlayed + 1,
    totalXP: currentStats.totalXP + xp,
    bestStreak: currentStats.bestStreak // Streak logic needs more context, keeping as is
  };

  await updateDoc(userRef, {
    [`gameStats.${gameType}`]: newStats,
    totalScore: userData.totalScore + score,
    totalXP: userData.totalXP + xp,
    gamesPlayed: userData.gamesPlayed + 1
  });
};

// --- Cohort Services ---

export const createCohort = async (
  title: string, 
  privacy: CohortPrivacy, 
  ownerId: string,
  maxMembers: number,
  description?: string
): Promise<Cohort> => {
  const cohortData: any = {
    title,
    privacy,
    ownerId,
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
export const joinCohort = async (cohortId: string, userId: string): Promise<boolean> => {
  return true;
};

// No-op: Leaving is now just disconnecting/removing presence
export const leaveCohort = async (cohortId: string, userId: string): Promise<boolean> => {
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

export const addFriend = async (userId: string, friendId: string) => {
  // This updates the 'friends' array in the user document
  // A more scalable approach uses a subcollection `users/{userId}/friends/{friendId}`
  
  // Fetch friend profile to store summary
  const friendProfile = await getUserProfile(friendId);
  if (!friendProfile) return;

  const friendSummary = {
    id: friendProfile.id,
    username: friendProfile.username,
    avatar: friendProfile.avatar,
    isOnline: false,
    currentActivity: 'offline',
    lastSeen: new Date()
  };

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    friends: arrayUnion(friendSummary)
  });
};

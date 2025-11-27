import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  type User
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types/user';
import { getAllAchievementsLocked } from '../data/achievements';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export interface SignupData {
  email: string;
  username: string;
  password?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      
      if (currentUser) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            let needsUpdate = false;
            const updates: Record<string, any> = {};
            
            // If user has no achievements or empty achievements, populate with all locked achievements
            if (!userData.achievements || userData.achievements.length === 0) {
              const allAchievements = getAllAchievementsLocked();
              updates.achievements = allAchievements;
              userData.achievements = allAchievements;
              needsUpdate = true;
            }
            
            // Ensure all game stats exist (for users created before pong-arithmetic was added)
            const defaultGameStats = { highScore: 0, gamesPlayed: 0, bestStreak: 0, totalXP: 0 };
            const gameTypes = ['asteroids', 'pacman-math', 'ph-invaders', 'pong-arithmetic'] as const;
            
            if (!userData.gameStats) {
              userData.gameStats = {} as UserProfile['gameStats'];
            }
            
            for (const gameType of gameTypes) {
              if (!userData.gameStats[gameType]) {
                userData.gameStats[gameType] = { ...defaultGameStats };
                updates[`gameStats.${gameType}`] = defaultGameStats;
                needsUpdate = true;
              }
            }
            
            // Ensure notifications array exists
            if (!userData.notifications) {
              userData.notifications = [];
              updates.notifications = [];
              needsUpdate = true;
            }
            
            // Convert Firestore Timestamps to Dates for notifications
            if (userData.notifications && userData.notifications.length > 0) {
              userData.notifications = userData.notifications.map(notif => ({
                ...notif,
                createdAt: notif.createdAt instanceof Date 
                  ? notif.createdAt 
                  : (notif.createdAt as any)?.toDate?.() || new Date(notif.createdAt as any),
              }));
            }
            
            // Apply updates if needed
            if (needsUpdate) {
              await updateDoc(userDocRef, updates);
            }
            
            setUser(userData);
          } else {
            // Fallback or create if missing (should be handled in signup)
            console.warn('User document not found for authenticated user');
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string) => {
    if (!password) throw new Error("Password is required for real authentication");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (data: SignupData) => {
    if (!data.password) throw new Error("Password is required for signup");
    
    // 1. Create Authentication User
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const firebaseUser = userCredential.user;

    // 2. Update Auth Profile
    await updateProfile(firebaseUser, {
      displayName: data.username
    });

    // 3. Create Firestore User Document with all achievements initialized as locked
    const allAchievements = getAllAchievementsLocked();
    
    const newUserProfile: UserProfile = {
      id: firebaseUser.uid,
      username: data.username,
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      gamesPlayed: 0,
      totalScore: 0,
      gamesCompleted: 0,
      achievements: allAchievements,
      dailyQuests: [], // Could initialize with some default quests if defined elsewhere
      friends: [],
      gameStats: {
        'asteroids': { highScore: 0, gamesPlayed: 0, bestStreak: 0, totalXP: 0 },
        'pacman-math': { highScore: 0, gamesPlayed: 0, bestStreak: 0, totalXP: 0 },
        'ph-invaders': { highScore: 0, gamesPlayed: 0, bestStreak: 0, totalXP: 0 },
        'pong-arithmetic': { highScore: 0, gamesPlayed: 0, bestStreak: 0, totalXP: 0 },
      },
      activityHistory: [],
      notifications: []
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
    setUser(newUserProfile);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const refreshUser = async () => {
    if (!firebaseUser) return;
    
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        
        // Convert Firestore Timestamps to Dates for notifications
        if (userData.notifications && userData.notifications.length > 0) {
          userData.notifications = userData.notifications.map(notif => ({
            ...notif,
            createdAt: notif.createdAt instanceof Date 
              ? notif.createdAt 
              : (notif.createdAt as any)?.toDate?.() || new Date(notif.createdAt as any),
          }));
        }
        
        setUser(userData);
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      isAuthenticated: !!user, 
      isLoading,
      login, 
      signup, 
      logout,
      refreshUser
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

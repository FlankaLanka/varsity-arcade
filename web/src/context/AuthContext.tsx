import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  type User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types/user';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
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
            setUser(userDoc.data() as UserProfile);
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

    // 3. Create Firestore User Document
    const newUserProfile: UserProfile = {
      id: firebaseUser.uid,
      username: data.username,
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      gamesPlayed: 0,
      totalScore: 0,
      gamesCompleted: 0,
      achievements: [],
      dailyQuests: [], // Could initialize with some default quests if defined elsewhere
      friends: [],
      gameStats: {
        'asteroids': { highScore: 0, gamesPlayed: 0, bestStreak: 0, totalXP: 0 },
        'pacman-math': { highScore: 0, gamesPlayed: 0, bestStreak: 0, totalXP: 0 },
        'ph-invaders': { highScore: 0, gamesPlayed: 0, bestStreak: 0, totalXP: 0 },
      },
      activityHistory: []
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
    setUser(newUserProfile);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      isAuthenticated: !!user, 
      isLoading,
      login, 
      signup, 
      logout 
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

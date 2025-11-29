import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteCohort, getUserProfile, grantCohortSolveXP, grantBattleWinXP, getUserCohortStats } from '../services/firestore';
import type { Cohort, CohortMember, WhiteboardDrawing, CohortProblem, AIChatMessage } from '../types/cohort';
import type { UserProfile } from '../types/user';
import { isTeacher } from '../types/user';
import Whiteboard from '../components/Whiteboard';
import WhiteboardBattle from '../components/WhiteboardBattle';
import VoiceChatControls from '../components/VoiceChatControls';
import CohortMemberAvatars from '../components/CohortMemberAvatars';
import AIChatInterface from '../components/AIChatInterface';
import TeacherVerificationModal from '../components/TeacherVerificationModal';
import { useAuth } from '../context/AuthContext';
import { useAchievements } from '../context/AchievementContext';
import { rtdb } from '../lib/firebase';
import { ref, onValue, remove, onDisconnect, set, get, update } from 'firebase/database';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, HelpCircle, Lightbulb, AlertCircle } from 'lucide-react';
import { getRandomProblem, getNextProblem } from '../data/problemBank';
import { getUserColor } from '../utils/formatters';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { checkNewAchievements, unlockAchievements } from '../services/achievements';

export default function CohortRoomPage() {
  const { cohortId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<CohortMember[]>([]);
  const [mode, setMode] = useState<'whiteboard' | 'battle'>('whiteboard');
  const [drawings, setDrawings] = useState<WhiteboardDrawing[]>([]);
  const [memberHealths, setMemberHealths] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingNewQuestion, setLoadingNewQuestion] = useState(false);
  const whiteboardSnapshotRef = useRef<(() => Promise<string | null>) | null>(null);
  const [, setSnapshotReady] = useState(false);
  const [currentProblem, setCurrentProblem] = useState<CohortProblem | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [speakingMembers, setSpeakingMembers] = useState<Set<string>>(new Set());
  const [teacherRejected, setTeacherRejected] = useState(false); // Teacher already present - reject join
  
  // Teacher verification modal state
  const [teacherVerificationRequest, setTeacherVerificationRequest] = useState<{
    userId: string;
    username: string;
    problem: CohortProblem | null;
    whiteboardImage: string | null;
    chatHistory: AIChatMessage[];
  } | null>(null);

  // Voice chat hook - only initialize when we have user and cohortId
  const voiceChat = useVoiceChat({
    cohortId: cohortId || '',
    userId: user?.id || '',
    onSpeakingLevelChange: () => {} // Can be used for additional UI feedback if needed
  });

  // Achievement context for showing popups
  const { showAchievements, showLevelUp } = useAchievements();

  // Wrapper to store the snapshot function in a ref and trigger re-render
  const handleSnapshotRequest = useCallback((fn: () => Promise<string | null>) => {
    if (typeof fn === 'function') {
      whiteboardSnapshotRef.current = fn;
      setSnapshotReady(true); // Trigger re-render so AIChatInterface gets the function
    }
  }, []);

  // Handle user presence and leaving on disconnect
  useEffect(() => {
    if (!cohortId || !user?.id || !cohort) return;

    const joinCohort = async () => {
      // Check if user is a teacher trying to join
      if (user && isTeacher(user)) {
        // Check if there's already a teacher in the cohort
        const presenceRef = ref(rtdb, `cohorts/${cohortId}/presence`);
        const presenceSnapshot = await get(presenceRef);
        const presenceData = presenceSnapshot.val();
        
        if (presenceData) {
          const presentUserIds = Object.keys(presenceData);
          
          // Check each present user's profile to see if any is a teacher
          const profiles = await Promise.all(presentUserIds.map(id => getUserProfile(id)));
          const existingTeacher = profiles.find(p => p && isTeacher(p));
          
          if (existingTeacher && existingTeacher.id !== user.id) {
            // Teacher already present - reject this teacher
            setTeacherRejected(true);
            return;
          }
        }
      }

      // Mark user as present in RTDB (all users, including owner)
      const presenceRef = ref(rtdb, `cohorts/${cohortId}/presence/${user.id}`);
      set(presenceRef, true).catch(() => {});

      // When user disconnects, remove their presence (all users, including owner)
      onDisconnect(presenceRef).remove();
    };

    joinCohort();

    return () => {
      // Cleanup on component unmount - remove presence for all
      // User is removed from members list automatically when presence is gone
      const presenceRef = ref(rtdb, `cohorts/${cohortId}/presence/${user.id}`);
      remove(presenceRef).catch(() => {});
    };
  }, [cohortId, user?.id, cohort, user]);

  // Track presence to filter members list
  const [presentUserIds, setPresentUserIds] = useState<Set<string>>(new Set());

  // Listen to presence changes and update members list
  useEffect(() => {
    if (!cohortId || !cohort) return;

    const presenceRef = ref(rtdb, `cohorts/${cohortId}/presence`);
    const unsubscribe = onValue(presenceRef, async (snapshot) => {
      const presenceData = snapshot.val();
      const currentPresentIds = presenceData ? Object.keys(presenceData) : [];
      setPresentUserIds(new Set(currentPresentIds));
      
      // Update members list to only show those who are present
      if (currentPresentIds.length > 0) {
        // Create an array of promises to fetch user profiles
        const memberPromises = currentPresentIds.map(id => getUserProfile(id));
        const userProfiles = await Promise.all(memberPromises);
        
        const presentMembers: CohortMember[] = userProfiles
          .filter((profile): profile is UserProfile => profile !== null)
          .map(profile => ({
            userId: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            joinedAt: new Date(),
            accountType: profile.accountType || 'student', // Include account type for member display
            // position will be updated by other logic if needed
          }));
          
        setMembers(presentMembers);
      } else {
        setMembers([]);
      }

      if (currentPresentIds.length === 0) {
        try {
          const gameStateRef = ref(rtdb, `cohorts/${cohortId}/gameState`);
          await set(gameStateRef, {
            mode: 'whiteboard',
            drawings: [],
            startedBy: null,
            startedAt: null,
          });
        } catch (error) {
          console.error('Failed to reset game state when cohort emptied:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [cohortId, cohort]);

  // Listen to speaking members from Firebase
  useEffect(() => {
    if (!cohortId) return;

    const speakingRef = ref(rtdb, `cohorts/${cohortId}/voice/speaking`);
    
    const unsubscribe = onValue(speakingRef, (snapshot) => {
      const speakingData = snapshot.val();
      if (speakingData) {
        const speakingUserIds = Object.keys(speakingData);
        setSpeakingMembers(new Set(speakingUserIds));
      } else {
        setSpeakingMembers(new Set());
      }
    });

    return () => unsubscribe();
  }, [cohortId]);

  // Listen for teacher verification requests (only if current user is a teacher)
  useEffect(() => {
    if (!cohortId || !user || !isTeacher(user)) return;

    const teacherVerificationRef = ref(rtdb, `cohorts/${cohortId}/teacherVerification`);
    
    const unsubscribe = onValue(teacherVerificationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTeacherVerificationRequest({
          userId: data.userId,
          username: data.username,
          problem: data.problem || null,
          whiteboardImage: data.whiteboardImage || null,
          chatHistory: data.chatHistory || []
        });
      } else {
        setTeacherVerificationRequest(null);
      }
    });

    return () => unsubscribe();
  }, [cohortId, user]);

  // Handler for teacher accepting verification
  const handleTeacherAccept = async () => {
    if (!cohortId || !teacherVerificationRequest) return;
    
    console.log('[Teacher] Accepting verification');
    
    try {
      // Update verification state to accepted
      // Keep awaitingTeacher true so UI shows "TEACHER APPROVED!" until countdown
      const verificationRef = ref(rtdb, `cohorts/${cohortId}/verification`);
      await update(verificationRef, {
        message: 'Great job! The teacher has verified your solution!',
        solved: true,
        awaitingTeacher: true // Keep true so UI shows teacher approved text
      });
      console.log('[Teacher] Set solved: true');
      
      // Clear teacher verification request
      const teacherVerificationRef = ref(rtdb, `cohorts/${cohortId}/teacherVerification`);
      await remove(teacherVerificationRef);
      
      setTeacherVerificationRequest(null);
      
      // Start countdown after showing success message (same as AI verification flow)
      console.log('[Teacher] Starting countdown in 2 seconds...');
      setTimeout(async () => {
        console.log('[Teacher] Setting countdown: 3');
        // Set countdown to start the battle
        await update(verificationRef, {
          countdown: 3,
          message: 'GET READY!'
        });
        
        // Countdown interval to update Firebase (all clients see it)
        let currentCount = 3;
        const countdownInterval = setInterval(async () => {
          currentCount -= 1;
          console.log('[Teacher] Countdown:', currentCount);
          
          if (currentCount <= 0) {
            clearInterval(countdownInterval);
            await update(verificationRef, {
              countdown: 0,
              message: 'GET READY!'
            });
            console.log('[Teacher] Countdown finished, removing verification state');
            // Clear verification state after all clients have seen countdown 0
            setTimeout(async () => {
              await remove(verificationRef);
            }, 200);
          } else {
            await update(verificationRef, {
              countdown: currentCount,
              message: 'GET READY!'
            });
          }
        }, 1000);
      }, 2000);
    } catch (error) {
      console.error('Failed to accept verification:', error);
    }
  };

  // Handler for teacher rejecting verification
  const handleTeacherReject = async () => {
    if (!cohortId || !teacherVerificationRequest) return;
    
    try {
      // Update verification state to rejected
      const verificationRef = ref(rtdb, `cohorts/${cohortId}/verification`);
      await update(verificationRef, {
        message: 'Keep working! The teacher wants you to review your solution.',
        solved: false,
        awaitingTeacher: false
      });
      
      // Clear teacher verification request
      const teacherVerificationRef = ref(rtdb, `cohorts/${cohortId}/teacherVerification`);
      await remove(teacherVerificationRef);
      
      setTeacherVerificationRequest(null);
    } catch (error) {
      console.error('Failed to reject verification:', error);
    }
  };

  // Listen to cohort changes in Firestore to update cohort data (but not members directly)
  useEffect(() => {
    if (!cohortId) return;

    const cohortRef = doc(db, 'cohorts', cohortId);
    const unsubscribe = onSnapshot(cohortRef, async (snapshot) => {
      if (!snapshot.exists()) {
        navigate('/cohorts');
        return;
    }

      const cohortData = snapshot.data() as Cohort;
      setCohort({ ...cohortData, id: snapshot.id });
      setLoading(false);
    }, (error) => {
      console.error("Error listening to cohort:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cohortId, navigate]);

  // Listen to game state changes (mode, drawings) from RTDB for multiplayer sync
  useEffect(() => {
    if (!cohortId) return;

    const gameStateRef = ref(rtdb, `cohorts/${cohortId}/gameState`);
    
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      const gameState = snapshot.val();
      if (gameState) {
        // Update mode for all users
        if (gameState.mode === 'battle' || gameState.mode === 'whiteboard') {
          setMode(gameState.mode);
        }
        
        // Update drawings when battle starts
        if (gameState.mode === 'battle' && gameState.drawings) {
          console.log('[CohortRoomPage] Battle starting with drawings:', gameState.drawings.length);
          setDrawings(gameState.drawings);
        }
        
        // If returning to whiteboard, clear drawings
        if (gameState.mode === 'whiteboard') {
          setDrawings([]);
        }

      } else {
        // Default to whiteboard if no game state exists
        setMode('whiteboard');
        setDrawings([]);
      }
    });

    return () => unsubscribe();
  }, [cohortId]);

  // Clear whiteboard snapshot when switching to battle mode
  useEffect(() => {
    if (mode === 'battle') {
      whiteboardSnapshotRef.current = null;
    }
  }, [mode]);

  // Listen to current problem from RTDB and initialize if needed
  useEffect(() => {
    if (!cohortId || !cohort) return;

    // Open Canvas doesn't have problems
    if (cohort.subjectCategory === 'Open Canvas') {
      setCurrentProblem(null);
      return;
    }

    const problemRef = ref(rtdb, `cohorts/${cohortId}/currentProblem`);
    
    const unsubscribe = onValue(problemRef, async (snapshot) => {
      const problemData = snapshot.val();
      
      if (problemData) {
        setCurrentProblem(problemData as CohortProblem);
      } else {
        // No problem exists, initialize one based on cohort subject
        const newProblem = getRandomProblem(
          cohort.subjectCategory || 'Math',
          cohort.subjectSubcategory || 'Algebra'
        );
        
        if (newProblem) {
          await set(problemRef, newProblem);
          setCurrentProblem(newProblem);
        }
      }
    });

    return () => unsubscribe();
  }, [cohortId, cohort?.subjectCategory, cohort?.subjectSubcategory]);

  if (loading || !cohort) return <div className="text-white p-10">Loading cohort...</div>;

  // Show rejection screen if teacher tries to join and there's already a teacher
  if (teacherRejected) {
    return (
      <div className="h-screen bg-space-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-gray-900/80 border-2 border-yellow-400 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-yellow-400/20 border-2 border-yellow-400">
            <AlertCircle size={32} className="text-yellow-400" />
          </div>
          <h2 className="text-xl font-['Press_Start_2P'] text-yellow-400 mb-4">
            TEACHER ALREADY PRESENT
          </h2>
          <p className="text-gray-300 mb-6 text-sm leading-relaxed">
            This cohort already has a teacher. Only one teacher is allowed per cohort at a time.
          </p>
          <button
            onClick={() => navigate('/cohorts')}
            className="px-6 py-3 bg-yellow-400 text-black font-['Press_Start_2P'] text-xs rounded hover:bg-yellow-300 transition-colors"
          >
            RETURN TO COHORTS
          </button>
        </div>
      </div>
    );
  }

  const handleVerificationSuccess = async (finalDrawings: WhiteboardDrawing[]) => {
    if (!cohortId || !user?.id) return;
    
    try {
      // Grant XP for solving the problem
      const { newLevel, updatedProfile } = await grantCohortSolveXP(user.id);
      
      if (newLevel) {
        showLevelUp(newLevel);
      }
      
      // Check for achievements
      if (updatedProfile) {
        const cohortStats = await getUserCohortStats(user.id);
        const newAchievements = checkNewAchievements(updatedProfile, {
          cohortSolves: cohortStats.solves,
          battleWins: cohortStats.battleWins
        });
        
        if (newAchievements.length > 0) {
          const { unlockedAchievements } = await unlockAchievements(user.id, newAchievements);
          if (unlockedAchievements.length > 0) {
            showAchievements(unlockedAchievements);
          }
        }
      }

      // Refresh user profile to update local state
      await refreshUser();

      // Update game state in RTDB so all users see the battle start
      const gameStateRef = ref(rtdb, `cohorts/${cohortId}/gameState`);
      await set(gameStateRef, {
        mode: 'battle',
        drawings: finalDrawings,
        startedBy: user.id,
        startedAt: Date.now()
      });
      
      // Local state will be updated by the listener above
    } catch (error) {
      console.error("Failed to start battle:", error);
      alert("Failed to start battle. Please try again.");
    }
  };

  const handleBattleEnd = async (victory: boolean = false) => {
    if (!cohortId || !cohort) return;
    
    setLoadingNewQuestion(true);
    
    try {
      // Grant XP for battle victory
      if (victory && user?.id) {
        const { newLevel, updatedProfile } = await grantBattleWinXP(user.id);
        
        if (newLevel) {
          showLevelUp(newLevel);
        }
        
        // Check for achievements
        if (updatedProfile) {
          const cohortStats = await getUserCohortStats(user.id);
          const newAchievements = checkNewAchievements(updatedProfile, {
            cohortSolves: cohortStats.solves,
            battleWins: cohortStats.battleWins
          });
          
          if (newAchievements.length > 0) {
            const { unlockedAchievements } = await unlockAchievements(user.id, newAchievements);
            if (unlockedAchievements.length > 0) {
              showAchievements(unlockedAchievements);
            }
          }
        }

        // Refresh user profile to update local state
        await refreshUser();
      }

      // 1. Update game state to return to whiteboard
      const gameStateRef = ref(rtdb, `cohorts/${cohortId}/gameState`);
      await set(gameStateRef, {
        mode: 'whiteboard',
        drawings: [],
        startedBy: null,
        startedAt: null
      });
      
      // 2. Clear whiteboard drawings in RTDB (clear entire whiteboard node)
      const whiteboardRef = ref(rtdb, `cohorts/${cohortId}/whiteboard`);
      await remove(whiteboardRef);
      
      // 3. Clear battle state (enemies, players, projectiles) so next battle starts fresh
      const battleRef = ref(rtdb, `cohorts/${cohortId}/battle`);
      await remove(battleRef);
      
      // 4. Clear AI chat in RTDB
      const chatRef = ref(rtdb, `cohorts/${cohortId}/chat/messages`);
      await remove(chatRef);
      
      // 4. Select new random problem (different from current) - skip for Open Canvas
      if (cohort.subjectCategory !== 'Open Canvas') {
        const newProblem = getNextProblem(
          cohort.subjectCategory || 'Math',
          cohort.subjectSubcategory || 'Algebra',
          currentProblem?.id
        );
        
        // 5. Update currentProblem in RTDB
        if (newProblem) {
          const problemRef = ref(rtdb, `cohorts/${cohortId}/currentProblem`);
          await set(problemRef, newProblem);
        }
      } else {
        // Open Canvas - clear any existing problem
        const problemRef = ref(rtdb, `cohorts/${cohortId}/currentProblem`);
        await remove(problemRef);
      }
      
      // Small delay to ensure all Firebase updates are processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Local state will be updated by the listeners
      setLoadingNewQuestion(false);
    } catch (error) {
      console.error("Failed to end battle:", error);
      setLoadingNewQuestion(false);
    }
  };

  const handleDeleteCohort = async () => {
    if (!cohortId || !user?.id || !cohort) return;
    
    if (!window.confirm(`Are you sure you want to delete "${cohort.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Clean up RTDB data
      const rtdbRefs = [
        ref(rtdb, `cohorts/${cohortId}/presence`),
        ref(rtdb, `cohorts/${cohortId}/whiteboard`),
        ref(rtdb, `cohorts/${cohortId}/battle`),
        ref(rtdb, `cohorts/${cohortId}/gameState`),
        ref(rtdb, `cohorts/${cohortId}/cursors`)
      ];
      
      await Promise.all(rtdbRefs.map(ref => remove(ref).catch(() => {}))); // Ignore errors if paths don't exist
      
      // Delete from Firestore
      await deleteCohort(cohortId, user.id);
      
      // Navigate back to cohorts page
      navigate('/cohorts');
    } catch (error: any) {
      console.error("Failed to delete cohort:", error);
      alert(error.message || "Failed to delete cohort");
    }
  };

  const isOwner = user?.id === cohort?.ownerId;

  return (
    <>
      <div className="h-screen bg-space-900 text-white flex flex-col overflow-hidden pt-16">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex justify-between items-center z-10">
          <div>
            <h1 className="text-sm font-['Press_Start_2P'] text-neon-cyan truncate max-w-md">
              {cohort.title}
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              ID: {cohort.id} • {mode === 'whiteboard' ? 'COLLABORATION MODE' : 'BATTLE MODE'} • {members.length}/{cohort.settings?.maxMembers || 5} members
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <button 
                onClick={handleDeleteCohort}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-red-500/30 rounded transition-all"
                title="Delete Cohort"
              >
                <Trash2 size={14} />
                DELETE
              </button>
            )}
          <button 
              onClick={async () => {
                if (!cohortId || !user?.id || !cohort) return;
                
                try {
                  // Clean up RTDB presence first (for all users including owner)
                  const presenceRef = ref(rtdb, `cohorts/${cohortId}/presence/${user.id}`);
                  await remove(presenceRef);
                  // No need to explicitly call leaveCohort as it is now a no-op
                } catch (error) {
                  console.error("Failed to leave cohort:", error);
                }
                
                navigate('/cohorts');
              }}
            className="text-xs text-gray-400 hover:text-white"
          >
            EXIT
          </button>
          </div>
        </header>

        {/* Problem Banner */}
        {loadingNewQuestion ? (
          <div className="bg-gradient-to-r from-neon-purple/20 via-gray-900 to-neon-cyan/20 border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-center max-w-6xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-neon-purple/30 rounded-lg border border-neon-purple/50">
                  <HelpCircle size={20} className="text-neon-purple animate-pulse" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                    LOADING...
                  </div>
                  <p className="text-white font-medium text-lg animate-pulse">
                    Preparing New Question
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : currentProblem ? (
          <div className="bg-gradient-to-r from-neon-purple/20 via-gray-900 to-neon-cyan/20 border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-center w-10 h-10 bg-neon-purple/30 rounded-lg border border-neon-purple/50">
                  <HelpCircle size={20} className="text-neon-purple" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                    {currentProblem.category} • {currentProblem.subcategory}
                  </div>
                  <p className="text-white font-medium text-lg">
                    {currentProblem.question}
                  </p>
                </div>
              </div>
              {currentProblem.hint && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    showHint 
                      ? 'bg-neon-yellow/20 border-neon-yellow/50 text-neon-yellow' 
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                  title={showHint ? 'Hide Hint' : 'Show Hint'}
                >
                  <Lightbulb size={16} />
                  <span className="text-xs font-bold">HINT</span>
                </button>
              )}
            </div>
            {showHint && currentProblem.hint && (
              <div className="mt-2 max-w-6xl mx-auto pl-13">
                <div className="bg-neon-yellow/10 border border-neon-yellow/30 rounded-lg px-4 py-2 ml-13">
                  <p className="text-neon-yellow/80 text-sm italic">
                    💡 {currentProblem.hint}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Whiteboard Section */}
        <div className="flex overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
          {/* Loading Overlay */}
          {loadingNewQuestion && (
            <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center">
              <div className="text-center">
                <div className="text-neon-cyan font-['Press_Start_2P'] text-xl mb-4 animate-pulse">
                  LOADING NEW QUESTION...
                </div>
                <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mx-auto">
                  <div className="h-full bg-neon-cyan animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Left Sidebar - Members */}
          <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-800">
              <h3 className="text-xs font-['Press_Start_2P'] text-neon-purple">MEMBERS ({members.length})</h3>
            </div>
            <CohortMemberAvatars 
              members={members} 
              mode={mode} 
              memberHealths={memberHealths}
              speakingMembers={speakingMembers}
            />
            
            {/* Voice Chat Controls */}
            <div className="p-3 border-t border-gray-800 mt-auto">
              <VoiceChatControls
                isMuted={voiceChat.isMuted}
                isDeafened={voiceChat.isDeafened}
                micVolume={voiceChat.micVolume}
                outputVolume={voiceChat.outputVolume}
                speakingLevel={voiceChat.speakingLevel}
                onToggleMute={voiceChat.toggleMute}
                onToggleDeafen={voiceChat.toggleDeafen}
                onMicVolumeChange={voiceChat.setMicVolume}
                onOutputVolumeChange={voiceChat.setOutputVolume}
              />
            </div>
          </div>

          {/* Center - Whiteboard / Battle */}
          <div className={`flex-1 bg-gray-950 relative overflow-hidden flex flex-col min-w-0 ${loadingNewQuestion ? 'pointer-events-none opacity-50' : ''}`}>
            {mode === 'whiteboard' ? (
              <Whiteboard 
                onVerifySuccess={handleVerificationSuccess}
                cohortId={cohortId || ''}
                currentUser={user ? {
                  id: user.id,
                  username: user.username,
                  color: getUserColor(user.id)
                } : undefined}
                onSnapshotRequest={handleSnapshotRequest}
                currentProblem={currentProblem}
                members={members}
              />
            ) : (
              <WhiteboardBattle 
                drawings={drawings} 
                onBattleEnd={handleBattleEnd} 
                onHealthUpdate={setMemberHealths}
                members={members}
                currentUserId={user?.id || ''}
                cohortId={cohortId || ''}
              />
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Section */}
      <div className={`bg-gray-900 border-t border-gray-800 flex flex-col overflow-hidden text-white relative ${loadingNewQuestion ? 'pointer-events-none opacity-50' : ''}`} style={{ aspectRatio: '16/9' }}>
        <div className="p-4 border-b border-gray-800 shrink-0">
          <h3 className="text-sm font-['Press_Start_2P'] text-neon-green">AI TUTOR</h3>
        </div>
          <AIChatInterface 
            cohortId={cohortId || ''} 
            whiteboardSnapshot={mode === 'whiteboard' ? whiteboardSnapshotRef.current : null}
            members={members}
            currentProblem={currentProblem}
            disabled={mode === 'battle'}
          />
      </div>

      {/* Teacher Verification Modal */}
      <TeacherVerificationModal
        isOpen={!!teacherVerificationRequest}
        studentUsername={teacherVerificationRequest?.username || ''}
        problem={teacherVerificationRequest?.problem || null}
        whiteboardImage={teacherVerificationRequest?.whiteboardImage || null}
        chatHistory={teacherVerificationRequest?.chatHistory || []}
        onAccept={handleTeacherAccept}
        onReject={handleTeacherReject}
        onClose={() => setTeacherVerificationRequest(null)}
      />
    </>
  );
}

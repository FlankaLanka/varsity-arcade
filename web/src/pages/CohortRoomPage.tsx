import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteCohort, leaveCohort, getUserProfile } from '../services/firestore';
import type { Cohort, CohortMember, WhiteboardDrawing } from '../types/cohort';
import type { UserProfile } from '../types/user';
import Whiteboard from '../components/Whiteboard';
import WhiteboardBattle from '../components/WhiteboardBattle';
import VoiceChatControls from '../components/VoiceChatControls';
import CohortMemberAvatars from '../components/CohortMemberAvatars';
import AIChatInterface from '../components/AIChatInterface';
import { useAuth } from '../context/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, onValue, remove, onDisconnect, set } from 'firebase/database';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2 } from 'lucide-react';

export default function CohortRoomPage() {
  const { cohortId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<CohortMember[]>([]);
  const [mode, setMode] = useState<'whiteboard' | 'battle'>('whiteboard');
  const [drawings, setDrawings] = useState<WhiteboardDrawing[]>([]);
  const [memberHealths, setMemberHealths] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Handle user presence and leaving on disconnect
  useEffect(() => {
    if (!cohortId || !user?.id || !cohort) return;

    // Mark user as present in RTDB (all users, including owner)
    const presenceRef = ref(rtdb, `cohorts/${cohortId}/presence/${user.id}`);
    set(presenceRef, true).catch(() => {});

    // When user disconnects, remove their presence (all users, including owner)
    onDisconnect(presenceRef).remove();

    return () => {
      // Cleanup on component unmount - remove presence for all
      // User is removed from members list automatically when presence is gone
      remove(presenceRef).catch(() => {});
    };
  }, [cohortId, user?.id, cohort]);

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

  if (loading || !cohort) return <div className="text-white p-10">Loading cohort...</div>;

  const handleVerificationSuccess = async (finalDrawings: WhiteboardDrawing[]) => {
    if (!cohortId || !user?.id) return;
    
    try {
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

  const handleBattleEnd = async () => {
    if (!cohortId) return;
    
    try {
      // Update game state to return to whiteboard
      const gameStateRef = ref(rtdb, `cohorts/${cohortId}/gameState`);
      await set(gameStateRef, {
        mode: 'whiteboard',
        drawings: [],
        startedBy: null,
        startedAt: null
      });
      
      // Local state will be updated by the listener above
    } catch (error) {
      console.error("Failed to end battle:", error);
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Members */}
        <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-xs font-['Press_Start_2P'] text-neon-purple">MEMBERS ({members.length})</h3>
          </div>
          <CohortMemberAvatars members={members} mode={mode} memberHealths={memberHealths} />
          
          {/* Voice Chat Controls */}
          <div className="p-3 border-t border-gray-800 mt-auto">
            <VoiceChatControls />
          </div>
        </div>

        {/* Center - Whiteboard / Battle */}
        <div className="flex-1 bg-gray-950 relative overflow-hidden flex flex-col">
          {mode === 'whiteboard' ? (
            <Whiteboard 
              onVerifySuccess={handleVerificationSuccess}
              cohortId={cohortId || ''}
              currentUser={user ? {
                id: user.id,
                username: user.username,
                color: ['#FFFFFF', '#FF0055', '#00FFFF', '#55FF00', '#FFFF00'][Math.abs(user.id.charCodeAt(0)) % 5]
              } : undefined}
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

        {/* Right Sidebar - AI Chat */}
        <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-xs font-['Press_Start_2P'] text-neon-green">AI TUTOR</h3>
          </div>
          <AIChatInterface />
        </div>
      </div>
    </div>
  );
}

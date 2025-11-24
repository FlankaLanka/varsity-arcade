import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCohortById, getCohortMembers } from '../data/mockCohorts';
import type { Cohort, CohortMember, WhiteboardDrawing } from '../types/cohort';
import Whiteboard from '../components/Whiteboard';
import WhiteboardBattle from '../components/WhiteboardBattle';
import VoiceChatControls from '../components/VoiceChatControls';
import CohortMemberAvatars from '../components/CohortMemberAvatars';
import AIChatInterface from '../components/AIChatInterface';

export default function CohortRoomPage() {
  const { cohortId } = useParams();
  const navigate = useNavigate();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<CohortMember[]>([]);
  const [mode, setMode] = useState<'whiteboard' | 'battle'>('whiteboard');
  const [drawings, setDrawings] = useState<WhiteboardDrawing[]>([]);

  useEffect(() => {
    if (cohortId) {
      const cohortData = getCohortById(cohortId);
      if (cohortData) {
        setCohort(cohortData);
        setMembers(getCohortMembers(cohortId));
      } else {
        // Cohort not found
        navigate('/cohorts');
      }
    }
  }, [cohortId, navigate]);

  if (!cohort) return <div className="text-white p-10">Loading cohort...</div>;

  const handleVerificationSuccess = (finalDrawings: WhiteboardDrawing[]) => {
    setDrawings(finalDrawings);
    setMode('battle');
  };

  const handleBattleEnd = () => {
    setMode('whiteboard');
  };

  return (
    <div className="h-screen bg-space-900 text-white flex flex-col overflow-hidden pt-16">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex justify-between items-center z-10">
        <div>
          <h1 className="text-sm font-['Press_Start_2P'] text-neon-cyan truncate max-w-md">
            {cohort.title}
          </h1>
          <p className="text-xs text-gray-500 flex items-center gap-2">
            ID: {cohort.id} • {mode === 'whiteboard' ? 'COLLABORATION MODE' : 'BATTLE MODE'}
          </p>
        </div>
        <button 
          onClick={() => navigate('/cohorts')}
          className="text-xs text-gray-400 hover:text-white"
        >
          EXIT
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Members */}
        <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-xs font-['Press_Start_2P'] text-neon-purple">MEMBERS ({members.length})</h3>
          </div>
          <CohortMemberAvatars members={members} mode={mode} />
          
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
            />
          ) : (
            <WhiteboardBattle 
              drawings={drawings} 
              onBattleEnd={handleBattleEnd} 
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


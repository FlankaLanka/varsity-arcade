import React, { useMemo } from 'react';
import { User, GraduationCap } from 'lucide-react';
import type { CohortMember } from '../types/cohort';

interface CohortMemberAvatarsProps {
  members: CohortMember[];
  mode: 'whiteboard' | 'battle';
  memberHealths?: Record<string, number>;
  speakingMembers?: Set<string>;
}

export default function CohortMemberAvatars({ members, mode, memberHealths, speakingMembers = new Set() }: CohortMemberAvatarsProps) {
  // Sort members: teachers first, then students
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aIsTeacher = a.accountType === 'teacher';
      const bIsTeacher = b.accountType === 'teacher';
      if (aIsTeacher && !bIsTeacher) return -1;
      if (!aIsTeacher && bIsTeacher) return 1;
      return 0;
    });
  }, [members]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {sortedMembers.map(member => {
        const isTeacher = member.accountType === 'teacher';
        
        return (
          <div 
            key={member.userId}
            className={`flex items-center gap-3 p-2 rounded transition-colors ${
              isTeacher 
                ? 'bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30' 
                : 'hover:bg-gray-800'
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              {member.avatar ? (
                <img 
                  src={member.avatar} 
                  alt={member.username} 
                  className={`w-8 h-8 rounded-full bg-gray-700 object-cover border-2 transition-all ${
                    speakingMembers.has(member.userId)
                      ? 'border-neon-green shadow-[0_0_8px_rgba(41,255,100,0.6)]'
                      : isTeacher
                        ? 'border-yellow-400'
                        : 'border-gray-600'
                  }`}
                />
              ) : (
                <div className={`w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 transition-all ${
                  speakingMembers.has(member.userId)
                    ? 'border-neon-green shadow-[0_0_8px_rgba(41,255,100,0.6)]'
                    : isTeacher
                      ? 'border-yellow-400'
                      : 'border-gray-600'
                }`}>
                  {isTeacher ? (
                    <GraduationCap size={14} className="text-yellow-400" />
                  ) : (
                    <User size={14} className="text-gray-400" />
                  )}
                </div>
              )}
              
              {/* Teacher Badge */}
              {isTeacher && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-gray-900">
                  <GraduationCap size={10} className="text-gray-900" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-sm font-bold truncate ${
                    isTeacher ? 'text-yellow-400' : 'text-gray-200'
                  }`}>
                    {member.username}
                  </span>
                  {isTeacher && (
                    <span className="px-1.5 py-0.5 text-[8px] font-['Press_Start_2P'] bg-yellow-400/20 text-yellow-400 rounded border border-yellow-400/30 shrink-0">
                      TEACHER
                    </span>
                  )}
                </div>
                {mode === 'battle' && !isTeacher && (
                  <span className="text-[10px] text-neon-pink font-['Press_Start_2P'] shrink-0">
                    {memberHealths?.[member.userId] ?? 100}HP
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


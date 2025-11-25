import React from 'react';
import { User } from 'lucide-react';
import type { CohortMember } from '../types/cohort';

interface CohortMemberAvatarsProps {
  members: CohortMember[];
  mode: 'whiteboard' | 'battle';
  memberHealths?: Record<string, number>;
  speakingMembers?: Set<string>;
}

export default function CohortMemberAvatars({ members, mode, memberHealths, speakingMembers = new Set() }: CohortMemberAvatarsProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {members.map(member => (
        <div 
          key={member.userId}
          className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors"
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
                    : 'border-gray-600'
                }`}
              />
            ) : (
              <div className={`w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 transition-all ${
                speakingMembers.has(member.userId)
                  ? 'border-neon-green shadow-[0_0_8px_rgba(41,255,100,0.6)]'
                  : 'border-gray-600'
              }`}>
                <User size={14} className="text-gray-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-200 truncate">
                {member.username}
              </span>
              {mode === 'battle' && (
                <span className="text-[10px] text-neon-pink font-['Press_Start_2P']">
                  {memberHealths?.[member.userId] ?? 100}HP
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


import React from 'react';
import { Circle, User } from 'lucide-react';
import type { CohortMember } from '../types/cohort';

interface CohortMemberAvatarsProps {
  members: CohortMember[];
  mode: 'whiteboard' | 'battle';
}

export default function CohortMemberAvatars({ members, mode }: CohortMemberAvatarsProps) {
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
                alt={member.displayName} 
                className="w-8 h-8 rounded-full bg-gray-700 object-cover border border-gray-600"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                <User size={14} className="text-gray-400" />
              </div>
            )}
            
            {/* Online Status */}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
              member.isOnline ? 'bg-neon-green' : 'bg-gray-500'
            }`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-200 truncate">
                {member.displayName}
              </span>
              {mode === 'battle' && member.isOnline && (
                <span className="text-[10px] text-neon-pink font-['Press_Start_2P']">
                  100HP
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {member.isOnline ? (
                <>
                  <Circle size={6} className="fill-neon-green text-neon-green animate-pulse" />
                  <span>Online</span>
                </>
              ) : (
                <span>Offline</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


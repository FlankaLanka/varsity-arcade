import React from 'react';
import { X, Check, XCircle, GraduationCap, MessageSquare, Image } from 'lucide-react';
import type { CohortProblem, AIChatMessage } from '../types/cohort';

interface TeacherVerificationModalProps {
  isOpen: boolean;
  studentUsername: string;
  problem: CohortProblem | null;
  whiteboardImage: string | null;
  chatHistory: AIChatMessage[];
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function TeacherVerificationModal({
  isOpen,
  studentUsername,
  problem,
  whiteboardImage,
  chatHistory,
  onAccept,
  onReject,
  onClose,
}: TeacherVerificationModalProps) {
  if (!isOpen) return null;

  // Filter to only show recent messages (last 10)
  const recentMessages = chatHistory.slice(-10);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl max-h-[calc(100vh-6rem)] mx-4 bg-gray-900 border-2 border-yellow-400 rounded-xl shadow-[0_0_50px_rgba(250,204,21,0.3)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-yellow-400/10 border-b border-yellow-400/30 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center border border-yellow-400">
              <GraduationCap size={20} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-['Press_Start_2P'] text-yellow-400">
                VERIFICATION REQUEST
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                <span className="text-white font-bold">{studentUsername}</span> is requesting verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Problem Section */}
          {problem && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-neon-purple text-xs font-['Press_Start_2P']">
                  PROBLEM
                </div>
                <span className="text-xs text-gray-500">
                  {problem.category} • {problem.subcategory}
                </span>
              </div>
              <p className="text-white text-lg">
                {problem.question}
              </p>
              {problem.answer && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <span className="text-xs text-gray-500">Correct Answer: </span>
                  <span className="text-neon-green font-['Press_Start_2P'] text-sm">{problem.answer}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Whiteboard Preview */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                <Image size={14} className="text-neon-cyan" />
                <span className="text-xs font-['Press_Start_2P'] text-neon-cyan">WHITEBOARD</span>
              </div>
              <div className="aspect-video bg-gray-950 flex items-center justify-center">
                {whiteboardImage ? (
                  <img 
                    src={whiteboardImage} 
                    alt="Student's whiteboard work" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-500 text-sm italic">
                    No whiteboard content
                  </div>
                )}
              </div>
            </div>

            {/* Chat History */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                <MessageSquare size={14} className="text-neon-green" />
                <span className="text-xs font-['Press_Start_2P'] text-neon-green">CHAT HISTORY</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-64">
                {recentMessages.length > 0 ? (
                  recentMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`text-sm p-2 rounded ${
                        msg.role === 'user' 
                          ? 'bg-neon-cyan/10 border border-neon-cyan/20' 
                          : 'bg-neon-green/10 border border-neon-green/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${
                          msg.role === 'user' ? 'text-neon-cyan' : 'text-neon-green'
                        }`}>
                          {msg.role === 'user' ? msg.username || 'Student' : 'AI Tutor'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        {msg.content.length > 200 
                          ? msg.content.slice(0, 200) + '...' 
                          : msg.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm italic text-center py-4">
                    No chat messages
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-800/50 border-t border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">
            Review the student's work and decide if they've solved the problem correctly.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onReject}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border-2 border-red-500 text-red-400 font-['Press_Start_2P'] text-xs rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <XCircle size={16} />
              REJECT
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-2 px-6 py-3 bg-neon-green/20 border-2 border-neon-green text-neon-green font-['Press_Start_2P'] text-xs rounded-lg hover:bg-neon-green/30 transition-colors"
            >
              <Check size={16} />
              ACCEPT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


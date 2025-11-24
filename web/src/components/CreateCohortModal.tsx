import React, { useState } from 'react';
import { X, Lock, Unlock, UserPlus } from 'lucide-react';
import type { CohortPrivacy } from '../types/cohort';

interface CreateCohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, privacy: CohortPrivacy, description?: string) => void;
}

export default function CreateCohortModal({ isOpen, onClose, onCreate }: CreateCohortModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<CohortPrivacy>('public');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onCreate(title, privacy, description);
    
    // Reset form
    setTitle('');
    setDescription('');
    setPrivacy('public');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-gray-900 border-2 border-neon-purple rounded-xl shadow-[0_0_20px_rgba(184,41,235,0.3)] relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-['Press_Start_2P'] text-white">CREATE COHORT</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-neon-cyan font-bold text-sm tracking-wider">COHORT TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Algebra Study Session"
              className="w-full bg-black/50 border border-gray-600 rounded p-3 text-white focus:border-neon-purple focus:outline-none focus:shadow-[0_0_10px_rgba(184,41,235,0.2)]"
              required
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-neon-cyan font-bold text-sm tracking-wider">DESCRIPTION (OPTIONAL)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you be studying?"
              rows={3}
              className="w-full bg-black/50 border border-gray-600 rounded p-3 text-white focus:border-neon-purple focus:outline-none focus:shadow-[0_0_10px_rgba(184,41,235,0.2)]"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-neon-cyan font-bold text-sm tracking-wider">PRIVACY SETTING</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPrivacy('public')}
                className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${
                  privacy === 'public'
                    ? 'bg-neon-green/20 border-neon-green text-white shadow-[0_0_10px_rgba(41,255,100,0.2)]'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Unlock size={20} className="mb-2" />
                <span className="text-[10px] font-bold">PUBLIC</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPrivacy('friends')}
                className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${
                  privacy === 'friends'
                    ? 'bg-neon-blue/20 border-neon-blue text-white shadow-[0_0_10px_rgba(41,235,255,0.2)]'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <UserPlus size={20} className="mb-2" />
                <span className="text-[10px] font-bold">FRIENDS</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${
                  privacy === 'private'
                    ? 'bg-neon-pink/20 border-neon-pink text-white shadow-[0_0_10px_rgba(255,0,128,0.2)]'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Lock size={20} className="mb-2" />
                <span className="text-[10px] font-bold">PRIVATE</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {privacy === 'public' && "Anyone can see and join this cohort."}
              {privacy === 'friends' && "Only your friends can see and join."}
              {privacy === 'private' && "Invite code required to join."}
            </p>
          </div>
          
          <button
            type="submit"
            className="w-full bg-neon-purple hover:bg-neon-purple/80 text-white font-bold py-3 rounded transition-colors shadow-[0_0_15px_rgba(184,41,235,0.4)] mt-4 font-['Press_Start_2P'] text-xs"
          >
            CREATE COHORT
          </button>
        </form>
      </div>
    </div>
  );
}


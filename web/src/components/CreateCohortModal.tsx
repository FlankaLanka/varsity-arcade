import React, { useState } from 'react';
import { X, Lock, Unlock, UserPlus, BookOpen } from 'lucide-react';
import type { CohortPrivacy } from '../types/cohort';
import { SUBJECT_CATEGORIES, type SubjectCategory } from '../data/problemBank';

interface CreateCohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, privacy: CohortPrivacy, maxMembers: number, subjectCategory: string, subjectSubcategory: string, description?: string) => void;
}

export default function CreateCohortModal({ isOpen, onClose, onCreate }: CreateCohortModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<CohortPrivacy>('public');
  const [maxMembers, setMaxMembers] = useState(5);
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>('Math');
  const [subjectSubcategory, setSubjectSubcategory] = useState<string>(SUBJECT_CATEGORIES.Math[0]);

  if (!isOpen) return null;

  const handleCategoryChange = (category: SubjectCategory) => {
    setSubjectCategory(category);
    // Reset subcategory - empty string for Open Canvas, first option for others
    if (category === 'Open Canvas') {
      setSubjectSubcategory('');
    } else {
      setSubjectSubcategory(SUBJECT_CATEGORIES[category][0] || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onCreate(title, privacy, maxMembers, subjectCategory, subjectSubcategory, description);
    
    // Reset form
    setTitle('');
    setDescription('');
    setPrivacy('public');
    setMaxMembers(5);
    setSubjectCategory('Math');
    setSubjectSubcategory(SUBJECT_CATEGORIES.Math[0]);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-gray-900 border-2 border-neon-purple rounded-xl shadow-[0_0_20px_rgba(184,41,235,0.3)] relative flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
          <h2 className="text-base font-['Press_Start_2P'] text-white">CREATE COHORT</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="block text-neon-cyan font-bold text-sm tracking-wider">COHORT TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Algebra Study Session"
              className="w-full bg-black/50 border border-gray-600 rounded p-3 text-base text-white focus:border-neon-purple focus:outline-none focus:shadow-[0_0_10px_rgba(184,41,235,0.2)]"
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
              className="w-full bg-black/50 border border-gray-600 rounded p-3 text-base text-white focus:border-neon-purple focus:outline-none focus:shadow-[0_0_10px_rgba(184,41,235,0.2)]"
            />
          </div>

          {/* Subject Selection */}
          <div className="space-y-2">
            <label className="block text-neon-cyan font-bold text-sm tracking-wider flex items-center gap-2">
              <BookOpen size={16} />
              SUBJECT
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select
                  value={subjectCategory}
                  onChange={(e) => handleCategoryChange(e.target.value as SubjectCategory)}
                  className="w-full bg-black/50 border border-gray-600 rounded p-2.5 text-base text-white focus:border-neon-purple focus:outline-none"
                >
                  {Object.keys(SUBJECT_CATEGORIES).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Topic</label>
                {subjectCategory === 'Open Canvas' ? (
                  <div className="w-full bg-black/30 border border-gray-600 rounded p-2.5 text-base text-gray-500">
                    No specific topic (Free drawing)
                  </div>
                ) : (
                  <select
                    value={subjectSubcategory}
                    onChange={(e) => setSubjectSubcategory(e.target.value)}
                    className="w-full bg-black/50 border border-gray-600 rounded p-2.5 text-base text-white focus:border-neon-purple focus:outline-none"
                  >
                    {SUBJECT_CATEGORIES[subjectCategory].map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {subjectCategory === 'Open Canvas' 
                ? 'Free drawing mode - no specific problems, just collaborate and draw!'
                : 'Problems will be generated based on this subject.'}
            </p>
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
                <Unlock size={18} className="mb-1.5" />
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
                <UserPlus size={18} className="mb-1.5" />
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
                <Lock size={18} className="mb-1.5" />
                <span className="text-[10px] font-bold">PRIVATE</span>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {privacy === 'public' && "Anyone can see and join this cohort."}
              {privacy === 'friends' && "Only your friends can see and join."}
              {privacy === 'private' && "Invite code required to join."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-neon-cyan font-bold text-sm tracking-wider">MAX MEMBERS</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="5"
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-purple"
              />
              <span className="text-neon-purple font-['Press_Start_2P'] text-sm w-12 text-center">
                {maxMembers}
              </span>
            </div>
            <p className="text-xs text-gray-500">Maximum number of members allowed in this cohort (1-5)</p>
          </div>
          
          <button
            type="submit"
            className="w-full bg-neon-purple hover:bg-neon-purple/80 text-white font-bold py-3 rounded transition-colors shadow-[0_0_15px_rgba(184,41,235,0.4)] font-['Press_Start_2P'] text-xs"
          >
            CREATE COHORT
          </button>
        </form>
      </div>
    </div>
  );
}


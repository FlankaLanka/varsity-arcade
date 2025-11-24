import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Lock, Unlock, Plus, Search, UserPlus } from 'lucide-react';
import { getFriendsCohorts, getPublicCohorts, joinCohort, createCohort } from '../data/mockCohorts';
import type { Cohort, CohortPrivacy } from '../types/cohort';
import CreateCohortModal from '../components/CreateCohortModal';

export default function CohortsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'public' | 'friends'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [friendsCohorts, setFriendsCohorts] = useState(getFriendsCohorts());
  const [publicCohorts, setPublicCohorts] = useState(getPublicCohorts());

  const handleJoinCohort = (cohortId: string) => {
    const success = joinCohort(cohortId);
    if (success) {
      // Refresh lists
      setFriendsCohorts(getFriendsCohorts());
      setPublicCohorts(getPublicCohorts());
      // Navigate to room
      navigate(`/cohorts/${cohortId}`);
    } else {
      // Already a member, just navigate
      navigate(`/cohorts/${cohortId}`);
    }
  };

  const handleCreateCohort = (title: string, privacy: CohortPrivacy, description?: string) => {
    createCohort(title, privacy, description);
    setFriendsCohorts(getFriendsCohorts());
    setPublicCohorts(getPublicCohorts());
    setIsCreateModalOpen(false);
  };

  const displayedCohorts = useMemo(() => {
    const cohorts = activeTab === 'friends' ? friendsCohorts : publicCohorts;
    if (!searchQuery.trim()) return cohorts;
    return cohorts.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, friendsCohorts, publicCohorts, searchQuery]);

  return (
    <div className="min-h-screen bg-space-900 text-white p-6 pt-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-['Press_Start_2P'] text-neon-cyan mb-2">COHORTS</h1>
            <p className="text-gray-400">Join a study group or create your own.</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-neon-purple hover:bg-neon-purple/80 text-white rounded font-['Press_Start_2P'] text-xs transition-colors shadow-[0_0_10px_rgba(184,41,235,0.5)]"
          >
            <Plus size={16} />
            CREATE COHORT
          </button>
        </div>

        {/* Search and Tabs */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-gray-900/50 p-4 rounded-lg border border-gray-800">
          <div className="flex bg-gray-800 rounded p-1">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 rounded text-sm font-bold transition-colors ${
                activeTab === 'friends' 
                  ? 'bg-neon-blue text-white shadow-[0_0_10px_rgba(41,235,255,0.3)]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              FRIENDS COHORTS
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`px-4 py-2 rounded text-sm font-bold transition-colors ${
                activeTab === 'public' 
                  ? 'bg-neon-green text-black shadow-[0_0_10px_rgba(41,255,100,0.3)]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              PUBLIC COHORTS
            </button>
          </div>

          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search cohorts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded py-2 pl-10 pr-4 text-white focus:outline-none focus:border-neon-cyan"
            />
          </div>
        </div>

        {/* Cohort Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCohorts.length > 0 ? (
            displayedCohorts.map(cohort => (
              <CohortCard 
                key={cohort.id} 
                cohort={cohort} 
                onJoin={() => handleJoinCohort(cohort.id)} 
              />
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-gray-500">
              <p>NO COHORTS FOUND.</p>
            </div>
          )}
        </div>
      </div>

      <CreateCohortModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCohort}
      />
    </div>
  );
}

function CohortCard({ cohort, onJoin }: { cohort: Cohort; onJoin: () => void }) {
  const isPrivate = cohort.privacy === 'private';
  const isFriendsOnly = cohort.privacy === 'friends';
  
  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-6 hover:border-neon-cyan transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        {isPrivate ? (
          <Lock className="text-neon-pink" size={20} />
        ) : isFriendsOnly ? (
          <UserPlus className="text-neon-purple" size={20} />
        ) : (
          <Unlock className="text-neon-green" size={20} />
        )}
      </div>

      <h3 className="text-xl font-bold text-white mb-2 pr-8">{cohort.title}</h3>
      <p className="text-gray-400 text-sm mb-4 line-clamp-2 h-10">
        {cohort.description || "No description provided."}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <Users size={16} />
          <span>{cohort.memberIds.length} / {cohort.settings?.maxMembers || '∞'}</span>
        </div>
        
        <button
          onClick={onJoin}
          className="px-4 py-2 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black rounded text-xs font-bold transition-colors"
        >
          JOIN
        </button>
      </div>
      
      {/* Privacy Badge */}
      <div className="absolute top-0 left-0 px-3 py-1 bg-gray-900/80 text-[10px] font-bold uppercase tracking-wider text-gray-400 rounded-br-lg">
        {cohort.privacy}
      </div>
    </div>
  );
}


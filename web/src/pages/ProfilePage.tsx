import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, BookOpen, Award, Briefcase, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import XPProgressBar from '../components/XPProgressBar';
import AchievementBadge from '../components/AchievementBadge';
import FriendCard from '../components/FriendCard';
import { FriendDetailModal } from '../components/FriendDetailModal';
import { useAuth } from '../context/AuthContext';
import { removeFriend } from '../services/firestore';
import type { Achievement, Friend, ActivityEntry, GameType, StudentProfile, TeacherUserProfile } from '../types/user';
import { isStudent, isTeacher } from '../types/user';

// Helper to calculate quest progress since we removed the mock data file
// Ideally this should be in a utility file
const getQuestProgress = (quest: any) => {
    if (!quest) return 0;
    return Math.min(100, Math.max(0, (quest.progress / quest.maxProgress) * 100));
};

const achievementTabs: Array<'all' | 'unlocked' | 'locked'> = ['all', 'unlocked', 'locked'];

const gameLabels: Record<GameType, { label: string; icon: string; accent: string }> = {
  'asteroids': { label: 'Asteroids: Synonym Shooter', icon: '☄️', accent: 'text-purple-300' },
  'pacman-math': { label: 'Pac-Man: Math Blitz', icon: '👻', accent: 'text-yellow-300' },
  'ph-invaders': { label: 'pH Invaders', icon: '🧪', accent: 'text-green-300' },
  'pong-arithmetic': { label: 'Pong Arithmetic', icon: '🏓', accent: 'text-orange-300' },
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user: userProfile, firebaseUser, logout, refreshUser } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof achievementTabs)[number]>('all');

  useEffect(() => {
    if (userProfile?.friends) {
      setFriends(userProfile.friends);
    }
  }, [userProfile]);

  // Guard clause for type safety, though AuthProvider ensures user is present in this route
  if (!userProfile) return null;

  // Check if user is a teacher - render different profile
  if (isTeacher(userProfile)) {
    return (
      <TeacherProfilePage 
        userProfile={userProfile} 
        friends={friends}
        onLogout={logout}
        onFriendClick={(friend) => {
          setSelectedFriend(friend);
          setIsFriendModalOpen(true);
        }}
        selectedFriend={selectedFriend}
        isFriendModalOpen={isFriendModalOpen}
        onFriendModalClose={() => {
          setSelectedFriend(null);
          setIsFriendModalOpen(false);
        }}
        onRemoveFriend={async (friendId: string) => {
          if (!firebaseUser) return;
          try {
            await removeFriend(firebaseUser.uid, friendId);
            setFriends(prev => prev.filter(friend => friend.id !== friendId));
            if (refreshUser) await refreshUser();
          } catch (error) {
            console.error('Failed to remove friend:', error);
          }
        }}
        navigate={navigate}
        refreshUser={refreshUser}
      />
    );
  }

  // Student profile rendering
  const studentProfile = userProfile as StudentProfile;

  const filteredAchievements = studentProfile.achievements.filter(achievement => {
    if (activeTab === 'all') return true;
    return activeTab === 'unlocked' ? achievement.isUnlocked : !achievement.isUnlocked;
  });

  const achievementCounts = {
    all: studentProfile.achievements.length,
    unlocked: studentProfile.achievements.filter(a => a.isUnlocked).length,
    locked: studentProfile.achievements.filter(a => !a.isUnlocked).length,
  };

  const defaultAvatar = (
    <svg width="80" height="80" viewBox="0 0 8 8" className="pixelated">
      <rect x="2" y="1" width="4" height="1" fill="#00ffff" />
      <rect x="1" y="2" width="6" height="3" fill="#00ffff" />
      <rect x="2" y="3" width="1" height="1" fill="#000000" />
      <rect x="5" y="3" width="1" height="1" fill="#000000" />
      <rect x="3" y="4" width="2" height="1" fill="#ff006e" />
      <rect x="1" y="5" width="2" height="2" fill="#00ffff" />
      <rect x="5" y="5" width="2" height="2" fill="#00ffff" />
      <rect x="3" y="6" width="2" height="2" fill="#00ffff" />
    </svg>
  );

  const activityHistory = [...studentProfile.activityHistory].sort(
    (a, b) => {
      const dateA = a.date instanceof Date ? a.date : (a.date as any).toDate();
      const dateB = b.date instanceof Date ? b.date : (b.date as any).toDate();
      return dateB.getTime() - dateA.getTime();
    }
  );

  const handleFriendClick = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsFriendModalOpen(true);
  };

  const handleFriendModalClose = () => {
    setSelectedFriend(null);
    setIsFriendModalOpen(false);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!firebaseUser) return;
    
    try {
      await removeFriend(firebaseUser.uid, friendId);
    setFriends(prev => prev.filter(friend => friend.id !== friendId));
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  const handleBlockFriend = async (friendId: string) => {
    // For now, blocking is the same as removing
    await handleRemoveFriend(friendId);
  };

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-space-900 via-space-800 to-space-900 overflow-visible">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10 overflow-visible">
        <HeaderSection userProfile={studentProfile} defaultAvatar={defaultAvatar} />

        <StatsGrid userProfile={studentProfile} />

        <AchievementSection
          achievements={filteredAchievements}
          activeTab={activeTab}
          tabCounts={achievementCounts}
          onTabChange={setActiveTab}
        />

        <DailyQuestSection />

        <GameStatsSection />

        <FriendsSection friends={friends} onFriendClick={handleFriendClick} />

        <ActivitySection activities={activityHistory} />

        <SettingsSection onLogout={logout} userProfile={studentProfile} />
      </div>

      <FriendDetailModal
        friend={selectedFriend}
        open={isFriendModalOpen}
        onClose={handleFriendModalClose}
        onViewProfile={(friend) => {
          handleFriendModalClose();
          navigate(`/friend/${friend.id}`);
        }}
        onRemove={handleRemoveFriend}
        onBlock={handleBlockFriend}
      />
    </div>
  );
}

// Teacher Profile Page Component
function TeacherProfilePage({
  userProfile,
  friends,
  onLogout,
  onFriendClick,
  selectedFriend,
  isFriendModalOpen,
  onFriendModalClose,
  onRemoveFriend,
  navigate,
  refreshUser,
}: {
  userProfile: TeacherUserProfile;
  friends: Friend[];
  onLogout: () => void;
  onFriendClick: (friend: Friend) => void;
  selectedFriend: Friend | null;
  isFriendModalOpen: boolean;
  onFriendModalClose: () => void;
  onRemoveFriend: (friendId: string) => Promise<void>;
  navigate: (path: string) => void;
  refreshUser?: () => Promise<void>;
}) {
  const defaultAvatar = (
    <svg width="80" height="80" viewBox="0 0 8 8" className="pixelated">
      <rect x="2" y="1" width="4" height="1" fill="#facc15" />
      <rect x="1" y="2" width="6" height="3" fill="#facc15" />
      <rect x="2" y="3" width="1" height="1" fill="#000000" />
      <rect x="5" y="3" width="1" height="1" fill="#000000" />
      <rect x="3" y="4" width="2" height="1" fill="#ff006e" />
      <rect x="1" y="5" width="2" height="2" fill="#facc15" />
      <rect x="5" y="5" width="2" height="2" fill="#facc15" />
      <rect x="3" y="6" width="2" height="2" fill="#facc15" />
    </svg>
  );

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-space-900 via-space-800 to-space-900 overflow-visible">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10 overflow-visible">
        {/* Teacher Header */}
        <TeacherHeaderSection userProfile={userProfile} defaultAvatar={defaultAvatar} />

        {/* Teacher Profile Info */}
        <TeacherInfoSection 
          teacherProfile={userProfile.teacherProfile} 
          userId={userProfile.id}
          onUpdate={refreshUser}
        />

        {/* Friends Section */}
        <FriendsSection friends={friends} onFriendClick={onFriendClick} />

        {/* Settings Section */}
        <SettingsSection onLogout={onLogout} userProfile={userProfile} />
      </div>

      <FriendDetailModal
        friend={selectedFriend}
        open={isFriendModalOpen}
        onClose={onFriendModalClose}
        onViewProfile={(friend) => {
          onFriendModalClose();
          navigate(`/friend/${friend.id}`);
        }}
        onRemove={onRemoveFriend}
        onBlock={onRemoveFriend}
      />
    </div>
  );
}

function TeacherHeaderSection({
  userProfile,
  defaultAvatar,
}: {
  userProfile: TeacherUserProfile;
  defaultAvatar: ReactElement;
}) {
  return (
    <section className="p-6 border-2 border-yellow-400 rounded-xl bg-gray-900/70 backdrop-blur-lg shadow-2xl">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-24 h-24 bg-gray-800 border-2 border-yellow-400 rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.6)]">
          {userProfile.avatar ? (
            <img src={userProfile.avatar} alt={userProfile.username} className="w-full h-full object-cover pixelated" />
          ) : (
            defaultAvatar
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-['Press_Start_2P'] text-white">{userProfile.username}</h1>
            <span className="px-3 py-1 bg-yellow-400/20 border border-yellow-400 rounded text-yellow-400 text-xs font-['Press_Start_2P']">
              TEACHER
            </span>
          </div>
          <p className="text-sm text-gray-400">@{userProfile.username}</p>
        </div>
      </div>
    </section>
  );
}


function TeacherInfoSection({ 
  teacherProfile,
  userId,
  onUpdate
}: { 
  teacherProfile: TeacherUserProfile['teacherProfile'];
  userId: string;
  onUpdate?: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState(teacherProfile.yearsOfExperience);
  const [subjects, setSubjects] = useState<string[]>(teacherProfile.subjects);
  const [bio, setBio] = useState(teacherProfile.bio || '');
  const [educationCredentials, setEducationCredentials] = useState<string[]>(teacherProfile.educationCredentials || []);
  const [newSubject, setNewSubject] = useState('');
  const [newCredential, setNewCredential] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when teacherProfile changes
  useEffect(() => {
    setYearsOfExperience(teacherProfile.yearsOfExperience);
    setSubjects(teacherProfile.subjects);
    setBio(teacherProfile.bio || '');
    setEducationCredentials(teacherProfile.educationCredentials || []);
  }, [teacherProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'teacherProfile.yearsOfExperience': yearsOfExperience,
        'teacherProfile.subjects': subjects,
        'teacherProfile.bio': bio || '',
        'teacherProfile.educationCredentials': educationCredentials
      });
      
      setIsEditing(false);
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Failed to update teacher profile:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setYearsOfExperience(teacherProfile.yearsOfExperience);
    setSubjects(teacherProfile.subjects);
    setBio(teacherProfile.bio || '');
    setEducationCredentials(teacherProfile.educationCredentials || []);
    setNewSubject('');
    setNewCredential('');
    setIsEditing(false);
  };

  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject('');
    }
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const addCredential = () => {
    if (newCredential.trim() && !educationCredentials.includes(newCredential.trim())) {
      setEducationCredentials([...educationCredentials, newCredential.trim()]);
      setNewCredential('');
    }
  };

  const removeCredential = (index: number) => {
    setEducationCredentials(educationCredentials.filter((_, i) => i !== index));
  };

  return (
    <section className="p-6 border-2 border-yellow-400/40 bg-gray-900/60 rounded-xl shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-['Press_Start_2P'] text-yellow-400 flex items-center gap-2">
          <GraduationCap size={18} />
          Teacher Profile
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400/20 border border-yellow-400 rounded text-yellow-400 text-xs font-['Press_Start_2P'] hover:bg-yellow-400/30 transition-colors"
          >
            <Edit2 size={14} />
            EDIT
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs font-['Press_Start_2P'] hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <X size={14} />
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400/20 border border-yellow-400 rounded text-yellow-400 text-xs font-['Press_Start_2P'] hover:bg-yellow-400/30 transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Years of Experience */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-2">
          <div className="flex items-center gap-2 text-yellow-400">
            <Briefcase size={16} />
            <span className="text-xs font-['Press_Start_2P']">Experience</span>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="50"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 bg-gray-800 border-2 border-yellow-400/50 rounded px-3 py-2 text-white text-lg font-['Press_Start_2P'] focus:border-yellow-400 focus:outline-none"
              />
              <span className="text-lg font-['Press_Start_2P'] text-white">
                {yearsOfExperience === 1 ? 'Year' : 'Years'}
              </span>
            </div>
          ) : (
            <p className="text-2xl font-['Press_Start_2P'] text-white">
              {yearsOfExperience} {yearsOfExperience === 1 ? 'Year' : 'Years'}
            </p>
          )}
        </div>

        {/* Subjects */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-2">
          <div className="flex items-center gap-2 text-yellow-400">
            <BookOpen size={16} />
            <span className="text-xs font-['Press_Start_2P']">Subjects</span>
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-1 px-3 py-1 bg-yellow-400/10 border border-yellow-400/30 rounded text-sm text-yellow-200"
                  >
                    <span>{subject}</span>
                    <button
                      onClick={() => removeSubject(idx)}
                      className="ml-1 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                  placeholder="Add subject..."
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-yellow-400 focus:outline-none"
                />
                <button
                  onClick={addSubject}
                  className="px-3 py-1 bg-yellow-400/20 border border-yellow-400/30 rounded text-yellow-400 hover:bg-yellow-400/30 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.length > 0 ? (
                subjects.map((subject, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1 bg-yellow-400/10 border border-yellow-400/30 rounded text-sm text-yellow-200"
                  >
                    {subject}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm italic">No subjects added yet</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-2">
        <div className="flex items-center gap-2 text-yellow-400">
          <span className="text-xs font-['Press_Start_2P']">Bio</span>
        </div>
        {isEditing ? (
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell students about yourself..."
            rows={4}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-yellow-400 focus:outline-none resize-none"
          />
        ) : (
          <p className="text-gray-300 text-sm leading-relaxed">
            {bio || 'No bio added yet. Tell students about yourself!'}
          </p>
        )}
      </div>

      {/* Education Credentials */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-2">
        <div className="flex items-center gap-2 text-yellow-400">
          <Award size={16} />
          <span className="text-xs font-['Press_Start_2P']">Education & Credentials</span>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <div className="space-y-2">
              {educationCredentials.map((credential, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 text-gray-300"
                >
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-sm flex-1">{credential}</span>
                  <button
                    onClick={() => removeCredential(idx)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCredential}
                onChange={(e) => setNewCredential(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCredential()}
                placeholder="Add credential (e.g., M.S. Mathematics, Stanford)"
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-yellow-400 focus:outline-none"
              />
              <button
                onClick={addCredential}
                className="px-3 py-1 bg-yellow-400/20 border border-yellow-400/30 rounded text-yellow-400 hover:bg-yellow-400/30 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {educationCredentials.length > 0 ? (
              educationCredentials.map((credential, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 text-gray-300"
                >
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-sm">{credential}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-500 text-sm italic">No credentials added yet</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ... (Sub-components HeaderSection, StatsGrid, AchievementSection remain mostly same but simpler props)

function HeaderSection({
  userProfile,
  defaultAvatar,
}: {
  userProfile: any; // UserProfile
  defaultAvatar: ReactElement;
}) {
  return (
    <section className="p-6 border-2 border-neon-cyan rounded-xl bg-gray-900/70 backdrop-blur-lg shadow-2xl">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-24 h-24 bg-gray-800 border-2 border-neon-pink rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_30px_rgba(255,0,110,0.6)]">
          {userProfile.avatar ? (
            <img src={userProfile.avatar} alt={userProfile.username} className="w-full h-full object-cover pixelated" />
          ) : (
            defaultAvatar
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-['Press_Start_2P'] text-white mb-2">{userProfile.username}</h1>
          <p className="text-sm text-gray-400 mb-4">@{userProfile.username}</p>
          <XPProgressBar currentXP={userProfile.totalXP} currentLevel={userProfile.level} />
        </div>
      </div>
    </section>
  );
}

function StatsGrid({ userProfile }: { userProfile: any }) {
  const stats = [
    { label: 'Streak', value: `${userProfile.currentStreak} days`, accent: 'text-orange-400', icon: '🔥' },
    { label: 'Games Played', value: userProfile.gamesPlayed, accent: 'text-neon-cyan', icon: '🎮' },
    { label: 'Total Score', value: userProfile.totalScore.toLocaleString(), accent: 'text-neon-yellow', icon: '💯' },
    { label: 'Games Completed', value: userProfile.gamesCompleted, accent: 'text-neon-green', icon: '🏁' },
  ];

  return (
    <section className="p-6 border-2 border-space-600 bg-gray-900/60 rounded-xl shadow-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="flex items-center gap-3 border border-gray-700 rounded-lg p-4 bg-gray-950/70">
            <div className="text-2xl">{stat.icon}</div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className={`text-lg font-['Press_Start_2P'] ${stat.accent}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AchievementSection({
  achievements,
  activeTab,
  tabCounts,
  onTabChange,
}: {
  achievements: Achievement[];
  activeTab: (typeof achievementTabs)[number];
  tabCounts: Record<(typeof achievementTabs)[number], number>;
  onTabChange: (tab: (typeof achievementTabs)[number]) => void;
}) {
  return (
    <section className="p-6 border-2 border-neon-yellow/40 bg-gray-900/60 rounded-xl shadow-lg space-y-4 overflow-visible">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-['Press_Start_2P'] text-neon-yellow flex items-center gap-2">
          <span role="img" aria-label="trophy">
            🏆
          </span>
          Achievements
        </h2>
        <div className="flex gap-2">
          {achievementTabs.map(tab => (
            <button
              key={tab}
              className={`px-3 py-1 text-xs border rounded transition-all font-['Press_Start_2P'] ${
                activeTab === tab ? 'bg-neon-yellow text-black border-neon-yellow' : 'border-gray-700 text-gray-400 hover:border-neon-yellow'
              }`}
              onClick={() => onTabChange(tab)}
            >
              {tab.toUpperCase()} ({tabCounts[tab]})
            </button>
          ))}
        </div>
      </div>

      {achievements.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No achievements in this category yet. Keep playing!</p>
      ) : (
        <div className="flex flex-wrap gap-4 overflow-visible">
          {achievements.map(achievement => (
            <AchievementBadge key={achievement.id} achievement={achievement} size="medium" />
          ))}
        </div>
      )}
    </section>
  );
}

function DailyQuestSection() {
  const { user: profile } = useAuth();
  if (!profile || !isStudent(profile)) return null;
  
  return (
    <section className="p-6 border-2 border-neon-pink/40 bg-gray-900/60 rounded-xl shadow-lg space-y-4">
      <h2 className="text-sm font-['Press_Start_2P'] text-neon-pink flex items-center gap-2">
        <span role="img" aria-label="target">
          🎯
        </span>
        Daily Quests
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {profile.dailyQuests.map(quest => {
          const progressPercent = getQuestProgress(quest);
          return (
            <div key={quest.id} className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white">{quest.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{quest.description}</p>
                </div>
                <span className="text-xs font-['Press_Start_2P'] text-neon-yellow">+{quest.xpReward} XP</span>
              </div>
              <div className="relative h-2 bg-gray-800 rounded overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-pink to-neon-yellow" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-xs text-gray-500">
                {quest.progress} / {quest.maxProgress}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GameStatsSection() {
  const { user: profile } = useAuth();
  if (!profile || !isStudent(profile)) return null;
  
  const statValues = Object.values(profile.gameStats);
  const maxHighScore = Math.max(...statValues.map(stat => stat.highScore));
  const maxGamesPlayed = Math.max(...statValues.map(stat => stat.gamesPlayed));

  return (
    <section className="p-6 border-2 border-destructive/30 bg-gray-900/60 rounded-xl shadow-lg space-y-4">
      <h2 className="text-sm font-['Press_Start_2P'] text-neon-cyan flex items-center gap-2">
        <span role="img" aria-label="chart">
          📊
        </span>
        Game Stats
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(profile.gameStats).map(([gameKey, stats]) => {
          const { label, icon, accent } = gameLabels[gameKey as GameType];
          return (
            <div key={gameKey} className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{icon}</span>
                <p className={`text-xs font-['Press_Start_2P'] ${accent}`}>{label}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <StatBlock label="High Score" value={stats.highScore.toLocaleString()} />
                <StatBlock label="Games" value={stats.gamesPlayed} />
                <StatBlock label="Best Streak" value={`${stats.bestStreak} days`} />
                <StatBlock label="Total XP" value={`${stats.totalXP}`} />
              </div>
              <div className="space-y-2">
                <ProgressMeter label="High Score" value={stats.highScore} max={maxHighScore} gradient="from-neon-pink to-neon-yellow" />
                <ProgressMeter label="Games Played" value={stats.gamesPlayed} max={maxGamesPlayed} gradient="from-neon-cyan to-neon-green" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-gray-800 rounded p-2 bg-gray-900/80">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-['Press_Start_2P'] text-white">{value}</p>
    </div>
  );
}

function ProgressMeter({
  label,
  value,
  max,
  gradient,
}: {
  label: string;
  value: number;
  max: number;
  gradient: string;
}) {
  const percentage = max === 0 ? 0 : Math.min(100, (value / max) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500 mb-1">
        <span>{label}</span>
        <span>{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradient}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function FriendsSection({ friends, onFriendClick }: { friends: Friend[]; onFriendClick: (friend: Friend) => void }) {
  return (
    <section className="p-6 border-2 border-neon-green/30 bg-gray-900/60 rounded-xl shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-['Press_Start_2P'] text-neon-green flex items-center gap-2">
          <span role="img" aria-label="friends">
            🤝
          </span>
          Friends
        </h2>
        <span className="text-xs text-gray-400">{friends.length} total</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {friends.map(friend => (
          <FriendCard key={friend.id} friend={friend} onClick={onFriendClick} />
        ))}
        {friends.length === 0 && (
            <p className="text-xs text-gray-500 italic col-span-2 text-center">No friends yet.</p>
        )}
      </div>
    </section>
  );
}

function ActivitySection({ activities }: { activities: ActivityEntry[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_COLLAPSED_ITEMS = 3;

  const groupedEntries = activities.reduce<Map<string, ActivityEntry[]>>((map, activity) => {
    // Handle Firestore timestamps
    const dateObj = activity.date instanceof Date ? activity.date : (activity.date as any).toDate();
    const key = dateObj.toLocaleDateString();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push({ ...activity, date: dateObj });
    return map;
  }, new Map<string, ActivityEntry[]>());

  // Flatten all entries for counting and limiting
  const allEntries = Array.from(groupedEntries.entries()).flatMap(([date, items]) => 
    items.map(item => ({ date, item }))
  );
  const hasMoreItems = allEntries.length > MAX_COLLAPSED_ITEMS;
  const displayedEntriesFlat = isExpanded 
    ? allEntries
    : allEntries.slice(0, MAX_COLLAPSED_ITEMS);

  // Regroup displayed entries by date
  const displayedEntries = displayedEntriesFlat.reduce<Map<string, ActivityEntry[]>>((map, { date, item }) => {
    if (!map.has(date)) {
      map.set(date, []);
    }
    map.get(date)?.push(item);
    return map;
  }, new Map<string, ActivityEntry[]>());

  return (
    <section className="p-6 border-2 border-indigo-500/40 bg-gray-900/60 rounded-xl shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-['Press_Start_2P'] text-indigo-300 flex items-center gap-2">
          <span role="img" aria-label="timeline">
            🕒
          </span>
          Activity Timeline
        </h2>
        {hasMoreItems && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 transition-colors font-['Press_Start_2P']"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>Show More ({allEntries.length - MAX_COLLAPSED_ITEMS})</span>
              </>
            )}
          </button>
        )}
      </div>
      <div className="relative pl-6">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/40 via-indigo-400/20 to-transparent pointer-events-none" />
        <div className="space-y-6">
          {Array.from(displayedEntries.entries()).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-['Press_Start_2P'] text-indigo-200 mb-3">{date}</p>
              <div className="space-y-3">
                {items.map(activity => (
                  <div key={activity.id} className="relative pl-6">
                    <div className="absolute left-0 top-3 w-3 h-3 rounded-full bg-indigo-400 border-2 border-gray-900" />
                    <div className="border border-gray-800 rounded-lg p-4 bg-gray-950/70">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{activity.icon ?? '✨'}</span>
                          <p className="text-sm text-white">{activity.description}</p>
                        </div>
                        <span className="text-xs text-gray-500">{activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {activity.meta && (
                        <div className="mt-2 text-xs text-gray-400 flex flex-wrap gap-3">
                          {Object.entries(activity.meta).map(([key, value]) => (
                            <span key={key} className="uppercase tracking-wide">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SettingsSection({ onLogout, userProfile }: { onLogout: () => void, userProfile: any }) {
  return (
    <section className="p-6 border-2 border-gray-700 bg-gray-900/70 rounded-xl shadow-lg space-y-6">
      <h2 className="text-sm font-['Press_Start_2P'] text-white flex items-center gap-2">
        <span role="img" aria-label="gear">
          ⚙️
        </span>
        Settings
      </h2>

      <div className="grid md:grid-cols-3 gap-4 text-sm">
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-3">
          <h3 className="text-xs font-['Press_Start_2P'] text-neon-cyan">Account</h3>
          <SettingField label="Username" value={userProfile.username} />
          <SettingField label="Email" value={userProfile.email || "player@varsityarcade.com"} />
          <button className="w-full px-3 py-1 border border-gray-600 text-xs text-gray-300 rounded hover:border-neon-cyan hover:text-neon-cyan transition-all">
            Update Password
          </button>
        </div>

        <div className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-3">
          <h3 className="text-xs font-['Press_Start_2P'] text-neon-cyan">Preferences</h3>
          <ToggleRow label="Dark Theme" enabled />
          <ToggleRow label="Notifications" enabled />
          <ToggleRow label="Sound Effects" enabled={false} />
        </div>

        <div className="border border-gray-700 rounded-lg p-4 bg-gray-950/70 space-y-3">
          <h3 className="text-xs font-['Press_Start_2P'] text-neon-cyan">Privacy</h3>
          <select className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none">
            <option>Friends Only</option>
            <option>Public</option>
            <option>Private</option>
          </select>
          <ToggleRow label="Allow Friend Requests" enabled />
          <ToggleRow label="Share Activity" enabled={false} />
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="px-4 py-3 border-2 border-neon-pink text-neon-pink font-['Press_Start_2P'] text-xs rounded hover:bg-neon-pink/10 transition-all"
      >
        Logout
      </button>
    </section>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-xs text-gray-400 space-y-1 block">
      <span>{label}</span>
      <input
        type="text"
        defaultValue={value}
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white focus:border-neon-cyan focus:outline-none"
      />
    </label>
  );
}

function ToggleRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <label className="flex items-center justify-between text-xs text-gray-300">
      <span>{label}</span>
      <span
        className={`w-10 h-5 rounded-full border-2 ${enabled ? 'border-neon-green bg-neon-green/20' : 'border-gray-600 bg-gray-800'}`}
      >
        <span
          className={`block w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </span>
    </label>
  );
}

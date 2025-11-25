import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Flame, GamepadIcon, TrendingUp, Settings, User, LogOut } from 'lucide-react';
import XPProgressBar from './XPProgressBar';
import AchievementBadge from './AchievementBadge';
import { useAuth } from '../context/AuthContext';
import { getQuestProgressPercentage } from '../utils/xpSystem';
import { getXPProgress } from '../utils/xpSystem';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  if (!isOpen) return null;

  const navigate = useNavigate();
  const { user: userProfile, logout } = useAuth();
  
  if (!userProfile) return null;

  // Logic to get recent data from profile
  const recentAchievements = userProfile.achievements
    .filter(a => a.isUnlocked)
    .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
    .slice(0, 4);
    
  const activeDailyQuests = userProfile.dailyQuests.filter(q => !q.completed);

  const handleProfileNavigation = () => {
    onClose();
    navigate('/profile');
  };

  const handleViewAllAchievements = () => {
    onClose();
    navigate('/profile'); // Navigate to profile which has achievements section
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  // Calculate stats
  const unlockedAchievementsCount = userProfile.achievements.filter(a => a.isUnlocked).length;
  const totalAchievementsCount = userProfile.achievements.length;
  const xpProgress = getXPProgress(userProfile.totalXP, userProfile.level);

  // Default pixel art avatar
  const defaultAvatar = (
    <svg width="64" height="64" viewBox="0 0 8 8" className="pixelated">
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

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-96 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main Dropdown Container */}
      <div className="bg-gray-900/95 backdrop-blur-md border-2 border-neon-cyan rounded-lg shadow-2xl max-h-[calc(100vh-100px)] flex flex-col overflow-visible">
        {/* Header Section */}
        <div className="relative p-6 bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-b-2 border-neon-cyan/30">
          {/* Scanline Effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.5) 2px, rgba(0, 255, 255, 0.5) 4px)',
            }}
          />

          <div className="relative flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gray-800 border-2 border-neon-pink rounded-lg overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(255,0,110,0.5)]">
              {userProfile.avatar ? (
                <img 
                  src={userProfile.avatar} 
                  alt={userProfile.username}
                  className="w-full h-full object-cover pixelated"
                />
              ) : (
                defaultAvatar
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h3 className="text-lg font-['Press_Start_2P'] text-white mb-1">
                {userProfile.username}
              </h3>
              <p className="text-sm text-gray-400">
                @{userProfile.username}
              </p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="mt-4">
            <XPProgressBar 
              currentXP={userProfile.totalXP} 
              currentLevel={userProfile.level}
            />
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-visible">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-gray-800/30 border-b-2 border-gray-800">
          {/* Streak */}
          <div className="flex items-center gap-2 p-2 bg-gray-900/50 border border-orange-500/30 rounded">
            <Flame className="w-4 h-4 text-orange-500" />
            <div>
              <div className="text-xs text-gray-400">Streak</div>
              <div className="text-sm font-['Press_Start_2P'] text-orange-500">
                {userProfile.currentStreak} days
              </div>
            </div>
          </div>

          {/* Games Played */}
          <div className="flex items-center gap-2 p-2 bg-gray-900/50 border border-neon-cyan/30 rounded">
            <GamepadIcon className="w-4 h-4 text-neon-cyan" />
            <div>
              <div className="text-xs text-gray-400">Games</div>
              <div className="text-sm font-['Press_Start_2P'] text-neon-cyan">
                {userProfile.gamesPlayed}
              </div>
            </div>
          </div>

          {/* Total Score */}
          <div className="flex items-center gap-2 p-2 bg-gray-900/50 border border-neon-yellow/30 rounded">
            <TrendingUp className="w-4 h-4 text-neon-yellow" />
            <div>
              <div className="text-xs text-gray-400">Total Score</div>
              <div className="text-sm font-['Press_Start_2P'] text-neon-yellow">
                {userProfile.totalScore.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Completed Games */}
          <div className="flex items-center gap-2 p-2 bg-gray-900/50 border border-neon-green/30 rounded">
            <Trophy className="w-4 h-4 text-neon-green" />
            <div>
              <div className="text-xs text-gray-400">Completed</div>
              <div className="text-sm font-['Press_Start_2P'] text-neon-green">
                {userProfile.gamesCompleted}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="p-4 border-b-2 border-gray-800 overflow-visible">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-['Press_Start_2P'] text-neon-yellow flex items-center gap-2">
              <Trophy className="w-3 h-3" />
              Achievements ({unlockedAchievementsCount}/{totalAchievementsCount})
            </h4>
            <button 
              className="text-xs text-gray-400 hover:text-neon-cyan transition-colors"
              onClick={handleViewAllAchievements}
            >
              View All
            </button>
          </div>
          <div className="flex gap-2 overflow-visible">
            {recentAchievements.length > 0 ? (
              recentAchievements.map(achievement => (
                <AchievementBadge 
                  key={achievement.id}
                  achievement={achievement}
                  size="medium"
                />
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">
                No achievements unlocked yet. Play games to earn achievements!
              </p>
            )}
          </div>
        </div>

        {/* Daily Quests */}
        <div className="p-4 border-b-2 border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-['Press_Start_2P'] text-neon-pink flex items-center gap-2">
              <Target className="w-3 h-3" />
              Daily Quests
            </h4>
          </div>
          <div className="space-y-2">
            {activeDailyQuests.slice(0, 3).map(quest => {
              const progressPercent = getQuestProgressPercentage(quest);
              return (
                <div key={quest.id} className="bg-gray-900/50 border border-gray-700 rounded p-2">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="text-xs text-white">
                        {quest.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {quest.description}
                      </div>
                    </div>
                    <div className="text-xs text-neon-yellow font-['Press_Start_2P'] ml-2">
                      +{quest.xpReward}
                    </div>
                  </div>
                  {/* Quest Progress Bar */}
                  <div className="relative h-2 bg-gray-800 rounded overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-neon-pink transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {quest.progress} / {quest.maxProgress}
                  </div>
                </div>
              );
            })}
            {activeDailyQuests.length === 0 && (
              <p className="text-xs text-gray-500 italic">
                All daily quests completed! 🎉
              </p>
            )}
          </div>
        </div>
        </div>
        {/* End Scrollable Content Area */}

        {/* Quick Links */}
        <div className="p-3 bg-gray-800/50 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button 
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-gray-300 hover:bg-gray-800 hover:border-neon-cyan transition-all flex items-center justify-center gap-2"
              onClick={handleProfileNavigation}
            >
              <User className="w-3 h-3" />
              Profile
            </button>
            <button 
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-xs text-red-400 hover:bg-red-900/30 hover:border-red-500 transition-all flex items-center justify-center gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

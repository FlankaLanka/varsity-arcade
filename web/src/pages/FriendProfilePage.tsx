import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ReactElement } from 'react';
import XPProgressBar from '../components/XPProgressBar';
import AchievementBadge from '../components/AchievementBadge';
import { getUserProfile } from '../services/firestore';
import type { Achievement, ActivityEntry, GameType, UserProfile } from '../types/user';

const achievementTabs: Array<'all' | 'unlocked' | 'locked'> = ['all', 'unlocked', 'locked'];

const gameLabels: Record<GameType, { label: string; icon: string; accent: string }> = {
  'asteroids': { label: 'Asteroids: Synonym Shooter', icon: '☄️', accent: 'text-purple-300' },
  'pacman-math': { label: 'Pac-Man: Math Blitz', icon: '👻', accent: 'text-yellow-300' },
  'ph-invaders': { label: 'pH Invaders', icon: '🧪', accent: 'text-green-300' },
};

export function FriendProfilePage() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!friendId) return;
      setIsLoading(true);
      try {
        const userData = await getUserProfile(friendId);
        setProfile(userData);
      } catch (error) {
        console.error("Failed to fetch friend profile", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [friendId]);

  const [activeTab, setActiveTab] = useState<(typeof achievementTabs)[number]>('all');

  const filteredAchievements = useMemo(() => {
    if (!profile) return [];
    if (activeTab === 'all') return profile.achievements;
    const unlocked = activeTab === 'unlocked';
    return profile.achievements.filter(achievement => achievement.isUnlocked === unlocked);
  }, [activeTab, profile]);

  const achievementCounts = useMemo(() => {
    if (!profile) {
      return { all: 0, unlocked: 0, locked: 0 };
    }
    const unlockedCount = profile.achievements.filter(a => a.isUnlocked).length;
    return {
      all: profile.achievements.length,
      unlocked: unlockedCount,
      locked: profile.achievements.length - unlockedCount,
    };
  }, [profile]);

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-space-900 text-white">
          <div className="text-center space-y-4">
            <p className="text-lg font-['Press_Start_2P'] animate-pulse">LOADING...</p>
          </div>
        </div>
      );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-space-900 text-white">
        <div className="text-center space-y-4">
          <p className="text-lg font-['Press_Start_2P']">FRIEND NOT FOUND</p>
          <button
            className="px-4 py-3 border-2 border-neon-cyan text-neon-cyan font-['Press_Start_2P'] text-xs rounded hover:bg-neon-cyan/10 transition-all"
            onClick={() => navigate(-1)}
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  const defaultAvatar: ReactElement = (
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

  const activityHistory = [...profile.activityHistory].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : (a.date as any).toDate();
      const dateB = b.date instanceof Date ? b.date : (b.date as any).toDate();
      return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-space-900 via-space-800 to-space-900">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <HeaderSection profile={profile} defaultAvatar={defaultAvatar} />
        <StatsGrid profile={profile} />
        <AchievementSection
          achievements={filteredAchievements}
          activeTab={activeTab}
          tabCounts={achievementCounts}
          onTabChange={setActiveTab}
        />
        <GameStatsSection profile={profile} />
        <ActivitySection activities={activityHistory} />
      </div>
    </div>
  );
}

function HeaderSection({
  profile,
  defaultAvatar,
}: {
  profile: UserProfile;
  defaultAvatar: ReactElement;
}) {
  return (
    <section className="p-6 border-2 border-neon-cyan rounded-xl bg-gray-900/70 backdrop-blur-lg shadow-2xl">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-24 h-24 bg-gray-800 border-2 border-neon-pink rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_30px_rgba(255,0,110,0.6)]">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover pixelated" />
          ) : (
            defaultAvatar
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-['Press_Start_2P'] text-white mb-2">{profile.username}</h1>
          <p className="text-sm text-gray-400 mb-4">@{profile.username}</p>
          <XPProgressBar currentXP={profile.totalXP} currentLevel={profile.level} />
        </div>
      </div>
    </section>
  );
}

function StatsGrid({ profile }: { profile: UserProfile }) {
  const stats = [
    { label: 'Level', value: profile.level, accent: 'text-neon-green', icon: '🚀' },
    { label: 'Total XP', value: profile.totalXP, accent: 'text-neon-cyan', icon: '⚡' },
    { label: 'Games Played', value: profile.gamesPlayed, accent: 'text-neon-yellow', icon: '🎮' },
    { label: 'Total Score', value: profile.totalScore.toLocaleString(), accent: 'text-neon-pink', icon: '🏆' },
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
    <section className="p-6 border-2 border-neon-yellow/40 bg-gray-900/60 rounded-xl shadow-lg space-y-4">
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
        <p className="text-sm text-gray-500 italic">No achievements in this category yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {achievements.map(achievement => (
            <AchievementBadge key={achievement.id} achievement={achievement} size="medium" />
          ))}
        </div>
      )}
    </section>
  );
}

function GameStatsSection({ profile }: { profile: UserProfile }) {
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
                <StatBlock label="Streak" value={`${stats.bestStreak} days`} />
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

function ActivitySection({ activities }: { activities: ActivityEntry[] }) {
  const groupedEntries = activities.reduce<Map<string, ActivityEntry[]>>((map, activity) => {
    const dateObj = activity.date instanceof Date ? activity.date : (activity.date as any).toDate();
    const key = dateObj.toLocaleDateString();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push({ ...activity, date: dateObj });
    return map;
  }, new Map<string, ActivityEntry[]>());

  return (
    <section className="p-6 border-2 border-indigo-500/40 bg-gray-900/60 rounded-xl shadow-lg space-y-4">
      <h2 className="text-sm font-['Press_Start_2P'] text-indigo-300 flex items-center gap-2">
        <span role="img" aria-label="timeline">
          🕒
        </span>
        Activity Timeline
      </h2>
      <div className="relative pl-6">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/40 via-indigo-400/20 to-transparent pointer-events-none" />
        <div className="space-y-6">
          {Array.from(groupedEntries.entries()).map(([date, items]) => (
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

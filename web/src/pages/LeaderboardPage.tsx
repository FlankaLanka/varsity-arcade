import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../services/firestore';
import type { GameType } from '../types/user';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  gameType: string;
  userId: string;
  avatar?: string;
  isCurrentUser?: boolean;
}

export const LeaderboardPage = () => {
  const { user, firebaseUser } = useAuth();
  const [selectedGame, setSelectedGame] = useState<GameType>('pong-arithmetic');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all_time');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const games = [
    { id: 'asteroids' as GameType, name: 'ASTEROIDS' },
    { id: 'pacman-math' as GameType, name: 'PAC-MAN' },
    { id: 'ph-invaders' as GameType, name: 'PH INVADERS' },
    { id: 'pong-arithmetic' as GameType, name: 'PONG ARITHMETIC' }
  ];
  
  const periods = [
    { id: 'daily', name: 'TODAY' },
    { id: 'weekly', name: 'THIS WEEK' },
    { id: 'all_time', name: 'ALL TIME' }
  ];
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await getLeaderboard(selectedGame, 50);
        const entries: LeaderboardEntry[] = data.map((entry, index) => ({
          rank: index + 1,
          username: entry.username,
          score: entry.score,
          gameType: selectedGame,
          userId: entry.userId,
          avatar: entry.avatar,
          isCurrentUser: firebaseUser?.uid === entry.userId,
        }));
        setLeaderboardData(entries);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [selectedGame, firebaseUser?.uid]);
  
  // Calculate user stats
  const currentUserEntry = leaderboardData.find(entry => entry.isCurrentUser);
  const userRank = currentUserEntry?.rank || null;
  const userBestScore = user?.gameStats?.[selectedGame]?.highScore || 0;
  const totalPlayers = leaderboardData.length;
  const userPercentile = userRank && totalPlayers > 0 
    ? Math.round(((totalPlayers - userRank + 1) / totalPlayers) * 100)
    : null;
  
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-neon-yellow" size={24} />;
    if (rank === 2) return <Medal className="text-gray-300" size={24} />;
    if (rank === 3) return <Award className="text-orange-500" size={24} />;
    return null;
  };
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-neon-yellow';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-500';
    return 'text-gray-400';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-4 border-neon-cyan p-6 bg-space-800/50">
        <h1 className="text-3xl text-neon-cyan font-pixel mb-2 flex items-center gap-3">
          <Trophy size={32} />
          RANKINGS
        </h1>
        <p className="text-gray-400 text-sm font-mono">Compete for the top spot in the galaxy</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 font-pixel mb-2 block">GAME</label>
          <div className="flex gap-2 flex-wrap">
            {games.map(game => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`retro-btn text-xs px-4 py-2 ${
                  selectedGame === game.id
                    ? 'bg-neon-cyan text-black border-neon-cyan'
                    : 'border-space-700 text-gray-400 hover:text-white'
                }`}
              >
                {game.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 font-pixel mb-2 block">PERIOD</label>
          <div className="flex gap-2 flex-wrap">
            {periods.map(period => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={`retro-btn text-xs px-4 py-2 ${
                  selectedPeriod === period.id
                    ? 'bg-neon-pink text-white border-neon-pink'
                    : 'border-space-700 text-gray-400 hover:text-white'
                }`}
              >
                {period.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="retro-card border-neon-cyan">
        {loading ? (
          <div className="p-8 text-center text-gray-400 font-pixel">
            Loading leaderboard...
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="p-8 text-center text-gray-400 font-pixel">
            No scores yet. Be the first to play!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-space-700">
                  <th className="text-left py-4 px-4 text-neon-cyan font-pixel text-xs">RANK</th>
                  <th className="text-left py-4 px-4 text-neon-cyan font-pixel text-xs">PLAYER</th>
                  <th className="text-right py-4 px-4 text-neon-cyan font-pixel text-xs">SCORE</th>
                  <th className="text-center py-4 px-4 text-neon-cyan font-pixel text-xs">GAME</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((entry) => (
                  <tr
                    key={`${entry.userId}-${entry.rank}`}
                    className={`border-b border-space-700/50 transition-colors ${
                      entry.isCurrentUser
                        ? 'bg-neon-cyan/10 border-neon-cyan'
                        : 'hover:bg-space-700/30'
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(entry.rank)}
                        <span className={`font-pixel text-sm ${getRankColor(entry.rank)}`}>
                          #{entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {entry.avatar ? (
                          <img 
                            src={entry.avatar} 
                            alt={entry.username}
                            className={`w-8 h-8 rounded border-2 ${
                              entry.isCurrentUser 
                                ? 'border-neon-cyan' 
                                : 'border-space-600'
                            } object-cover`}
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded border-2 ${
                            entry.isCurrentUser 
                              ? 'border-neon-cyan bg-neon-cyan/20' 
                              : 'border-space-600 bg-space-700'
                          } flex items-center justify-center`}>
                            <span className="text-xs font-pixel text-neon-cyan">
                              {entry.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className={`font-mono text-sm ${
                          entry.isCurrentUser ? 'text-neon-cyan font-bold' : 'text-white'
                        }`}>
                          {entry.username}
                          {entry.isCurrentUser && (
                            <span className="ml-2 text-xs text-neon-green">(YOU)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-pixel text-white text-sm">
                        {entry.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-xs font-pixel text-gray-400 uppercase">
                        {entry.gameType === 'asteroids' ? 'ASTEROIDS' :
                         entry.gameType === 'pacman-math' ? 'PAC-MAN' :
                         entry.gameType === 'ph-invaders' ? 'PH INVADERS' :
                         entry.gameType === 'pong-arithmetic' ? 'PONG ARITHMETIC' :
                         entry.gameType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Section */}
      {user && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="retro-card border-neon-green">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-neon-green" size={20} />
              <span className="text-xs text-gray-500 font-pixel">YOUR RANK</span>
            </div>
            <div className="text-2xl font-pixel text-neon-green">
              {userRank ? `#${userRank}` : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {userRank ? `Out of ${totalPlayers} players` : 'No rank yet'}
            </div>
          </div>
          
          <div className="retro-card border-neon-pink">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="text-neon-pink" size={20} />
              <span className="text-xs text-gray-500 font-pixel">BEST SCORE</span>
            </div>
            <div className="text-2xl font-pixel text-neon-pink">
              {userBestScore > 0 ? userBestScore.toLocaleString() : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {selectedGame === 'asteroids' ? 'ASTEROIDS' :
               selectedGame === 'pacman-math' ? 'PAC-MAN' :
               selectedGame === 'ph-invaders' ? 'PH INVADERS' :
               selectedGame === 'pong-arithmetic' ? 'PONG ARITHMETIC' :
               selectedGame} - All Time
            </div>
          </div>
          
          <div className="retro-card border-neon-yellow">
            <div className="flex items-center gap-3 mb-2">
              <Award className="text-neon-yellow" size={20} />
              <span className="text-xs text-gray-500 font-pixel">PERCENTILE</span>
            </div>
            <div className="text-2xl font-pixel text-neon-yellow">
              {userPercentile ? `TOP ${userPercentile}%` : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {userPercentile ? 'Your ranking percentile' : 'Play to get ranked'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


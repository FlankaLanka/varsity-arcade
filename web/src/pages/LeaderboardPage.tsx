import React, { useState } from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  gameType: string;
  isCurrentUser?: boolean;
}

const generateSyntheticData = (gameType: string, period: string): LeaderboardEntry[] => {
  const names = [
    'NovaStar', 'QuantumX', 'PixelPilot', 'CosmicRay', 'StellarAce',
    'NebulaNinja', 'GalaxyGamer', 'VoidViper', 'AstroAce', 'SpaceSage',
    'CometCrusher', 'MeteorMage', 'OrbitOracle', 'SolarSniper', 'LunarLancer',
    'PlasmaPro', 'FusionFighter', 'NebulaNomad', 'StardustSage', 'CosmicCoder'
  ];
  
  const entries: LeaderboardEntry[] = [];
  const baseScore = period === 'daily' ? 5000 : period === 'weekly' ? 25000 : 100000;
  
  for (let i = 0; i < 20; i++) {
    entries.push({
      rank: i + 1,
      displayName: names[i] || `Player${i + 1}`,
      score: baseScore - (i * 250) + Math.floor(Math.random() * 500),
      gameType,
      isCurrentUser: i === 7 // Mark 8th place as current user for demo
    });
  }
  
  return entries;
};

export const LeaderboardPage = () => {
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('weekly');
  
  const games = [
    { id: 'all', name: 'ALL GAMES' },
    { id: 'asteroids', name: 'ASTEROIDS' },
    { id: 'pacman', name: 'PAC-MAN' },
    { id: 'math', name: 'PH INVADERS' }
  ];
  
  const periods = [
    { id: 'daily', name: 'TODAY' },
    { id: 'weekly', name: 'THIS WEEK' },
    { id: 'all_time', name: 'ALL TIME' }
  ];
  
  const leaderboardData = generateSyntheticData(selectedGame, selectedPeriod);
  
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
                  key={entry.rank}
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
                      <div className={`w-8 h-8 rounded border-2 ${
                        entry.isCurrentUser 
                          ? 'border-neon-cyan bg-neon-cyan/20' 
                          : 'border-space-600 bg-space-700'
                      } flex items-center justify-center`}>
                        <span className="text-xs font-pixel text-neon-cyan">
                          {entry.displayName.charAt(0)}
                        </span>
                      </div>
                      <span className={`font-mono text-sm ${
                        entry.isCurrentUser ? 'text-neon-cyan font-bold' : 'text-white'
                      }`}>
                        {entry.displayName}
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
                      {entry.gameType === 'all' ? 'MIXED' : entry.gameType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="retro-card border-neon-green">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-neon-green" size={20} />
            <span className="text-xs text-gray-500 font-pixel">YOUR RANK</span>
          </div>
          <div className="text-2xl font-pixel text-neon-green">#8</div>
          <div className="text-xs text-gray-400 mt-1">+2 from last week</div>
        </div>
        
        <div className="retro-card border-neon-pink">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="text-neon-pink" size={20} />
            <span className="text-xs text-gray-500 font-pixel">BEST SCORE</span>
          </div>
          <div className="text-2xl font-pixel text-neon-pink">12,450</div>
          <div className="text-xs text-gray-400 mt-1">Asteroids - This Week</div>
        </div>
        
        <div className="retro-card border-neon-yellow">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-neon-yellow" size={20} />
            <span className="text-xs text-gray-500 font-pixel">PERCENTILE</span>
          </div>
          <div className="text-2xl font-pixel text-neon-yellow">TOP 15%</div>
          <div className="text-xs text-gray-400 mt-1">Above average player</div>
        </div>
      </div>
    </div>
  );
};


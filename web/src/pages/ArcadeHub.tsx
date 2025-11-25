import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users } from 'lucide-react';

// Game Thumbnail Components
const AsteroidsThumbnail = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Space background */}
    <div className="absolute inset-0 bg-space-900 rounded"></div>
    {/* Stars */}
    <div className="absolute inset-0">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-0.5 bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
    {/* Ship */}
    <div className="relative z-10">
      <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-cyan-400"></div>
    </div>
    {/* Asteroids */}
    <div className="absolute top-4 left-4 w-3 h-3 border border-white rounded-full"></div>
    <div className="absolute top-8 right-6 w-2 h-2 border border-white rounded-full"></div>
    <div className="absolute bottom-6 left-8 w-2.5 h-2.5 border border-white rounded-full"></div>
  </div>
);

const PacManThumbnail = () => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
    {/* Dark maze background */}
    <div className="absolute inset-0 bg-space-900 rounded"></div>
    
    {/* Maze walls - simple grid pattern */}
    <div className="absolute inset-0 p-1.5">
      <div className="h-full w-full relative">
        {/* Horizontal walls */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-space-700"></div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-space-700"></div>
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-space-700"></div>
        {/* Vertical walls */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-space-700"></div>
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-space-700"></div>
        <div className="absolute left-1/3 top-0 bottom-0 w-0.5 bg-space-700"></div>
        <div className="absolute right-1/3 top-0 bottom-0 w-0.5 bg-space-700"></div>
      </div>
    </div>
    
    {/* Pac-Man character - yellow circle with mouth */}
    <div className="relative z-10">
      <div className="relative">
        {/* Yellow circle */}
        <div className="w-8 h-8 bg-yellow-400 rounded-full relative overflow-hidden">
          {/* Mouth cutout using clip-path */}
          <div className="absolute inset-0 bg-space-900" style={{
            clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)'
          }}></div>
        </div>
      </div>
    </div>
    
    {/* Small pellets scattered around */}
    <div className="absolute top-2 left-2 w-1 h-1 bg-cyan-400 rounded-full"></div>
    <div className="absolute top-2 right-2 w-1 h-1 bg-cyan-400 rounded-full"></div>
    <div className="absolute bottom-2 left-2 w-1 h-1 bg-cyan-400 rounded-full"></div>
    <div className="absolute bottom-2 right-2 w-1 h-1 bg-cyan-400 rounded-full"></div>
    <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-cyan-400 rounded-full"></div>
    <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-cyan-400 rounded-full"></div>
    
    {/* Large power pellet */}
    <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full border border-cyan-400"></div>
    
    {/* Ghost (small) */}
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
      <div className="w-3 h-3 bg-pink-500 rounded-t-full relative">
        <div className="absolute bottom-0 left-0 w-1 h-1 bg-pink-500"></div>
        <div className="absolute bottom-0 left-1/3 w-1 h-1 bg-pink-500"></div>
        <div className="absolute bottom-0 right-1/3 w-1 h-1 bg-pink-500"></div>
        <div className="absolute bottom-0 right-0 w-1 h-1 bg-pink-500"></div>
        {/* Eyes */}
        <div className="absolute top-1 left-0.5 w-0.5 h-0.5 bg-black rounded-full"></div>
        <div className="absolute top-1 right-0.5 w-0.5 h-0.5 bg-black rounded-full"></div>
      </div>
    </div>
  </div>
);

const PHInvadersThumbnail = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Space background */}
    <div className="absolute inset-0 bg-space-900 rounded"></div>
    {/* Invader formation */}
    <div className="relative z-10 flex flex-col gap-1">
      <div className="flex gap-1">
        <div className="w-3 h-2 bg-red-500"></div>
        <div className="w-3 h-2 bg-green-500"></div>
        <div className="w-3 h-2 bg-blue-500"></div>
      </div>
      <div className="flex gap-1">
        <div className="w-3 h-2 bg-yellow-500"></div>
        <div className="w-3 h-2 bg-purple-500"></div>
        <div className="w-3 h-2 bg-red-500"></div>
      </div>
    </div>
    {/* Player ship */}
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-cyan-400"></div>
    </div>
    {/* pH indicator */}
    <div className="absolute top-1 left-1 text-[6px] text-green-400 font-pixel">pH</div>
  </div>
);

const PongThumbnail = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Dark background */}
    <div className="absolute inset-0 bg-space-900 rounded"></div>
    {/* Center dividing line */}
    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-space-700"></div>
    {/* Left paddle (player) */}
    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-12 bg-cyan-400"></div>
    {/* Right paddle (AI) */}
    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-12 bg-pink-500"></div>
    {/* Ball */}
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
    {/* Number on ball */}
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[6px] text-black font-pixel">7</div>
  </div>
);

export const ArcadeHub = () => {
  const navigate = useNavigate();

  const GameCard = ({ title, players, difficulty, color, onClick, thumbnail }: any) => (
    <div 
      onClick={onClick}
      className="retro-card group cursor-pointer hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_#00f3ff] transition-all"
    >
      <div className={`h-32 bg-${color}-900/20 mb-4 flex items-center justify-center border border-gray-700 group-hover:border-${color}-400 overflow-hidden rounded`}>
        {thumbnail}
      </div>
      
      <h3 className="text-neon-yellow text-sm mb-2">{title}</h3>
      
      <div className="flex justify-between items-end text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Users size={12} />
          <span className="text-neon-green">{players} ONLINE</span>
        </div>
        <span className="border border-gray-600 px-1 rounded uppercase">{difficulty}</span>
      </div>

      <div className="absolute top-2 right-2 w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="border-4 border-neon-pink p-6 bg-space-800/50 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl text-white mb-2">DAILY CHALLENGE</h2>
          <p className="text-neon-pink text-sm mb-4 font-pixel">Asteroids: Synonym Shooter - Score 300 or higher.</p>
          <button 
            onClick={() => navigate('/game/asteroids')}
            className="retro-btn bg-neon-pink text-white border-neon-pink hover:bg-white hover:text-black"
          >
            PLAY NOW <Play size={12} className="inline ml-2"/>
          </button>
        </div>
        
        {/* Decor */}
        <div className="absolute -right-10 -bottom-10 text-space-700 opacity-20">
          <div className="w-48 h-48 border-4 border-neon-pink rounded-full flex items-center justify-center">
            <div className="w-32 h-32 border-2 border-neon-pink rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Game Grid */}
      <div>
        <h2 className="text-neon-cyan text-lg mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-neon-cyan inline-block"></span>
          AVAILABLE GAMES
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GameCard 
            title="ASTEROIDS: SYNONYM SHOOTER" 
            players={12} 
            difficulty="MED" 
            color="cyan"
            onClick={() => navigate('/game/asteroids')}
            thumbnail={<AsteroidsThumbnail />}
          />
          <GameCard 
            title="PAC-MAN: MATH BLITZ" 
            players={8} 
            difficulty="MED" 
            color="yellow"
            onClick={() => navigate('/game/pacman-math')}
            thumbnail={<PacManThumbnail />}
          />
           <GameCard 
            title="pH INVADERS" 
            players={42} 
            difficulty="EASY" 
            color="green"
            onClick={() => navigate('/game/ph-invaders')}
            thumbnail={<PHInvadersThumbnail />}
          />
          <GameCard 
            title="PONG ARITHMETIC" 
            players={15} 
            difficulty="EASY" 
            color="cyan"
            onClick={() => navigate('/game/pong-arithmetic')}
            thumbnail={<PongThumbnail />}
          />
        </div>
      </div>
    </div>
  );
};


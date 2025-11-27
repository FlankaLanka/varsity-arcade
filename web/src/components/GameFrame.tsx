import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface GameFrameProps {
  title: string;
  children: React.ReactNode;
  score: number;
  lives: number;
  wave?: number;
  timeRemaining?: number;
  overlay?: React.ReactNode;
  hideHUD?: boolean; // Option to hide default HUD for custom game UI
  challengeScoreToBeat?: number;
  challengerUsername?: string;
}

export const GameFrame = ({ 
  title, 
  children, 
  score, 
  lives, 
  wave, 
  timeRemaining, 
  overlay,
  hideHUD = false,
  challengeScoreToBeat,
  challengerUsername
}: GameFrameProps) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4">
      {/* Game Header */}
      <div className="flex items-center justify-between mb-3">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="font-['Press_Start_2P'] text-[10px]">EXIT</span>
        </button>
        <h1 className="font-['Press_Start_2P'] text-sm text-neon-yellow">{title}</h1>
        <div className="w-16"></div>
      </div>

      {/* Arcade Cabinet Frame */}
      <div className="relative border-4 border-space-700 rounded-lg bg-black p-1 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
        {/* CRT Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20 rounded"></div>
        
        {/* Challenge Banner */}
        {challengeScoreToBeat && challengerUsername && !overlay && (
          <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-neon-yellow/90 to-neon-pink/90 border-b-2 border-neon-yellow p-2">
            <div className="text-center font-['Press_Start_2P'] text-black text-[10px]">
              🎯 CHALLENGE: Beat {challengerUsername}'s score of {challengeScoreToBeat.toLocaleString()}!
            </div>
          </div>
        )}

        {/* HUD - Only show if no overlay and not hidden */}
        {!overlay && !hideHUD && (
          <>
            <div className="absolute top-3 left-3 z-20 font-['Press_Start_2P'] text-white">
              <div className="text-neon-cyan text-[8px] mb-0.5">SCORE</div>
              <div className="text-sm">{score.toLocaleString()}</div>
              {challengeScoreToBeat && (
                <>
                  <div className="text-neon-yellow text-[8px] mt-2 mb-0.5">TARGET</div>
                  <div className={`text-xs ${score >= challengeScoreToBeat ? 'text-neon-green' : 'text-neon-yellow'}`}>
                    {challengeScoreToBeat.toLocaleString()}
                  </div>
                </>
              )}
        </div>

            <div className="absolute top-3 right-3 z-20 font-['Press_Start_2P'] text-white text-right">
              <div className="text-neon-pink text-[8px] mb-0.5">LIVES</div>
              <div className="text-sm">{lives > 0 ? '♥'.repeat(lives) : '—'}</div>
        </div>
        
        {wave && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 font-['Press_Start_2P'] text-white text-center">
                <div className="text-neon-green text-[8px] mb-0.5">WAVE</div>
                <div className="text-sm">{wave}</div>
          </div>
        )}

        {timeRemaining !== undefined && (
              <div className="absolute bottom-3 right-3 z-20 font-['Press_Start_2P'] text-white text-right">
                <div className="text-neon-yellow text-[8px] mb-0.5">TIME</div>
                <div className={`text-sm ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
              {timeRemaining.toString().padStart(2, '0')}
            </div>
          </div>
            )}
          </>
        )}

        {/* Game Container */}
        <div className="bg-space-900 relative overflow-hidden rounded aspect-video">
          {children}
        </div>

        {/* Overlay (Game Over / Victory) */}
        {overlay && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded">
            {overlay}
          </div>
        )}
      </div>

      {/* Controls Hint */}
      <div className="mt-4 flex justify-center gap-6 text-gray-500 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="border border-gray-700 px-1.5 py-0.5 rounded bg-space-800 text-[10px] text-white font-['Press_Start_2P']">WASD</span>
          <span>Move</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="border border-gray-700 px-1.5 py-0.5 rounded bg-space-800 text-[10px] text-white font-['Press_Start_2P']">SPACE</span>
          <span>Action</span>
        </div>
      </div>
    </div>
  );
};

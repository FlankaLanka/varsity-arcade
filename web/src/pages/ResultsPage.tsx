import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Share2, Users, Trophy, ArrowRight } from 'lucide-react';

export const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { score, game } = location.state || { score: 0, game: 'Unknown' };
  
  const [loopTriggered, setLoopTriggered] = useState(false);

  // Simulate Orchestrator Agent
  useEffect(() => {
    if (score > 0) {
      // Fake async agent call
      setTimeout(() => {
        setLoopTriggered(true);
      }, 800);
    }
  }, [score]);

  return (
    <div className="max-w-2xl mx-auto pt-10 text-center">
      <h1 className="text-3xl text-neon-yellow mb-2">SESSION COMPLETE</h1>
      <div className="text-gray-400 mb-8 font-pixel text-sm">{game.toUpperCase()}</div>

      {/* Score Card */}
      <div className="retro-card mb-8 transform hover:scale-105 transition-transform duration-300">
        <div className="text-neon-cyan text-sm mb-2">FINAL SCORE</div>
        <div className="text-6xl font-pixel text-white text-shadow-lg mb-6">{score}</div>
        
        <div className="grid grid-cols-3 gap-4 border-t border-space-700 pt-4">
          <div>
            <div className="text-gray-500 text-xs">ACCURACY</div>
            <div className="text-neon-green">92%</div>
          </div>
           <div>
            <div className="text-gray-500 text-xs">STREAK</div>
            <div className="text-neon-pink">3 DAYS</div>
          </div>
           <div>
            <div className="text-gray-500 text-xs">RANK</div>
            <div className="text-neon-yellow">#4</div>
          </div>
        </div>
      </div>

      {/* Viral Loop Prompt (Agent Driven) */}
      {loopTriggered && (
        <div className="animate-bounce-in">
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-neon-pink p-6 rounded-lg mb-8 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl text-white font-pixel mb-2">NEW RECORD!</h3>
              <p className="text-gray-300 mb-6 text-sm max-w-md mx-auto">
                The <span className="text-neon-cyan">Loop Orchestrator</span> has identified you as a top performer. Challenge a friend to beat your score and earn a <span className="text-neon-yellow">Streak Shield</span>!
              </p>
              
              <button className="retro-btn bg-neon-pink text-white border-neon-pink hover:bg-white hover:text-black w-full sm:w-auto flex items-center justify-center gap-2 mx-auto">
                <Share2 size={16} />
                CHALLENGE FRIEND
              </button>
            </div>
            
            {/* Background FX */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-pink blur-[60px] opacity-20"></div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="retro-btn border-gray-600 text-gray-400 hover:text-white hover:border-white"
        >
          BACK TO HUB
        </button>
        <button 
          onClick={() => navigate('/game/asteroids')}
          className="retro-btn border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black"
        >
          PLAY AGAIN <ArrowRight size={16} className="inline ml-2" />
        </button>
      </div>
    </div>
  );
};


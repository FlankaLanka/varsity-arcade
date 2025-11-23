import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Share2 } from 'lucide-react';

interface GameFrameProps {
  title: string;
  onExit?: () => void;
  children: React.ReactNode;
  score: number;
  lives: number;
  wave?: number;
  timeRemaining?: number;
}

export const GameFrame = ({ title, onExit, children, score, lives, wave, timeRemaining }: GameFrameProps) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-pixel text-xs">EXIT GAME</span>
        </button>
        <h1 className="font-pixel text-xl text-neon-yellow shadow-neon">{title}</h1>
        <div className="w-20"></div> {/* Spacer */}
      </div>

      {/* Arcade Cabinet Frame */}
      <div className="relative border-4 border-space-700 rounded-lg bg-black p-1 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
        {/* CRT Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20"></div>
        
        {/* HUD */}
        <div className="absolute top-4 left-4 z-20 font-pixel text-white text-shadow">
          <div className="text-neon-cyan text-xs mb-1">SCORE</div>
          <div className="text-xl">{score.toString()}</div>
        </div>

        <div className="absolute top-4 right-4 z-20 font-pixel text-white text-right text-shadow">
          <div className="text-neon-pink text-xs mb-1">LIVES</div>
          <div className="text-xl">{'♥'.repeat(lives)}</div>
        </div>
        
        {wave && (
           <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 font-pixel text-white text-center text-shadow">
            <div className="text-neon-green text-xs mb-1">WAVE</div>
            <div className="text-xl">{wave}</div>
          </div>
        )}

        {timeRemaining !== undefined && (
          <div className="absolute bottom-4 right-4 z-20 font-pixel text-white text-right text-shadow">
            <div className="text-neon-yellow text-xs mb-1">TIME</div>
            <div className={`text-xl ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
              {timeRemaining.toString().padStart(2, '0')}
            </div>
          </div>
        )}

        {/* Game Container */}
        <div className="aspect-video bg-space-900 relative overflow-hidden">
          {children}
        </div>
      </div>

      {/* Controls Hint */}
      <div className="mt-6 flex justify-center gap-8 text-gray-500 text-sm font-mono uppercase">
        <div className="flex items-center gap-2">
          <span className="border border-gray-700 px-2 py-1 rounded bg-space-800 text-xs text-white font-pixel">WASD</span>
          <span>Move</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-gray-700 px-2 py-1 rounded bg-space-800 text-xs text-white font-pixel">MOUSE</span>
          <span>Aim & Shoot</span>
        </div>
      </div>
    </div>
  );
};


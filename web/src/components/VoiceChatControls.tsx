import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

export default function VoiceChatControls() {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [volume, setVolume] = useState(100);
  const [speakingLevel, setSpeakingLevel] = useState(0);

  // Mock speaking level animation
  useEffect(() => {
    if (isMuted) {
      setSpeakingLevel(0);
      return;
    }

    const interval = setInterval(() => {
      // Random mock audio level
      setSpeakingLevel(Math.random() * 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isMuted]);

  return (
    <div className="space-y-3">
      <div className="text-xs font-['Press_Start_2P'] text-neon-blue mb-2">VOICE</div>
      
      {/* Mic Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2 rounded transition-all ${
            isMuted 
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
              : 'bg-neon-green/20 text-neon-green hover:bg-neon-green/30'
          }`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        
        {/* Visualizer */}
        <div className="flex gap-0.5 items-end h-6 flex-1">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className={`w-1 rounded-t-sm transition-all duration-100 ${
                isMuted ? 'bg-gray-700 h-0.5' : 'bg-neon-green'
              }`}
              style={{
                height: isMuted ? '2px' : `${Math.max(20, Math.random() * speakingLevel)}%`
              }}
            />
          ))}
        </div>
      </div>

      {/* Audio Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsDeafened(!isDeafened)}
          className={`p-2 rounded transition-all ${
            isDeafened 
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          {isDeafened || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          disabled={isDeafened}
          className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
        />
      </div>
    </div>
  );
}


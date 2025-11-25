import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceChatControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  micVolume: number;
  outputVolume: number;
  speakingLevel: number;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onMicVolumeChange: (volume: number) => void;
  onOutputVolumeChange: (volume: number) => void;
}

export default function VoiceChatControls({
  isMuted,
  isDeafened,
  micVolume,
  outputVolume,
  speakingLevel,
  onToggleMute,
  onToggleDeafen,
  onMicVolumeChange,
  onOutputVolumeChange
}: VoiceChatControlsProps) {

  return (
    <div className="space-y-3">
      <div className="text-xs font-['Press_Start_2P'] text-neon-blue mb-2">VOICE</div>
      
      {/* Mic Input Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMute}
          className={`p-2 rounded transition-all ${
            isMuted 
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
              : 'bg-neon-green/20 text-neon-green hover:bg-neon-green/30'
          }`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        
        <input
          type="range"
          min="0"
          max="100"
          value={micVolume}
          onChange={(e) => onMicVolumeChange(parseInt(e.target.value))}
          disabled={isMuted}
          className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all disabled:opacity-50"
        />
      </div>

      {/* Output Volume Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDeafen}
          className={`p-2 rounded transition-all ${
            isDeafened 
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          {isDeafened || outputVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        
        <input
          type="range"
          min="0"
          max="100"
          value={outputVolume}
          onChange={(e) => onOutputVolumeChange(parseInt(e.target.value))}
          disabled={isDeafened}
          className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all disabled:opacity-50"
        />
      </div>
    </div>
  );
}



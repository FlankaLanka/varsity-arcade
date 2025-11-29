import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Users } from 'lucide-react';

interface VoiceChatControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  micVolume: number;
  outputVolume: number;
  speakingLevel: number;
  isInVoiceChannel: boolean;
  voiceChannelUserCount: number;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onMicVolumeChange: (volume: number) => void;
  onOutputVolumeChange: (volume: number) => void;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
}

export default function VoiceChatControls({
  isMuted,
  isDeafened,
  micVolume,
  outputVolume,
  speakingLevel,
  isInVoiceChannel,
  voiceChannelUserCount,
  onToggleMute,
  onToggleDeafen,
  onMicVolumeChange,
  onOutputVolumeChange,
  onJoinVoice,
  onLeaveVoice
}: VoiceChatControlsProps) {

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-['Press_Start_2P'] text-neon-blue">VOICE</div>
        {/* Voice channel user count indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Users size={12} />
          <span className={voiceChannelUserCount > 0 ? 'text-neon-green' : 'text-gray-500'}>
            {voiceChannelUserCount}
          </span>
        </div>
      </div>
      
      {/* Join/Leave Voice Button */}
      <button
        onClick={isInVoiceChannel ? onLeaveVoice : onJoinVoice}
        className={`w-full flex items-center justify-center gap-2 p-2.5 rounded text-xs transition-all ${
          isInVoiceChannel 
            ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
            : 'bg-neon-green/20 text-neon-green border border-neon-green/50 hover:bg-neon-green/30'
        }`}
      >
        {isInVoiceChannel ? <PhoneOff size={14} /> : <Phone size={14} />}
        <span className="font-['Press_Start_2P'] text-[8px]">
          {isInVoiceChannel ? 'LEAVE VOICE' : 'JOIN VOICE'}
        </span>
        {!isInVoiceChannel && voiceChannelUserCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-neon-green/30 rounded text-[8px]">
            {voiceChannelUserCount} in call
          </span>
        )}
      </button>

      {/* Only show controls when in voice channel */}
      {isInVoiceChannel && (
        <>
          {/* Mic Input Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className={`p-2 rounded transition-all relative ${
                isMuted 
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                  : 'bg-neon-green/20 text-neon-green hover:bg-neon-green/30'
              }`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              {/* Speaking indicator ring */}
              {!isMuted && speakingLevel > 15 && (
                <span 
                  className="absolute inset-0 rounded animate-ping opacity-50"
                  style={{
                    backgroundColor: 'rgba(41, 255, 100, 0.3)',
                    animationDuration: '1s'
                  }}
                />
              )}
            </button>
            
            {/* Speaking level bar */}
            <div className="flex-1 h-4 bg-gray-800 rounded-lg overflow-hidden relative">
              <div 
                className="absolute inset-y-0 left-0 transition-all duration-75"
                style={{ 
                  width: `${isMuted ? 0 : speakingLevel}%`,
                  background: speakingLevel > 80 
                    ? 'linear-gradient(90deg, #29ff64, #ff6b6b)' 
                    : speakingLevel > 50 
                      ? 'linear-gradient(90deg, #29ff64, #ffff00)' 
                      : '#29ff64'
                }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={micVolume}
                onChange={(e) => onMicVolumeChange(parseInt(e.target.value))}
                disabled={isMuted}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              {/* Mic volume indicator line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/80 transition-all"
                style={{ left: `${micVolume}%` }}
              />
            </div>
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
            
            <div className="flex-1 h-4 bg-gray-800 rounded-lg overflow-hidden relative">
              <div 
                className="absolute inset-y-0 left-0 bg-neon-cyan/50 transition-all"
                style={{ width: isDeafened ? '0%' : `${outputVolume}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={outputVolume}
                onChange={(e) => onOutputVolumeChange(parseInt(e.target.value))}
                disabled={isDeafened}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, onValue, set, remove, serverTimestamp } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import AgoraRTC, { 
  IAgoraRTCClient, 
  IMicrophoneAudioTrack, 
  IAgoraRTCRemoteUser
} from 'agora-rtc-sdk-ng';

interface UseVoiceChatOptions {
  cohortId: string;
  userId: string;
  onSpeakingLevelChange?: (level: number) => void;
}

const SPEAKING_THRESHOLD = 15;
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';

// Configure Agora SDK - warning level only
AgoraRTC.setLogLevel(3);

export function useVoiceChat({ cohortId, userId, onSpeakingLevelChange }: UseVoiceChatOptions) {
  // === State ===
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [micVolume, setMicVolume] = useState(100);
  const [outputVolume, setOutputVolume] = useState(100);
  const [speakingLevel, setSpeakingLevel] = useState(0);
  const [micInitialized, setMicInitialized] = useState(false);
  const [speakingMembers, setSpeakingMembers] = useState<Set<string>>(new Set());
  const [isInVoiceChannel, setIsInVoiceChannel] = useState(false);
  const [voiceChannelUserCount, setVoiceChannelUserCount] = useState(0);

  // === Refs ===
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteUsersRef = useRef<Map<string, IAgoraRTCRemoteUser>>(new Map());
  const joinedRef = useRef(false);
  const lastSpeakingStateRef = useRef<boolean>(false);
  const localUidRef = useRef<number | string | null>(null);
  const joiningRef = useRef(false); // Prevent double joins
  
  // Refs for state accessed in event handlers (to avoid stale closures)
  const isDeafenedRef = useRef(isDeafened);
  const outputVolumeRef = useRef(outputVolume);
  const isMutedRef = useRef(isMuted);
  const cohortIdRef = useRef(cohortId);
  const userIdRef = useRef(userId);
  const onSpeakingLevelChangeRef = useRef(onSpeakingLevelChange);

  // Keep refs in sync with state
  useEffect(() => { isDeafenedRef.current = isDeafened; }, [isDeafened]);
  useEffect(() => { outputVolumeRef.current = outputVolume; }, [outputVolume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { cohortIdRef.current = cohortId; }, [cohortId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { onSpeakingLevelChangeRef.current = onSpeakingLevelChange; }, [onSpeakingLevelChange]);

  // === Cleanup function (extracted for reuse) ===
  const cleanupAgora = useCallback(async () => {
    console.log('[VoiceChat] Cleaning up Agora...');
    
    // Stop and close local track
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }
    
    // Leave channel
    if (clientRef.current && joinedRef.current) {
      try {
        await clientRef.current.leave();
      } catch (e) {
        // Ignore leave errors
      }
    }
    
    // Reset refs
    joinedRef.current = false;
    joiningRef.current = false;
    clientRef.current = null;
    remoteUsersRef.current.clear();
    
    // Reset state
    setMicInitialized(false);
    setIsInVoiceChannel(false);
    
    // Clean up Firebase voice state
    const speakingRef = ref(rtdb, `cohorts/${cohortIdRef.current}/voice/speaking/${userIdRef.current}`);
    remove(speakingRef).catch(() => {});
    
    const stateRef = ref(rtdb, `cohorts/${cohortIdRef.current}/voice/state/${userIdRef.current}`);
    remove(stateRef).catch(() => {});
    
    // Remove from voice channel presence
    const voicePresenceRef = ref(rtdb, `cohorts/${cohortIdRef.current}/voice/presence/${userIdRef.current}`);
    remove(voicePresenceRef).catch(() => {});
    
    console.log('[VoiceChat] Cleanup complete');
  }, []);

  // === Listen to voice channel presence (how many users in voice) ===
  useEffect(() => {
    if (!cohortId) return;

    const voicePresenceRef = ref(rtdb, `cohorts/${cohortId}/voice/presence`);
    const unsubscribe = onValue(voicePresenceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setVoiceChannelUserCount(Object.keys(data).length);
      } else {
        setVoiceChannelUserCount(0);
      }
    });

    return () => unsubscribe();
  }, [cohortId]);

  // === Speaking Members Listener ===
  useEffect(() => {
    if (!cohortId) return;

    const speakingRef = ref(rtdb, `cohorts/${cohortId}/voice/speaking`);
    const unsubscribe = onValue(speakingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSpeakingMembers(new Set(Object.keys(data)));
      } else {
        setSpeakingMembers(new Set());
      }
    });

    return () => unsubscribe();
  }, [cohortId]);

  // === Cleanup on unmount or cohortId/userId change ===
  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        cleanupAgora();
      }
    };
  }, [cohortId, userId, cleanupAgora]);

  // === Volume Adjustment Effects (Independent of channel state) ===
  
  // Mic volume adjustment - applies immediately
  useEffect(() => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setVolume(micVolume);
    }
  }, [micVolume]);

  // Output volume adjustment - applies immediately to all remote users
  useEffect(() => {
    remoteUsersRef.current.forEach((user) => {
      if (user.audioTrack) {
        user.audioTrack.setVolume(isDeafened ? 0 : outputVolume);
      }
    });
  }, [outputVolume, isDeafened]);

  // === Join Voice Channel ===
  const joinVoice = useCallback(async () => {
    if (!cohortId || !userId || !AGORA_APP_ID) {
      if (!AGORA_APP_ID) {
        console.error('[VoiceChat] Agora App ID not configured. Add VITE_AGORA_APP_ID to .env');
      }
      return;
    }

    // Already joined or joining - skip
    if (joinedRef.current || joiningRef.current || clientRef.current) {
      console.log('[VoiceChat] Already joined or joining, skipping...');
      return;
    }

    joiningRef.current = true;

    try {
      console.log('[VoiceChat] Joining voice channel...');
      
      const client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8' 
      });
      clientRef.current = client;

      // Event: Remote user publishes audio
      client.on('user-published', async (user, mediaType) => {
        if (mediaType === 'audio') {
          console.log('[VoiceChat] Remote user published audio:', user.uid);
          await client.subscribe(user, mediaType);
          
          const remoteAudioTrack = user.audioTrack;
          if (remoteAudioTrack) {
            remoteUsersRef.current.set(String(user.uid), user);
            
            if (!isDeafenedRef.current) {
              remoteAudioTrack.play();
              remoteAudioTrack.setVolume(outputVolumeRef.current);
            }
            
            console.log('[VoiceChat] Subscribed to remote audio from', user.uid);
          }
        }
      });

      // Event: Remote user unpublishes audio
      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio') {
          console.log('[VoiceChat] Remote user unpublished audio:', user.uid);
          remoteUsersRef.current.delete(String(user.uid));
        }
      });

      // Event: Remote user leaves
      client.on('user-left', (user) => {
        console.log('[VoiceChat] Remote user left:', user.uid);
        remoteUsersRef.current.delete(String(user.uid));
      });

      // Volume indicator for speaking detection
      client.enableAudioVolumeIndicator();
      client.on('volume-indicator', (volumes) => {
        const localVolume = volumes.find(v => v.uid === localUidRef.current);
        if (localVolume) {
          const level = Math.min(100, localVolume.level * 2);
          setSpeakingLevel(level);
          if (onSpeakingLevelChangeRef.current) {
            onSpeakingLevelChangeRef.current(level);
          }
          
          const isSpeaking = level > SPEAKING_THRESHOLD && !isMutedRef.current;
          if (isSpeaking !== lastSpeakingStateRef.current) {
            lastSpeakingStateRef.current = isSpeaking;
            const speakingRef = ref(rtdb, `cohorts/${cohortIdRef.current}/voice/speaking/${userIdRef.current}`);
            if (isSpeaking) {
              set(speakingRef, { speaking: true, timestamp: serverTimestamp() }).catch(() => {});
            } else {
              remove(speakingRef).catch(() => {});
            }
          }
        }
      });

      // Join channel
      console.log('[VoiceChat] Joining Agora channel:', cohortId);
      const assignedUid = await client.join(AGORA_APP_ID, cohortId, null, null);
      localUidRef.current = assignedUid;
      joinedRef.current = true;
      console.log('[VoiceChat] Joined Agora channel successfully with UID:', assignedUid);

      // Create and publish local audio track
      console.log('[VoiceChat] Creating microphone audio track...');
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true
      });
      
      localAudioTrackRef.current = localAudioTrack;

      // Start muted
      localAudioTrack.setEnabled(false);

      // Publish track
      await client.publish([localAudioTrack]);
      console.log('[VoiceChat] Published local audio track');

      setMicInitialized(true);
      setIsInVoiceChannel(true);
      joiningRef.current = false;

      // Update Firebase voice state
      const stateRef = ref(rtdb, `cohorts/${cohortId}/voice/state/${userId}`);
      set(stateRef, {
        isMuted: true,
        isDeafened: false,
        timestamp: serverTimestamp()
      }).catch(() => {});

      // Add to voice channel presence
      const voicePresenceRef = ref(rtdb, `cohorts/${cohortId}/voice/presence/${userId}`);
      set(voicePresenceRef, { joined: true, timestamp: serverTimestamp() }).catch(() => {});

    } catch (error: any) {
      console.error('[VoiceChat] Failed to join voice channel:', error);
      
      if (error?.message?.includes('dynamic use static key')) {
        console.error(
          '[VoiceChat] Your Agora project requires tokens (Secured mode).\n' +
          'Create a new project in "Testing mode" at console.agora.io'
        );
      }
      
      // Reset on error
      clientRef.current = null;
      joinedRef.current = false;
      joiningRef.current = false;
      setMicInitialized(false);
      setIsInVoiceChannel(false);
    }
  }, [cohortId, userId]);

  // === Leave Voice Channel ===
  const leaveVoice = useCallback(async () => {
    await cleanupAgora();
  }, [cleanupAgora]);

  // === Callbacks ===
  
  const toggleMute = useCallback(() => {
    if (!localAudioTrackRef.current) {
      console.log('[VoiceChat] Cannot toggle mute - no audio track');
      return;
    }

    const newMuted = !isMuted;
    setIsMuted(newMuted);

    localAudioTrackRef.current.setEnabled(!newMuted);

    if (newMuted) {
      const speakingRef = ref(rtdb, `cohorts/${cohortIdRef.current}/voice/speaking/${userIdRef.current}`);
      remove(speakingRef).catch(() => {});
      lastSpeakingStateRef.current = false;
    }

    console.log('[VoiceChat] Mute toggled:', newMuted ? 'muted' : 'unmuted');

    const stateRef = ref(rtdb, `cohorts/${cohortIdRef.current}/voice/state/${userIdRef.current}`);
    set(stateRef, {
      isMuted: newMuted,
      isDeafened: isDeafenedRef.current,
      timestamp: serverTimestamp()
    }).catch(() => {});
  }, [isMuted]);

  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);

    remoteUsersRef.current.forEach((user) => {
      if (user.audioTrack) {
        user.audioTrack.setVolume(newDeafened ? 0 : outputVolumeRef.current);
      }
    });

    console.log('[VoiceChat] Deafen toggled:', newDeafened ? 'deafened' : 'undeafened');

    const stateRef = ref(rtdb, `cohorts/${cohortIdRef.current}/voice/state/${userIdRef.current}`);
    set(stateRef, {
      isMuted: isMutedRef.current,
      isDeafened: newDeafened,
      timestamp: serverTimestamp()
    }).catch(() => {});
  }, [isDeafened]);

  // === Return ===
  return {
    isMuted,
    isDeafened,
    micVolume,
    outputVolume,
    speakingLevel,
    toggleMute,
    toggleDeafen,
    setMicVolume,
    setOutputVolume,
    micInitialized,
    speakingMembers,
    isInVoiceChannel,
    voiceChannelUserCount,
    joinVoice,
    leaveVoice
  };
}

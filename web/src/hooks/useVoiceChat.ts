import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, onValue, set, remove, onDisconnect, serverTimestamp, push } from 'firebase/database';
import { rtdb } from '../lib/firebase';

interface UseVoiceChatOptions {
  cohortId: string;
  userId: string;
  onSpeakingLevelChange?: (level: number) => void;
}

interface PeerConnection {
  peer: RTCPeerConnection;
  gainNode: GainNode;
  audioContext: AudioContext;
  mediaStreamSource: MediaStreamAudioSourceNode | null;
}

export function useVoiceChat({ cohortId, userId, onSpeakingLevelChange }: UseVoiceChatOptions) {
  const [isMuted, setIsMuted] = useState(true); // Default to muted
  const [isDeafened, setIsDeafened] = useState(false);
  const [micVolume, setMicVolume] = useState(100); // 0-100
  const [outputVolume, setOutputVolume] = useState(100); // 0-100
  const [speakingLevel, setSpeakingLevel] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const localGainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const speakingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isSpeakingRef = useRef<Map<string, boolean>>(new Map());

  // Initialize microphone and audio context - DISABLED (mic feature disabled)
  useEffect(() => {
    // Microphone feature is disabled - do not request mic access
    console.log('[VoiceChat] Microphone feature is disabled - no mic access requested');
    
    // Ensure any existing streams are closed
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localAudioContextRef.current && localAudioContextRef.current.state !== 'closed') {
      localAudioContextRef.current.close().catch(() => {});
      localAudioContextRef.current = null;
    }
    
    return () => {
      // Cleanup if needed
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (localAudioContextRef.current && localAudioContextRef.current.state !== 'closed') {
        localAudioContextRef.current.close().catch(() => {});
        localAudioContextRef.current = null;
      }
    };
  }, [cohortId, userId, onSpeakingLevelChange]);

  // Update mic volume when it changes - DISABLED (no mic access)
  useEffect(() => {
    // Mic feature disabled - do nothing
  }, [micVolume]);

  // Update output volume for all remote streams
  useEffect(() => {
    peersRef.current.forEach(({ gainNode, audioContext }) => {
      if (gainNode) {
        gainNode.gain.value = isDeafened ? 0 : outputVolume / 100; // Map 0-100 to 0.0-1.0
      }
      // Resume audio context if suspended
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    });
  }, [outputVolume, isDeafened]);

  // Handle mute/unmute - DISABLED (no-op)
  const toggleMute = useCallback(() => {
    // Mic feature disabled - do nothing
    console.log('[VoiceChat] Mute toggle clicked but microphone feature is disabled');
  }, []);

  // Handle deafen/undeafen
  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);

    // Mute/unmute all remote audio by setting gain to 0
    peersRef.current.forEach(({ gainNode, audioContext }) => {
      if (gainNode) {
        gainNode.gain.value = newDeafened ? 0 : outputVolume / 100;
      }
      // Also resume audio context if needed
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    });

    // Update Firebase
    const stateRef = ref(rtdb, `cohorts/${cohortId}/voice/state/${userId}`);
    set(stateRef, {
      isMuted: isMuted,
      isDeafened: newDeafened,
      timestamp: serverTimestamp()
    }).catch(() => {});
  }, [cohortId, userId, isMuted, isDeafened, outputVolume]);

  // Create peer connection for a user
  const createPeerConnection = useCallback((remoteUserId: string) => {
    console.log('Creating peer connection for', remoteUserId);
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection - DISABLED (no mic access)
    // if (localStreamRef.current) {
    //   localStreamRef.current.getTracks().forEach(track => {
    //     if (localStreamRef.current) {
    //       peer.addTrack(track, localStreamRef.current);
    //     }
    //   });
    // }

    // Create audio context for remote stream
    const audioContext = new AudioContext();
    
    // Resume audio context if suspended (required for autoplay policies)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(err => console.error('Error resuming audio context:', err));
    }
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = isDeafened ? 0 : outputVolume / 100;
    gainNode.connect(audioContext.destination);

    // Handle remote stream
    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      console.log('Received remote stream from', remoteUserId, remoteStream);
      
      // Disconnect existing source if any
      const peerConn = peersRef.current.get(remoteUserId);
      if (peerConn && peerConn.mediaStreamSource) {
        try {
          peerConn.mediaStreamSource.disconnect();
        } catch (e) {
          // Ignore if already disconnected
        }
      }
      
      // Connect to audio context for volume control
      try {
        // Resume audio context if needed
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(err => console.error('Error resuming audio context:', err));
        }
        
        const mediaStreamSource = audioContext.createMediaStreamSource(remoteStream);
        mediaStreamSource.connect(gainNode);
        
        // Store the source in the peer connection
        if (peerConn) {
          peerConn.mediaStreamSource = mediaStreamSource;
        }
        
        console.log('Connected remote stream to audio context for', remoteUserId);
      } catch (error) {
        console.error('Error connecting remote stream to audio context:', error);
      }
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate from', userId, 'to', remoteUserId);
        const iceRef = ref(rtdb, `cohorts/${cohortId}/voice/signals/${remoteUserId}/${userId}/ice`);
        const iceKey = push(iceRef);
        set(iceKey, {
          type: 'ice',
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
          timestamp: serverTimestamp()
        }).catch(() => {});
      } else {
        console.log('ICE gathering complete for', userId, 'to', remoteUserId);
      }
    };

    // Handle connection state changes
    peer.onconnectionstatechange = () => {
      console.log('Peer connection state:', peer.connectionState, 'for', remoteUserId);
      if (peer.connectionState === 'connected') {
        console.log('Successfully connected to', remoteUserId);
      } else if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
        console.warn('Connection issue with', remoteUserId, 'state:', peer.connectionState);
      }
    };

    const peerConnection: PeerConnection = {
      peer,
      gainNode,
      audioContext,
      mediaStreamSource: null
    };

    // Store peer connection BEFORE setting up ontrack handler
    peersRef.current.set(remoteUserId, peerConnection);
    return peerConnection;
  }, [cohortId, userId, isDeafened, outputVolume]);

  // Listen for other members and create connections - DISABLED (no mic, no audio to send)
  useEffect(() => {
    // Mic feature disabled - don't create peer connections since we have no audio to send
    if (!cohortId || !userId) return;
    // if (!cohortId || !userId || !localStreamRef.current) return;

    const presenceRef = ref(rtdb, `cohorts/${cohortId}/presence`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val();
      if (!presenceData) return;

      const presentUserIds = Object.keys(presenceData).filter(id => id !== userId);

      // Create connections for new users
      presentUserIds.forEach(remoteUserId => {
        if (!peersRef.current.has(remoteUserId)) {
          createPeerConnection(remoteUserId);
        }
      });

      // Remove connections for users who left
      peersRef.current.forEach((_, remoteUserId) => {
        if (!presentUserIds.includes(remoteUserId)) {
          const peerConn = peersRef.current.get(remoteUserId);
          if (peerConn) {
            // Disconnect media stream source
            if (peerConn.mediaStreamSource) {
              try {
                peerConn.mediaStreamSource.disconnect();
              } catch (e) {
                // Ignore if already disconnected
              }
            }
            peerConn.peer.close();
            if (peerConn.audioContext.state !== 'closed') {
              peerConn.audioContext.close().catch(() => {}); // Ignore errors if already closing
            }
            peersRef.current.delete(remoteUserId);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [cohortId, userId, createPeerConnection]);

  // Handle WebRTC signaling
  useEffect(() => {
    if (!cohortId || !userId) return;

    const signalsRef = ref(rtdb, `cohorts/${cohortId}/voice/signals/${userId}`);

    const unsubscribe = onValue(signalsRef, async (snapshot) => {
      const signalsData = snapshot.val();
      if (!signalsData) return;

      // Process signals from other users
      Object.entries(signalsData).forEach(([remoteUserId, userSignals]: [string, any]) => {
        const peerConn = peersRef.current.get(remoteUserId);
        if (!peerConn) return;

        // Handle offer
        if (userSignals.offer) {
          const offer = userSignals.offer;
          if (peerConn.peer.signalingState === 'stable' || peerConn.peer.signalingState === 'have-local-offer') {
            return; // Already processed
          }

          peerConn.peer.setRemoteDescription(new RTCSessionDescription(offer.sdp))
            .then(() => {
              return peerConn.peer.createAnswer();
            })
            .then((answer) => {
              return peerConn.peer.setLocalDescription(answer);
            })
            .then(() => {
              const answerRef = ref(rtdb, `cohorts/${cohortId}/voice/signals/${remoteUserId}/${userId}/answer`);
              set(answerRef, {
                type: 'answer',
                sdp: peerConn.peer.localDescription,
                timestamp: serverTimestamp()
              }).catch(() => {});
            })
            .catch(console.error);
        }

        // Handle answer
        if (userSignals.answer) {
          const answer = userSignals.answer;
          if (peerConn.peer.signalingState === 'have-local-offer') {
            peerConn.peer.setRemoteDescription(new RTCSessionDescription(answer.sdp))
              .catch(console.error);
          }
        }

        // Handle ICE candidates
        if (userSignals.ice) {
          const iceCandidates = Object.values(userSignals.ice) as any[];
          iceCandidates.forEach((ice: any) => {
            if (ice.type === 'ice') {
              peerConn.peer.addIceCandidate(new RTCIceCandidate({
                candidate: ice.candidate,
                sdpMLineIndex: ice.sdpMLineIndex,
                sdpMid: ice.sdpMid
              })).catch(() => {}); // Ignore errors for already processed candidates
            }
          });
        }
      });
    });

    return () => unsubscribe();
  }, [cohortId, userId]);

  // Create offers for new peers when they're added - DISABLED (no mic, no audio to send)
  const createOffersForPeers = useCallback(async () => {
    // Mic feature disabled - don't create offers since we have no audio to send
    return;
    // if (!localStreamRef.current) return;

    peersRef.current.forEach(async (peerConn, remoteUserId) => {
      // Only create offer if connection is in stable state (new connection)
      if (peerConn.peer.signalingState === 'stable') {
        try {
          const offer = await peerConn.peer.createOffer();
          await peerConn.peer.setLocalDescription(offer);

          const offerRef = ref(rtdb, `cohorts/${cohortId}/voice/signals/${remoteUserId}/${userId}/offer`);
          set(offerRef, {
            type: 'offer',
            sdp: offer,
            timestamp: serverTimestamp()
          }).catch(() => {});
        } catch (error) {
          console.error('Error creating offer:', error);
        }
      }
    });
  }, [cohortId, userId]);

  // Create offers when peers are added
  useEffect(() => {
    if (peersRef.current.size > 0) {
      // Small delay to ensure peer connection is ready
      const timer = setTimeout(() => {
        createOffersForPeers();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [peersRef.current.size, createOffersForPeers]);

  // Cleanup on unmount or when cohortId/userId becomes invalid
  useEffect(() => {
    return () => {
      console.log('[VoiceChat] Final cleanup - closing all peer connections and releasing resources...');
      
      // Close all peer connections
      peersRef.current.forEach(({ peer, audioContext, mediaStreamSource }, remoteUserId) => {
        console.log('[VoiceChat] Closing peer connection to', remoteUserId);
        // Disconnect media stream source
        if (mediaStreamSource) {
          try {
            mediaStreamSource.disconnect();
          } catch (e) {
            // Ignore if already disconnected
          }
        }
        peer.close();
        if (audioContext.state !== 'closed') {
          audioContext.close().catch(() => {}); // Ignore errors if already closing
        }
      });
      peersRef.current.clear();

      // Ensure local stream is stopped (in case it wasn't already)
      if (localStreamRef.current) {
        console.log('[VoiceChat] Final cleanup - stopping local stream tracks');
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        localStreamRef.current = null;
      }

      // Clean up Firebase references
      if (cohortId && userId) {
        const signalsRef = ref(rtdb, `cohorts/${cohortId}/voice/signals/${userId}`);
        remove(signalsRef).catch(() => {});
        
        const speakingRef = ref(rtdb, `cohorts/${cohortId}/voice/speaking/${userId}`);
        remove(speakingRef).catch(() => {});
        
        const stateRef = ref(rtdb, `cohorts/${cohortId}/voice/state/${userId}`);
        remove(stateRef).catch(() => {});
      }
      
      console.log('[VoiceChat] Final cleanup complete');
    };
  }, [cohortId, userId]);

  return {
    isMuted,
    isDeafened,
    micVolume,
    outputVolume,
    speakingLevel,
    toggleMute,
    toggleDeafen,
    setMicVolume,
    setOutputVolume
  };
}


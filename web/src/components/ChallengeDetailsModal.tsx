import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trophy, Target, XCircle } from 'lucide-react';
import { getChallengeById, updateChallengeStatus } from '../services/firestore';
import type { Challenge, Notification } from '../types/user';

interface ChallengeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: Notification | null;
}

const getGameRoute = (gameType: string): string => {
  const routeMap: Record<string, string> = {
    'asteroids': '/game/asteroids',
    'pacman-math': '/game/pacman-math',
    'ph-invaders': '/game/ph-invaders',
    'pong-arithmetic': '/game/pong-arithmetic',
  };
  return routeMap[gameType] || '/game/asteroids';
};

const getGameName = (gameType: string): string => {
  const nameMap: Record<string, string> = {
    'asteroids': 'Asteroids',
    'pacman-math': 'Pac-Man: Math Blitz',
    'ph-invaders': 'pH Invaders',
    'pong-arithmetic': 'Pong Arithmetic',
  };
  return nameMap[gameType] || gameType;
};

export default function ChallengeDetailsModal({
  isOpen,
  onClose,
  notification,
}: ChallengeDetailsModalProps) {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && notification?.meta?.challengeId) {
      loadChallenge();
    } else {
      setChallenge(null);
      setError(null);
    }
  }, [isOpen, notification]);

  const loadChallenge = async () => {
    if (!notification?.meta?.challengeId) return;

    setIsLoading(true);
    setError(null);
    try {
      const challengeData = await getChallengeById(notification.meta.challengeId);
      if (challengeData) {
        setChallenge(challengeData);
      } else {
        setError('Challenge not found');
      }
    } catch (err) {
      console.error('Failed to load challenge:', err);
      setError('Failed to load challenge details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!challenge || !notification?.meta?.gameType) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Update challenge status to accepted
      await updateChallengeStatus(challenge.id, 'accepted');

      // Navigate to game with challenge context
      const gameRoute = getGameRoute(notification.meta.gameType);
      navigate(gameRoute, {
        state: {
          challengeId: challenge.id,
          scoreToBeat: challenge.scoreToBeat,
          challengerUsername: challenge.challengerUsername,
        },
      });

      onClose();
    } catch (err) {
      console.error('Failed to accept challenge:', err);
      setError('Failed to accept challenge. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!challenge) return;

    setIsProcessing(true);
    setError(null);

    try {
      await updateChallengeStatus(challenge.id, 'expired');
      onClose();
    } catch (err) {
      console.error('Failed to decline challenge:', err);
      setError('Failed to decline challenge. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const gameType = notification?.meta?.gameType || '';
  const scoreToBeat = notification?.meta?.scoreToBeat || challenge?.scoreToBeat || 0;
  const challengerUsername = notification?.meta?.challengerUsername || challenge?.challengerUsername || 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border-2 border-neon-yellow rounded-lg shadow-2xl w-full max-w-md mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-gray-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neon-yellow" />
            <h2 className="text-lg font-['Press_Start_2P'] text-white">
              CHALLENGE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm">Loading challenge...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 text-sm mb-4">{error}</div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 transition-colors font-['Press_Start_2P'] text-xs"
              >
                CLOSE
              </button>
            </div>
          ) : (
            <>
              {/* Challenge Info */}
              <div className="space-y-4 mb-6">
                <div className="bg-gray-800/50 border border-neon-yellow/30 rounded-lg p-4">
                  <div className="text-xs text-gray-400 mb-2">CHALLENGER</div>
                  <div className="text-lg font-['Press_Start_2P'] text-neon-yellow">
                    {challengerUsername}
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-neon-cyan/30 rounded-lg p-4">
                  <div className="text-xs text-gray-400 mb-2">GAME</div>
                  <div className="text-lg font-['Press_Start_2P'] text-neon-cyan">
                    {getGameName(gameType)}
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-neon-pink/30 rounded-lg p-4">
                  <div className="text-xs text-gray-400 mb-2">SCORE TO BEAT</div>
                  <div className="text-2xl font-['Press_Start_2P'] text-neon-pink">
                    {scoreToBeat.toLocaleString()}
                  </div>
                </div>

                {challenge?.createdAt && (
                  <div className="text-xs text-gray-500 text-center">
                    Challenged {new Date(challenge.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 transition-colors font-['Press_Start_2P'] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  DECLINE
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-neon-yellow text-black border border-neon-yellow rounded hover:bg-white transition-colors font-['Press_Start_2P'] text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    'PROCESSING...'
                  ) : (
                    <>
                      <Target size={16} />
                      ACCEPT CHALLENGE
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


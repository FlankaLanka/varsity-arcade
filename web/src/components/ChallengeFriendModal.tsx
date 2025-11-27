import React, { useState, useCallback } from 'react';
import { X, Users, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createChallenge } from '../services/firestore';
import type { GameType, Friend } from '../types/user';

interface ChallengeFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  gameType: GameType;
  gameName: string;
}

export default function ChallengeFriendModal({
  isOpen,
  onClose,
  score,
  gameType,
  gameName,
}: ChallengeFriendModalProps) {
  const { user, firebaseUser } = useAuth();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const friends = user?.friends || [];

  const handleChallenge = useCallback(async () => {
    if (!selectedFriend || !firebaseUser) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createChallenge(
        firebaseUser.uid,
        selectedFriend.id,
        gameType,
        score
      );
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedFriend(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to create challenge:', err);
      setError('Failed to send challenge. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFriend, firebaseUser, gameType, score, onClose]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
      setSelectedFriend(null);
      setError(null);
      setSuccess(false);
    }
  }, [onClose, isSubmitting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border-2 border-neon-pink rounded-lg shadow-2xl w-full max-w-md mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-gray-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neon-yellow" />
            <h2 className="text-lg font-['Press_Start_2P'] text-white">
              CHALLENGE FRIEND
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-['Press_Start_2P'] text-neon-green mb-2">
                CHALLENGE SENT!
              </h3>
              <p className="text-gray-400 text-sm">
                {selectedFriend?.username} has been notified
              </p>
            </div>
          ) : (
            <>
              {/* Challenge Info */}
              <div className="bg-gray-800/50 border border-neon-cyan/30 rounded-lg p-4 mb-6">
                <div className="text-xs text-gray-400 mb-2">YOUR SCORE</div>
                <div className="text-2xl font-['Press_Start_2P'] text-neon-cyan mb-2">
                  {score.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">GAME: {gameName.toUpperCase()}</div>
              </div>

              {/* Friends List */}
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-sm mb-4">
                    You don't have any friends yet.
                  </p>
                  <p className="text-gray-500 text-xs">
                    Add friends from your profile to challenge them!
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-gray-400 mb-3">
                    SELECT A FRIEND TO CHALLENGE:
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {friends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend)}
                        className={`
                          w-full p-3 rounded-lg border-2 transition-all text-left
                          ${
                            selectedFriend?.id === friend.id
                              ? 'border-neon-pink bg-neon-pink/10'
                              : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                            {friend.avatar ? (
                              <img
                                src={friend.avatar}
                                alt={friend.username}
                                className="w-full h-full rounded-lg object-cover"
                              />
                            ) : (
                              <span className="text-lg">
                                {friend.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-['Press_Start_2P'] text-sm text-white">
                              {friend.username}
                            </div>
                            <div className="text-xs text-gray-400">
                              {friend.isOnline ? 'Online' : 'Offline'}
                            </div>
                          </div>
                          {selectedFriend?.id === friend.id && (
                            <div className="text-neon-pink">✓</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 transition-colors font-['Press_Start_2P'] text-xs"
                  disabled={isSubmitting}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleChallenge}
                  disabled={!selectedFriend || isSubmitting || friends.length === 0}
                  className={`
                    flex-1 px-4 py-2 rounded font-['Press_Start_2P'] text-xs transition-all
                    ${
                      !selectedFriend || isSubmitting || friends.length === 0
                        ? 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-neon-pink text-white border border-neon-pink hover:bg-white hover:text-black'
                    }
                  `}
                >
                  {isSubmitting ? 'SENDING...' : 'SEND CHALLENGE'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


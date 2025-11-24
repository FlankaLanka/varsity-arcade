/**
 * Friends List Component
 *
 * Displays user's friends list with online status and current activity.
 * Appears as a dropdown from the friends icon in the header.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus } from 'lucide-react';
import FriendCard from './FriendCard';
import { FriendDetailModal } from './FriendDetailModal';
import { mockFriends, removeFriend, blockFriend } from '../data/mockFriendsData';
import type { Friend } from '../types/user';

interface FriendsListProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsList({ isOpen, onClose }: FriendsListProps) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>(() => [...mockFriends]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onlineFriends = useMemo(() => friends.filter(friend => friend.isOnline), [friends]);
  const offlineFriends = useMemo(() => friends.filter(friend => !friend.isOnline), [friends]);

  const handleFriendClick = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedFriend(null);
  };

  const handleRemoveFriend = (friendId: string) => {
    removeFriend(friendId);
    setFriends(prev => prev.filter(friend => friend.id !== friendId));
  };

  const handleBlockFriend = (friendId: string) => {
    blockFriend(friendId);
    setFriends(prev => prev.filter(friend => friend.id !== friendId));
  };

  return (
    <>
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-80 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Dropdown Container */}
          <div className="bg-gray-900/95 backdrop-blur-md border-2 border-neon-pink rounded-lg shadow-2xl overflow-hidden max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="relative p-4 bg-gradient-to-br from-pink-900/50 to-purple-900/50 border-b-2 border-neon-pink/30">
          {/* Scanline Effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 110, 0.5) 2px, rgba(255, 0, 110, 0.5) 4px)',
            }}
          />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neon-pink" />
              <h3 className="text-sm font-['Press_Start_2P'] text-white">
                Friends
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {/* Friend Count Badge */}
              <div className="px-2 py-1 bg-neon-pink/20 border border-neon-pink rounded">
                <span className="text-xs font-['Press_Start_2P'] text-neon-pink">
                  {friends.length}
                </span>
              </div>
              {/* Add Friend Button */}
              <button
                className="p-1.5 bg-gray-900/50 border border-neon-pink/50 rounded hover:bg-neon-pink/20 hover:border-neon-pink transition-all"
                onClick={() => {
                  onClose();
                  /* TODO: Open add friend modal */
                }}
                title="Add Friend"
              >
                <UserPlus className="w-3 h-3 text-neon-pink" />
              </button>
            </div>
          </div>
        </div>

        {/* Friends List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Online Friends */}
          {onlineFriends.length > 0 && (
            <div className="p-4 border-b-2 border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_10px_rgba(0,255,0,0.5)]" />
                <h4 className="text-xs font-['Press_Start_2P'] text-neon-green">
                  Online ({onlineFriends.length})
                </h4>
              </div>
              <div className="space-y-2">
                {onlineFriends.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onClick={() => handleFriendClick(friend)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Offline Friends */}
          {offlineFriends.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-gray-600" />
                <h4 className="text-xs font-['Press_Start_2P'] text-gray-500">
                  Offline ({offlineFriends.length})
                </h4>
              </div>
              <div className="space-y-2">
                {offlineFriends.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onClick={() => handleFriendClick(friend)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {friends.length === 0 && (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-500 mb-2">
                No friends yet
              </p>
              <p className="text-xs text-gray-600 mb-4">
                Add friends to see their activity and compete on leaderboards!
              </p>
              <button
                className="px-4 py-2 bg-neon-pink/20 border-2 border-neon-pink rounded text-xs font-['Press_Start_2P'] text-neon-pink hover:bg-neon-pink/30 transition-all"
                onClick={() => {
                  onClose();
                  /* TODO: Open add friend modal */
                }}
              >
                Add Friend
              </button>
            </div>
          )}
        </div>
      </div>
        </div>
      )}

      {/* Modal rendered outside dropdown so it persists when dropdown closes */}
      <FriendDetailModal
        friend={selectedFriend}
        open={isModalOpen}
        onClose={handleModalClose}
        onViewProfile={(friend) => {
          handleModalClose();
          navigate(`/friend/${friend.id}`);
        }}
        onRemove={handleRemoveFriend}
        onBlock={handleBlockFriend}
      />
    </>
  );
}


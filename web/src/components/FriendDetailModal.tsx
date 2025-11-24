/**
 * Friend Detail Modal
 *
 * Displays friend information with action buttons.
 */

import { X, UserMinus, ShieldBan, UserRoundSearch } from 'lucide-react';
import type { Friend } from '../types/user';
import { formatActivityText, formatLastSeen } from '../utils/formatters';

interface FriendDetailModalProps {
  friend: Friend | null;
  open: boolean;
  onClose: () => void;
  onViewProfile: (friend: Friend) => void;
  onRemove: (friendId: string) => void;
  onBlock: (friendId: string) => void;
}

export function FriendDetailModal({
  friend,
  open,
  onClose,
  onViewProfile,
  onRemove,
  onBlock,
}: FriendDetailModalProps) {
  if (!open || !friend) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const defaultAvatar = (
    <svg width="64" height="64" viewBox="0 0 8 8" className="pixelated">
      <rect x="2" y="1" width="4" height="1" fill="#00ffff" />
      <rect x="1" y="2" width="6" height="3" fill="#00ffff" />
      <rect x="2" y="3" width="1" height="1" fill="#000000" />
      <rect x="5" y="3" width="1" height="1" fill="#000000" />
      <rect x="3" y="4" width="2" height="1" fill="#ff006e" />
      <rect x="1" y="5" width="2" height="2" fill="#00ffff" />
      <rect x="5" y="5" width="2" height="2" fill="#00ffff" />
      <rect x="3" y="6" width="2" height="2" fill="#00ffff" />
    </svg>
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center px-4 py-10 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-900 border-2 border-neon-cyan rounded-xl shadow-2xl p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-white"
          onClick={onClose}
          aria-label="Close friend details"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 border-2 border-neon-pink rounded-lg overflow-hidden flex items-center justify-center bg-gray-800">
            {friend.avatar ? (
              <img src={friend.avatar} alt={friend.username} className="w-full h-full object-cover pixelated" />
            ) : (
              defaultAvatar
            )}
          </div>
          <div>
            <p className="text-lg font-['Press_Start_2P'] text-white">{friend.username}</p>
            <p className="text-sm text-gray-400">@{friend.username}</p>
            <p className="text-xs text-gray-500 mt-1">{formatActivityText(friend)}</p>
          </div>
        </div>

        <div className="mt-4 p-3 border border-gray-700 rounded-lg bg-gray-950/70">
          <p className="text-xs text-gray-400">Status</p>
          <p className="text-sm text-white">
            {friend.isOnline ? 'Online' : 'Offline'} • Last seen {formatLastSeen(friend.lastSeen)}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            className="flex items-center justify-center gap-2 border-2 border-neon-cyan text-neon-cyan rounded-lg py-2 text-xs font-['Press_Start_2P'] hover:bg-neon-cyan/10 transition-all"
            onClick={() => handleAction(() => onViewProfile(friend))}
          >
            <UserRoundSearch className="w-4 h-4" />
            View Profile
          </button>
          <button
            className="flex items-center justify-center gap-2 border-2 border-orange-400 text-orange-300 rounded-lg py-2 text-xs font-['Press_Start_2P'] hover:bg-orange-400/10 transition-all"
            onClick={() => handleAction(() => onRemove(friend.id))}
          >
            <UserMinus className="w-4 h-4" />
            Remove Friend
          </button>
          <button
            className="flex items-center justify-center gap-2 border-2 border-red-500 text-red-300 rounded-lg py-2 text-xs font-['Press_Start_2P'] hover:bg-red-500/10 transition-all"
            onClick={() => handleAction(() => onBlock(friend.id))}
          >
            <ShieldBan className="w-4 h-4" />
            Block User
          </button>
        </div>
      </div>
    </div>
  );
}

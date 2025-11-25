/**
 * AddFriendModal Component
 * 
 * Modal for searching and adding friends by username.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { searchUsersByUsername, addFriend, getUserProfile } from '../services/firestore';
import { checkNewAchievements, unlockAchievements } from '../services/achievements';
import { useAuth } from '../context/AuthContext';
import { useAchievements } from '../context/AchievementContext';
import type { UserProfile } from '../types/user';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFriendAdded?: () => void;
}

export default function AddFriendModal({ isOpen, onClose, onFriendAdded }: AddFriendModalProps) {
  const { user, firebaseUser, refreshUser } = useAuth();
  const { showAchievements } = useAchievements();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [addedFriendIds, setAddedFriendIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!firebaseUser) return;
      
      setIsSearching(true);
      setError(null);
      
      try {
        const results = await searchUsersByUsername(searchTerm, firebaseUser.uid);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, firebaseUser]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setAddedFriendIds(new Set());
      setError(null);
    }
  }, [isOpen]);

  // Update added friends set when user changes
  useEffect(() => {
    if (user?.friends) {
      setAddedFriendIds(new Set(user.friends.map(f => f.id)));
    }
  }, [user?.friends]);

  const handleAddFriend = useCallback(async (friendId: string) => {
    if (!firebaseUser) return;
    
    setAddingFriendId(friendId);
    setError(null);
    
    try {
      const success = await addFriend(firebaseUser.uid, friendId);
      
      if (success) {
        setAddedFriendIds(prev => new Set([...prev, friendId]));
        // Refresh user data to get updated friends list
        if (refreshUser) {
          await refreshUser();
        }
        
        // Check for social achievements
        const updatedProfile = await getUserProfile(firebaseUser.uid);
        if (updatedProfile) {
          const newAchievements = checkNewAchievements(updatedProfile, {
            friendsCount: updatedProfile.friends?.length || 0
          });
          
          if (newAchievements.length > 0) {
            const { unlockedAchievements } = await unlockAchievements(
              firebaseUser.uid,
              newAchievements
            );
            
            if (unlockedAchievements.length > 0) {
              showAchievements(unlockedAchievements);
            }
          }
        }
        
        onFriendAdded?.();
      } else {
        setError('Already friends with this user.');
      }
    } catch (err) {
      console.error('Failed to add friend:', err);
      setError('Failed to add friend. Please try again.');
    } finally {
      setAddingFriendId(null);
    }
  }, [firebaseUser, refreshUser, onFriendAdded, showAchievements]);

  const isAlreadyFriend = useCallback((userId: string) => {
    return addedFriendIds.has(userId);
  }, [addedFriendIds]);

  if (!isOpen) return null;

  // Use portal to render modal at document body level, not inside header
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border-2 border-neon-pink rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="relative p-4 bg-gradient-to-br from-pink-900/50 to-purple-900/50 border-b-2 border-neon-pink/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-neon-pink" />
              <h2 className="text-sm font-['Press_Start_2P'] text-white">Add Friend</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username..."
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-neon-pink focus:outline-none transition-colors"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-pink animate-spin" />
            )}
          </div>
          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <p className="text-xs text-gray-500 mt-2">Type at least 2 characters to search</p>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-red-900/30 border-b border-red-800">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        
        {/* Search Results */}
        <div className="max-h-[300px] overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {searchResults.map((result) => (
                <div 
                  key={result.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-lg bg-gray-700 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                      {result.avatar ? (
                        <img src={result.avatar} alt={result.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                    
                    {/* User Info */}
                    <div>
                      <p className="text-sm font-medium text-white">{result.username}</p>
                      <p className="text-xs text-gray-500">Level {result.level}</p>
                    </div>
                  </div>
                  
                  {/* Add Button */}
                  {isAlreadyFriend(result.id) ? (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-neon-green/20 border border-neon-green rounded text-neon-green">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-medium">Added</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddFriend(result.id)}
                      disabled={addingFriendId === result.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-neon-pink/20 border border-neon-pink rounded text-neon-pink hover:bg-neon-pink/30 transition-colors disabled:opacity-50"
                    >
                      {addingFriendId === result.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span className="text-xs font-medium">Add</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : searchTerm.length >= 2 && !isSearching ? (
            <div className="p-8 text-center">
              <Search className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No users found</p>
              <p className="text-xs text-gray-600 mt-1">Try a different username</p>
            </div>
          ) : !searchTerm ? (
            <div className="p-8 text-center">
              <UserPlus className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Search for friends</p>
              <p className="text-xs text-gray-600 mt-1">Enter a username to find players</p>
            </div>
          ) : null}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


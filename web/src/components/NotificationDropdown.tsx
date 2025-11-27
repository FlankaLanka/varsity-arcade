import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Trophy, UserPlus, AlertCircle, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, acceptFriendRequest, rejectFriendRequest } from '../services/firestore';
import { checkNewAchievements, unlockAchievements } from '../services/achievements';
import { getUserProfile } from '../services/firestore';
import { useAchievements } from '../context/AchievementContext';
import type { Notification } from '../types/user';
import { useClickOutside } from '../hooks/useClickOutside';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeClick?: (notification: Notification) => void;
}

export default function NotificationDropdown({
  isOpen,
  onClose,
  onChallengeClick,
}: NotificationDropdownProps) {
  const { user, firebaseUser, refreshUser } = useAuth();
  const { showAchievements } = useAchievements();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [processingNotificationId, setProcessingNotificationId] = useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, onClose, isOpen);

  // Use notifications from user context to avoid flicker
  useEffect(() => {
    if (user?.notifications) {
      // Sort by date, newest first
      const sorted = [...user.notifications].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      setNotifications(sorted);
    } else {
      setNotifications([]);
    }
  }, [user?.notifications]);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!firebaseUser) return;

      // Don't handle clicks for friend-request notifications (they have buttons)
      if (notification.type === 'friend-request') {
        return;
      }

      // Mark as read if not already read
      if (!notification.read) {
        try {
          await markNotificationAsRead(firebaseUser.uid, notification.id);
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, read: true } : n
            )
          );
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      }

      // Handle challenge notifications
      if (notification.type === 'challenge' && onChallengeClick) {
        onChallengeClick(notification);
      }
    },
    [firebaseUser, onChallengeClick]
  );

  const handleAcceptFriendRequest = useCallback(
    async (notification: Notification) => {
      if (!firebaseUser || !notification.meta?.requesterId) return;

      setProcessingNotificationId(notification.id);

      try {
        // Accept the friend request (pass notificationId to remove it)
        const success = await acceptFriendRequest(firebaseUser.uid, notification.meta.requesterId, notification.id);

        if (success) {
          // Remove the notification from local state
          const updatedNotifications = notifications.filter(n => n.id !== notification.id);
          setNotifications(updatedNotifications);

          // Refresh user data to get updated friends list immediately
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
        }
      } catch (error) {
        console.error('Failed to accept friend request:', error);
      } finally {
        setProcessingNotificationId(null);
      }
    },
    [firebaseUser, notifications, refreshUser, showAchievements]
  );

  const handleRejectFriendRequest = useCallback(
    async (notification: Notification) => {
      if (!firebaseUser) return;

      setProcessingNotificationId(notification.id);

      try {
        await rejectFriendRequest(firebaseUser.uid, notification.id);
        
        // Remove the notification from local state
        const updatedNotifications = notifications.filter(n => n.id !== notification.id);
        setNotifications(updatedNotifications);
      } catch (error) {
        console.error('Failed to reject friend request:', error);
      } finally {
        setProcessingNotificationId(null);
      }
    },
    [firebaseUser, notifications]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!firebaseUser) return;

    try {
      await markAllNotificationsAsRead(firebaseUser.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [firebaseUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'challenge':
        return <Trophy className="w-4 h-4 text-neon-yellow" />;
      case 'achievement':
        return <Trophy className="w-4 h-4 text-neon-green" />;
      case 'friend-request':
        return <UserPlus className="w-4 h-4 text-neon-cyan" />;
      case 'system':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-96 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-gray-900/95 backdrop-blur-md border-2 border-neon-cyan rounded-lg shadow-2xl max-h-[calc(100vh-200px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-neon-cyan" />
            <h3 className="text-sm font-['Press_Start_2P'] text-white">
              NOTIFICATIONS
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-neon-pink text-white text-xs font-['Press_Start_2P'] rounded">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-gray-400 hover:text-neon-cyan transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    w-full p-4 transition-colors
                    ${!notification.read ? 'bg-gray-800/30' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4
                          className={`
                            text-xs font-['Press_Start_2P'] truncate
                            ${!notification.read ? 'text-white' : 'text-gray-400'}
                          `}
                        >
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-neon-cyan rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      {/* Friend Request Actions */}
                      {notification.type === 'friend-request' && notification.meta?.requesterId && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAcceptFriendRequest(notification)}
                            disabled={processingNotificationId === notification.id}
                            className="flex-1 px-3 py-1.5 bg-neon-green text-black text-xs font-['Press_Start_2P'] rounded hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingNotificationId === notification.id ? '...' : 'ACCEPT'}
                          </button>
                          <button
                            onClick={() => handleRejectFriendRequest(notification)}
                            disabled={processingNotificationId === notification.id}
                            className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-['Press_Start_2P'] rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingNotificationId === notification.id ? '...' : 'REJECT'}
                          </button>
                        </div>
                      )}
                      
                      {/* Other notification types are clickable */}
                      {notification.type !== 'friend-request' && (
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className="w-full text-left"
                        >
                          <div className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </div>
                        </button>
                      )}
                      
                      {notification.type === 'friend-request' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


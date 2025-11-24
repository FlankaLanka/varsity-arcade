import React, { useState, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { StarfieldBackground } from './StarfieldBackground';
import { Gamepad2, Trophy, Users, UserCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import ProfileDropdown from './ProfileDropdown';
import FriendsList from './FriendsList';
import { useClickOutside } from '../hooks/useClickOutside';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  
  const profileRef = useRef<HTMLDivElement>(null);
  const friendsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useClickOutside(profileRef, () => setIsProfileOpen(false), isProfileOpen);
  useClickOutside(friendsRef, () => setIsFriendsOpen(false), isFriendsOpen);

  // Count online friends for badge
  const onlineFriendsCount = user?.friends?.filter(f => f.isOnline).length || 0;

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={clsx(
          "flex items-center gap-2 px-4 py-2 border-2 transition-all",
          isActive 
            ? "border-neon-cyan text-neon-cyan bg-space-800 shadow-[4px_4px_0px_0px_rgba(0,243,255,0.5)]" 
            : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
        )}
      >
        <Icon size={20} />
        <span className="font-pixel text-xs hidden md:block">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen text-white font-mono selection:bg-neon-pink selection:text-white flex flex-col">
      <StarfieldBackground />
      
      {/* Header */}
      <header className="border-b-2 border-space-700 bg-space-900/80 backdrop-blur-md sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-neon-pink shadow-[2px_2px_0px_0px_rgba(255,0,255,0.8)] group-hover:animate-pulse"></div>
            <span className="font-pixel text-neon-pink text-lg tracking-tighter">VARSITY<span className="text-white">ARCADE</span></span>
          </Link>

          <nav className="flex items-center gap-2">
            <NavItem to="/" icon={Gamepad2} label="ARCADE" />
            <NavItem to="/cohorts" icon={Users} label="COHORTS" />
            <NavItem to="/leaderboard" icon={Trophy} label="RANK" />
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="text-neon-green font-pixel">ONLINE: 42</span>
              <span className="text-gray-500">SERVER: US-EAST</span>
            </div>

            {/* Friends List Button */}
            <div className="relative" ref={friendsRef}>
              <button 
                className={clsx(
                  "relative w-10 h-10 border-2 flex items-center justify-center transition-all",
                  isFriendsOpen 
                    ? "border-neon-pink bg-neon-pink/20" 
                    : "border-space-700 hover:bg-space-700 hover:border-neon-pink/50"
                )}
                onClick={() => {
                  setIsFriendsOpen(!isFriendsOpen);
                  setIsProfileOpen(false);
                }}
                title="Friends"
              >
                <Users size={20} className={isFriendsOpen ? "text-neon-pink" : ""} />
                {/* Online Friends Badge */}
                {onlineFriendsCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-neon-green border-2 border-space-900 rounded-full flex items-center justify-center">
                    <span className="text-xs font-['Press_Start_2P'] text-black">
                      {onlineFriendsCount}
                    </span>
                  </div>
                )}
              </button>
              
              <FriendsList 
                isOpen={isFriendsOpen} 
                onClose={() => setIsFriendsOpen(false)} 
              />
            </div>

            {/* Profile Button */}
            <div className="relative" ref={profileRef}>
              <button 
                className={clsx(
                  "w-10 h-10 border-2 flex items-center justify-center transition-all",
                  isProfileOpen 
                    ? "border-neon-cyan bg-neon-cyan/20" 
                    : "border-space-700 hover:bg-space-700 hover:border-neon-cyan/50"
                )}
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsFriendsOpen(false);
                }}
                title="Profile"
              >
                <UserCircle2 size={20} className={isProfileOpen ? "text-neon-cyan" : ""} />
            </button>
              
              <ProfileDropdown 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 fade-in">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-space-700 bg-space-900 p-6 text-center text-gray-600 text-sm">
        <p>INSERT COIN TO CONTINUE • © 2025 VARSITY ARCADE</p>
      </footer>
    </div>
  );
};

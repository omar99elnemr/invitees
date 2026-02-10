/**
 * Header Component
 * Top navigation bar with user menu
 * Enhanced with mobile responsiveness
 */
import { User, LogOut, Key, PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import NotificationBell from '../common/NotificationBell';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Role-based gradient
  const getRoleGradient = () => {
    switch (user?.role) {
      case 'admin': return 'from-indigo-600 to-purple-600';
      case 'director': return 'from-emerald-600 to-teal-600';
      default: return 'from-blue-600 to-indigo-600';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/40 z-50 shadow-sm">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? (
              <PanelLeftClose size={22} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <PanelLeft size={22} className="text-gray-600 dark:text-gray-300" />
            )}
          </button>
          
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/10">
              <svg viewBox="0 0 32 32" className="w-5 h-5">
                <circle cx="13" cy="11" r="3.8" fill="white" opacity="0.95"/>
                <path d="M6.5 22.5c0-3.8 2.9-5.8 6.5-5.8s6.5 2 6.5 5.8" fill="white" opacity="0.95"/>
                <circle cx="23.5" cy="22" r="6.5" fill="#34D399"/>
                <path d="M20.2 22l2.3 2.3 3.8-3.8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Invitees
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl relative transition-all duration-300"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun size={20} className="text-amber-400 transition-transform duration-300 hover:rotate-45" />
            ) : (
              <Moon size={20} className="text-gray-500 transition-transform duration-300 hover:-rotate-12" />
            )}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 p-1.5 pr-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <div className={`w-8 h-8 bg-gradient-to-br ${getRoleGradient()} text-white rounded-lg flex items-center justify-center font-semibold text-sm shadow-md ring-2 ring-white/20 dark:ring-gray-700/50`}>
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.full_name || user?.username}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</div>
              </div>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User info header */}
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="font-medium text-gray-900 dark:text-white">{user?.full_name || user?.username}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email || user?.username}</div>
                </div>
                
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <User size={16} className="mr-3 text-gray-400" />
                    Profile Settings
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/profile?tab=password');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Key size={16} className="mr-3 text-gray-400" />
                    Change Password
                  </button>
                  
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={16} className="mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

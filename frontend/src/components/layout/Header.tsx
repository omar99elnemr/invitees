/**
 * Header Component
 * Top navigation bar with user menu
 * Enhanced with mobile responsiveness
 */
import { Bell, User, LogOut, Key, PanelLeftClose, PanelLeft, Sun, Moon, CheckCircle, XCircle, Clock, UserPlus, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../../services/api';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await dashboardAPI.getActivity(8);
      setNotifications(res.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const handleToggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      loadNotifications();
      setShowMenu(false);
    }
  };

  const getNotifIcon = (item: any) => {
    const status = item.status || item.action || '';
    if (status.includes('approved') || status === 'approve') return <CheckCircle size={14} className="text-green-500" />;
    if (status.includes('rejected') || status === 'reject') return <XCircle size={14} className="text-red-500" />;
    if (status.includes('waiting') || status.includes('pending') || status === 'create') return <Clock size={14} className="text-yellow-500" />;
    if (status.includes('user') || status.includes('invit')) return <UserPlus size={14} className="text-blue-500" />;
    return <Activity size={14} className="text-gray-400" />;
  };

  const getNotifText = (item: any) => {
    // Audit log entries (admin)
    if (item.formatted_details) return item.formatted_details;
    // Event invitee entries (director/organizer)
    if (item.invitee_name && item.event_name) {
      const statusLabel = (item.status || '').replace(/_/g, ' ');
      return `${item.invitee_name} — ${statusLabel} for ${item.event_name}`;
    }
    return item.action || 'Activity';
  };

  const getNotifTime = (item: any) => {
    const dateStr = item.timestamp || item.status_date || item.updated_at;
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ago`;
    } catch {
      return '';
    }
  };

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
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700/50 z-50 shadow-sm">
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <svg viewBox="0 0 32 32" className="w-5 h-5">
                <circle cx="13" cy="10" r="4" fill="white"/>
                <path d="M6 22c0-4 3.5-6 7-6s7 2 7 6" fill="white"/>
                <circle cx="23" cy="22" r="7" fill="#10B981"/>
                <path d="M19.5 22l2.5 2.5 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
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
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl relative transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun size={20} className="text-amber-500" />
            ) : (
              <Moon size={20} className="text-gray-600 dark:text-gray-300" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleToggleNotifications}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl relative transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Recent Activity</span>
                  <button
                    onClick={() => { navigate('/dashboard'); setShowNotifications(false); }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse flex gap-3">
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No recent activity
                    </div>
                  ) : (
                    notifications.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0 cursor-default"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            {getNotifIcon(item)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
                              {getNotifText(item)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {getNotifTime(item)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 p-1.5 pr-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <div className={`w-8 h-8 bg-gradient-to-br ${getRoleGradient()} text-white rounded-lg flex items-center justify-center font-semibold text-sm shadow-md`}>
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

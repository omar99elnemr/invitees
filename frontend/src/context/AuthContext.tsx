/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { authAPI } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';
import { isInstalledApp } from '../utils/capacitor';

// Public routes where session timeout should never trigger
const isPublicRoute = () => {
  const path = window.location.pathname;
  return path.startsWith('/portal') ||
         path.startsWith('/checkin/') ||
         path.startsWith('/live/') ||
         path === '/login';
};

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// Check interval (every minute)
const CHECK_INTERVAL = 60 * 1000;
// Heartbeat interval to keep backend session alive (10 minutes)
const HEARTBEAT_INTERVAL = 10 * 60 * 1000;
// Throttle activity updates to avoid excessive processing (2 seconds)
const ACTIVITY_THROTTLE = 2000;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const rememberMeRef = useRef<boolean>(isInstalledApp || localStorage.getItem('rememberMe') === 'true');
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatActivityRef = useRef<number>(Date.now());
  const throttleRef = useRef<number>(0);

  // Update last activity timestamp on user interactions (throttled)
  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - throttleRef.current < ACTIVITY_THROTTLE) return;
    throttleRef.current = now;
    lastActivityRef.current = now;
  }, []);

  // Show session expired overlay (does NOT clear user to avoid ProtectedRoute redirect)
  const triggerSessionExpired = useCallback(() => {
    // Stop the inactivity timer
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
    setShowSessionExpiredModal(true);
  }, []);

  // Check if session has expired due to inactivity
  const checkSessionTimeout = useCallback(() => {
    // Skip timeout check if user checked "remember me", not logged in, modal already showing, or on public route
    if (!user || rememberMeRef.current || showSessionExpiredModal || isPublicRoute()) return;

    const inactiveTime = Date.now() - lastActivityRef.current;
    if (inactiveTime >= SESSION_TIMEOUT) {
      triggerSessionExpired();
    }
  }, [user, showSessionExpiredModal, triggerSessionExpired]);

  // Set up activity listeners and session check interval
  useEffect(() => {
    if (user && !rememberMeRef.current && !showSessionExpiredModal && !isPublicRoute()) {
      // Add activity listeners — covers mouse, keyboard, scroll, touch, clicks, tab focus, navigation
      const uiEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];
      uiEvents.forEach(event => {
        window.addEventListener(event, updateActivity, { passive: true });
      });

      // Track page visibility changes (tab switch back = activity)
      const handleVisibility = () => { if (!document.hidden) updateActivity(); };
      document.addEventListener('visibilitychange', handleVisibility);

      // Track SPA navigation (popstate = back/forward buttons)
      window.addEventListener('popstate', updateActivity);

      // Start session check interval
      sessionCheckIntervalRef.current = setInterval(checkSessionTimeout, CHECK_INTERVAL);

      // Heartbeat: periodically ping backend to keep session alive while user is active
      lastHeartbeatActivityRef.current = lastActivityRef.current;
      heartbeatIntervalRef.current = setInterval(() => {
        // Only ping if user has been active since the last heartbeat
        if (lastActivityRef.current > lastHeartbeatActivityRef.current) {
          lastHeartbeatActivityRef.current = lastActivityRef.current;
          authAPI.getCurrentUser().catch(() => {
            // 401 will be caught by the axios interceptor → session expired event
          });
        }
      }, HEARTBEAT_INTERVAL);

      return () => {
        uiEvents.forEach(event => {
          window.removeEventListener(event, updateActivity);
        });
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('popstate', updateActivity);
        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
        }
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [user, showSessionExpiredModal, updateActivity, checkSessionTimeout]);

  // Listen for server-side 401 session expired events (from axios interceptor)
  useEffect(() => {
    const handleServerSessionExpired = () => {
      // Only trigger if user is logged in, modal not already showing, and not on a public route
      if (user && !showSessionExpiredModal && !isPublicRoute()) {
        triggerSessionExpired();
      }
    };
    window.addEventListener('auth:session-expired', handleServerSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleServerSessionExpired);
  }, [user, showSessionExpiredModal, triggerSessionExpired]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Use raw fetch with cache:'no-store' to guarantee the browser
      // never serves a cached /api/auth/me response (XMLHttpRequest
      // used by axios does NOT support the cache directive).
      const res = await fetch(`/api/auth/me?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error('Not authenticated');
      const data = await res.json();
      setUser(data);
      // Restore remember me preference (PWA always remembers)
      rememberMeRef.current = isInstalledApp || localStorage.getItem('rememberMe') === 'true';
    } catch (error) {
      setUser(null);
      // If not authenticated, clear stale remember flag
      localStorage.removeItem('rememberMe');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string, remember = false) => {
    try {
      const response = await authAPI.login({ username, password, remember });
      setUser(response.data);
      rememberMeRef.current = isInstalledApp || remember;
      lastActivityRef.current = Date.now();
      setShowSessionExpiredModal(false);
      // Persist remember me preference (PWA always remembers)
      if (isInstalledApp || remember) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      toast.success('Login successful!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      rememberMeRef.current = false;
      localStorage.removeItem('rememberMe');
      toast.success('Logged out successfully');
    }
  };

  const hasRole = (roles: string[]) => {
    return user ? roles.includes(user.role) : false;
  };

  const refetchUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  };

  // Handle "Login Again" button - destroy backend session then redirect
  const handleSessionExpiredClose = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Session may already be expired on the server — that's fine
    }
    setShowSessionExpiredModal(false);
    setUser(null);
    rememberMeRef.current = false;
    localStorage.removeItem('rememberMe');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
        refetchUser,
      }}
    >
      {children}
      
      {/* Session Expired Modal */}
      {showSessionExpiredModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-center w-14 h-14 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
                <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">Session Expired</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Your session has expired due to inactivity. Please log in again to continue.
              </p>
              <button
                onClick={handleSessionExpiredClose}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Login Again
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

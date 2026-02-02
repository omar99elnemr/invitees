/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { authAPI } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// Check interval (every minute)
const CHECK_INTERVAL = 60 * 1000;

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
  const rememberMeRef = useRef<boolean>(false);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity timestamp on user interactions
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Check if session has expired due to inactivity
  const checkSessionTimeout = useCallback(() => {
    // Skip timeout check if user checked "remember me" or not logged in
    if (!user || rememberMeRef.current) return;

    const inactiveTime = Date.now() - lastActivityRef.current;
    if (inactiveTime >= SESSION_TIMEOUT) {
      // Session expired due to inactivity
      setShowSessionExpiredModal(true);
      // Clear user state
      setUser(null);
      // Clear the interval
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    }
  }, [user]);

  // Set up activity listeners and session check interval
  useEffect(() => {
    if (user && !rememberMeRef.current) {
      // Add activity listeners
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
      events.forEach(event => {
        window.addEventListener(event, updateActivity, { passive: true });
      });

      // Start session check interval
      sessionCheckIntervalRef.current = setInterval(checkSessionTimeout, CHECK_INTERVAL);

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, updateActivity);
        });
        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
        }
      };
    }
  }, [user, updateActivity, checkSessionTimeout]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string, remember = false) => {
    try {
      const response = await authAPI.login({ username, password, remember });
      setUser(response.data);
      rememberMeRef.current = remember;
      lastActivityRef.current = Date.now();
      setShowSessionExpiredModal(false);
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
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
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

  // Handle session expired modal close - redirect to login
  const handleSessionExpiredClose = () => {
    setShowSessionExpiredModal(false);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">Session Expired</h3>
              <p className="text-gray-600 text-center mb-6">
                Your session has expired after 30 minutes of inactivity. Please log in again to continue.
              </p>
              <button
                onClick={handleSessionExpiredClose}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
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

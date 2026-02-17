/**
 * Login Page
 * User authentication page with enhanced design
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, User, Lock, Eye, EyeOff, Calendar, Users, CheckCircle, Shield } from 'lucide-react';
import { isInstalledApp, isNative } from '../utils/capacitor';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(isInstalledApp);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password, remember);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by AuthContext with toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-900 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center ring-1 ring-white/20 shadow-lg">
                <svg viewBox="0 0 32 32" className="w-10 h-10">
                  <circle cx="13" cy="11" r="3.8" fill="white" opacity="0.95"/>
                  <path d="M6.5 22.5c0-3.8 2.9-5.8 6.5-5.8s6.5 2 6.5 5.8" fill="white" opacity="0.95"/>
                  <circle cx="23.5" cy="22" r="6.5" fill="#34D399"/>
                  <path d="M20.2 22l2.3 2.3 3.8-3.8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Invitees</h1>
                <p className="text-indigo-200 text-sm">Management System</p>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
            Streamline Your<br />
            <span className="text-indigo-300">Event Invitations</span>
          </h2>
          
          <p className="text-indigo-200 text-lg mb-10 max-w-md">
            Manage guests, track approvals, and organize events with ease. Your complete invitation management solution.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/25 group-hover:scale-105">
                <Calendar size={20} />
              </div>
              <div>
                <p className="font-medium">Event Management</p>
                <p className="text-indigo-200 text-sm">Create and manage multiple events</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/25 group-hover:scale-105">
                <Users size={20} />
              </div>
              <div>
                <p className="font-medium">Invitee Tracking</p>
                <p className="text-indigo-200 text-sm">Track all your guests in one place</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/25 group-hover:scale-105">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="font-medium">Approval Workflow</p>
                <p className="text-indigo-200 text-sm">Streamlined approval process</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/25 group-hover:scale-105">
                <Shield size={20} />
              </div>
              <div>
                <p className="font-medium">Role-Based Access</p>
                <p className="text-indigo-200 text-sm">Secure multi-user permissions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
              <svg viewBox="0 0 32 32" className="w-10 h-10">
                <circle cx="13" cy="11" r="3.8" fill="white" opacity="0.95"/>
                <path d="M6.5 22.5c0-3.8 2.9-5.8 6.5-5.8s6.5 2 6.5 5.8" fill="white" opacity="0.95"/>
                <circle cx="23.5" cy="22" r="6.5" fill="#34D399"/>
                <path d="M20.2 22l2.3 2.3 3.8-3.8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invitees Management</h1>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input pl-10"
                    placeholder="Enter your username"
                    required
                    autoFocus={!isNative}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isInstalledApp && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer dark:bg-gray-700"
                    />
                    <label htmlFor="remember" className="ml-2 block text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">7 days</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={20} className="mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-6">
            Event Invitees Management System © {new Date().getFullYear()}
          </p>
        </div>
      </div>

    </div>
  );
}

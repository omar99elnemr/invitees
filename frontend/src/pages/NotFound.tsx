/**
 * 404 Not Found Page
 * Displayed for any unmatched routes
 */
import { useNavigate } from 'react-router-dom';
import { Home, LogIn, ArrowLeft, SearchX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated 404 illustration */}
        <div className="relative mb-8">
          <div className="text-[10rem] font-extrabold leading-none text-gray-200 dark:text-gray-800 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <SearchX className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-indigo-500/25"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-indigo-500/25"
            >
              <LogIn className="w-4 h-4" />
              Go to Login
            </button>
          )}
        </div>

        {/* Subtle footer */}
        <p className="mt-10 text-xs text-gray-400 dark:text-gray-600">
          If you believe this is an error, contact your administrator.
        </p>
      </div>
    </div>
  );
}

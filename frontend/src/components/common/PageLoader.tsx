/**
 * PageLoader Component
 * Lightweight branded loading screen shown during lazy-loaded page transitions.
 * Uses the same logo as the splash screen but without the full animation sequence.
 */
export default function PageLoader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors z-[100]">
      {/* App logo */}
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
        <svg viewBox="0 0 32 32" className="w-8 h-8">
          <circle cx="13" cy="11" r="3.8" fill="white" opacity="0.95" />
          <path d="M6.5 22.5c0-3.8 2.9-5.8 6.5-5.8s6.5 2 6.5 5.8" fill="white" opacity="0.95" />
          <circle cx="23.5" cy="22" r="6.5" fill="#34D399" />
          <path d="M20.2 22l2.3 2.3 3.8-3.8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
      {/* Spinner */}
      <div className="w-6 h-6 border-[2.5px] border-gray-200 dark:border-gray-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
    </div>
  );
}

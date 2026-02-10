/**
 * PWA Install Prompt Component
 * Shows a custom install banner for Android (beforeinstallprompt) 
 * and iOS (manual instructions) when not already installed.
 */
import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone()) return;

    // Don't show if recently dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DURATION) return;

    // Android / Chrome: intercept beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show manual instructions
    if (isIOS()) {
      setShowIOSInstructions(true);
      setShowBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
        {/* App icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
          <svg viewBox="0 0 32 32" className="w-7 h-7">
            <circle cx="13" cy="10" r="4" fill="white"/>
            <path d="M6 22c0-4 3.5-6 7-6s7 2 7 6" fill="white"/>
            <circle cx="23" cy="22" r="7" fill="#10B981"/>
            <path d="M19.5 22l2.5 2.5 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Install Invitees App</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {showIOSInstructions
              ? <>Tap <Share className="inline w-3.5 h-3.5 -mt-0.5" /> then &quot;Add to Home Screen&quot;</>
              : 'Install for faster access and offline support'}
          </p>

          {!showIOSInstructions && (
            <button
              onClick={handleInstall}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

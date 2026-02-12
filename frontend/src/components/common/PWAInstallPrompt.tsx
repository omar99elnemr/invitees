/**
 * PWA Install Prompt Component
 * Shows a custom install banner on mobile browsers only:
 * - "Install" with browser-specific instructions when PWA is not installed
 * - "Open in App" when PWA is installed but user visits via regular browser
 * Never shows on desktop/PC or inside the installed PWA (standalone mode).
 */
import { useState, useEffect, useRef } from 'react';
import { Download, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const INSTALLED_KEY = 'pwa_installed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isMobile() {
  // Detect mobile via screen width OR mobile UA keywords
  const smallScreen = window.innerWidth <= 768;
  const mobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  return smallScreen || mobileUA;
}

type BannerMode = 'install' | 'open-in-app';

export default function PWAInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMode, setBannerMode] = useState<BannerMode>('install');
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Only show on mobile devices, never on desktop/PC
    if (!isMobile()) return;

    // If running as installed PWA, mark it and don't show banner
    if (isStandalone()) {
      localStorage.setItem(INSTALLED_KEY, '1');
      return;
    }

    // Don't show if recently dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DURATION) return;

    // Check if PWA was previously installed (user is now in regular browser)
    const wasInstalled = localStorage.getItem(INSTALLED_KEY) === '1';
    if (wasInstalled) {
      setBannerMode('open-in-app');
      setShowBanner(true);
      // No event listeners needed for this mode
      return;
    }

    // --- Install mode: show banner on ALL mobile browsers ---
    setBannerMode('install');

    // Check if beforeinstallprompt was captured globally (before React mounted)
    const earlyPrompt = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    if (earlyPrompt) {
      deferredPromptRef.current = earlyPrompt;
      (window as any).__pwaInstallPrompt = null; // consume it
    }

    // Also listen for late-firing beforeinstallprompt (Chrome/Chromium)
    const bipHandler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      (window as any).__pwaInstallPrompt = null;
      // Show immediately if timer hasn't fired yet
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', bipHandler);

    // Always show the banner after a short delay, even if
    // beforeinstallprompt never fires (Firefox, Brave, Samsung, etc.)
    const showTimer = setTimeout(() => {
      setShowBanner(true);
    }, 1500);

    // Track installation
    const installedHandler = () => {
      localStorage.setItem(INSTALLED_KEY, '1');
      setShowBanner(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    // Detect display-mode change to standalone (install detected)
    const mq = window.matchMedia('(display-mode: standalone)');
    const mqHandler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(INSTALLED_KEY, '1');
        setShowBanner(false);
        deferredPromptRef.current = null;
      }
    };
    mq.addEventListener('change', mqHandler);

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener('beforeinstallprompt', bipHandler);
      window.removeEventListener('appinstalled', installedHandler);
      mq.removeEventListener('change', mqHandler);
    };
  }, []);

  const handleInstall = async () => {
    // Re-check: the prompt may have arrived after initial mount
    const latePrompt = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    if (latePrompt && !deferredPromptRef.current) {
      deferredPromptRef.current = latePrompt;
      (window as any).__pwaInstallPrompt = null;
    }

    const prompt = deferredPromptRef.current;
    if (prompt) {
      // Native install prompt available (Chrome/Chromium)
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem(INSTALLED_KEY, '1');
        setShowBanner(false);
      }
      deferredPromptRef.current = null;
    } else if (isIOS()) {
      toast('Tap the Share button ⎋ at the bottom,\nthen select "Add to Home Screen"', { icon: '📲', duration: 6000 });
      setShowBanner(false);
    } else {
      toast('Tap ⋮ (menu) in your browser,\nthen select "Add to Home Screen" or "Install App"', { icon: '📲', duration: 6000 });
      setShowBanner(false);
    }
  };

  const handleOpenApp = () => {
    // We cannot programmatically launch the installed PWA from the browser.
    // Show a helpful message and dismiss the banner.
    toast('Open "Invitees" from your home screen for the best experience', { icon: '📱', duration: 4000 });
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {bannerMode === 'open-in-app' ? 'Invitees App' : 'Get Invitees App'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {bannerMode === 'open-in-app'
              ? 'Open the app for a better experience'
              : 'Faster access & native experience'}
          </p>
        </div>

        {bannerMode === 'open-in-app' ? (
          <button
            onClick={handleOpenApp}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </button>
        ) : (
          <button
            onClick={handleInstall}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
        )}

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

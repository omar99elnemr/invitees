/**
 * PWA Install Prompt Component
 * Shows a native-looking "Install app" bottom-sheet dialog on mobile browsers:
 * - On Android: offers a direct APK download for the native app
 * - On iOS / other: triggers the browser's native PWA install flow
 * - "Open in App" when PWA is installed but user visits via regular browser
 * Never shows on desktop/PC or inside the installed PWA (standalone mode).
 */
import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { isNative } from '../../utils/capacitor';

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

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
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

const APK_DOWNLOAD_URL = '/downloads/invitees.apk';

type BannerMode = 'install' | 'open-in-app' | 'android-download';

export default function PWAInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMode, setBannerMode] = useState<BannerMode>('install');
  const [installing, setInstalling] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Never show inside Capacitor native app
    if (isNative) return;

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

    // --- Android: offer native APK download instead of PWA install ---
    if (isAndroid()) {
      setBannerMode('android-download');
      const showTimer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(showTimer);
    }

    // --- Install mode: show banner on non-Android mobile browsers ---
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
      setInstalling(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    // Detect display-mode change to standalone (install detected)
    const mq = window.matchMedia('(display-mode: standalone)');
    const mqHandler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(INSTALLED_KEY, '1');
        setShowBanner(false);
        setInstalling(false);
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
    setInstalling(true);

    // Re-check: the prompt may have arrived after initial mount
    const latePrompt = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    if (latePrompt && !deferredPromptRef.current) {
      deferredPromptRef.current = latePrompt;
      (window as any).__pwaInstallPrompt = null;
    }

    const prompt = deferredPromptRef.current;
    if (prompt) {
      // Native install prompt available (Chrome/Chromium)
      // This triggers the exact same dialog shown in Floward screenshots
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          localStorage.setItem(INSTALLED_KEY, '1');
          setShowBanner(false);
        }
      } catch {
        // prompt() can only be called once — show fallback
      }
      deferredPromptRef.current = null;
      setInstalling(false);
    } else if (isIOS()) {
      toast('Tap the Share button ⎋ at the bottom,\nthen select "Add to Home Screen"', { icon: '📲', duration: 6000 });
      setShowBanner(false);
      setInstalling(false);
    } else {
      toast('Tap ⋮ (menu) in your browser,\nthen select "Add to Home Screen" or "Install App"', { icon: '📲', duration: 6000 });
      setShowBanner(false);
      setInstalling(false);
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

  // Android APK download mode — bottom-sheet dialog with download button
  if (bannerMode === 'android-download') {
    return (
      <>
        {/* Dimmed backdrop */}
        <div
          className="fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300"
          onClick={handleDismiss}
        />

        {/* Bottom sheet dialog */}
        <div className="fixed bottom-0 left-0 right-0 z-[61] animate-in slide-in-from-bottom duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-w-lg mx-auto overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-medium text-gray-900 dark:text-white">Get the Invitees App</h2>
            </div>

            {/* App info row */}
            <div className="px-5 pb-4 flex items-center gap-3.5">
              {/* App icon */}
              <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <svg viewBox="0 0 32 32" className="w-6 h-6">
                  <circle cx="13" cy="10" r="4" fill="white"/>
                  <path d="M6 22c0-4 3.5-6 7-6s7 2 7 6" fill="white"/>
                  <circle cx="23" cy="22" r="7" fill="#10B981"/>
                  <path d="M19.5 22l2.5 2.5 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Invitees</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Faster experience with the native app
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5">
              <button
                onClick={handleDismiss}
                className="px-5 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Not now
              </button>
              <a
                href={APK_DOWNLOAD_URL}
                download="invitees.apk"
                onClick={() => {
                  toast.success('Download started — open the APK to install', { duration: 5000 });
                  setTimeout(() => setShowBanner(false), 500);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download App
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  // "Open in App" mode — compact bottom banner
  if (bannerMode === 'open-in-app') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4 animate-in slide-in-from-bottom duration-300">
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <svg viewBox="0 0 32 32" className="w-7 h-7">
              <circle cx="13" cy="10" r="4" fill="white"/>
              <path d="M6 22c0-4 3.5-6 7-6s7 2 7 6" fill="white"/>
              <circle cx="23" cy="22" r="7" fill="#10B981"/>
              <path d="M19.5 22l2.5 2.5 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Invitees App</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Open the app for a better experience</p>
          </div>
          <button
            onClick={handleOpenApp}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </button>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    );
  }

  // Install mode — Chrome-native-style bottom-sheet dialog
  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300"
        onClick={handleDismiss}
      />

      {/* Bottom sheet dialog — matches Chrome's native "Install app" prompt */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] animate-in slide-in-from-bottom duration-300">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-w-lg mx-auto overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-medium text-gray-900 dark:text-white">Install app</h2>
          </div>

          {/* App info row */}
          <div className="px-5 pb-5 flex items-center gap-3.5">
            {/* App icon */}
            <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <svg viewBox="0 0 32 32" className="w-6 h-6">
                <circle cx="13" cy="10" r="4" fill="white"/>
                <path d="M6 22c0-4 3.5-6 7-6s7 2 7 6" fill="white"/>
                <circle cx="23" cy="22" r="7" fill="#10B981"/>
                <path d="M19.5 22l2.5 2.5 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Invitees</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {window.location.hostname}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Action buttons — right-aligned like Chrome's native dialog */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5">
            <button
              onClick={handleDismiss}
              className="px-5 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-5 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {installing ? 'Installing...' : 'Install'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

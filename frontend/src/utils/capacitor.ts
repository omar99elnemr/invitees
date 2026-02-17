/**
 * Capacitor native platform utilities
 * Handles: back button, status bar, app lifecycle, keyboard
 * Safe to import on web — all calls are guarded by isNativePlatform()
 */
import { Capacitor } from '@capacitor/core';

/** True when running inside a Capacitor native shell (Android/iOS) */
export const isNative = Capacitor.isNativePlatform();

/**
 * True when the app is running as an "installed app" — either:
 * - Capacitor native (Android/iOS)
 * - PWA standalone (Add to Home Screen)
 * - iOS standalone (Safari "Add to Home Screen")
 *
 * Use this wherever the old `isPWA` check was used:
 * session behavior, remember-me, splash screen, etc.
 */
export const isInstalledApp: boolean =
  isNative ||
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

// Add 'capacitor' class to <html> for CSS targeting
if (isNative) {
  document.documentElement.classList.add('capacitor');
}

/**
 * Initialize all native-only plugins.
 * Call once from main.tsx after React mounts.
 */
export async function initNativePlugins(): Promise<void> {
  if (!isNative) return;

  // ── Hide Capacitor splash immediately (animated React splash handles UX) ──
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // Splash screen plugin not available
  }

  // ── Status Bar ───────────────────────────────────────────────
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Render WebView behind the status bar — CSS safe-area-inset handles the offset
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Transparent status bar so the app header color shows through
    await StatusBar.setBackgroundColor({ color: '#00000000' });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.show();
  } catch {
    // Status bar plugin not available on this platform
  }

  // ── Back Button (Android) ────────────────────────────────────
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // At the root — minimize the app (don't exit)
        App.minimizeApp();
      }
    });
  } catch {
    // App plugin not available
  }

  // ── Keyboard (iOS) ──────────────────────────────────────────
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    // Ensure the viewport resizes when the keyboard opens
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch {
    // Keyboard plugin not available
  }
}

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

  // ── Push Notifications: channel + permission (Android 13+) ──────────
  // Creating the channel first makes the notification toggle appear in
  // Android Settings even before the user grants permission.
  // Then we request the POST_NOTIFICATIONS runtime permission via the
  // PushNotifications plugin (the correct API for FCM-based apps).
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Create notification channel immediately (doesn't need permission).
    // Without a channel Android won't show the notification toggle in Settings.
    try {
      await (PushNotifications as any).createChannel({
        id: 'invitees_notifications',
        name: 'Invitees Notifications',
        description: 'Event updates, approvals, and other notifications',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
      });
    } catch {
      // createChannel not available (iOS) or already exists
    }

    // Request POST_NOTIFICATIONS permission (Android 13+ runtime permission).
    // This triggers the system permission dialog on first launch.
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      await PushNotifications.requestPermissions();
    }
  } catch {
    // PushNotifications plugin not available
  }
}

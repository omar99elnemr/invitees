import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration
 *
 * MODE: "Live Server" — the native app loads your production web server URL.
 * This means:
 *   - All relative /api paths work as-is (same-origin)
 *   - No CORS or cookie changes needed on the backend
 *   - Frontend updates deploy instantly (no app store re-publish)
 *   - Requires network connectivity
 *
 * To switch to EMBEDDED mode (frontend files bundled inside the app):
 *   1. Remove the `server.url` and `server.cleartext` lines below
 *   2. Run `npm run build` first, then `npx cap sync`
 *   3. Update api.ts to use full server URL when Capacitor.isNativePlatform()
 *   4. Update backend CORS to allow capacitor://localhost and http://localhost
 */

const config: CapacitorConfig = {
  // App identifier — reverse-domain format required for Play Store / App Store
  appId: 'com.aldauselect.invitees',
  appName: 'Invitees',
  webDir: 'dist',

  // ── Live Server Mode ─────────────────────────────────────────────
  // Replace with your actual production URL (HTTPS recommended)
  server: {
    url: 'https://invitees.aldauselect.com',
    cleartext: true, // Allow HTTP during development; remove for HTTPS-only
  },

  // ── Android Configuration ────────────────────────────────────────
  android: {
    // Use https scheme so cookies and secure APIs work correctly
    // Even in live-server mode this affects how the WebView identifies itself
    allowMixedContent: true,
    backgroundColor: '#0f172a',
  },

  // ── iOS Configuration ────────────────────────────────────────────
  ios: {
    backgroundColor: '#0f172a',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Invitees',
  },

  // ── Plugins ──────────────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      // Disable the Capacitor plugin splash entirely — the animated React
      // SplashScreen component handles the launch experience instead.
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;

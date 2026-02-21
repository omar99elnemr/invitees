/**
 * Hook to register/unregister push notifications.
 *
 * Web (browser / PWA): subscribes via Web Push API + service worker.
 * Native (Capacitor):  polls for new in-app notifications and shows them
 *                      as local notifications so the user sees them even
 *                      when the app is minimised.
 */
import { useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isNative } from '../utils/capacitor';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Web Push registration (browser / PWA only) */
async function registerWebPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const { data } = await notificationsAPI.getVapidKey();
    if (!data.vapid_public_key) return;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.vapid_public_key),
      });
    }

    await notificationsAPI.subscribePush(subscription.toJSON());
  } catch {
    // Permission denied or push not supported — silently ignore
  }
}

/**
 * Native local-notification poller.
 * Checks for new unread notifications every 30 s and surfaces them
 * as Android/iOS local notifications.
 */
function startNativeNotificationPoller(
  stopSignal: { stopped: boolean },
) {
  let lastSeenId = 0;

  const poll = async () => {
    if (stopSignal.stopped) return;
    try {
      const { data } = await notificationsAPI.getAll(false, 10);
      const items = data.notifications ?? [];
      const unread = items.filter(
        (n: any) => !n.is_read && n.id > lastSeenId,
      );

      if (unread.length > 0) {
        // Update high-water mark so we don't re-show
        lastSeenId = Math.max(...unread.map((n: any) => n.id));

        const { LocalNotifications } = await import(
          '@capacitor/local-notifications'
        );
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') return;

        await LocalNotifications.schedule({
          notifications: unread.map((n: any, idx: number) => ({
            title: n.title,
            body: n.message,
            id: n.id + 100000 + idx, // unique id to avoid collisions
            smallIcon: 'ic_launcher',
          })),
        });
      }
    } catch {
      // Polling failure — silently ignore
    }
  };

  // Initial poll after short delay, then every 30 s
  const timeout = setTimeout(poll, 5000);
  const interval = setInterval(poll, 30000);

  return () => {
    stopSignal.stopped = true;
    clearTimeout(timeout);
    clearInterval(interval);
  };
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;

    if (isNative) {
      // Native: use local-notification poller
      const stopSignal = { stopped: false };
      const cleanup = startNativeNotificationPoller(stopSignal);
      registered.current = true;
      return cleanup;
    }

    // Web: use Web Push
    registerWebPush().then(() => {
      registered.current = true;
    });
  }, [isAuthenticated]);
}

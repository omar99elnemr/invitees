/**
 * Hook to register/unregister push notifications.
 *
 * Web (browser / PWA): subscribes via Web Push API + service worker.
 * Native (Capacitor):  registers for Firebase Cloud Messaging (FCM) push
 *                      notifications so the user gets notified even when
 *                      the app is completely closed.
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
 * Register for Firebase Cloud Messaging (FCM) on native Capacitor.
 * This enables true push notifications even when the app is killed.
 */
async function registerFCMPush() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') return;

    // Register with FCM
    await PushNotifications.register();

    // Listen for the FCM token
    PushNotifications.addListener('registration', async (tokenData) => {
      try {
        const platform = (window as any).Capacitor?.getPlatform?.() || 'android';
        await notificationsAPI.registerFCMToken(tokenData.value, platform);
      } catch {
        // Token registration failed — will retry on next app launch
      }
    });

    // Handle registration errors
    PushNotifications.addListener('registrationError', (err) => {
      console.warn('FCM registration failed:', err);
    });

    // Handle notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      // Show as local notification so user sees it even in foreground
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') return;

        await LocalNotifications.schedule({
          notifications: [{
            title: notification.title || 'Invitees',
            body: notification.body || '',
            id: Date.now() % 100000,
            smallIcon: 'ic_stat_notify',
          }],
        });
      } catch {
        // Local notification failed
      }
    });

    // Handle notification tap (open the app to the correct page)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url;
      if (url && url !== '/') {
        window.location.href = url;
      }
    });
  } catch {
    // PushNotifications plugin not available — silently ignore
  }
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;

    if (isNative) {
      // Native: register for FCM push notifications
      registerFCMPush().then(() => {
        registered.current = true;
      });
      return;
    }

    // Web: use Web Push
    registerWebPush().then(() => {
      registered.current = true;
    });
  }, [isAuthenticated]);
}

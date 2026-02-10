/**
 * Hook to register/unregister push notifications.
 * Automatically subscribes when the user is authenticated and
 * the browser supports push + service workers.
 */
import { useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const register = async () => {
      try {
        // Get VAPID public key from server
        const { data } = await notificationsAPI.getVapidKey();
        if (!data.vapid_public_key) return; // Push not configured on server

        const registration = await navigator.serviceWorker.ready;

        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // Ask for permission & subscribe
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.vapid_public_key),
          });
        }

        // Send subscription to backend
        await notificationsAPI.subscribePush(subscription.toJSON());
        registered.current = true;
      } catch {
        // Permission denied or push not supported — silently ignore
      }
    };

    register();
  }, [isAuthenticated]);
}

/**
 * useEventToasts
 * Lightweight polling hook that shows toast notifications when:
 * - An event is starting soon (within 1 hour)
 * - An event status changes (e.g. upcoming → ongoing, ongoing → ended)
 * Runs inside Layout so it covers all authenticated pages.
 */
import { useEffect, useRef, useCallback } from 'react';
import { eventsAPI } from '../services/api';
import type { Event } from '../types';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SOON_THRESHOLD = 60 * 60 * 1000; // 1 hour

/** Session-level set of toast keys already shown (avoids repeats within a session) */
const shownToasts = new Set<string>(
  JSON.parse(sessionStorage.getItem('_evt_toasts') || '[]')
);

function persistShown() {
  sessionStorage.setItem('_evt_toasts', JSON.stringify([...shownToasts]));
}

function showOnce(key: string, message: string, icon: string) {
  if (shownToasts.has(key)) return;
  shownToasts.add(key);
  persistShown();
  toast(message, { icon, duration: 6000 });
}

export function useEventToasts() {
  const prevStatusMap = useRef<Record<number, string>>({});

  const check = useCallback(async () => {
    try {
      const res = await eventsAPI.getAll();
      const events: Event[] = res.data || [];
      const now = Date.now();

      for (const evt of events) {
        const prev = prevStatusMap.current[evt.id];

        // Status change detection (skip first load)
        if (prev && prev !== evt.status) {
          if (evt.status === 'ongoing') {
            showOnce(`live-${evt.id}`, `"${evt.name}" is now live!`, '🟢');
          } else if (evt.status === 'ended') {
            showOnce(`ended-${evt.id}`, `"${evt.name}" has ended`, '🏁');
          } else if (evt.status === 'cancelled') {
            showOnce(`cancel-${evt.id}`, `"${evt.name}" was cancelled`, '🚫');
          } else if (evt.status === 'on_hold') {
            showOnce(`hold-${evt.id}`, `"${evt.name}" is on hold`, '⏸️');
          }
        }

        // Starting soon detection
        if (evt.status === 'upcoming' && evt.start_date) {
          const start = new Date(evt.start_date).getTime();
          const diff = start - now;
          if (diff > 0 && diff <= SOON_THRESHOLD) {
            const mins = Math.round(diff / 60000);
            const label = mins >= 60 ? '~1 hour' : `${mins} min`;
            showOnce(`soon-${evt.id}`, `"${evt.name}" starts in ${label}`, '⏰');
          }
        }

        prevStatusMap.current[evt.id] = evt.status;
      }
    } catch {
      // Silently ignore — dashboard will show errors if the API is down
    }
  }, []);

  useEffect(() => {
    // Initial check after a short delay (let the page load first)
    const initTimer = setTimeout(check, 3000);
    const interval = setInterval(check, POLL_INTERVAL);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [check]);
}

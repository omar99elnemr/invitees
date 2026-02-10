/**
 * NotificationBell Component
 * Bell icon with unread count badge + dropdown panel showing notifications.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI, type Notification } from '../../services/api';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const typeIcons: Record<string, string> = {
  event_status: '📅',
  event_reminder: '⏰',
  group_assignment: '👥',
  invitation_submitted: '📨',
  invitation_approved: '✅',
  invitation_rejected: '❌',
  invitation_cancelled: '🚫',
  system: 'ℹ️',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await notificationsAPI.getAll(false, 30);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch {
      // silently fail
    }
  }, []);

  // Poll unread count every 10s; also refresh full list when panel is open
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (isOpen) fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchNotifications, isOpen]);

  // Full fetch when panel opens
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    const n = notifications.find(n => n.id === id);
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (n && !n.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleClick = (n: Notification) => {
    if (!n.is_read) handleMarkRead(n.id);
    if (n.link) {
      setIsOpen(false);
      navigate(n.link);
    }
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed right-3 left-3 top-[60px] sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 max-h-[70vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                    !n.is_read ? 'bg-primary/5 dark:bg-primary/10' : ''
                  }`}
                  onClick={() => handleClick(n)}
                >
                  {/* Type icon */}
                  <span className="text-base mt-0.5 flex-shrink-0">{typeIcons[n.type] || typeIcons.system}</span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                      {n.link && <ExternalLink className="w-2.5 h-2.5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

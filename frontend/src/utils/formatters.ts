/**
 * Formatter helper functions
 */
import { format, parseISO } from 'date-fns';

// Server-generated timestamps (created_at, status_date, last_login, etc.) use
// datetime.utcnow() and are genuine UTC. 'Africa/Cairo' converts them to Egypt
// local time with automatic DST handling (UTC+2 winter, UTC+3 summer).
const EGYPT_TIMEZONE = 'Africa/Cairo';

// Module-level time format state (settable at runtime)
let _hour12: boolean = true;

/** Set the system-wide time format. Call once on app init and whenever the admin changes it. */
export function setTimeFormat(fmt: '12' | '24') {
  _hour12 = fmt === '12';
}

/** Get the current hour12 flag for Intl / toLocaleString. */
export function getHour12(): boolean {
  return _hour12;
}

/**
 * Format date/time for display (local timezone)
 */
export const formatDate = (dateString: string | null | undefined, formatStr = 'PPP'): string => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date and time (local timezone)
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  return formatDate(dateString, 'PPp');
};

/**
 * Format time only (local timezone)
 */
export const formatTime = (dateString: string | null | undefined): string => {
  return formatDate(dateString, 'p');
};

/**
 * Format date/time in Egypt timezone
 */
export const formatDateTimeEgypt = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-EG', {
      timeZone: EGYPT_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: _hour12,
    });
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date only in Egypt timezone
 */
export const formatDateEgypt = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-EG', {
      timeZone: EGYPT_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format time only in Egypt timezone
 */
export const formatTimeEgypt = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-EG', {
      timeZone: EGYPT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: _hour12,
    });
  } catch {
    return 'Invalid Time';
  }
};

/**
 * Format event date/time for display.
 * Event dates (start_date, end_date) are stored as Egypt local time (naive) with
 * a fake 'Z' suffix appended by to_utc_isoformat(). This function parses the raw
 * ISO string directly — no timezone conversion — so the displayed value matches
 * the Egypt local time the user originally entered.
 */
export const formatEventDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return dateString;
    const [, year, monthStr, day, hour, minute] = match;
    const h = parseInt(hour);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (_hour12) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${months[parseInt(monthStr) - 1]} ${parseInt(day)}, ${year}, ${String(h12).padStart(2, '0')}:${minute} ${ampm}`;
    }
    return `${months[parseInt(monthStr) - 1]} ${parseInt(day)}, ${year}, ${String(h).padStart(2, '0')}:${minute}`;
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format event date only (no time) for display.
 * Same raw-parse approach as formatEventDateTime — no timezone conversion.
 */
export const formatEventDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateString;
    const [, year, monthStr, day] = match;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(monthStr) - 1]} ${parseInt(day)}, ${year}`;
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format status for display
 */
export const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get status color class
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'waiting_for_approval': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'upcoming': 'bg-blue-100 text-blue-800',
    'ongoing': 'bg-green-100 text-green-800',
    'ended': 'bg-gray-100 text-gray-800',
    'cancelled': 'bg-red-100 text-red-800',
    'on_hold': 'bg-yellow-100 text-yellow-800',
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get role color class
 */
export const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    'admin': 'bg-purple-100 text-purple-800',
    'director': 'bg-blue-100 text-blue-800',
    'organizer': 'bg-green-100 text-green-800',
  };
  
  return colors[role] || 'bg-gray-100 text-gray-800';
};

/**
 * Truncate text
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

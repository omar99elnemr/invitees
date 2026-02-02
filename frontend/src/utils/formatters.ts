/**
 * Formatter helper functions
 */
import { format, parseISO } from 'date-fns';

// Egypt timezone constant
const EGYPT_TIMEZONE = 'Africa/Cairo';

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
      hour12: true,
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
      hour12: true,
    });
  } catch {
    return 'Invalid Time';
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

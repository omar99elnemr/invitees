/**
 * Validation helper functions
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format (international, no '+' prefix, digits only)
 */
export const isValidPhone = (phone: string): boolean => {
  // Strip everything except digits
  const cleaned = phone.replace(/[^\d]/g, '');
  // 7-15 digits, starts with 1-9
  if (cleaned.length < 7 || cleaned.length > 15 || !/^[1-9]/.test(cleaned)) return false;
  return true;
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true, message: 'Password is strong' };
};

/**
 * Validate date range
 */
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

/**
 * Format phone number for display (digits only, no '+')
 */
export const formatPhone = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/[^\d]/g, '');
  return cleaned;
};

/**
 * Validate username
 */
export const isValidUsername = (username: string): boolean => {
  // 3-50 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
};

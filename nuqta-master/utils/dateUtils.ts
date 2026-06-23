// @ts-nocheck
/**
 * Date and Time Utilities
 * Helper functions for date formatting and manipulation
 */

import { BusinessHoursData } from './storeTransformers';

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date to human-readable string
 * @param date - Date object or ISO string
 * @param format - Format type ('short', 'medium', 'long')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid date';

  const options: Intl.DateTimeFormatOptions = {
    short: {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    },
    medium: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  }[format];

  return d.toLocaleDateString('en-US', options);
}

/**
 * Get relative time (e.g., "2 hours ago", "just now")
 * @param date - Date object or ISO string
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid date';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  // Future dates
  if (diffInSeconds < 0) {
    const absDiff = Math.abs(diffInSeconds);
    if (absDiff < 60) return 'in a few seconds';
    if (absDiff < 3600) return `in ${Math.floor(absDiff / 60)} minutes`;
    if (absDiff < 86400) return `in ${Math.floor(absDiff / 3600)} hours`;
    return formatDate(d, 'medium');
  }

  // Past dates
  if (diffInSeconds < 10) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  return formatDate(d, 'medium');
}

/**
 * Format time in 12-hour format
 * @param time24 - Time in 24-hour format (e.g., "14:30")
 * @returns Time in 12-hour format (e.g., "2:30 PM")
 */
export function format12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;

  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) return time24;

  const isPM = hour >= 12;
  const hour12 = hour % 12 || 12;
  const period = isPM ? 'PM' : 'AM';

  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns Boolean indicating if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is within a range
 * @param date - Date to check
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @returns Boolean indicating if date is within range
 */
export function isWithinRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  return d >= start && d <= end;
}

// ============================================================================
// BUSINESS HOURS UTILITIES
// ============================================================================

/**
 * Check if store is currently open based on business hours
 * @param hours - Business hours object
 * @returns Boolean indicating if store is open now
 */
export function isStoreOpen(hours?: BusinessHoursData): boolean {
  if (!hours) return false;

  const now = new Date();
  const day = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todayHours = hours[day];
  if (!todayHours || todayHours.closed) return false;

  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);

  if (isNaN(openHour) || isNaN(openMin) || isNaN(closeHour) || isNaN(closeMin)) {
    return false;
  }

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Get next opening time for a store
 * @param hours - Business hours object
 * @returns Formatted string with next opening time
 */
export function getNextOpeningTime(hours?: BusinessHoursData): string {
  if (!hours) return 'Hours not available';

  const now = new Date();
  const currentDay = now.getDay();

  // Check if open today but later
  const todayHours = hours[currentDay];
  if (todayHours && !todayHours.closed) {
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const openTime = openHour * 60 + openMin;

    if (currentTime < openTime) {
      return `Opens today at ${format12Hour(todayHours.open)}`;
    }
  }

  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const nextDayHours = hours[nextDay];

    if (nextDayHours && !nextDayHours.closed) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][nextDay];
      return `Opens ${i === 1 ? 'tomorrow' : dayName} at ${format12Hour(nextDayHours.open)}`;
    }
  }

  return 'Closed';
}

/**
 * Get closing time for today
 * @param hours - Business hours object
 * @returns Formatted closing time string
 */
export function getClosingTime(hours?: BusinessHoursData): string | null {
  if (!hours) return null;

  const today = new Date().getDay();
  const todayHours = hours[today];

  if (!todayHours || todayHours.closed) return null;

  return format12Hour(todayHours.close);
}

// ============================================================================
// TIME CALCULATIONS
// ============================================================================

/**
 * Calculate time until a specific date
 * @param targetDate - Target date to count down to
 * @returns Object with days, hours, minutes, seconds
 */
export function getTimeUntil(targetDate: Date | string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  const total = target.getTime() - now.getTime();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

/**
 * Add days to a date
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get start of day
 * @param date - Date to process
 * @returns Date set to 00:00:00
 */
export function startOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 * @param date - Date to process
 * @returns Date set to 23:59:59
 */
export function endOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  formatDate,
  getRelativeTime,
  format12Hour,
  isToday,
  isWithinRange,
  isStoreOpen,
  getNextOpeningTime,
  getClosingTime,
  getTimeUntil,
  addDays,
  startOfDay,
  endOfDay,
};

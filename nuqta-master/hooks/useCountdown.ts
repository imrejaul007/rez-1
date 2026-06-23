import { useState, useEffect, useCallback, useRef } from 'react';
import { colors } from '@/constants/theme';

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formattedTime: string;
  urgencyLevel: 'expired' | 'critical' | 'warning' | 'normal';
}

/**
 * Custom hook for countdown logic with efficient updates
 * @param expiryDate - Target expiry date (string or Date)
 * @param onExpire - Optional callback when countdown expires
 * @returns CountdownResult with time remaining and urgency level
 */
export function useCountdown(
  expiryDate: string | Date | undefined,
  onExpire?: () => void
): CountdownResult {
  // Store onExpire in ref to avoid re-creating interval when callback changes
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const calculateTimeRemaining = useCallback((): CountdownResult => {
    if (!expiryDate) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        formattedTime: 'Expired',
        urgencyLevel: 'expired',
      };
    }

    const now = new Date().getTime();
    const target = new Date(expiryDate).getTime();
    const difference = target - now;

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        formattedTime: 'Expired',
        urgencyLevel: 'expired',
      };
    }

    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    // Determine urgency level
    let urgencyLevel: 'expired' | 'critical' | 'warning' | 'normal' = 'normal';
    if (totalSeconds <= 1800) { // < 30 minutes
      urgencyLevel = 'critical';
    } else if (totalSeconds <= 3600) { // < 1 hour
      urgencyLevel = 'warning';
    } else if (totalSeconds <= 86400) { // < 24 hours
      urgencyLevel = 'warning';
    }

    // Format time string
    let formattedTime: string;
    if (days > 0) {
      formattedTime = `${days}d ${hours}h`;
    } else if (hours > 0) {
      formattedTime = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      formattedTime = `${minutes}m ${seconds}s`;
    } else {
      formattedTime = `${seconds}s`;
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      isExpired: false,
      formattedTime,
      urgencyLevel,
    };
  }, [expiryDate]);

  const [countdown, setCountdown] = useState<CountdownResult>(calculateTimeRemaining());

  useEffect(() => {
    // Update immediately on mount
    const initialCountdown = calculateTimeRemaining();
    setCountdown(initialCountdown);

    // If already expired, call onExpire immediately
    if (initialCountdown.isExpired && onExpireRef.current) {
      onExpireRef.current();
      return; // Don't set up interval
    }

    // Set up interval for updates
    const interval = setInterval(() => {
      const newCountdown = calculateTimeRemaining();
      setCountdown(newCountdown);

      // Call onExpire when countdown reaches zero
      if (newCountdown.isExpired && onExpireRef.current) {
        onExpireRef.current();
        clearInterval(interval);
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, [expiryDate, calculateTimeRemaining]); // Removed onExpire - using ref instead

  return countdown;
}

/**
 * Hook for checking if a deal is expiring soon
 * @param expiryDate - Target expiry date
 * @param thresholdHours - Hours threshold for "expiring soon" (default: 24)
 * @returns boolean indicating if deal is expiring soon
 */
export function useIsExpiringSoon(
  expiryDate: string | Date | undefined,
  thresholdHours: number = 24
): boolean {
  const countdown = useCountdown(expiryDate);
  const thresholdSeconds = thresholdHours * 60 * 60;
  return !countdown.isExpired && countdown.totalSeconds <= thresholdSeconds;
}

/**
 * Format countdown for display with different styles
 * @param countdown - CountdownResult from useCountdown
 * @param style - Display style ('compact' | 'full' | 'verbose')
 * @returns Formatted string
 */
export function formatCountdownDisplay(
  countdown: CountdownResult,
  style: 'compact' | 'full' | 'verbose' = 'compact'
): string {
  if (countdown.isExpired) {
    return 'Expired';
  }

  const { days, hours, minutes, seconds, totalSeconds } = countdown;

  if (style === 'compact') {
    // Show most relevant unit(s)
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  if (style === 'full') {
    // Show all units with padding
    if (days > 0) {
      return `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  if (style === 'verbose') {
    // Show with labels
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  return countdown.formattedTime;
}

/**
 * Get urgency color based on time remaining
 * @param urgencyLevel - Urgency level from countdown
 * @returns Color hex code
 */
export function getUrgencyColor(urgencyLevel: CountdownResult['urgencyLevel']): string {
  switch (urgencyLevel) {
    case 'expired':
      return '#9CA3AF'; // Gray
    case 'critical':
      return colors.error; // Red
    case 'warning':
      return '#F59E0B'; // Orange
    case 'normal':
      return '#10B981'; // Green
    default:
      return colors.neutral[500]; // Default gray
  }
}

/**
 * Get urgency badge text based on time remaining
 * @param countdown - CountdownResult from useCountdown
 * @returns Badge text or null
 */
export function getUrgencyBadge(countdown: CountdownResult): string | null {
  if (countdown.isExpired) {
    return 'Expired';
  }
  if (countdown.totalSeconds <= 1800) { // < 30 minutes
    return 'Ending Soon!';
  }
  if (countdown.totalSeconds <= 3600) { // < 1 hour
    return 'Hurry Up!';
  }
  if (countdown.totalSeconds <= 86400) { // < 24 hours
    return 'Expiring Soon';
  }
  return null;
}

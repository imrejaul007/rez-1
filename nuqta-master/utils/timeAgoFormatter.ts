// Time Ago Formatter
// Converts ISO timestamps to human-readable "time ago" format

/**
 * Format timestamp to "time ago" string
 * Examples: "Just now", "5m ago", "2h ago", "3d ago"
 */
export function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const timestamp = new Date(isoString);
  const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

  // Just now (0-10 seconds)
  if (diffInSeconds < 10) {
    return 'Just now';
  }

  // Seconds ago (10-59 seconds)
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }

  // Minutes ago (1-59 minutes)
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // Hours ago (1-23 hours)
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  // Days ago (1-6 days)
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Weeks ago (1-3 weeks)
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  // Months ago (1-11 months)
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  // Years ago
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

/**
 * Format count to compact string (1.2K, 3.5M, etc.)
 */
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
}

/**
 * Validate if timestamp is valid
 */
export function isValidTimestamp(isoString: string): boolean {
  const timestamp = new Date(isoString);
  return !isNaN(timestamp.getTime());
}

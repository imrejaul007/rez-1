// YouTube-like View Tracking Utility
// Tracks video views with cooldown period to prevent spam while allowing legitimate re-views

import AsyncStorage from '@react-native-async-storage/async-storage';

const VIEW_HISTORY_KEY = '@video_view_history';
const VIEW_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours cooldown (YouTube-like)
const MAX_HISTORY_ENTRIES = 500; // Prevent storage from growing too large

interface ViewHistoryEntry {
  videoId: string;
  lastViewedAt: number; // timestamp
}

interface ViewHistory {
  entries: ViewHistoryEntry[];
}

/**
 * Get the view history from storage
 */
async function getViewHistory(): Promise<ViewHistory> {
  try {
    const data = await AsyncStorage.getItem(VIEW_HISTORY_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (_error) {
    // silently handle
  }
  return { entries: [] };
}

/**
 * Save the view history to storage
 */
async function saveViewHistory(history: ViewHistory): Promise<void> {
  try {
    // Clean up old entries (older than 7 days) to prevent storage bloat
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    history.entries = history.entries.filter(entry => entry.lastViewedAt > sevenDaysAgo);

    // Keep only the most recent entries if still too many
    if (history.entries.length > MAX_HISTORY_ENTRIES) {
      history.entries = history.entries
        .sort((a, b) => b.lastViewedAt - a.lastViewedAt)
        .slice(0, MAX_HISTORY_ENTRIES);
    }

    await AsyncStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(history));
  } catch (_error) {
    // silently handle
  }
}

/**
 * Check if a view should be counted for a video
 * Returns true if:
 * - Video has never been viewed, OR
 * - Cooldown period has passed since last view
 */
export async function shouldCountView(videoId: string): Promise<boolean> {
  if (!videoId) return false;

  const history = await getViewHistory();
  const entry = history.entries.find(e => e.videoId === videoId);

  if (!entry) {
    // Never viewed before
    return true;
  }

  const timeSinceLastView = Date.now() - entry.lastViewedAt;
  return timeSinceLastView >= VIEW_COOLDOWN_MS;
}

/**
 * Record that a video has been viewed
 * Call this AFTER successfully tracking the view with the API
 */
export async function recordView(videoId: string): Promise<void> {
  if (!videoId) return;

  const history = await getViewHistory();
  const existingIndex = history.entries.findIndex(e => e.videoId === videoId);

  const newEntry: ViewHistoryEntry = {
    videoId,
    lastViewedAt: Date.now(),
  };

  if (existingIndex >= 0) {
    // Update existing entry
    history.entries[existingIndex] = newEntry;
  } else {
    // Add new entry
    history.entries.push(newEntry);
  }

  await saveViewHistory(history);
}

/**
 * Get time remaining until next view can be counted (for UI display if needed)
 * Returns 0 if view can be counted now
 */
export async function getViewCooldownRemaining(videoId: string): Promise<number> {
  if (!videoId) return 0;

  const history = await getViewHistory();
  const entry = history.entries.find(e => e.videoId === videoId);

  if (!entry) {
    return 0;
  }

  const timeSinceLastView = Date.now() - entry.lastViewedAt;
  const remaining = VIEW_COOLDOWN_MS - timeSinceLastView;

  return Math.max(0, remaining);
}

/**
 * Clear all view history (for testing/debugging)
 */
export async function clearViewHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(VIEW_HISTORY_KEY);
  } catch (_error) {
    // silently handle
  }
}

export default {
  shouldCountView,
  recordView,
  getViewCooldownRemaining,
  clearViewHistory,
};

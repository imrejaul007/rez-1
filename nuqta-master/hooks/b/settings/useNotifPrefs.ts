/**
 * useNotifPrefs — granular notification preferences hook (Phase 3.5).
 *
 * Loads the user's per-channel × per-category notification matrix from
 * the B-feature backend (`GET /api/b/notif-prefs`) and exposes a typed
 * `updatePref(category, channel, enabled)` action that PUTs the change
 * back (`PUT /api/b/notif-prefs`).
 *
 * Source of truth
 * ---------------
 * The backend is the authoritative store. The pre-existing
 * `useNotificationStore` (the broader, channel-grouped notification
 * settings store) is read at mount time and used as a fallback when the
 * backend is unreachable or the request is still in flight.
 *
 * Shape
 * -----
 * A preference is a `(category, channel)` tuple:
 *   - `category`: one of
 *     `offers_cashback | order_updates | streak_reminders | weekly_digest |
 *      friend_activity | survey_invites`
 *   - `channel`:  one of `push | email | sms | in_app`
 *   - `enabled`:  boolean
 *
 * Usage
 * -----
 *   ```tsx
 *   const { prefs, isLoading, error, updatePref, isSaving, refresh } =
 *     useNotifPrefs();
 *   await updatePref('order_updates', 'push', false);
 *   ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import { useNotificationStore } from '@/stores/notificationStore';
import { useToastStore } from '@/stores/toastStore';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Supported delivery channels for B-feature notifications. */
export type NotifChannel = 'push' | 'email' | 'sms' | 'in_app';

/** Supported notification categories exposed by the B-side UI. */
export type NotifCategory =
  | 'offers_cashback'
  | 'order_updates'
  | 'streak_reminders'
  | 'weekly_digest'
  | 'friend_activity'
  | 'survey_invites';

/**
 * Canonical list of categories — order is the render order on the
 * preferences page. Exported as a tuple so it can drive `Object.keys` /
 * `for…of` loops without losing type information.
 */
export const NOTIF_CATEGORIES: ReadonlyArray<NotifCategory> = [
  'offers_cashback',
  'order_updates',
  'streak_reminders',
  'weekly_digest',
  'friend_activity',
  'survey_invites',
];

/** Canonical list of channels — order is the render order. */
export const NOTIF_CHANNELS: ReadonlyArray<NotifChannel> = [
  'push',
  'email',
  'sms',
  'in_app',
];

/** Human-readable label for a category. */
export const NOTIF_CATEGORY_LABELS: Record<NotifCategory, string> = {
  offers_cashback: 'Offers & cashback',
  order_updates: 'Order updates',
  streak_reminders: 'Streak reminders',
  weekly_digest: 'Weekly digest',
  friend_activity: 'Friend activity',
  survey_invites: 'Survey invites',
};

/** Human-readable label for a channel. */
export const NOTIF_CHANNEL_LABELS: Record<NotifChannel, string> = {
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  in_app: 'In-app',
};

/** One row in the preference matrix. */
export interface NotifPref {
  category: NotifCategory;
  channel: NotifChannel;
  enabled: boolean;
}

/** Response envelope returned by `GET /api/b/notif-prefs`. */
interface NotifPrefsResponse {
  prefs: NotifPref[];
}

export interface UseNotifPrefsResult {
  /** All 24 preference entries (6 categories × 4 channels). */
  prefs: NotifPref[];
  /** `true` while the initial GET is in flight. */
  isLoading: boolean;
  /** Human-readable error from the last failed call, or `null`. */
  error: string | null;
  /** Optimistic lookup for a single cell. */
  isEnabled: (category: NotifCategory, channel: NotifChannel) => boolean;
  /**
   * Update a single cell. Optimistically updates the local state, then
   * PUTs the change. Reverts on failure and surfaces a toast.
   */
  updatePref: (
    category: NotifCategory,
    channel: NotifChannel,
    enabled: boolean,
  ) => Promise<void>;
  /** `true` while a save is in flight (any save). */
  isSaving: boolean;
  /** Re-fetch the full matrix. */
  refresh: () => Promise<void>;
  /** Restore the local state to the default matrix. */
  resetToDefaults: () => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Hardcoded default matrix — mirrors the backend's `buildDefaultPrefs`
 * so the page renders sensibly even before the first successful GET.
 */
function buildDefaultPrefs(): NotifPref[] {
  const emailOn: ReadonlySet<NotifCategory> = new Set<NotifCategory>([
    'weekly_digest',
    'survey_invites',
  ]);
  const smsOn: ReadonlySet<NotifCategory> = new Set<NotifCategory>([]);

  const prefs: NotifPref[] = [];
  for (const category of NOTIF_CATEGORIES) {
    for (const channel of NOTIF_CHANNELS) {
      let enabled = false;
      if (channel === 'push' || channel === 'in_app') {
        enabled = true;
      } else if (channel === 'email') {
        enabled = emailOn.has(category);
      } else if (channel === 'sms') {
        enabled = smsOn.has(category);
      }
      prefs.push({ category, channel, enabled });
    }
  }
  return prefs;
}

const DEFAULT_PREFS: ReadonlyArray<NotifPref> = buildDefaultPrefs();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNotifCategory(value: unknown): value is NotifCategory {
  return (
    typeof value === 'string' &&
    (NOTIF_CATEGORIES as ReadonlyArray<string>).includes(value)
  );
}

function isNotifChannel(value: unknown): value is NotifChannel {
  return (
    typeof value === 'string' &&
    (NOTIF_CHANNELS as ReadonlyArray<string>).includes(value)
  );
}

function isNotifPref(value: unknown): value is NotifPref {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    isNotifCategory(v.category) &&
    isNotifChannel(v.channel) &&
    typeof v.enabled === 'boolean'
  );
}

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Load + mutate the per-channel × per-category notification preferences
 * for the authenticated user.
 */
export function useNotifPrefs(): UseNotifPrefsResult {
  const notificationSettings = useNotificationStore((s) => s.settings);
  const showError = useToastStore((s) => s.showError);

  // Local state — the matrix is the source of truth for the page.
  const [prefs, setPrefs] = useState<NotifPref[]>(() =>
    DEFAULT_PREFS.map((p) => ({ ...p })),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Track whether we've kicked off the initial fetch for this mount.
  const hasFetchedRef = useRef<boolean>(false);

  // Read settings from the broader notification store so we have a
  // channel-level fallback when the backend is unreachable.
  useEffect(() => {
    if (!notificationSettings) return;
    // Don't overwrite a successful server response, only seed defaults
    // when the page is still showing the hardcoded defaults.
    if (hasFetchedRef.current) return;
    setPrefs((current) => {
      return current.map((row) => {
        if (row.channel === 'push' && typeof notificationSettings.push?.enabled === 'boolean') {
          return { ...row, enabled: row.enabled && notificationSettings.push.enabled };
        }
        if (row.channel === 'email' && typeof notificationSettings.email?.enabled === 'boolean') {
          return { ...row, enabled: row.enabled && notificationSettings.email.enabled };
        }
        if (row.channel === 'sms' && typeof notificationSettings.sms?.enabled === 'boolean') {
          return { ...row, enabled: row.enabled && notificationSettings.sms.enabled };
        }
        if (row.channel === 'in_app' && typeof notificationSettings.inApp?.enabled === 'boolean') {
          return { ...row, enabled: row.enabled && notificationSettings.inApp.enabled };
        }
        return row;
      });
    });
  }, [notificationSettings]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<NotifPrefsResponse>(
        '/b/notif-prefs',
      );
      const payload = response?.data;
      if (!response.success || !payload || !Array.isArray(payload.prefs)) {
        throw new Error(
          response?.error ??
            response?.message ??
            'Malformed notif-prefs response',
        );
      }
      const validated: NotifPref[] = payload.prefs
        .filter(isNotifPref)
        .map((p) => ({ ...p }));
      if (validated.length === 0) {
        throw new Error('Empty notif-prefs response');
      }
      setPrefs(validated);
      hasFetchedRef.current = true;
    } catch (err) {
      const message = errorToString(err);
      setError(message);
      logger.error(
        'useNotifPrefs_fetch_failed',
        new Error(message),
        'B Features',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount.
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    refresh().catch(() => {
      /* error already captured above */
    });
  }, [refresh]);

  const updatePref = useCallback(
    async (
      category: NotifCategory,
      channel: NotifChannel,
      enabled: boolean,
    ): Promise<void> => {
      // Optimistic update.
      const previous = prefs;
      setPrefs((current) =>
        current.map((row) =>
          row.category === category && row.channel === channel
            ? { ...row, enabled }
            : row,
        ),
      );
      setIsSaving(true);
      setError(null);

      try {
        const response = await apiClient.put<NotifPrefsResponse>(
          '/b/notif-prefs',
          { category, channel, enabled },
        );
        if (!response.success || !response.data || !Array.isArray(response.data.prefs)) {
          throw new Error(
            response?.error ??
              response?.message ??
              'Failed to save preference',
          );
        }
        const validated: NotifPref[] = response.data.prefs
          .filter(isNotifPref)
          .map((p) => ({ ...p }));
        if (validated.length === 0) {
          throw new Error('Empty notif-prefs response after save');
        }
        setPrefs(validated);
      } catch (err) {
        // Revert optimistic update.
        setPrefs(previous);
        const message = errorToString(err);
        setError(message);
        logger.error(
          'useNotifPrefs_save_failed',
          new Error(`${category}/${channel}=${enabled}: ${message}`),
          'B Features',
        );
        try {
          showError('Couldn\'t save notification preferences');
        } catch {
          /* toast is a soft dependency */
        }
      } finally {
        setIsSaving(false);
      }
    },
    [prefs, showError],
  );

  const resetToDefaults = useCallback(() => {
    setPrefs(DEFAULT_PREFS.map((p) => ({ ...p })));
    setError(null);
  }, []);

  const isEnabled = useCallback(
    (category: NotifCategory, channel: NotifChannel): boolean => {
      for (const row of prefs) {
        if (row.category === category && row.channel === channel) {
          return row.enabled;
        }
      }
      return false;
    },
    [prefs],
  );

  return {
    prefs,
    isLoading,
    error,
    isEnabled,
    updatePref,
    isSaving,
    refresh,
    resetToDefaults,
  };
}

export default useNotifPrefs;
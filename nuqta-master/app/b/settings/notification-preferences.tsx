/**
 * /b/settings/notification-preferences — granular per-channel × per-category
 * notification settings (Phase 3.5).
 *
 * Layout
 * ------
 *   1. Header bar (back + title + reset link).
 *   2. Master channel toggles (push / email / sms / in_app). Flipping a
 *      master toggle updates all 6 categories for that channel.
 *   3. Per-category grid: one row per category with 4 channel toggles
 *      (`Push / Email / SMS / In-app`).
 *   4. Footer: "Save" + "Reset to defaults" buttons.
 *
 * Lifecycle
 * ---------
 *   - `useNotifPrefs()` reads from the backend on mount, exposes
 *     `updatePref(category, channel, enabled)` and `isSaving` for the
 *     "Save" button.
 *   - Optimistic updates are handled inside the hook — the page just
 *     calls `updatePref` and reflects the new state in the next render.
 *   - Success toasts fire on each successful save (so the user gets
 *     immediate feedback); the hook itself emits a failure toast on
 *     errors.
 *
 * Wrapped in `withErrorBoundary(NotifPrefsPage, 'Notification Preferences')`
 * and gated by `<FeatureFlagGate flag="b.notifPrefs">` so the page
 * disappears when the migration flag is disabled.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { SkeletonLoader } from '@/components/skeletons';
import {
  useNotifPrefs,
  NOTIF_CATEGORIES,
  NOTIF_CHANNELS,
  NOTIF_CATEGORY_LABELS,
  NOTIF_CHANNEL_LABELS,
  type NotifCategory,
  type NotifChannel,
} from '@/hooks/b/settings/useNotifPrefs';
import { useToastStore } from '@/stores/toastStore';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MasterChannelRowProps {
  channel: NotifChannel;
  enabled: boolean;
  isSaving: boolean;
  onToggle: (next: boolean) => void;
}

function MasterChannelRow({
  channel,
  enabled,
  isSaving,
  onToggle,
}: MasterChannelRowProps): React.ReactElement {
  return (
    <View style={styles.masterRow}>
      <Text style={styles.masterLabel} allowFontScaling={false}>
        {NOTIF_CHANNEL_LABELS[channel]}
      </Text>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        disabled={isSaving}
        trackColor={{ false: colors.border.default, true: colors.gold }}
        thumbColor={colors.text.white}
        accessibilityLabel={`${NOTIF_CHANNEL_LABELS[channel]} notifications master toggle`}
      />
    </View>
  );
}

interface CategoryRowProps {
  category: NotifCategory;
  isEnabled: (channel: NotifChannel) => boolean;
  isSaving: boolean;
  onToggle: (channel: NotifChannel, next: boolean) => void;
}

function CategoryRow({
  category,
  isEnabled,
  isSaving,
  onToggle,
}: CategoryRowProps): React.ReactElement {
  return (
    <View
      style={styles.categoryRow}
      accessibilityLabel={`${NOTIF_CATEGORY_LABELS[category]} notification toggles`}
    >
      <Text style={styles.categoryLabel} allowFontScaling={false}>
        {NOTIF_CATEGORY_LABELS[category]}
      </Text>
      <View style={styles.channelToggleRow}>
        {NOTIF_CHANNELS.map((channel) => {
          const enabled = isEnabled(channel);
          return (
            <View
              key={channel}
              style={styles.channelToggle}
              accessibilityLabel={`${NOTIF_CATEGORY_LABELS[category]} via ${NOTIF_CHANNEL_LABELS[channel]}`}
            >
              <Text style={styles.channelToggleLabel} allowFontScaling={false}>
                {NOTIF_CHANNEL_LABELS[channel]}
              </Text>
              <Switch
                value={enabled}
                onValueChange={(next) => onToggle(channel, next)}
                disabled={isSaving}
                trackColor={{ false: colors.border.default, true: colors.gold }}
                thumbColor={colors.text.white}
                style={styles.channelSwitch}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NotifPrefsSkeleton(): React.ReactElement {
  return (
    <View
      style={styles.skeleton}
      accessibilityLabel="Loading notification preferences"
      accessibilityRole="progressbar"
    >
      <SkeletonLoader
        width={'100%'}
        height={120}
        borderRadius={borderRadius.md}
        style={styles.skelSection}
      />
      <SkeletonLoader
        width={'100%'}
        height={300}
        borderRadius={borderRadius.md}
        style={styles.skelSection}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function NotifPrefsPage(): React.ReactElement {
  const router = useRouter();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const {
    prefs,
    isLoading,
    error,
    isEnabled,
    updatePref,
    isSaving,
    refresh,
    resetToDefaults,
  } = useNotifPrefs();

  // Track pending bulk operations so the master toggles can be disabled
  // while a fan-out is in flight.
  const [bulkSaving, setBulkSaving] = useState<NotifChannel | null>(null);

  // Screen-view telemetry on focus.
  useFocusEffect(
    useCallback(() => {
      try {
        logger.info(
          'screen_view',
          { screen: 'Notification Preferences' },
          'B Features',
        );
      } catch {
        /* logger is a soft dependency */
      }
      return () => {
        /* nothing to clean up */
      };
    }, []),
  );

  // Compute master channel state from the matrix.
  const masterState = useMemo(() => {
    const result: Record<NotifChannel, boolean> = {
      push: true,
      email: true,
      sms: false,
      in_app: true,
    };
    for (const channel of NOTIF_CHANNELS) {
      const rows = prefs.filter((p) => p.channel === channel);
      if (rows.length === 0) {
        result[channel] = false;
        continue;
      }
      const onCount = rows.filter((r) => r.enabled).length;
      // A master toggle is "on" if more than half of its rows are on.
      // This matches the iOS / Android system-settings convention.
      result[channel] = onCount > rows.length / 2;
    }
    return result;
  }, [prefs]);

  const onMasterToggle = useCallback(
    async (channel: NotifChannel, next: boolean) => {
      setBulkSaving(channel);
      try {
        for (const category of NOTIF_CATEGORIES) {
          // Skip no-op writes so we don't spam the backend.
          if (isEnabled(category, channel) === next) continue;
          // eslint-disable-next-line no-await-in-loop -- sequential keeps the
          // toast in sync with the final state.
          await updatePref(category, channel, next);
        }
        try {
          showSuccess(
            next
              ? `${NOTIF_CHANNEL_LABELS[channel]} notifications turned on`
              : `${NOTIF_CHANNEL_LABELS[channel]} notifications turned off`,
          );
        } catch {
          /* toast is a soft dependency */
        }
      } finally {
        setBulkSaving(null);
      }
    },
    [isEnabled, showSuccess, updatePref],
  );

  const onRowToggle = useCallback(
    async (category: NotifCategory, channel: NotifChannel, next: boolean) => {
      await updatePref(category, channel, next);
      try {
        showSuccess(
          `${NOTIF_CATEGORY_LABELS[category]} ${NOTIF_CHANNEL_LABELS[channel]} ${next ? 'on' : 'off'}`,
        );
      } catch {
        /* toast is a soft dependency */
      }
    },
    [showSuccess, updatePref],
  );

  const onReset = useCallback(() => {
    resetToDefaults();
    try {
      showSuccess('Preferences reset to defaults');
    } catch {
      /* toast is a soft dependency */
    }
  }, [resetToDefaults, showSuccess]);

  const onRetry = useCallback(() => {
    refresh().catch(() => {
      /* error is captured inside the hook */
    });
  }, [refresh]);

  const isBulk = isSaving || bulkSaving !== null;
  const showErrorState = !isLoading && error && prefs.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/b' as const);
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset to defaults"
          onPress={onReset}
          disabled={isBulk}
          style={({ pressed }) => [
            styles.resetBtn,
            pressed && styles.resetBtnPressed,
            isBulk && styles.disabled,
          ]}
        >
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      {isLoading && prefs.length === 0 ? (
        <NotifPrefsSkeleton />
      ) : showErrorState ? (
        <View style={styles.errorWrap} accessibilityLabel="Couldn't load preferences">
          <Text style={styles.errorTitle}>Couldn't load preferences</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={onRetry}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>
              Channels
            </Text>
            <Text style={styles.sectionHint} allowFontScaling={false}>
              Turn a channel on or off for every category at once.
            </Text>
            {NOTIF_CHANNELS.map((channel) => (
              <MasterChannelRow
                key={channel}
                channel={channel}
                enabled={masterState[channel]}
                isSaving={isBulk}
                onToggle={(next) => {
                  onMasterToggle(channel, next).catch(() => {
                    /* errors handled inside the hook */
                  });
                }}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>
              By category
            </Text>
            <Text style={styles.sectionHint} allowFontScaling={false}>
              Pick exactly which channels deliver each type of update.
            </Text>
            {NOTIF_CATEGORIES.map((category) => (
              <CategoryRow
                key={category}
                category={category}
                isEnabled={(channel) => isEnabled(category, channel)}
                isSaving={isBulk}
                onToggle={(channel, next) => {
                  onRowToggle(category, channel, next).catch(() => {
                    /* errors handled inside the hook */
                  });
                }}
              />
            ))}
          </View>

          {error ? (
            <View style={styles.inlineError}>
              <Text style={styles.inlineErrorText} allowFontScaling={false}>
                {error}
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerHint} allowFontScaling={false}>
              Changes are saved automatically. Use "Reset" to start over.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Gated + error-bounded export
// ---------------------------------------------------------------------------

function NotifPrefsPageGated(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.notifPrefs">
      <NotifPrefsPage />
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.nileBlue,
  },
  resetBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  resetBtnPressed: {
    opacity: 0.7,
  },
  resetText: {
    ...typography.labelSmall,
    color: colors.nileBlue,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  section: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  masterLabel: {
    ...typography.label,
    color: colors.text.primary,
  },
  categoryRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  categoryLabel: {
    ...typography.label,
    color: colors.nileBlue,
    marginBottom: spacing.sm,
  },
  channelToggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  channelToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 120,
    flex: 1,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  channelToggleLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  channelSwitch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  inlineError: {
    backgroundColor: colors.errorScale?.[50] ?? '#FEF2F2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  inlineErrorText: {
    ...typography.caption,
    color: colors.error ?? '#EF4444',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.base,
  },
  footerHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  // Error state
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryBtnPressed: {
    opacity: 0.8,
  },
  retryText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  disabled: {
    opacity: 0.5,
  },
  // Skeleton
  skeleton: {
    flex: 1,
    padding: spacing.base,
  },
  skelSection: {
    marginBottom: spacing.base,
  },
});

export default withErrorBoundary(NotifPrefsPageGated, 'Notification Preferences');

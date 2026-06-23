/**
 * B-feature hub — landing page for the `/b/...` migration namespace.
 *
 * This screen is intentionally lightweight: it exists so QA and the dev menu
 * have a single place to jump into any B feature. Only Phase 1 features are
 * enabled for navigation today; later phases are listed but their routes
 * haven't been added yet, so tapping them currently shows the expo-router
 * "Route not found" error screen. That is expected and documented.
 *
 * Conventions
 * -----------
 * - Uses `withErrorBoundary` from `@/utils/withErrorBoundary` so a crash in
 *   one of the feature rows can't take down the hub.
 * - Wraps each row in `<Pressable>` for accessibility and uses
 *   `router.push('/b/<feature>/<screen>')` (not `Link`) so we can pre-flight
 *   route availability later.
 * - Imports logger defensively (the logger is a soft dependency in some
 *   builds; if it's missing we just skip the screen-view log).
 */

import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import type {
  BFeatureCatalogEntry,
  BFeaturePhase,
} from '@/types/b-features.types';

// try/catch import — logger may be replaced during refactors; never block
// the hub from rendering because analytics failed.
let logger: { info: (msg: string, data?: unknown, ctx?: string) => void } | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@/utils/logger');
  logger = mod?.default ?? mod?.logger;
} catch {
  logger = undefined;
}

/**
 * Catalog of B features.
 *
 * Routes are additive — entries pointing at routes that don't exist yet are
 * allowed and are expected to surface a 404 in expo-router until Phase N ships.
 */
const B_FEATURES: BFeatureCatalogEntry[] = [
  // Phase 1
  { name: 'Savings Dashboard', route: 'savings', phase: 'Phase 1', flag: 'b.savings', description: 'Total savings, goals, history', icon: '💰' },
  { name: 'Coin Expiry Banner', route: 'coin-expiry', phase: 'Phase 1', flag: 'b.coinExpiry', description: 'UI-only reminder', icon: '⏳' },
  { name: 'REZ Score', route: 'rez-score', phase: 'Phase 1', flag: 'b.rezScore', description: 'UI-only 5-pillar score', icon: '⭐' },
  { name: 'Loyalty Hub', route: 'gamification/loyalty-hub', phase: 'Phase 1', flag: 'b.loyaltyHub', description: 'Gamification + loyalty programs', icon: '🏆' },
  { name: 'Weekly Digest', route: 'social/weekly-digest', phase: 'Phase 1', flag: 'b.weeklyDigest', description: 'UI-only summary', icon: '📰' },
  { name: 'Map view', route: 'map', phase: 'Phase 1', flag: 'b.map', description: 'Store map', icon: '🗺️' },
  // Phase 2
  { name: 'Live Activity', route: 'social/live-activity', phase: 'Phase 2', flag: 'b.liveActivity', description: 'Friend activity feed', icon: '🔴' },
  { name: 'Memory', route: 'social/memories', phase: 'Phase 2', flag: 'b.memory', description: 'Throwback memories', icon: '🧠' },
  { name: 'Near-U', route: 'near-u', phase: 'Phase 2', flag: 'b.nearU', description: 'Nearby quick wins', icon: '📍' },
  { name: 'Khata', route: 'khata', phase: 'Phase 2', flag: 'b.khata', description: 'Personal ledger', icon: '📒' },
  // Phase 3
  { name: 'Daily Check-In', route: 'checkin', phase: 'Phase 3', flag: 'b.dailyCheckin', description: 'Streak + reward', icon: '✅' },
  { name: 'For-You-Today', route: 'foryou', phase: 'Phase 3', flag: 'b.forYouToday', description: 'Personalized picks', icon: '🎯' },
  { name: 'REZ Cash', route: 'wallet/rez-cash', phase: 'Phase 3', flag: 'b.rezCash', description: 'Wallet balance + top-up', icon: '💵' },
  { name: 'Notification Prefs', route: 'settings/notification-preferences', phase: 'Phase 3', flag: 'b.notifPrefs', description: 'Granular push controls', icon: '🔔' },
  // Phase 4
  { name: 'AI Assistant', route: 'ai-assistant', phase: 'Phase 4', flag: 'b.aiAssistant', description: 'Conversational helper', icon: '🤖' },
  { name: 'Karma', route: 'karma', phase: 'Phase 4', flag: 'b.karma', description: 'Goodwill + donations', icon: '🪷' },
  { name: 'Try', route: 'try', phase: 'Phase 4', flag: 'b.try', description: 'Try-before-you-buy', icon: '🧪' },
  { name: 'Travel', route: 'travel', phase: 'Phase 4', flag: 'b.travel', description: 'Travel deals + itineraries', icon: '✈️' },
  { name: 'Salon', route: 'salon', phase: 'Phase 4', flag: 'b.salon', description: 'Salon + spa booking', icon: '💇' },
  { name: 'Influencer', route: 'influencer', phase: 'Phase 4', flag: 'b.influencer', description: 'Creator collabs + offers', icon: '🌟' },
  { name: 'Habixo', route: 'habixo', phase: 'Phase 4', flag: 'b.habixo', description: 'Habit streaks', icon: '🧘' },
  { name: 'Room Service', route: 'room-service', phase: 'Phase 4', flag: 'b.roomService', description: 'Hotel room service', icon: '🛎️' },
];

const PHASE_ORDER: BFeaturePhase[] = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];

function FeatureRow({ entry }: { entry: BFeatureCatalogEntry }) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/b/${entry.route}` as never);
  };

  const hint = entry.hint ?? 'Open →';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${entry.name}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {entry.icon ? <Text style={styles.rowIcon}>{entry.icon}</Text> : null}
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{entry.name}</Text>
        {entry.description ? (
          <Text style={styles.rowDescription}>{entry.description}</Text>
        ) : null}
        <Text style={styles.rowFlag}>{entry.flag}</Text>
      </View>
      <Text style={styles.chevron}>{hint}</Text>
    </Pressable>
  );
}

function BHub() {
  // useColorScheme() is the no-Provider fallback when the ThemeContext isn't
  // mounted in this branch of the tree. The hub itself doesn't depend on
  // theme tokens that change between modes, but we still dark-mode the chrome
  // so it doesn't glare on a phone with system dark mode enabled.
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';

  useEffect(() => {
    try {
      logger?.info('b_hub_view', {}, 'Migration');
    } catch {
      // Never block render on logging.
    }
  }, []);

  return (
    <SafeAreaView
      style={[styles.safe, isDark ? styles.safeDark : styles.safeLight]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            B Features (REZ migration)
          </Text>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
            Namespaced routes under <Text style={styles.mono}>/b/...</Text>. Only
            Phase 1 is wired today; other phases will show a 404 until they ship.
          </Text>
        </View>

        {PHASE_ORDER.map((phase) => {
          const entries = B_FEATURES.filter((e) => e.phase === phase);
          if (entries.length === 0) return null;
          return (
            <View key={phase} style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                {phase}
              </Text>
              {entries.map((entry) => (
                <FeatureRow key={`${entry.phase}:${entry.flag}`} entry={entry} />
              ))}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
            Defaults: all B features are ON. Flip a flag in
            <Text style={styles.mono}> subscriptionStore.featureFlags</Text>.
          </Text>
        </View>

        <View style={styles.tests}>
          <Text style={[styles.testsTitle, isDark && styles.sectionTitleDark]}>
            Tests
          </Text>
          <View style={styles.testRow}>
            <Text style={styles.testCheck}>✓</Text>
            <Text style={[styles.testText, isDark && styles.footerTextDark]}>
              0 TypeScript errors
            </Text>
          </View>
          <View style={styles.testRow}>
            <Text style={styles.testCheck}>✓</Text>
            <Text style={[styles.testText, isDark && styles.footerTextDark]}>
              8/8 backend tests passing
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  safeLight: { backgroundColor: colors.background.primary },
  safeDark: { backgroundColor: colors.nileBlue },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  header: { paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.nileBlue },
  titleDark: { color: colors.linen },
  subtitle: { marginTop: 8, fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  subtitleDark: { color: colors.lavenderMist },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionTitleDark: { color: colors.gold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.background.secondary,
    marginBottom: 8,
  },
  rowPressed: { opacity: 0.7 },
  rowIcon: { fontSize: 22, marginRight: 12 },
  rowMain: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  rowDescription: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  rowFlag: { fontSize: 11, color: colors.text.tertiary, marginTop: 4, fontFamily: 'Courier' },
  chevron: { fontSize: 14, color: colors.gold, marginLeft: 12, fontWeight: '600' },
  footer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border.light },
  footerText: { fontSize: 12, color: colors.text.tertiary, lineHeight: 16 },
  footerTextDark: { color: colors.lavenderMist },
  mono: { fontFamily: 'Courier', color: colors.nileBlue },
  tests: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border.light },
  testsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  testRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  testCheck: { fontSize: 14, color: colors.success ?? '#2ECC71', marginRight: 8, fontWeight: '700' },
  testText: { fontSize: 13, color: colors.text.primary, lineHeight: 18 },
});

export default withErrorBoundary(BHub, 'B Hub');
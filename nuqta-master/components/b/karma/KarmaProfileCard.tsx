/**
 * KarmaProfileCard — large card at the top of the Karma screen.
 *
 * Shows:
 *   - The total karma number (big, bold).
 *   - The user's current level (L1-L4) as a coloured pill.
 *   - A trust-score progress bar (0-100).
 *   - The list of badges earned (emoji glyphs from a closed lookup).
 *   - "Joined N days ago" using the `joinedAt` ISO timestamp.
 *
 * The card is pure / stateless: the parent owns the data and passes the
 * `KarmaProfile` in directly. A wrapper page can stick this card in a
 * `<FeatureFlagGate flag="b.karma">` if needed (the spec calls for the
 * gate at the page level, not the card level).
 *
 * Accessibility
 * -------------
 *   - Outer `View` exposes an `accessibilityLabel` summarising total
 *     karma, level, and trust score so screen readers announce the
 *     highlights at once.
 *   - Each badge is its own accessible element with a spoken label.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import type { KarmaLevel, KarmaProfile } from '@/types/karma.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Display metadata for each level. Centralised so the badge colour, label,
 * and emoji live next to each other — easier to keep them in sync.
 */
const LEVEL_META: Record<
  KarmaLevel,
  { label: string; emoji: string; color: string; bg: string }
> = {
  L1: { label: 'Sprout', emoji: '🌱', color: '#3F8F4F', bg: '#E6F4EA' },
  L2: { label: 'Contributor', emoji: '🤝', color: '#1A6FB8', bg: '#E2F0FB' },
  L3: { label: 'Champion', emoji: '🏆', color: '#B0791C', bg: '#FBF1DC' },
  L4: { label: 'Luminary', emoji: '✨', color: '#6B3FA0', bg: '#EFE6F8' },
};

/**
 * Badge glyphs. The backend returns a slug (e.g. "eco_warrior"); the UI
 * maps it to an emoji so the card stays compact. Unknown badges get a
 * neutral fallback so the row never breaks.
 */
const BADGE_GLYPHS: Record<string, string> = {
  first_mission: '🎯',
  streak_7: '🔥',
  eco_warrior: '🌿',
  community_builder: '🏘️',
  health_champion: '💪',
  mentor: '🧑‍🏫',
  early_adopter: '🚀',
  top_10: '⭐',
};

const BADGE_LABELS: Record<string, string> = {
  first_mission: 'First mission',
  streak_7: '7-day streak',
  eco_warrior: 'Eco warrior',
  community_builder: 'Community builder',
  health_champion: 'Health champion',
  mentor: 'Mentor',
  early_adopter: 'Early adopter',
  top_10: 'Top 10',
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysSince(iso: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 0;
  const diff = Date.now() - ms;
  if (diff < 0) return 0;
  return Math.floor(diff / MS_PER_DAY);
}

function badgeGlyph(slug: string): string {
  return BADGE_GLYPHS[slug] ?? '🏅';
}

function badgeLabel(slug: string): string {
  return BADGE_LABELS[slug] ?? slug.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface LevelBadgeProps {
  level: KarmaLevel;
}

function LevelBadge({ level }: LevelBadgeProps): React.ReactElement {
  const meta = LEVEL_META[level];
  return (
    <View
      style={[styles.levelPill, { backgroundColor: meta.bg }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Level ${level}, ${meta.label}`}
    >
      <Text style={styles.levelEmoji}>{meta.emoji}</Text>
      <View>
        <Text style={[styles.levelCode, { color: meta.color }]}>{level}</Text>
        <Text style={[styles.levelLabel, { color: meta.color }]}>
          {meta.label}
        </Text>
      </View>
    </View>
  );
}

interface TrustBarProps {
  score: number;
}

function TrustBar({ score }: TrustBarProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <View
      style={styles.trustWrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Trust score ${clamped} out of 100`}
    >
      <View style={styles.trustRow}>
        <Text style={styles.trustLabel}>Trust score</Text>
        <Text style={styles.trustValue}>{clamped}/100</Text>
      </View>
      <View style={styles.trustTrack}>
        <View
          style={[
            styles.trustFill,
            { width: `${clamped}%` },
          ]}
        />
      </View>
    </View>
  );
}

interface BadgeChipProps {
  slug: string;
}

function BadgeChip({ slug }: BadgeChipProps): React.ReactElement {
  return (
    <View
      style={styles.badgeChip}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Badge ${badgeLabel(slug)}`}
    >
      <Text style={styles.badgeGlyph}>{badgeGlyph(slug)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface KarmaProfileCardProps {
  profile: KarmaProfile;
}

/**
 * Large profile card — total karma, level, trust score, badges, joined
 * timestamp. Pure / stateless: parent owns the data.
 */
function KarmaProfileCardBase({ profile }: KarmaProfileCardProps): React.ReactElement {
  const joinedDaysAgo = useMemo(() => daysSince(profile.joinedAt), [profile.joinedAt]);
  const totalLabel = useMemo(() => {
    return profile.totalKarma.toLocaleString();
  }, [profile.totalKarma]);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Karma profile. Total karma ${totalLabel}. Level ${profile.currentLevel}. Trust score ${profile.trustScore} out of 100.`}
    >
      <View style={styles.headerRow}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalKarma}>{totalLabel}</Text>
          <Text style={styles.totalLabel}>total karma</Text>
        </View>
        <LevelBadge level={profile.currentLevel} />
      </View>

      <View style={styles.trustSection}>
        <TrustBar score={profile.trustScore} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.joinedLabel}>
          Joined {joinedDaysAgo} {joinedDaysAgo === 1 ? 'day' : 'days'} ago
        </Text>
      </View>

      {profile.badgesEarned.length > 0 ? (
        <View
          style={styles.badgesSection}
          accessibilityLabel={`${profile.badgesEarned.length} badges earned`}
        >
          <Text style={styles.badgesHeading}>Badges earned</Text>
          <View style={styles.badgesRow}>
            {profile.badgesEarned.map((slug) => (
              <BadgeChip key={slug} slug={slug} />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.badgesSection}>
          <Text style={styles.noBadges}>
            No badges yet — complete a mission to earn your first.
          </Text>
        </View>
      )}
    </View>
  );
}

const KarmaProfileCard = React.memo(KarmaProfileCardBase);
export default KarmaProfileCard;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  totalWrap: {
    flex: 1,
  },
  totalKarma: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.nileBlue,
    lineHeight: 40,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  levelEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  levelCode: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  trustSection: {
    marginBottom: spacing.base,
  },
  trustWrap: {
    width: '100%',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  trustLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  trustValue: {
    ...typography.caption,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  trustTrack: {
    height: 8,
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  trustFill: {
    height: '100%',
    backgroundColor: colors.gold,
  },
  metaRow: {
    marginBottom: spacing.base,
  },
  joinedLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  badgesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.base,
  },
  badgesHeading: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeChip: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  badgeGlyph: {
    fontSize: 18,
  },
  noBadges: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
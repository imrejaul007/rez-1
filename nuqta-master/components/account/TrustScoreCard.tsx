// TrustScoreCard — Compact reusable card showing trust score + tier
// Used in profile sections, account overview, etc.

import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrustScoreCardProps {
  score: number;        // 0-100
  tier: string;         // 'entry' | 'signature' | 'elite'
  pointsToNext: number;
  onPress?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<string, string> = {
  entry: '#C9A962',
  signature: '#E5C878',
  elite: '#FFD700',
};

const TIER_LABELS: Record<string, string> = {
  entry: 'Entry',
  signature: 'Signature',
  elite: 'Elite',
};

const RING_SIZE = 60;
const RING_BORDER = 5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrustScoreCard({ score, tier, pointsToNext, onPress }: TrustScoreCardProps) {
  const router = useRouter();
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.entry;
  const tierLabel = TIER_LABELS[tier] || tier;
  const progress = score / 100;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/account/trust-passport' as any);
    }
  };

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Trust score ${score} out of 100, ${tierLabel} tier. ${pointsToNext} points to next tier. Tap to view details.`}
    >
      {/* Left: Score Ring */}
      <View style={styles.ringContainer}>
        {/* Track */}
        <View
          style={[
            styles.ringTrack,
            {
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              borderWidth: RING_BORDER,
              borderColor: colors.neutral[200],
            },
          ]}
        />
        {/* Filled arc */}
        <View
          style={[
            styles.ringFill,
            {
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              borderWidth: RING_BORDER,
              borderColor: 'transparent',
              borderTopColor: progress > 0 ? tierColor : 'transparent',
              borderRightColor: progress > 0.25 ? tierColor : 'transparent',
              borderBottomColor: progress > 0.5 ? tierColor : 'transparent',
              borderLeftColor: progress > 0.75 ? tierColor : 'transparent',
              transform: [{ rotate: '-45deg' }],
            },
          ]}
        />
        {/* Score text */}
        <View style={styles.ringCenter}>
          <ThemedText style={styles.ringScore}>{score}</ThemedText>
        </View>
      </View>

      {/* Right: Info */}
      <View style={styles.infoContainer}>
        <View style={styles.topRow}>
          <View style={[styles.tierBadge, { backgroundColor: tierColor + '20' }]}>
            <Ionicons name="ribbon" size={12} color={tierColor} />
            <ThemedText style={[styles.tierText, { color: tierColor }]}>{tierLabel}</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
        </View>
        <ThemedText style={styles.scoreText}>
          Trust Score: <ThemedText style={styles.scoreBold}>{score}</ThemedText>
        </ThemedText>
        {pointsToNext > 0 && (
          <ThemedText style={styles.nextTierText}>
            {pointsToNext} pts to next tier
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(26,58,82,0.06)' },
    }),
  },

  // Ring
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTrack: {
    position: 'absolute',
  },
  ringFill: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringScore: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },

  // Info
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  scoreBold: {
    fontWeight: '800',
  },
  nextTierText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral[500],
  },
});

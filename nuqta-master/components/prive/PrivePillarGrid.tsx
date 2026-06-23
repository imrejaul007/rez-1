/**
 * PrivePillarGrid - 6-pillar reputation display
 * Shows score, trend, weight, and progress for each pillar
 */

import { colors } from '@/constants/theme';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS, PILLAR_CONFIG, PillarId, resolvePillarId } from './priveTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PillarData {
  id: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
}

interface PrivePillarGridProps {
  pillars: PillarData[];
  totalScore: number;
  tier: 'none' | 'entry' | 'signature' | 'elite';
  accessState: 'active' | 'building' | 'paused' | 'none';
}

export const PrivePillarGrid: React.FC<PrivePillarGridProps> = ({
  pillars,
  totalScore,
  tier,
  accessState,
}) => {
  const router = useRouter();

  const getTrendInfo = (trend: string) => {
    switch (trend) {
      case 'up':
        return { icon: '↑', color: colors.brand.emerald };
      case 'down':
        return { icon: '↓', color: '#F44336' };
      default:
        return { icon: '→', color: '#9E9E9E' };
    }
  };

  const getAccessStateColor = () => {
    switch (accessState) {
      case 'active':
        return colors.brand.emerald;
      case 'paused':
        return '#FFC107';
      case 'none':
        return '#9E9E9E';
      default:
        return '#FF9800';
    }
  };

  const getTierLabel = () => {
    switch (tier) {
      case 'elite':
        return 'Elite';
      case 'signature':
        return 'Signature';
      case 'entry':
        return 'Entry';
      case 'none':
        return 'Not Eligible';
      default:
        return 'Building';
    }
  };

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionLabel}>THE 6 PILLARS</Text>
          <View style={[styles.accessStatusBadge, { backgroundColor: `${getAccessStateColor()}20` }]}>
            <View style={[styles.accessStatusDot, { backgroundColor: getAccessStateColor() }]} />
            <Text style={[styles.accessStatusText, { color: getAccessStateColor() }]}>
              {accessState.charAt(0).toUpperCase() + accessState.slice(1)}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/prive/pillars' as any)}>
          <Text style={styles.viewDetails}>View Details →</Text>
        </Pressable>
      </View>

      {/* Privé Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCategoryInfo}>
          <Text style={styles.scoreLabel}>Privé Score</Text>
          <Text style={styles.scoreValue}>{totalScore.toFixed(1)}</Text>
        </View>
        <View style={styles.scoreInfo}>
          <View style={styles.tierBadge}>
            <Text style={styles.tierIcon}>◈</Text>
            <Text style={styles.tierText}>{getTierLabel()}</Text>
          </View>
          <Text style={styles.tierProgress}>
            {tier === 'elite' ? '85+ achieved' : `${(85 - totalScore).toFixed(1)} to Elite`}
          </Text>
        </View>
      </View>

      {/* 6 Pillar Grid - 2x3 */}
      <View style={styles.pillarGrid}>
        {pillars.map((pillarData) => {
          const resolvedId = resolvePillarId(pillarData.id) || (pillarData.id as PillarId);
          const config = PILLAR_CONFIG[resolvedId] || PILLAR_CONFIG.engagement;
          const trend = getTrendInfo(pillarData.trend);
          const weightPercent = (config.weight * 100).toFixed(0);

          return (
            <View key={pillarData.id} style={styles.pillarCard}>
              <View style={styles.pillarCardHeader}>
                <View style={[styles.pillarIconBg, { backgroundColor: `${config.color}20` }]}>
                  <Text style={styles.pillarIcon}>{config.icon}</Text>
                </View>
                <View style={styles.pillarScoreContainer}>
                  <Text style={styles.pillarScore}>{pillarData.score}</Text>
                  <Text style={[styles.pillarTrendIcon, { color: trend.color }]}>
                    {trend.icon}
                  </Text>
                </View>
              </View>
              <Text style={styles.pillarName}>{config.shortName}</Text>
              <View style={styles.pillarWeightRow}>
                <Text style={styles.pillarWeight}>{weightPercent}% weight</Text>
              </View>
              <View style={styles.pillarProgressContainer}>
                <View style={styles.pillarProgressTrack}>
                  <View
                    style={[
                      styles.pillarProgressFill,
                      { width: `${pillarData.score}%`, backgroundColor: config.color },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Trust Warning */}
      <View style={styles.trustWarningCard}>
        <Text style={styles.trustWarningText}>
          <Text style={styles.trustWarningNote}>Note: </Text>
          Trust below 60 = Privé blocked regardless of total score
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: PRIVE_SPACING.xxl,
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.md,
  },
  sectionLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1.5,
  },
  accessStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.xs,
    borderRadius: 20,
  },
  accessStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accessStatusText: {
    fontSize: 12,
  },
  viewDetails: {
    fontSize: 12,
    color: PRIVE_COLORS.gold.primary,
  },
  scoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.md,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.transparent.gold20,
  },
  scoreCategoryInfo: {
    gap: PRIVE_SPACING.xs,
  },
  scoreLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '300',
    color: PRIVE_COLORS.gold.primary,
  },
  scoreInfo: {
    alignItems: 'flex-end',
    gap: PRIVE_SPACING.xs,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.xs,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.sm,
  },
  tierIcon: {
    fontSize: 12,
    color: PRIVE_COLORS.gold.primary,
  },
  tierText: {
    fontSize: 12,
    color: PRIVE_COLORS.gold.primary,
  },
  tierProgress: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  pillarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PRIVE_SPACING.sm,
  },
  pillarCard: {
    width: (SCREEN_WIDTH - PRIVE_SPACING.xl * 2 - PRIVE_SPACING.sm * 2) / 3,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.md,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  pillarCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.xs,
  },
  pillarIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarIcon: {
    fontSize: 14,
  },
  pillarScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pillarScore: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  pillarTrendIcon: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  pillarName: {
    fontSize: 11,
    color: PRIVE_COLORS.text.secondary,
    marginBottom: PRIVE_SPACING.sm,
  },
  pillarWeightRow: {
    marginBottom: PRIVE_SPACING.sm,
  },
  pillarWeight: {
    fontSize: 10,
    color: PRIVE_COLORS.text.tertiary,
  },
  pillarProgressContainer: {
    marginTop: 'auto',
  },
  pillarProgressTrack: {
    height: 4,
    backgroundColor: PRIVE_COLORS.border.primary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  pillarProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  trustWarningCard: {
    marginTop: PRIVE_SPACING.md,
    padding: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    alignItems: 'center',
  },
  trustWarningText: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },
  trustWarningNote: {
    color: '#F44336',
  },
});

export default React.memo(PrivePillarGrid);

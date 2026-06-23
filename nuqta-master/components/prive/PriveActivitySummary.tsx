/**
 * PriveActivitySummary - Active/Completed campaigns stats
 * Shows campaign metrics and history button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';

interface PriveActivitySummaryProps {
  activeCampaigns: number;
  completedCampaigns: number;
  avgRating: number | null;
}

export const PriveActivitySummary: React.FC<PriveActivitySummaryProps> = ({
  activeCampaigns = 0,
  completedCampaigns = 0,
  avgRating = null,
}) => {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>YOUR ACTIVITY</Text>

      <View style={styles.activityCard}>
        <View style={styles.activityRow}>
          <View style={styles.activityItem}>
            <Text style={styles.activityNumber}>{activeCampaigns}</Text>
            <Text style={styles.activityLabel}>Active</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityNumber}>{completedCampaigns}</Text>
            <Text style={styles.activityLabel}>Completed</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityNumber}>{avgRating != null ? avgRating.toFixed(1) : 'N/A'}</Text>
            <Text style={styles.activityLabel}>Avg Rating</Text>
          </View>
        </View>

        <Pressable
          style={styles.viewActivityBtn}
          onPress={() => router.push('/prive/activity-history' as any)}
        >
          <Text style={styles.viewActivityText}>View Full History</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: PRIVE_SPACING.xxl,
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  sectionLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1.5,
    marginBottom: PRIVE_SPACING.lg,
  },
  activityCard: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  activityItem: {
    alignItems: 'center',
    gap: PRIVE_SPACING.xs,
  },
  activityNumber: {
    fontSize: 28,
    fontWeight: '300',
    color: PRIVE_COLORS.gold.primary,
  },
  activityLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  activityDivider: {
    width: 1,
    height: 40,
    backgroundColor: PRIVE_COLORS.transparent.white08,
  },
  viewActivityBtn: {
    alignItems: 'center',
    marginTop: PRIVE_SPACING.lg,
    paddingTop: PRIVE_SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.transparent.white08,
  },
  viewActivityText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
});

export default React.memo(PriveActivitySummary);

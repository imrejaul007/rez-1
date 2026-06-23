/**
 * CashbackTrackingSection Component
 *
 * Explains how cashback is tracked and credited
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const TRACKING_STAGES = [
  {
    id: 1,
    icon: 'cart-outline',
    title: 'Purchase Made',
    description: 'You complete a purchase through Cash Store',
    time: 'Instant',
    status: 'active',
  },
  {
    id: 2,
    icon: 'sync',
    title: 'Tracking Started',
    description: 'The brand reports your purchase to us',
    time: '24-48 hours',
    status: 'pending',
  },
  {
    id: 3,
    icon: 'hourglass-outline',
    title: 'Pending Cashback',
    description: 'Cashback appears as pending while the brand confirms',
    time: '7-30 days',
    status: 'pending',
  },
  {
    id: 4,
    icon: 'checkmark-circle',
    title: 'Confirmed',
    description: 'Brand confirms the purchase is valid',
    time: 'Varies by brand',
    status: 'confirmed',
  },
  {
    id: 5,
    icon: 'wallet',
    title: 'Credited',
    description: 'Cashback is added to your ReZ wallet',
    time: 'Instant after confirmation',
    status: 'completed',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return colors.infoScale[400];
    case 'pending':
      return colors.warningScale[400];
    case 'confirmed':
      return colors.successScale[400];
    case 'completed':
      return colors.brand.green;
    default:
      return colors.neutral[500];
  }
};

const TrackingStage: React.FC<{
  stage: typeof TRACKING_STAGES[0];
  isLast: boolean;
}> = ({ stage, isLast }) => {
  const color = getStatusColor(stage.status);

  return (
    <View style={styles.stageContainer}>
      {/* Timeline */}
      <View style={styles.timeline}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <Ionicons name={stage.icon as any} size={16} color={colors.background.primary} />
        </View>
        {!isLast && <View style={[styles.line, { backgroundColor: `${color}30` }]} />}
      </View>

      {/* Content */}
      <View style={styles.stageContent}>
        <View style={styles.stageHeader}>
          <Text style={styles.stageTitle}>{stage.title}</Text>
          <View style={[styles.timeBadge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.timeText, { color }]}>{stage.time}</Text>
          </View>
        </View>
        <Text style={styles.stageDescription}>{stage.description}</Text>
      </View>
    </View>
  );
};

const CashbackTrackingSection: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="analytics" size={24} color={colors.infoScale[400]} />
        </View>
        <Text style={styles.headerTitle}>Cashback Tracking</Text>
        <Text style={styles.headerSubtitle}>
          Understand how your cashback is processed
        </Text>
      </View>

      {/* Tracking Timeline */}
      <View style={styles.timelineContainer}>
        {TRACKING_STAGES.map((stage, index) => (
          <TrackingStage
            key={stage.id}
            stage={stage}
            isLast={index === TRACKING_STAGES.length - 1}
          />
        ))}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <View style={styles.infoIconContainer}>
          <Ionicons name="information-circle" size={20} color={colors.infoScale[400]} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Important Note</Text>
          <Text style={styles.infoText}>
            Tracking times may vary by brand. Some brands take longer to confirm purchases.
            You can always check your cashback status in the Activity section.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: colors.background.primary,
    marginTop: 8,
  },
  header: {
    marginBottom: 24,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tint.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  timelineContainer: {
    marginBottom: 20,
  },
  stageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeline: {
    alignItems: 'center',
    marginRight: 16,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    width: 2,
    height: 40,
    marginVertical: 4,
    borderRadius: 1,
  },
  stageContent: {
    flex: 1,
    paddingBottom: 28,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  timeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  stageDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.tint.blue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.infoScale[200],
  },
  infoIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.infoScale[400],
    lineHeight: 20,
  },
});

export default memo(CashbackTrackingSection);

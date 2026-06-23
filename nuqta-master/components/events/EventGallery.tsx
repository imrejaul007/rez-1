// @ts-nocheck
/**
 * EventGallery — Event description, reward info, and detail rows.
 *
 * Renders the body content that sits between the price card
 * and the time-slot / reviews sections on the event page.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventItem } from '@/types/homepage.types';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface RewardInfo {
  rewards: Array<{ action: string; coins: number; description: string }>;
  totalPotential: number;
}

interface EventGalleryProps {
  eventDetails: EventItem;
  rewardInfo: RewardInfo | null;
  HORIZONTAL_PADDING: number;
}

/** Maps a reward action keyword to an Ionicon name. */
const getRewardIcon = (action: string): string => {
  if (action.includes('checkin')) return 'location-outline';
  if (action.includes('booking') || action.includes('entry')) return 'ticket-outline';
  if (action.includes('sharing')) return 'share-social-outline';
  if (action.includes('review') || action.includes('rating')) return 'star-outline';
  return 'gift-outline';
};

const EventGallery = React.memo(function EventGallery({
  eventDetails,
  rewardInfo,
  HORIZONTAL_PADDING,
}: EventGalleryProps) {
  return (
    <>
      {/* Description */}
      <View style={[styles.section, { marginHorizontal: HORIZONTAL_PADDING }]}>
        <Text style={styles.sectionTitle}>About Event</Text>
        <Text style={styles.description}>{eventDetails.description}</Text>
      </View>

      {/* Earn Coins Card */}
      {rewardInfo && rewardInfo.rewards.length > 0 && (
        <View style={[styles.section, { marginHorizontal: HORIZONTAL_PADDING }]}>
          <Text style={styles.sectionTitle}>Earn Coins</Text>
          <View style={styles.rewardCard}>
            <View style={styles.rewardCardHeader}>
              <View style={styles.rewardIconCircle}>
                <Ionicons name="gift-outline" size={20} color={Colors.text.inverse} />
              </View>
              <View style={styles.rewardHeaderText}>
                <Text style={styles.rewardTitle}>
                  Earn up to {rewardInfo.totalPotential} coins
                </Text>
                <Text style={styles.rewardSubtitle}>
                  Complete actions to earn rewards
                </Text>
              </View>
            </View>
            {rewardInfo.rewards.map((reward, index) => (
              <View
                key={index}
                style={[styles.rewardRow, index > 0 && styles.rewardRowBorder]}
              >
                <Ionicons
                  name={getRewardIcon(reward.action) as any}
                  size={18}
                  color={Colors.brand.purpleLight}
                />
                <Text style={styles.rewardDescription}>
                  {reward.description || reward.action.replace(/_/g, ' ')}
                </Text>
                <View style={styles.rewardCoinBadge}>
                  <Text style={styles.rewardCoinText}>+{reward.coins}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Event Details List */}
      <View style={[styles.section, { marginHorizontal: HORIZONTAL_PADDING }]}>
        <Text style={styles.sectionTitle}>Event Details</Text>
        <View style={styles.detailsList}>
          <DetailItem icon="person-outline" label="Organizer" value={eventDetails.organizer} />
          <DetailItem
            icon="calendar-outline"
            label="Date & Time"
            value={`${eventDetails.date} at ${eventDetails.time}`}
          />
          <DetailItem
            icon={eventDetails.isOnline ? 'globe-outline' : 'location-outline'}
            label="Location"
            value={eventDetails.location}
          />
          <DetailItem icon="pricetag-outline" label="Category" value={eventDetails.category} />
        </View>
      </View>
    </>
  );
});

/** Single detail row (icon + label + value). */
function DetailItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon as any} size={20} color={colors.neutral[500]} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing['2xl'],
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.bodyLarge,
    color: colors.neutral[700],
    lineHeight: 24,
    fontWeight: '400',
  },

  // Rewards
  rewardCard: {
    backgroundColor: colors.tint.purpleLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#E0D4FC',
  },
  rewardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  rewardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardHeaderText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  rewardTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  rewardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rewardRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E0D4FC',
  },
  rewardDescription: {
    flex: 1,
    marginLeft: 10,
    ...Typography.body,
    color: colors.neutral[700],
  },
  rewardCoinBadge: {
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rewardCoinText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },

  // Details
  detailsList: {
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.base,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  detailValue: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    fontWeight: '600',
  },
});

export default EventGallery;

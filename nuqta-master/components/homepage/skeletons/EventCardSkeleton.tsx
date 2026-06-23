import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonCard from '@/components/common/SkeletonCard';
import { colors } from '@/constants/theme';

interface EventCardSkeletonProps {
  width?: number;
}

/**
 * Event Card Skeleton Loader
 *
 * Matches the layout of EventCard component:
 * - Event image (160px height) with gradient overlay
 * - Event title (2 lines)
 * - Event subtitle (1 line)
 * - Location information
 * - Date and time
 * - Category badge
 */
function EventCardSkeleton({ width = 280 }: EventCardSkeletonProps) {
  return (
    <View
      style={[styles.container, { width }]}
      accessibilityLabel="Loading event"
      accessibilityRole="none"
    >
      <View style={styles.card}>
        {/* Event Image Skeleton */}
        <View style={styles.imageContainer}>
          <SkeletonCard
            width="100%"
            height={160}
            borderRadius={0}
            variant="rectangle"
            style={styles.image}
          />

          {/* Online Badge Skeleton (positioned absolutely) */}
          <View style={styles.onlineBadgePosition}>
            <SkeletonCard
              width={60}
              height={24}
              borderRadius={12}
            />
          </View>

          {/* Price Badge Skeleton (positioned absolutely) */}
          <View style={styles.priceBadgePosition}>
            <SkeletonCard
              width={50}
              height={28}
              borderRadius={14}
            />
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.content}>
          {/* Event Title - Line 1 */}
          <SkeletonCard
            width="90%"
            height={20}
            borderRadius={4}
            style={styles.titleFirst}
          />

          {/* Event Title - Line 2 */}
          <SkeletonCard
            width="75%"
            height={20}
            borderRadius={4}
            style={styles.titleSecond}
          />

          {/* Event Subtitle */}
          <SkeletonCard
            width="60%"
            height={16}
            borderRadius={4}
            style={styles.subtitle}
          />

          {/* Meta Info Container */}
          <View style={styles.metaInfo}>
            {/* Location */}
            <View style={styles.locationContainer}>
              <SkeletonCard
                width={14}
                height={14}
                variant="circle"
                style={styles.icon}
              />
              <SkeletonCard
                width={120}
                height={14}
                borderRadius={4}
              />
            </View>

            {/* Date and Time */}
            <View style={styles.dateContainer}>
              <SkeletonCard
                width={14}
                height={14}
                variant="circle"
                style={styles.icon}
              />
              <SkeletonCard
                width={70}
                height={14}
                borderRadius={4}
                style={styles.date}
              />
              <SkeletonCard
                width={14}
                height={14}
                variant="circle"
                style={styles.icon}
              />
              <SkeletonCard
                width={60}
                height={14}
                borderRadius={4}
              />
            </View>
          </View>

          {/* Category Badge */}
          <SkeletonCard
            width={80}
            height={28}
            borderRadius={12}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexShrink: 0,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    backgroundColor: colors.neutral[100],
  },
  image: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  onlineBadgePosition: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  priceBadgePosition: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  content: {
    padding: 20,
  },
  titleFirst: {
    marginBottom: 4,
  },
  titleSecond: {
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 16,
  },
  metaInfo: {
    gap: 8,
    marginBottom: 16,
    minHeight: 60,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    marginRight: 4,
  },
  date: {
    marginRight: 8,
  },
});

export default React.memo(EventCardSkeleton);

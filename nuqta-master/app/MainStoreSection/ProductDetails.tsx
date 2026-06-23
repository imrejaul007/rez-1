import React, { memo, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Platform, LayoutAnimation, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { triggerImpact } from '@/utils/haptics';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Gradients,
} from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface OperatingHours {
  open: string;
  close: string;
  closed?: boolean;
}

interface ProductDetailsProps {
  title?: string;
  description?: string;
  price?: string;
  location?: string;
  distance?: string;
  isOpen?: boolean;
  onOpenMap?: () => void;
  // New Magicpin-inspired props
  isVerified?: boolean;
  operatingHours?: {
    [key: string]: OperatingHours;
  };
  onGetDirections?: () => void;
}

// Get today's hours display text
const getTodayHoursText = (operatingHours?: { [key: string]: OperatingHours }, isOpen?: boolean): string | null => {
  if (!operatingHours) return null;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[now.getDay()];
  const todayHours = operatingHours[todayKey];

  if (!todayHours) return null;

  if (todayHours.closed) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (now.getDay() + i) % 7;
      const nextDayKey = days[nextDayIndex];
      const nextDayHours = operatingHours[nextDayKey];
      if (nextDayHours && !nextDayHours.closed) {
        const dayName = nextDayIndex === (now.getDay() + 1) % 7 ? 'tomorrow' : days[nextDayIndex];
        return `Opens ${dayName} at ${nextDayHours.open}`;
      }
    }
    return 'Closed today';
  }

  if (isOpen) {
    return `Open until ${todayHours.close}`;
  } else {
    // Store is closed but not marked as closed for the day
    return `Opens at ${todayHours.open}`;
  }
};

export default memo(function ProductDetails({
  title,
  description,
  location,
  distance,
  isOpen,
  onOpenMap,
  isVerified,
  operatingHours,
  onGetDirections,
}: ProductDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { width } = Dimensions.get('window');
  const isSmall = width < 360;

  // Toggle description expansion
  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerImpact('Light');
    setIsExpanded(prev => !prev);
  }, []);

  // Get today's hours text
  const hoursText = getTodayHoursText(operatingHours, isOpen);

  // Show error state if required data is missing
  if (!title || !description) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.nileBlue} />
        <ThemedText style={styles.errorText}>
          Product information unavailable
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, isSmall && styles.containerCompact]}
      accessibilityRole="summary"
      accessibilityLabel={`Product details. ${title}. ${distance} away in ${location}. ${isOpen ? 'Open now' : 'Currently closed'}`}
    >
      {/* Title Row with Verified Badge */}
      <View style={styles.rowTop}>
        <View style={styles.titleContainer}>
          <ThemedText
            style={[styles.title, isSmall && styles.titleSmall]}
            numberOfLines={2}
            accessibilityRole="header"
          >
            {title}
          </ThemedText>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary[600]} />
            </View>
          )}
        </View>
      </View>

      {/* Description with See More/Less */}
      <View style={styles.descriptionContainer}>
        <ThemedText
          style={[styles.description, isSmall && styles.descriptionSmall]}
          numberOfLines={isExpanded ? undefined : 3}
        >
          {description}
        </ThemedText>
        {description.length > 120 && (
          <Pressable
            onPress={toggleExpanded}
           
            style={styles.seeMoreButton}
          >
            <ThemedText style={styles.seeMoreText}>
              {isExpanded ? 'See less' : 'See more'}
            </ThemedText>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.primary[700]}
            />
          </Pressable>
        )}
      </View>

      {/* Operating Hours Quick View */}
      {hoursText && (
        <View style={styles.hoursRow}>
          <Ionicons name="time-outline" size={14} color={Colors.gray[500]} />
          <ThemedText style={styles.hoursText}>{hoursText}</ThemedText>
        </View>
      )}

      {/* Location and Status Row */}
      <View style={styles.rowBottom}>
        {(distance || location) && (
          <Pressable
           
            onPress={onOpenMap}
            style={styles.locationPill}
            accessibilityRole="button"
            accessibilityLabel={`Location: ${distance || ''} ${distance && location ? 'away at' : ''} ${location || ''}`}
            accessibilityHint="Double tap to open map"
          >
            <Ionicons name="location-outline" size={16} color={Colors.primary[700]} style={{ flexShrink: 0 }} />
            <ThemedText
              style={styles.locationText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {distance && location ? `${distance} • ${location}` : distance || location || 'Location not available'}
            </ThemedText>
          </Pressable>
        )}

        {isOpen !== undefined && (
          <View
            style={[styles.openBadge, { backgroundColor: isOpen ? Colors.primary[50] : '#FEF3F2' }]}
            accessibilityLabel={isOpen ? 'Store is open' : 'Store is closed'}
            accessibilityRole="text"
          >
            <View style={[styles.openDot, { backgroundColor: isOpen ? Colors.primary[600] : colors.error }]} />
            <ThemedText style={[styles.openText, { color: isOpen ? Colors.primary[700] : colors.error }]}>
              {isOpen ? 'Open' : 'Closed'}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Get Directions Button */}
      {onGetDirections && (
        <Pressable
          style={styles.directionsButton}
          onPress={() => {
            triggerImpact('Medium');
            onGetDirections();
          }}
         
        >
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.directionsGradient}
          >
            <Ionicons name="navigate" size={16} color={colors.background.primary} />
            <ThemedText style={styles.directionsText}>Get Directions</ThemedText>
          </LinearGradient>
        </Pressable>
      )}
    </View>
);
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    // subtle bottom divider look (keeps visual separation when stacked)
    borderBottomWidth: 0,
    overflow: 'hidden', // Prevent content from overflowing
  },
  containerCompact: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
    backgroundColor: colors.errorScale[50],
    borderWidth: 1,
    borderColor: colors.errorScale[100],
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 28,
  },
  titleSmall: {
    fontSize: 20,
    lineHeight: 26,
  },
  verifiedBadge: {
    marginLeft: Spacing.xs,
  },
  priceWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 82,
  },
  price: {
    color: Colors.primary[700],
    fontSize: 16,
    fontWeight: '800',
  },
  descriptionContainer: {
    marginTop: Spacing.sm,
  },
  description: {
    color: Colors.gray[600],
    fontSize: 14,
    lineHeight: 20,
  },
  descriptionSmall: {
    fontSize: 13,
    lineHeight: 18,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  seeMoreText: {
    ...Typography.labelSmall,
    color: Colors.primary[700],
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  hoursText: {
    ...Typography.bodySmall,
    color: Colors.gray[600],
  },
  rowBottom: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 8, android: 6 }),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.indigoMist,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    flex: 1,
    minWidth: 0, // Allow shrinking below content size
    maxWidth: '100%', // Prevent overflow
  },
  locationText: {
    marginLeft: 8,
    color: colors.neutral[700],
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1, // Allow text to shrink
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    flexShrink: 0,
    gap: Spacing.xs,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openText: {
    fontSize: 12,
    fontWeight: '700',
  },
  directionsButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  directionsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  directionsText: {
    ...Typography.button,
    color: colors.background.primary,
    fontWeight: '700',
  },
});

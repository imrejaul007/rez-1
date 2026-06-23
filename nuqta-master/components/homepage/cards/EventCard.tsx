import React, { useMemo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { EventCardProps } from '@/types/homepage.types';
import { useThemeColor } from '@/hooks/useThemeColor';
import FastImage from '@/components/common/FastImage';
import { colors } from '@/constants/theme';

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: EventCardProps, nextProps: EventCardProps) => {
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.width === nextProps.width &&
    prevProps.event.title === nextProps.event.title &&
    prevProps.event.date === nextProps.event.date &&
    prevProps.event.price.amount === nextProps.event.price.amount &&
    prevProps.event.isOnline === nextProps.event.isOnline
  );
};

function EventCard({
  event,
  onPress,
  width = 280
}: EventCardProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: colors.background.primary, dark: colors.neutral[800] }, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({ light: colors.neutral[500], dark: colors.neutral[400] }, 'text');
  const borderColor = useThemeColor({ light: colors.neutral[200], dark: colors.neutral[700] }, 'border');

  // Memoize date formatting
  const formattedDate = useMemo(() => {
    const date = new Date(event.date);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }, [event.date]);

  // Memoize price formatting
  const formattedPrice = useMemo(() => {
    if (event.price.isFree) {
      return 'Free';
    }
    return `${event.price.currency}${event.price.amount}`;
  }, [event.price.isFree, event.price.currency, event.price.amount]);

  // Memoize accessibility label
  const eventLabel = useMemo(() => {
    return `${event.title}. ${event.subtitle}. ${formattedDate}${event.time ? ` at ${event.time}` : ''}. ${event.isOnline ? 'Online event' : event.location}. Price: ${formattedPrice}. Category: ${event.category}`;
  }, [event.title, event.subtitle, formattedDate, event.time, event.isOnline, event.location, formattedPrice, event.category]);

  // Memoize the onPress callback
  const handlePress = useCallback(() => {
    onPress(event);
  }, [onPress, event]);

  // Memoize price badge background color
  const priceBadgeColor = useMemo(() => {
    return event.price.isFree ? colors.brand.goldWarm : colors.lightMustard; // Sun Gold for free, Nuqta Gold for paid
  }, [event.price.isFree]);

  // Memoize price badge text color
  const priceBadgeTextColor = useMemo(() => {
    return event.price.isFree ? colors.nileBlue : colors.background.primary; // Nuqta Navy for free, White for paid
  }, [event.price.isFree]);

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
     
      accessibilityLabel={eventLabel}
      accessibilityRole="button"
      accessibilityHint="Double tap to view event details and register"
    >
      <ThemedView style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
        {/* Event Image */}
        <View
          style={styles.imageContainer}
          accessibilityLabel={`Event image for ${event.title}`}
          accessibilityRole="image"
        >
          <FastImage
            source={event.image}
            style={styles.image}
            resizeMode="cover"
            showLoader={true}
          />
          {/* Image Overlay Gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          />
          {event.isOnline && (
            <View
              style={styles.onlineBadge}
              accessibilityLabel="Online event"
              accessibilityRole="text"
            >
              <ThemedText style={styles.onlineBadgeText}>Online</ThemedText>
            </View>
          )}
          {/* Price Badge on Image */}
          <View
            style={[styles.priceBadge, { backgroundColor: priceBadgeColor }]}
            accessibilityLabel={`Event price: ${formattedPrice}`}
            accessibilityRole="text"
          >
            <ThemedText style={[styles.priceBadgeText, { color: priceBadgeTextColor }]}>{formattedPrice}</ThemedText>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.content}>
          <ThemedText style={[styles.title, { color: colors.nileBlue }]} numberOfLines={2}>
            {event.title}
          </ThemedText>

          <ThemedText style={[styles.subtitle, { color: textSecondary }]} numberOfLines={1}>
            {event.subtitle}
          </ThemedText>

          <View style={styles.metaInfo}>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color={colors.lightMustard} style={styles.icon} />
              <ThemedText style={[styles.location, { color: textSecondary }]}>
                {event.isOnline ? 'Online Event' : event.location}
              </ThemedText>
            </View>

            <View style={styles.dateContainer}>
              <Ionicons name="calendar" size={16} color={colors.lightMustard} style={styles.icon} />
              <ThemedText style={[styles.date, { color: colors.nileBlue }]}>
                {formattedDate}
              </ThemedText>
              {event.time && (
                <>
                  <Ionicons name="time" size={16} color={colors.lightMustard} style={styles.icon} />
                  <ThemedText style={[styles.time, { color: textSecondary }]}>
                    {event.time}
                  </ThemedText>
                </>
              )}
            </View>
          </View>

          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: colors.nileBlue, borderColor: colors.nileBlue }]}>
            <ThemedText style={[styles.categoryText, { color: colors.background.primary }]}>
              {event.category}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default React.memo(EventCard, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexShrink: 0,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: colors.nileBlue,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    backgroundColor: colors.neutral[100],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  onlineBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.nileBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  onlineBadgeText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: colors.nileBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  priceBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 24,
    letterSpacing: -0.3,
    height: 48, // Fixed height for 2 lines (24px line-height x 2)
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
    height: 20, // Fixed height for 1 line
  },
  metaInfo: {
    gap: 8,
    marginBottom: 16,
    minHeight: 60, // Fixed height for location + date/time
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  location: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
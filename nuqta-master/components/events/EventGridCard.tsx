/**
 * EventGridCard Component
 * Compact event card for 2-column grid layout
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { EventItem } from '@/types/homepage.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 48) / 2; // 16px padding on each side + 16px gap
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 0.75; // 4:3 aspect ratio

interface EventGridCardProps {
  event: EventItem;
  onPress: (event: EventItem) => void;
}

const EventGridCard: React.FC<EventGridCardProps> = ({ event, onPress }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const handlePress = useCallback(() => {
    onPress(event);
  }, [event, onPress]);

  // Format date
  const formattedDate = useMemo(() => {
    try {
      const date = new Date(event.date);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return event.date;
    }
  }, [event.date]);

  // Format price - for online events, use regional currency
  const priceDisplay = useMemo(() => {
    if (event.price?.isFree) {
      return 'Free';
    }
    const isOnline = (event as any).isOnline || (event.location as any)?.isOnline;
    const displayCurrency = isOnline ? currencySymbol : (event.price?.currency || currencySymbol);
    return `${displayCurrency}${event.price?.amount || 0}`;
  }, [event.price, event.location, currencySymbol]);

  const isFree = event.price?.isFree;

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
     
      accessibilityLabel={`${event.title}, ${formattedDate}, ${priceDisplay}`}
      accessibilityRole="button"
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <CachedImage
          source={event.image}
          style={styles.image}
          contentFit="cover"
        />

        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <ThemedText style={styles.categoryText}>
            {event.category}
          </ThemedText>
        </View>

        {/* Online/Venue Badge */}
        <View
          style={[
            styles.typeBadge,
            event.isOnline ? styles.onlineBadge : styles.venueBadge,
          ]}
        >
          <Ionicons
            name={event.isOnline ? 'globe-outline' : 'location-outline'}
            size={10}
            color={colors.background.primary}
          />
          <ThemedText style={styles.typeBadgeText}>
            {event.isOnline ? 'Online' : 'Venue'}
          </ThemedText>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <ThemedText style={styles.title} numberOfLines={2}>
          {event.title}
        </ThemedText>

        {/* Date & Time */}
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.neutral[500]} />
          <ThemedText style={styles.dateText}>
            {formattedDate}
            {event.time && ` • ${event.time}`}
          </ThemedText>
        </View>

        {/* Rating Row — only show when rating exists and > 0 */}
        {(event.rating ?? 0) > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={colors.brand.goldWarm} />
            <ThemedText style={styles.ratingText}>
              {(event.rating ?? 0).toFixed(1)}
            </ThemedText>
            {(event.reviewCount ?? 0) > 0 && (
              <ThemedText style={styles.reviewCount}>
                ({event.reviewCount})
              </ThemedText>
            )}
          </View>
        )}

        {/* Price & Cashback */}
        <View style={styles.priceRow}>
          {isFree ? (
            <View style={styles.freeBadge}>
              <ThemedText style={styles.freeText}>Free</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.priceText}>{priceDisplay}</ThemedText>
          )}
          {(event.cashback ?? 0) > 0 && (
            <View style={styles.cashbackBadge}>
              <ThemedText style={styles.cashbackText}>
                {event.cashback}% Cashback
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    position: 'relative',
    backgroundColor: colors.neutral[100],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.background.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  onlineBadge: {
    backgroundColor: colors.lightMustard,
  },
  venueBadge: {
    backgroundColor: 'rgba(26, 58, 82, 0.7)',
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.background.primary,
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
    lineHeight: 18,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.amberDark,
  },
  reviewCount: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  freeBadge: {
    backgroundColor: colors.greenMist,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  cashbackBadge: {
    backgroundColor: colors.successScale[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cashbackText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.brand.greenDark,
  },
});

export default memo(EventGridCard);

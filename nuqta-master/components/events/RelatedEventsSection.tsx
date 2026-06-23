/**
 * Related Events Section Component
 * Displays related/similar events in a horizontal scrollable list
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { EventItem } from '@/types/homepage.types';
import eventAnalytics from '@/services/eventAnalytics';
import { colors } from '@/constants/theme';

interface RelatedEventsSectionProps {
  events: EventItem[];
  isLoading?: boolean;
  onEventPress?: (event: EventItem) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75; // 75% of screen width
const CARD_MARGIN = 12;

function RelatedEventsSection({
  events,
  isLoading = false,
  onEventPress,
}: RelatedEventsSectionProps) {
  const router = useRouter();

  const handleEventPress = (event: EventItem) => {
    // Track analytics
    eventAnalytics.trackEventView(event.id, 'related_events', { sourceEventId: '' });
    
    if (onEventPress) {
      onEventPress(event);
    } else {
      // Navigate to event page
      router.push({
        pathname: '/EventPage' as any,
        params: {
          id: event.id,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>You Might Also Like</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purpleLight} />
          <Text style={styles.loadingText}>Loading related events...</Text>
        </View>
      </View>
    );
  }

  if (!events || events.length === 0) {
    return null; // Don't show section if no related events
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>You Might Also Like</Text>
        <Pressable
          style={styles.viewAllButton}
          onPress={() => {
            // Navigate to events list filtered by category
            if (events.length > 0 && events[0].category) {
              router.push({
                pathname: '/events' as any,
                params: {
                  category: events[0].category,
                },
              });
            }
          }}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.brand.purpleLight} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        snapToAlignment="start"
      >
        {events.map((event) => (
          <Pressable
            key={event.id}
            style={styles.eventCard}
            onPress={() => handleEventPress(event)}
           
          >
            <CachedImage
              source={event.image}
              style={styles.eventImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.eventGradient}
            >
              <View style={styles.eventContent}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{event.category}</Text>
                </View>
                
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                
                <Text style={styles.eventSubtitle} numberOfLines={1}>
                  by {event.organizer}
                </Text>

                <View style={styles.eventMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.background.primary} />
                    <Text style={styles.metaText}>{event.date}</Text>
                  </View>
                  
                  {event.location && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={colors.background.primary} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {event.location}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.priceContainer}>
                  {event.price.isFree ? (
                    <Text style={styles.freeText}>Free</Text>
                  ) : (
                    <Text style={styles.priceText}>
                      {event.price.currency}
                      {event.price.amount}
                    </Text>
                  )}
                  
                  {event.isOnline && (
                    <View style={styles.onlineBadge}>
                      <Ionicons name="videocam" size={12} color={colors.background.primary} />
                      <Text style={styles.onlineText}>Online</Text>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral[800],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingRight: 20,
  },
  eventCard: {
    width: CARD_WIDTH,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: CARD_MARGIN,
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  eventGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  eventContent: {
    gap: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background.primary,
    lineHeight: 24,
  },
  eventSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background.primary,
  },
  freeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.successScale[400],
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
});

export default React.memo(RelatedEventsSection);

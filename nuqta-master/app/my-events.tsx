// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * My Events Page
 * Shows user's event bookings (upcoming/past) and favorited events
 * Connected to /api/events/my-events and /api/events/my-favorites
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useIsAuthenticated } from '@/stores/selectors';
import eventsApiService from '@/services/eventsApi';
import { alertOk } from '@/utils/alert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const C = Colors;
const { width: SCREEN_WIDTH } = Dimensions.get('window');


type TabType = 'upcoming' | 'past' | 'favorites';

interface EventBooking {
  _id: string;
  eventId: any;
  status: string;
  bookingReference: string;
  amount: number;
  currency: string;
  createdAt: string;
  rewardsEarned?: Array<{ action: string; coins: number }>;
}

interface FavoriteEvent {
  _id: string;
  title: string;
  image: string;
  date: string;
  category: string;
  price?: { amount: number; currency: string; isFree: boolean };
  location?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  pending: { color: Colors.warning, bg: colors.tint.amber, icon: 'time-outline' },
  confirmed: { color: Colors.success, bg: colors.tint.greenLight, icon: 'checkmark-circle-outline' },
  completed: { color: Colors.info, bg: colors.tint.blue, icon: 'checkmark-done-outline' },
  cancelled: { color: Colors.error, bg: colors.errorScale[50], icon: 'close-circle-outline' },
};

function MyEventsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState<EventBooking[]>([]);
  const [pastBookings, setPastBookings] = useState<EventBooking[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEvent[]>([]);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const fetchData = useCallback(async (tab: TabType) => {
    if (!isAuthenticated) return;

    try {
      const result = await eventsApiService.getMyEvents(tab === 'favorites' ? 'favorites' : tab === 'past' ? 'past' : 'upcoming');

      if (tab === 'upcoming') {
        if (!isMounted()) return;
        setUpcomingBookings(result?.bookings || []);
      } else if (tab === 'past') {
        if (!isMounted()) return;
        setPastBookings(result?.bookings || []);
      } else {
        // Backend returns { events: [...], tab: 'favorites' } for favorites tab
        if (!isMounted()) return;
        setFavorites(result?.events || result?.favorites || result?.bookings || []);
      }
    } catch (error) {
      alertOk('Error', 'Failed to load events. Pull down to refresh.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData(activeTab);
    }, [activeTab, fetchData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(activeTab);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setIsLoading(true);
    fetchData(tab);
  };

  const handleEventPress = (eventId: string) => {
    router.push({ pathname: '/EventPage', params: { id: eventId } } as any);
  };

  const handleCheckIn = async (booking: EventBooking) => {
    const eventId = typeof booking.eventId === 'object' ? booking.eventId?._id : booking.eventId;
    if (!eventId) return;

    setCheckingIn(booking._id);
    try {
      const result = await eventsApiService.checkInToEvent(eventId, booking._id, 'manual');
      if (result?.success) {
        const coins = result.data?.reward?.coinsAwarded || 0;
        alertOk(
          'Checked In!',
          coins > 0
            ? `You've checked in successfully and earned +${coins} coins!`
            : `You've checked in successfully!`
        );
        fetchData(activeTab);
      } else {
        alertOk('Check-in Failed', result?.message || 'Unable to check in at this time.');
      }
    } catch (error: any) {
      alertOk('Check-in Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setCheckingIn(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.authRequired}>
          <Ionicons name="lock-closed-outline" size={64} color={C.textSecondary} />
          <Text style={styles.authTitle}>Login Required</Text>
          <Text style={styles.authSubtitle}>Please login to view your events</Text>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/sign-in' as any)}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
    { id: 'past', label: 'Past', icon: 'time-outline' },
    { id: 'favorites', label: 'Favorites', icon: 'heart-outline' },
  ];

  const currentData = activeTab === 'upcoming' ? upcomingBookings
    : activeTab === 'past' ? pastBookings
    : favorites;

  const renderEventItem = useCallback(({ item }: { item: EventBooking | FavoriteEvent }) =>
    activeTab === 'favorites'
      ? renderFavoriteCard(item as FavoriteEvent)
      : renderBookingCard(item as EventBooking)
  , [activeTab]);

  const renderBookingCard = (booking: EventBooking) => {
    const event = booking.eventId;
    const eventTitle = typeof event === 'object' ? event?.title : 'Event';
    const eventImage = typeof event === 'object' ? event?.image : null;
    const eventId = typeof event === 'object' ? event?._id : event;
    const eventDate = typeof event === 'object' ? event?.date : null;
    const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
    const totalRewards = booking.rewardsEarned?.reduce((sum, r) => sum + r.coins, 0) || 0;
    const canCheckIn = activeTab === 'upcoming' && booking.status === 'confirmed';
    const isCheckingInThis = checkingIn === booking._id;

    return (
      <Pressable
        key={booking._id}
        style={styles.bookingCard}
        onPress={() => eventId && handleEventPress(eventId)}
       
      >
        {eventImage && (
          <CachedImage source={eventImage} style={styles.bookingImage} />
        )}
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingTitle} numberOfLines={2}>{eventTitle}</Text>
          <Text style={styles.bookingRef}>Ref: {booking.bookingReference}</Text>
          {eventDate && (
            <Text style={styles.bookingDate}>
              {new Date(eventDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          )}
          <View style={styles.bookingMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Text>
            </View>
            {totalRewards > 0 && (
              <View style={styles.rewardBadge}>
                <Ionicons name="gift-outline" size={12} color={C.purple} />
                <Text style={styles.rewardText}>+{totalRewards} coins</Text>
              </View>
            )}
          </View>
          {canCheckIn && (
            <Pressable
              style={styles.checkInButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCheckIn(booking);
              }}
              disabled={isCheckingInThis}
             
            >
              {isCheckingInThis ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <>
                  <Ionicons name="qr-code-outline" size={14} color={Colors.text.inverse} />
                  <Text style={styles.checkInButtonText}>Check In</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
      </Pressable>
    );
  };

  const renderFavoriteCard = (fav: FavoriteEvent) => {
    return (
      <Pressable
        key={fav._id}
        style={styles.bookingCard}
        onPress={() => handleEventPress(fav._id)}
       
      >
        {fav.image && (
          <CachedImage source={fav.image} style={styles.bookingImage} />
        )}
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingTitle} numberOfLines={2}>{fav.title}</Text>
          <Text style={styles.bookingRef}>
            {fav.category} {'\u2022'} {fav.date ? new Date(fav.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
          </Text>
          <Text style={styles.favoritePrice}>
            {fav.price?.isFree ? 'Free' : `${fav.price?.currency || ''}${fav.price?.amount || 0}`}
          </Text>
        </View>
        <Ionicons name="heart" size={20} color={Colors.error} />
      </Pressable>
    );
  };

  const renderEmptyState = () => {
    const config = {
      upcoming: { icon: 'calendar-outline', title: 'No Upcoming Events', subtitle: 'Browse events and book your next experience' },
      past: { icon: 'time-outline', title: 'No Past Events', subtitle: 'Your attended events will appear here' },
      favorites: { icon: 'heart-outline', title: 'No Favorites Yet', subtitle: 'Tap the heart icon on events to save them' },
    };
    const { icon, title, subtitle } = config[activeTab];

    return (
      <View style={styles.emptyState}>
        <Ionicons name={icon as any} size={64} color={C.textSecondary} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
        <Pressable
          style={styles.exploreButton}
          onPress={() => router.push('/events' as any)}
        >
          <Ionicons name="compass-outline" size={18} color={Colors.text.inverse} />
          <Text style={styles.exploreButtonText}>Explore Events</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>My Events</Text>
            <Text style={styles.headerSubtitle}>Bookings & favorites</Text>
          </View>
          <Pressable onPress={() => router.push('/events' as any)} style={styles.backButton}>
            <Ionicons name="add" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => handleTabChange(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? C.purple : C.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          data={currentData}
          renderItem={renderEventItem}
          keyExtractor={(item: any) => item._id || item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={C.purple}
              colors={[C.purple]}
            />
          }
          ListEmptyComponent={renderEmptyState()}
          estimatedItemSize={120}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.text.inverse,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.tint.purpleLight,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '500',
    color: C.textSecondary,
  },
  tabTextActive: {
    color: C.purple,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text.inverse,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  bookingImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bookingTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  bookingRef: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    marginBottom: 6,
  },
  bookingMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.purpleLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  rewardText: {
    ...Typography.caption,
    fontWeight: '600',
    color: C.purple,
  },
  bookingDate: {
    ...Typography.bodySmall,
    color: C.gold,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  checkInButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  favoritePrice: {
    ...Typography.body,
    fontWeight: '700',
    color: C.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: C.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.purple,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  exploreButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  authRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  authTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  authSubtitle: {
    ...Typography.body,
    color: C.textSecondary,
    marginBottom: Spacing.xl,
  },
  loginButton: {
    backgroundColor: C.purple,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius['2xl'],
  },
  loginButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(MyEventsPage, 'MyEvents');

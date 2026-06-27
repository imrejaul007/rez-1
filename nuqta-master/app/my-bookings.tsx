// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// My Bookings Page
// Shows user's service bookings with travel-specific enhancements

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import serviceBookingApi, { ServiceBooking } from '@/services/serviceBookingApi';
import CashbackStatusBadge from '@/components/travel/CashbackStatusBadge';
import { useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const TRAVEL_SLUGS = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];
const EDUCATION_KEYWORDS = ['class', 'course', 'tutorial', 'workshop', 'enrollment', 'lesson', 'training'];

const CATEGORY_ICONS: Record<string, string> = {
  flights: 'airplane',
  hotels: 'bed',
  trains: 'train',
  bus: 'bus',
  cab: 'car',
  packages: 'briefcase',
};

const isTravelBooking = (booking: ServiceBooking): boolean => {
  const slug = booking.serviceCategory?.slug || '';
  return TRAVEL_SLUGS.includes(slug) || !!booking.travelDetails;
};

const MyBookingsPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'courses'>('upcoming');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (!isAuthenticated) {
        setErrorMessage('Please login to view your bookings');
        setLoading(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const response = await serviceBookingApi.getUserBookings({
        page: 1,
        limit: 50,
      });

      if (response.success && response.data) {
        let filteredBookings = response.data;

        if (activeTab === 'courses') {
          // ED-02: Filter education-related bookings
          filteredBookings = filteredBookings.filter(booking => {
            const sType = (booking as any).serviceType?.toLowerCase() || '';
            const catSlug = booking.serviceCategory?.slug?.toLowerCase() || '';
            return EDUCATION_KEYWORDS.some(kw => sType.includes(kw) || catSlug.includes(kw));
          });
          filteredBookings.sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime());
        } else if (activeTab === 'upcoming') {
          filteredBookings = filteredBookings.filter(booking => {
            const bookingDate = new Date(booking.bookingDate);
            if (!isMounted()) return;
            bookingDate.setHours(0, 0, 0, 0);
            const isFuture = bookingDate >= today;
            const isActive = booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'no_show';
            return isFuture && isActive;
          });
          filteredBookings.sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime());
        } else {
          filteredBookings = filteredBookings.filter(booking => {
            const bookingDate = new Date(booking.bookingDate);
            if (!isMounted()) return;
            bookingDate.setHours(0, 0, 0, 0);
            const isPast = bookingDate < today;
            const isCompleted = booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'no_show';
            return isPast || isCompleted;
          });
          filteredBookings.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
        }

        if (!isMounted()) return;
        setBookings(filteredBookings);
      } else {
        if (!isMounted()) return;
        setBookings([]);
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setBookings([]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [isAuthenticated, activeTab]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings, activeTab]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = useCallback(async (bookingId: string) => {
    platformAlertDestructive(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      'Yes, Cancel',
      async () => {
        try {
          const response = await serviceBookingApi.cancelBooking(bookingId);
          if (response.success) {
            platformAlertSimple('Success', 'Booking cancelled successfully');
            fetchBookings();
          } else {
            platformAlertSimple('Error', response.error || 'Failed to cancel booking');
          }
        } catch (error) {
          platformAlertSimple('Error', 'Failed to cancel booking');
        }
      }
    );
  }, [fetchBookings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return Colors.nileBlue;
      case 'pending': return Colors.warning;
      case 'completed': return Colors.info;
      case 'cancelled':
      case 'no_show': return Colors.error;
      case 'assigned':
      case 'in_progress': return Colors.brand.purple;
      default: return Colors.text.tertiary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'no_show': return 'No Show';
      case 'assigned': return 'Assigned';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderTravelBooking = useCallback(({ item }: { item: ServiceBooking }) => {
    const canCancel = item.status === 'confirmed' || item.status === 'pending';
    const bookingDate = new Date(item.bookingDate);
    const isUpcoming = bookingDate > new Date();
    const route = item.travelDetails?.route;
    const categorySlug = item.serviceCategory?.slug || '';
    const categoryIcon = CATEGORY_ICONS[categorySlug] || 'airplane';
    const cashbackAmount = item.pricing?.cashbackEarned || 0;

    return (
      <Pressable
        style={styles.bookingCard}
        onPress={() => router.push(`/booking-detail?bookingId=${item._id}` as any)}
       
      >
        {/* Header with category icon */}
        <View style={styles.cardHeader}>
          <View style={styles.travelHeaderLeft}>
            <View style={[styles.categoryIcon, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name={categoryIcon as any} size={20} color={Colors.nileBlue} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {item.service?.name || item.serviceCategory?.name || 'Travel'}
              </Text>
              {route ? (
                <View style={styles.routeBadge}>
                  <Text style={styles.routeText}>
                    {route.fromCode || route.from} → {route.toCode || route.to}
                  </Text>
                </View>
              ) : (
                <Text style={styles.storeName} numberOfLines={1}>
                  {item.store?.name || ''}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.detailText}>{formatDate(item.bookingDate)}</Text>
          </View>
          {item.travelDetails?.class && (
            <View style={styles.detailRow}>
              <Ionicons name="star-outline" size={16} color={Colors.text.tertiary} />
              <Text style={styles.detailText}>{item.travelDetails.class}</Text>
            </View>
          )}
          {item.travelDetails?.passengers && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color={Colors.text.tertiary} />
              <Text style={styles.detailText}>
                {item.travelDetails.passengers.adults} Adult{item.travelDetails.passengers.adults !== 1 ? 's' : ''}
                {(item.travelDetails.passengers.children || 0) > 0 ? `, ${item.travelDetails.passengers.children} Child` : ''}
              </Text>
            </View>
          )}
          {item.pnr && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={Colors.text.tertiary} />
              <Text style={styles.detailText}>PNR: {item.pnr}</Text>
            </View>
          )}
        </View>

        {/* Footer: price + cashback + cancel */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>
                {currencySymbol}{(item.pricing?.total || item.pricing?.basePrice || 0).toLocaleString()}
              </Text>
            </View>
            {cashbackAmount > 0 && item.cashbackStatus && (
              <CashbackStatusBadge
                status={item.cashbackStatus}
                amount={cashbackAmount}
                verificationDays={item.verificationDays}
                creditedAt={item.cashbackCreditedAt}
                currencySymbol={currencySymbol}
                compact
              />
            )}
          </View>
          {canCancel && isUpcoming && (
            <Pressable
              style={styles.cancelButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelBooking(item._id);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>

        {/* Booking Number */}
        {item.bookingNumber && (
          <View style={styles.bookingNumberContainer}>
            <Text style={styles.bookingNumberLabel}>Booking #</Text>
            <Text style={styles.bookingNumber}>{item.bookingNumber}</Text>
          </View>
        )}
      </Pressable>
    );
  }, [router, currencySymbol, handleCancelBooking]);

  const renderStandardBooking = useCallback(({ item }: { item: ServiceBooking }) => {
    const canCancel = item.status === 'confirmed' || item.status === 'pending';
    const bookingDate = new Date(item.bookingDate);
    const isUpcoming = bookingDate > new Date();

    return (
      <Pressable
        style={styles.bookingCard}
        onPress={() => router.push(`/booking-detail?bookingId=${item._id}` as any)}
       
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {item.service?.name || 'Service'}
            </Text>
            <Text style={styles.storeName} numberOfLines={1}>
              {item.store?.name || 'Store'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.detailText}>{formatDate(item.bookingDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.detailText}>
              {formatTime(item.timeSlot?.start)} - {formatTime(item.timeSlot?.end)}
            </Text>
          </View>
          {item.duration > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="hourglass-outline" size={16} color={Colors.text.tertiary} />
              <Text style={styles.detailText}>{item.duration} minutes</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceValue}>
              {currencySymbol}{(item.pricing?.total || item.pricing?.basePrice || 0).toLocaleString()}
            </Text>
          </View>
          {canCancel && isUpcoming && (
            <Pressable
              style={styles.cancelButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelBooking(item._id);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>

        {/* Booking Number */}
        {item.bookingNumber && (
          <View style={styles.bookingNumberContainer}>
            <Text style={styles.bookingNumberLabel}>Booking #</Text>
            <Text style={styles.bookingNumber}>{item.bookingNumber}</Text>
          </View>
        )}
      </Pressable>
    );
  }, [router, currencySymbol, handleCancelBooking]);

  const renderBooking = useCallback(({ item }: { item: ServiceBooking }) => {
    if (isTravelBooking(item)) {
      return renderTravelBooking({ item });
    }
    return renderStandardBooking({ item });
  }, [renderTravelBooking, renderStandardBooking]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={80} color={Colors.border.default} />
      <Text style={styles.emptyTitle}>
        {activeTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'upcoming'
          ? 'Book a service to see your upcoming appointments here'
          : 'Your completed bookings will appear here'}
      </Text>
      {activeTab === 'upcoming' && (
        <Pressable
          style={styles.browseButton}
          onPress={() => router.push('/(tabs)/categories' as any)}
        >
          <Ionicons name="search" size={20} color={Colors.text.inverse} />
          <Text style={styles.browseButtonText}>Browse Services</Text>
        </Pressable>
      )}
    </View>
  );

  if (loading && !refreshing && bookings.length === 0) {
    return <CardGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
      <LinearGradient colors={[Colors.nileBlue, '#0f2a3d']} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              Upcoming
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'past' && styles.activeTab]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
              Past
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'courses' && styles.activeTab]}
            onPress={() => setActiveTab('courses')}
          >
            <Text style={[styles.tabText, activeTab === 'courses' && styles.activeTabText]}>
              Courses
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={Colors.error} />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {/* Bookings List */}
      <FlashList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.nileBlue}
            colors={[Colors.nileBlue]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={120}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: Colors.background.primary,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTabText: {
    color: Colors.nileBlue,
  },
  listContainer: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  bookingCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  travelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
    gap: 10,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  serviceName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  storeName: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.infoScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  routeText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  bookingDetails: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  priceValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  cancelButton: {
    backgroundColor: Colors.errorScale[50],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
  },
  bookingNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    gap: 6,
  },
  bookingNumberLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  bookingNumber: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  browseButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorScale[50],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.sm,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    ...Typography.body,
    color: Colors.error,
  },
});

export default withErrorBoundary(MyBookingsPage, 'MyBookings');

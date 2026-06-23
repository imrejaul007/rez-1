import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Travel Booking Confirmation Page
// Shows booking success, travel details, cashback status, and next actions

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Share
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming} from 'react-native-reanimated';
import { DetailPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import serviceBookingApi from '@/services/serviceBookingApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { useIsMounted } from '@/hooks/useIsMounted';

function TravelBookingConfirmationPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookingId = params.bookingId as string;
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation values
  const successAnim = useSharedValue(0);
  const contentAnim = useSharedValue(0);
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successAnim.value }],
    opacity: successAnim.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentAnim.value,
  }));
  const isMounted = useIsMounted();

  useEffect(() => {
    if (bookingId) {
      loadBookingDetails();
    } else {
      setError('Booking ID not provided');
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (booking) {
      setShowConfetti(true);
      successAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
      contentAnim.value = withTiming(1, { duration: 300 });
    }
  }, [booking]);

  const loadBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await serviceBookingApi.getBookingById(bookingId);
      if (response.success && response.data) {
        setBooking(response.data);
        // Haptic feedback on booking confirmation
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        setError(response.error || 'Failed to load booking details');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load booking');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!booking) return;
    try {
      const route = booking.travelDetails?.route;
      const routeText = route ? `${route.from} → ${route.to}` : '';
      await Share.share({
        message: `Travel Booking Confirmed! ${routeText}\nBooking #${booking.bookingNumber}\nDate: ${new Date(booking.bookingDate).toLocaleDateString()}\n\nBooked via ReZ App`,
        title: 'Travel Booking Confirmation' });
    } catch (error) {
      // silently handle
    }
  };

  const getCashbackStatusInfo = () => {
    const status = booking?.cashbackStatus || 'pending';
    const days = booking?.verificationDays || 7;
    switch (status) {
      case 'held':
        return { label: `Verifying (${days}d)`, color: Colors.warning, icon: 'time-outline' as const };
      case 'credited':
        return { label: 'Credited', color: Colors.success, icon: 'checkmark-circle' as const };
      case 'clawed_back':
        return { label: 'Reversed', color: Colors.error, icon: 'close-circle' as const };
      default:
        return { label: 'Pending', color: Colors.text.tertiary, icon: 'hourglass-outline' as const };
    }
  };

  const getCategoryIcon = (): string => {
    const slug = booking?.serviceCategory?.slug || '';
    switch (slug) {
      case 'flights': return 'airplane';
      case 'hotels': return 'bed';
      case 'trains': return 'train';
      case 'bus': return 'bus';
      case 'cab': return 'car';
      case 'packages': return 'briefcase';
      default: return 'airplane';
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <DetailPageSkeleton />
      </ThemedView>
    );
  }

  if (error || !booking) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <ThemedText style={styles.errorText}>{error || 'Booking not found'}</ThemedText>
        <Pressable
          style={styles.retryButton}
          onPress={() => router.replace('/my-bookings' as any)}
        >
          <ThemedText style={styles.retryButtonText}>Go to My Bookings</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const route = booking.travelDetails?.route;
  const passengers = booking.travelDetails?.passengers;
  const cashbackInfo = getCashbackStatusInfo();
  const cashbackAmount = booking.pricing?.cashbackEarned || 0;

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Success Header */}
        <LinearGradient colors={[Colors.nileBlue, '#0f2a3d']} style={styles.header}>
          <Animated.View style={[styles.successIconContainer, successStyle]}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={48} color={Colors.text.inverse} />
            </View>
          </Animated.View>
          <ThemedText style={styles.successTitle}>Booking Confirmed!</ThemedText>
          <ThemedText style={styles.successSubtitle}>
            Your {booking.serviceCategory?.name || 'travel'} booking has been confirmed
          </ThemedText>
        </LinearGradient>

        <Animated.View style={[styles.content, contentStyle]}>

          {/* Booking Number Card */}
          <View style={styles.card}>
            <View style={styles.bookingNumberRow}>
              <View>
                <ThemedText style={styles.cardLabel}>Booking Number</ThemedText>
                <ThemedText style={styles.bookingNumber}>{booking.bookingNumber}</ThemedText>
              </View>
              <View style={styles.categoryBadge}>
                <Ionicons name={getCategoryIcon() as any} size={20} color={Colors.nileBlue} />
              </View>
            </View>
            {booking.pnr && (
              <View style={styles.pnrRow}>
                <ThemedText style={styles.cardLabel}>PNR</ThemedText>
                <ThemedText style={styles.pnrValue}>{booking.pnr}</ThemedText>
              </View>
            )}
          </View>

          {/* Route Info (if available) */}
          {route && (route.from || route.to) && (
            <View style={styles.card}>
              <ThemedText style={styles.cardTitle}>Route</ThemedText>
              <View style={styles.routeContainer}>
                <View style={styles.routePoint}>
                  <View style={styles.routeDot} />
                  <ThemedText style={styles.routeCity}>{route.from}</ThemedText>
                  {route.fromCode && (
                    <ThemedText style={styles.routeCode}>{route.fromCode}</ThemedText>
                  )}
                </View>
                <View style={styles.routeLine}>
                  <Ionicons name="airplane" size={18} color={Colors.nileBlue} />
                </View>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
                  <ThemedText style={styles.routeCity}>{route.to}</ThemedText>
                  {route.toCode && (
                    <ThemedText style={styles.routeCode}>{route.toCode}</ThemedText>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Travel Details */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Travel Details</ThemedText>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={18} color={Colors.text.tertiary} />
                <ThemedText style={styles.detailLabel}>Date</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date(booking.bookingDate).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </ThemedText>
              </View>
              {booking.travelDetails?.class && (
                <View style={styles.detailItem}>
                  <Ionicons name="star-outline" size={18} color={Colors.text.tertiary} />
                  <ThemedText style={styles.detailLabel}>Class</ThemedText>
                  <ThemedText style={styles.detailValue}>{booking.travelDetails.class}</ThemedText>
                </View>
              )}
              {passengers && (
                <View style={styles.detailItem}>
                  <Ionicons name="people-outline" size={18} color={Colors.text.tertiary} />
                  <ThemedText style={styles.detailLabel}>Passengers</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {passengers.adults} Adult{passengers.adults !== 1 ? 's' : ''}
                    {passengers.children > 0 ? `, ${passengers.children} Child${passengers.children !== 1 ? 'ren' : ''}` : ''}
                  </ThemedText>
                </View>
              )}
              {booking.travelDetails?.tripType && (
                <View style={styles.detailItem}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={Colors.text.tertiary} />
                  <ThemedText style={styles.detailLabel}>Trip Type</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {booking.travelDetails.tripType === 'round-trip' ? 'Round Trip' : 'One Way'}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Price Breakdown</ThemedText>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Base Price</ThemedText>
              <ThemedText style={styles.priceValue}>{currencySymbol}{booking.pricing.basePrice?.toLocaleString()}</ThemedText>
            </View>
            {booking.pricing.taxes > 0 && (
              <View style={styles.priceRow}>
                <ThemedText style={styles.priceLabel}>Taxes & Fees</ThemedText>
                <ThemedText style={styles.priceValue}>{currencySymbol}{booking.pricing.taxes?.toLocaleString()}</ThemedText>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>Total Paid</ThemedText>
              <ThemedText style={styles.totalValue}>{currencySymbol}{booking.pricing.total?.toLocaleString()}</ThemedText>
            </View>
          </View>

          {/* Cashback Status */}
          {cashbackAmount > 0 && (
            <View style={[styles.card, styles.cashbackCard]}>
              <View style={styles.cashbackHeader}>
                <View style={styles.cashbackLeft}>
                  <Ionicons name="gift" size={24} color={Colors.success} />
                  <View>
                    <ThemedText style={styles.cashbackTitle}>Cashback Earned</ThemedText>
                    <ThemedText style={styles.cashbackAmount}>{currencySymbol}{cashbackAmount.toLocaleString()}</ThemedText>
                  </View>
                </View>
                <View style={[styles.cashbackBadge, { backgroundColor: `${cashbackInfo.color}15` }]}>
                  <Ionicons name={cashbackInfo.icon} size={14} color={cashbackInfo.color} />
                  <ThemedText style={[styles.cashbackStatus, { color: cashbackInfo.color }]}>
                    {cashbackInfo.label}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.cashbackNote}>
                Cashback will be credited to your wallet after {booking.verificationDays || 7} days of travel completion
              </ThemedText>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace('/my-bookings' as any)}
            >
              <LinearGradient colors={[Colors.nileBlue, '#0f2a3d']} style={styles.primaryButtonGradient}>
                <Ionicons name="list" size={20} color={Colors.text.inverse} />
                <ThemedText style={styles.primaryButtonText}>View My Bookings</ThemedText>
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={Colors.nileBlue} />
              <ThemedText style={styles.secondaryButtonText}>Share Booking</ThemedText>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.replace('/travel' as any)}
            >
              <Ionicons name="airplane-outline" size={20} color={Colors.nileBlue} />
              <ThemedText style={styles.secondaryButtonText}>Browse More Travel</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      <ConfettiOverlay visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { marginTop: Spacing.md, ...Typography.bodyLarge, color: Colors.error, textAlign: 'center' },
  retryButton: { marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.nileBlue, borderRadius: BorderRadius.md },
  retryButtonText: { color: Colors.text.inverse, ...Typography.bodyLarge, fontWeight: '600' },
  scrollContent: { paddingBottom: 120 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: 'center' },
  successIconContainer: { marginBottom: 16 },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: 'center', alignItems: 'center' },
  successTitle: { ...Typography.h2, color: Colors.text.inverse, marginBottom: Spacing.sm },
  successSubtitle: { ...Typography.body, color: Colors.text.tertiary, textAlign: 'center', paddingHorizontal: 40 },
  content: { padding: Spacing.base, marginTop: -20 },
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.subtle },
  bookingNumberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { ...Typography.caption, color: Colors.text.tertiary, marginBottom: Spacing.xs },
  bookingNumber: { ...Typography.h3, color: Colors.nileBlue, letterSpacing: 1 },
  categoryBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.infoScale[200],
    justifyContent: 'center', alignItems: 'center' },
  pnrRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.background.secondary },
  pnrValue: { ...Typography.h4, color: Colors.nileBlue, letterSpacing: 2 },
  cardTitle: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.base },
  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routePoint: { alignItems: 'center', flex: 1 },
  routeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.info, marginBottom: Spacing.sm },
  routeCity: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary },
  routeCode: { ...Typography.caption, color: Colors.text.tertiary, marginTop: 2 },
  routeLine: { flex: 1, alignItems: 'center' },
  detailsGrid: { gap: Spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailLabel: { ...Typography.bodySmall, color: Colors.text.tertiary, width: 80 },
  detailValue: { ...Typography.body, fontWeight: '500', color: Colors.text.primary, flex: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  priceLabel: { ...Typography.body, color: Colors.text.tertiary },
  priceValue: { ...Typography.body, fontWeight: '500', color: Colors.text.primary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.background.secondary, marginTop: Spacing.sm, paddingTop: Spacing.md },
  totalLabel: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary },
  totalValue: { ...Typography.h4, color: Colors.nileBlue },
  cashbackCard: { borderLeftWidth: 4, borderLeftColor: Colors.success },
  cashbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cashbackLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cashbackTitle: { ...Typography.bodySmall, color: Colors.text.tertiary },
  cashbackAmount: { ...Typography.h3, color: Colors.success },
  cashbackBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  cashbackStatus: { ...Typography.caption, fontWeight: '600' },
  cashbackNote: { ...Typography.caption, color: Colors.text.tertiary, marginTop: Spacing.md },
  actions: { marginTop: Spacing.sm, gap: 10 },
  primaryButton: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  primaryButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.base },
  primaryButtonText: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.inverse },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.nileBlue,
    backgroundColor: Colors.background.primary },
  secondaryButtonText: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue } });

export default withErrorBoundary(TravelBookingConfirmationPage, 'TravelBookingConfirmation');

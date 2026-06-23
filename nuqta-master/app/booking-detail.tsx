import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Booking Detail Page
// Full booking details with travel-specific enhancements, cancellation, and actions

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import serviceBookingApi, { ServiceBooking } from '@/services/serviceBookingApi';
import CashbackStatusBadge from '@/components/travel/CashbackStatusBadge';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const TRAVEL_SLUGS = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];

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

function BookingDetailPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookingId = params.bookingId as string;
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await serviceBookingApi.getBookingById(bookingId);
      if (response.success && response.data) {
        setBooking(response.data);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to load booking');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load booking');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleCancel = () => {
    platformAlertDestructive(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      async () => {
        try {
          setCancelling(true);
          const response = await serviceBookingApi.cancelBooking(bookingId);
          if (response.success) {
            platformAlertSimple('Cancelled', 'Your booking has been cancelled.');
            loadBooking();
          } else {
            platformAlertSimple('Error', response.error || 'Failed to cancel booking');
          }
        } catch (err) {
          platformAlertSimple('Error', 'Failed to cancel booking');
        } finally {
          if (!isMounted()) return;
          setCancelling(false);
        }
      }
    );
  };

  const handleShare = async () => {
    if (!booking) return;
    try {
      const route = booking.travelDetails?.route;
      const routeText = route ? `${route.from} → ${route.to}\n` : '';
      await Share.share({
        message: `Booking #${booking.bookingNumber}\n${routeText}${booking.service?.name || ''}\nDate: ${formatDate(booking.bookingDate)}\n\nBooked via ReZ App`,
        title: 'Booking Details',
      });
    } catch (err) {
      // silently handle
    }
  };

  const handleDownloadTicket = async () => {
    if (booking?.eTicketUrl) {
      try {
        await Linking.openURL(booking.eTicketUrl);
      } catch {
        platformAlertSimple('Error', 'Could not open e-ticket');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return Colors.nileBlue;
      case 'pending': return Colors.warning;
      case 'completed': return Colors.success;
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

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'refunded': return 'Refunded';
      case 'failed': return 'Failed';
      case 'partial': return 'Partial';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'pending': return Colors.warning;
      case 'refunded': return Colors.info;
      case 'failed': return Colors.error;
      default: return Colors.text.tertiary;
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (error || !booking) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isTravel = isTravelBooking(booking);
  const route = booking.travelDetails?.route;
  const passengers = booking.travelDetails?.passengers;
  const categorySlug = booking.serviceCategory?.slug || '';
  const categoryIcon = CATEGORY_ICONS[categorySlug] || 'briefcase';
  const canCancel = (booking.status === 'confirmed' || booking.status === 'pending') &&
    new Date(booking.bookingDate) > new Date();
  const cashbackAmount = booking.pricing?.cashbackEarned || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[Colors.nileBlue, '#0f2a3d']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Status Badge */}
        <View style={styles.headerStatusRow}>
          {isTravel && (
            <View style={styles.headerCategoryBadge}>
              <Ionicons name={categoryIcon as any} size={18} color={Colors.text.inverse} />
              <Text style={styles.headerCategoryText}>
                {booking.serviceCategory?.name || 'Travel'}
              </Text>
            </View>
          )}
          <View style={[styles.headerStatus, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.headerStatusText}>{getStatusText(booking.status)}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Booking Number + PNR */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.label}>Booking Number</Text>
              <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(booking.paymentStatus) + '15' }]}>
              <Text style={[styles.paymentBadgeText, { color: getPaymentStatusColor(booking.paymentStatus) }]}>
                {getPaymentStatusText(booking.paymentStatus)}
              </Text>
            </View>
          </View>
          {booking.pnr && (
            <View style={styles.pnrSection}>
              <Text style={styles.label}>PNR</Text>
              <Text style={styles.pnrValue}>{booking.pnr}</Text>
            </View>
          )}
          {booking.externalReference && (
            <View style={styles.pnrSection}>
              <Text style={styles.label}>Reference</Text>
              <Text style={styles.refValue}>{booking.externalReference}</Text>
            </View>
          )}
        </View>

        {/* Route (travel only) */}
        {isTravel && route && (route.from || route.to) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Route</Text>
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: Colors.info }]} />
                <Text style={styles.routeCity}>{route.from}</Text>
                {route.fromCode && <Text style={styles.routeCode}>{route.fromCode}</Text>}
              </View>
              <View style={styles.routeLine}>
                <View style={styles.routeDash} />
                <Ionicons name={categoryIcon as any} size={18} color={Colors.nileBlue} />
                <View style={styles.routeDash} />
              </View>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.routeCity}>{route.to}</Text>
                {route.toCode && <Text style={styles.routeCode}>{route.toCode}</Text>}
              </View>
            </View>
          </View>
        )}

        {/* Service / Travel Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isTravel ? 'Travel Details' : 'Booking Details'}
          </Text>

          <View style={styles.detailsList}>
            {/* Service Name */}
            <DetailRow icon="cube-outline" label="Service" value={booking.service?.name || 'N/A'} />

            {/* Date */}
            <DetailRow icon="calendar-outline" label="Date" value={formatDate(booking.bookingDate)} />

            {/* Time slot (non-travel) */}
            {!isTravel && booking.timeSlot && (
              <DetailRow
                icon="time-outline"
                label="Time"
                value={`${formatTime(booking.timeSlot.start)} - ${formatTime(booking.timeSlot.end)}`}
              />
            )}

            {/* Duration (non-travel) */}
            {!isTravel && booking.duration > 0 && (
              <DetailRow icon="hourglass-outline" label="Duration" value={`${booking.duration} min`} />
            )}

            {/* Travel class */}
            {booking.travelDetails?.class && (
              <DetailRow icon="star-outline" label="Class" value={booking.travelDetails.class} />
            )}

            {/* Trip type */}
            {booking.travelDetails?.tripType && (
              <DetailRow
                icon="swap-horizontal-outline"
                label="Trip Type"
                value={booking.travelDetails.tripType === 'round-trip' ? 'Round Trip' : 'One Way'}
              />
            )}

            {/* Return date */}
            {booking.travelDetails?.returnDate && (
              <DetailRow
                icon="calendar-outline"
                label="Return"
                value={formatDate(booking.travelDetails.returnDate)}
              />
            )}

            {/* Passengers */}
            {passengers && (
              <DetailRow
                icon="people-outline"
                label="Passengers"
                value={[
                  `${passengers.adults} Adult${passengers.adults !== 1 ? 's' : ''}`,
                  passengers.children > 0 ? `${passengers.children} Child${passengers.children !== 1 ? 'ren' : ''}` : '',
                  (passengers.infants || 0) > 0 ? `${passengers.infants} Infant${(passengers.infants || 0) !== 1 ? 's' : ''}` : '',
                ].filter(Boolean).join(', ')}
              />
            )}

            {/* Store (non-travel) */}
            {!isTravel && booking.store?.name && (
              <DetailRow icon="storefront-outline" label="Store" value={booking.store.name} />
            )}

            {/* Service type */}
            {booking.serviceType && (
              <DetailRow
                icon="location-outline"
                label="Type"
                value={booking.serviceType.charAt(0).toUpperCase() + booking.serviceType.slice(1)}
              />
            )}
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Info</Text>
          <View style={styles.detailsList}>
            <DetailRow icon="person-outline" label="Name" value={booking.customerName} />
            <DetailRow icon="call-outline" label="Phone" value={booking.customerPhone} />
            {booking.customerEmail && (
              <DetailRow icon="mail-outline" label="Email" value={booking.customerEmail} />
            )}
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Breakdown</Text>
          <View style={styles.priceList}>
            <PriceRow label="Base Price" value={booking.pricing.basePrice} symbol={currencySymbol} />
            {booking.pricing.discountAmount && booking.pricing.discountAmount > 0 && (
              <PriceRow
                label={`Discount${booking.pricing.discountType === 'percentage' ? ` (${booking.pricing.discount}%)` : ''}`}
                value={-booking.pricing.discountAmount}
                symbol={currencySymbol}
                isDiscount
              />
            )}
            {booking.pricing.taxes && booking.pricing.taxes > 0 && (
              <PriceRow label="Taxes & Fees" value={booking.pricing.taxes} symbol={currencySymbol} />
            )}
            {booking.pricing.convenienceFee && booking.pricing.convenienceFee > 0 && (
              <PriceRow label="Convenience Fee" value={booking.pricing.convenienceFee} symbol={currencySymbol} />
            )}
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{currencySymbol}{booking.pricing.total.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Cashback Status (travel bookings) */}
        {isTravel && cashbackAmount > 0 && booking.cashbackStatus && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cashback</Text>
            <CashbackStatusBadge
              status={booking.cashbackStatus}
              amount={cashbackAmount}
              verificationDays={booking.verificationDays}
              creditedAt={booking.cashbackCreditedAt}
              currencySymbol={currencySymbol}
            />
            {booking.cashbackStatus === 'held' && (
              <Text style={styles.cashbackNote}>
                Cashback will be credited after {booking.verificationDays || 7} days of travel completion
              </Text>
            )}
          </View>
        )}

        {/* Cancellation Policy (travel bookings) */}
        {isTravel && booking.refundPolicy?.tiers && booking.refundPolicy.tiers.length > 0 && canCancel && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cancellation Policy</Text>
            {booking.refundPolicy.tiers.map((tier, idx) => (
              <View key={idx} style={styles.policyRow}>
                <View style={[styles.policyDot, {
                  backgroundColor: tier.refundPercentage >= 75 ? Colors.success :
                    tier.refundPercentage >= 50 ? Colors.warning :
                      tier.refundPercentage > 0 ? Colors.error : Colors.text.tertiary
                }]} />
                <Text style={styles.policyText}>
                  {tier.hoursBeforeDeparture > 0
                    ? `More than ${tier.hoursBeforeDeparture}h before departure`
                    : 'Less than minimum notice'}
                  {' — '}
                  <Text style={styles.policyPct}>
                    {tier.refundPercentage > 0 ? `${tier.refundPercentage}% refund` : 'No refund'}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Cancellation details (if cancelled) */}
        {booking.status === 'cancelled' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cancellation Info</Text>
            {booking.cancelledAt && (
              <DetailRow icon="calendar-outline" label="Cancelled" value={formatDate(booking.cancelledAt)} />
            )}
            {booking.cancellationReason && (
              <DetailRow icon="chatbox-outline" label="Reason" value={booking.cancellationReason} />
            )}
          </View>
        )}

        {/* Rating (if completed) */}
        {booking.rating && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Rating</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Ionicons
                  key={star}
                  name={star <= booking.rating!.score ? 'star' : 'star-outline'}
                  size={24}
                  color={Colors.warning}
                />
              ))}
              <Text style={styles.ratingScore}>{booking.rating.score}/5</Text>
            </View>
            {booking.rating.review && (
              <Text style={styles.ratingReview}>{booking.rating.review}</Text>
            )}
          </View>
        )}

        {/* Customer Notes */}
        {booking.customerNotes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{booking.customerNotes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Download E-Ticket */}
          {booking.eTicketUrl && (
            <Pressable style={styles.actionButton} onPress={handleDownloadTicket}>
              <LinearGradient colors={[Colors.nileBlue, '#0f2a3d']} style={styles.actionGradient}>
                <Ionicons name="download-outline" size={20} color={Colors.text.inverse} />
                <Text style={styles.actionButtonText}>Download E-Ticket</Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Cancel Booking */}
          {canCancel && (
            <Pressable
              style={[styles.actionOutline, styles.cancelAction]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                  <Text style={styles.cancelActionText}>Cancel Booking</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Contact Support */}
          <Pressable
            style={styles.actionOutline}
            onPress={() => platformAlertSimple('Support', 'Contact us at support@rez.app')}
          >
            <Ionicons name="headset-outline" size={20} color={Colors.nileBlue} />
            <Text style={styles.actionOutlineText}>Contact Support</Text>
          </Pressable>
        </View>

        {/* Timestamps */}
        <View style={styles.timestamps}>
          <Text style={styles.timestampText}>
            Booked on {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          {booking.confirmedAt && (
            <Text style={styles.timestampText}>
              Confirmed on {new Date(booking.confirmedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// Helper components
function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={18} color="#94A3B8" />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function PriceRow({ label, value, symbol, isDiscount }: { label: string; value: number; symbol: string; isDiscount?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, isDiscount && styles.discountValue]}>
        {isDiscount ? '-' : ''}{symbol}{Math.abs(value).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  errorText: { marginTop: Spacing.md, ...Typography.body, fontSize: 16, color: Colors.error, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.nileBlue, borderRadius: BorderRadius.md },
  retryBtnText: { color: Colors.text.inverse, ...Typography.body, fontWeight: '600' },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.inverse },
  shareBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
  },
  headerCategoryText: { ...Typography.caption, fontWeight: '600', color: Colors.text.inverse },
  headerStatus: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
  },
  headerStatusText: { ...Typography.caption, fontWeight: '600', color: Colors.text.inverse },

  // Content
  scrollContent: { padding: Spacing.base, paddingBottom: 120 },

  // Cards
  card: {
    backgroundColor: Colors.text.inverse,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...Typography.caption, color: Colors.text.tertiary, marginBottom: Spacing.xs },
  bookingNumber: { ...Typography.h3, fontWeight: '700', color: Colors.nileBlue, letterSpacing: 1 },
  paymentBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  paymentBadgeText: { ...Typography.caption, fontWeight: '600' },
  pnrSection: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.background.secondary },
  pnrValue: { ...Typography.h4, fontWeight: '600', color: Colors.nileBlue, letterSpacing: 2 },
  refValue: { ...Typography.body, fontWeight: '500', color: Colors.text.secondary },
  cardTitle: { ...Typography.body, fontSize: 16, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.base },

  // Route
  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routePoint: { alignItems: 'center', flex: 1 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginBottom: Spacing.sm },
  routeCity: { ...Typography.body, fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  routeCode: { ...Typography.caption, color: Colors.text.tertiary, marginTop: 2 },
  routeLine: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.xs },
  routeDash: { flex: 1, height: 1, backgroundColor: Colors.border.default },

  // Details
  detailsList: { gap: Spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailLabel: { ...Typography.caption, color: Colors.text.tertiary, width: 80 },
  detailValue: { ...Typography.body, fontWeight: '500', color: Colors.text.primary, flex: 1 },

  // Pricing
  priceList: { gap: Spacing.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  priceLabel: { ...Typography.body, color: Colors.text.tertiary },
  priceValue: { ...Typography.body, fontWeight: '500', color: Colors.text.primary },
  discountValue: { color: Colors.success },
  totalDivider: { height: 1, backgroundColor: Colors.background.secondary, marginVertical: Spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  totalLabel: { ...Typography.body, fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  totalValue: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue },

  // Cashback
  cashbackNote: { ...Typography.caption, color: Colors.text.tertiary, marginTop: Spacing.md },

  // Policy
  policyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  policyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  policyText: { ...Typography.caption, color: Colors.text.secondary, flex: 1, lineHeight: 18 },
  policyPct: { fontWeight: '600' },

  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ratingScore: { ...Typography.body, fontWeight: '600', color: Colors.text.primary, marginLeft: Spacing.sm },
  ratingReview: { ...Typography.body, color: Colors.text.secondary, marginTop: Spacing.sm, lineHeight: 20 },

  // Notes
  notesText: { ...Typography.body, color: Colors.text.secondary, lineHeight: 20 },

  // Actions
  actions: { marginTop: Spacing.sm, gap: Spacing.sm },
  actionButton: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  actionGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.base,
  },
  actionButtonText: { ...Typography.body, fontSize: 16, fontWeight: '600', color: Colors.text.inverse },
  actionOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.nileBlue, backgroundColor: Colors.text.inverse,
  },
  actionOutlineText: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue },
  cancelAction: { borderColor: Colors.error },
  cancelActionText: { ...Typography.body, fontWeight: '600', color: Colors.error },

  // Timestamps
  timestamps: {
    marginTop: Spacing.base, paddingTop: Spacing.base,
    borderTopWidth: 1, borderTopColor: Colors.border.default,
    gap: Spacing.xs,
  },
  timestampText: { ...Typography.caption, color: Colors.text.tertiary, textAlign: 'center' },
});

export default withErrorBoundary(BookingDetailPage, 'BookingDetail');

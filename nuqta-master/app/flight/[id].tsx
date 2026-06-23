// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Flight Details Page - Dedicated page for flight bookings
 * Production-ready with complete booking flow
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Modal,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import productsApi from '@/services/productsApi';
import { useWishlist } from '@/contexts/WishlistContext';
import { useProductReviews } from '@/hooks/useProductReviews';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useCurrency, useGetCurrencySymbol, useGetLocale, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
import FlightBookingFlow from '../../components/flight/FlightBookingFlow';
import FlightBookingConfirmation from '../../components/flight/FlightBookingConfirmation';
import RelatedFlightsSection from '../../components/flight/RelatedFlightsSection';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth } = Dimensions.get('window');

interface FlightDetails {
  id: string;
  name: string;
  route: {
    from: string;
    to: string;
    fromCode: string;
    toCode: string;
  };
  airline?: string;
  flightNumber?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  description: string;
  duration: number;
  departureTime?: string;
  arrivalTime?: string;
  availableDates: string[];
  cashback: {
    percentage: number;
    amount: number;
  };
  rating: number;
  reviewCount: number;
  store: {
    id: string;
    name: string;
    logo?: string;
  };
  amenities: string[];
  cancellationPolicy: {
    freeCancellation: boolean;
    cancellationDeadline: string;
    refundPercentage: number;
  };
  baggage: {
    cabin: string;
    checked: string;
  };
  classOptions: {
    economy: { price: number; available: boolean };
    business: { price: number; available: boolean };
    first: { price: number; available: boolean };
  };
}

interface BookingData {
  departureDate: Date;
  returnDate?: Date;
  tripType: 'one-way' | 'round-trip';
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  flightClass: 'economy' | 'business' | 'first';
  selectedExtras: {
    baggage?: string;
    meals?: string[];
    seatSelection?: boolean;
    specialAssistance?: string;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  passengerDetails: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    passportNumber?: string;
    nationality?: string;
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

const amenityIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Wi-Fi': 'wifi-outline',
  'Entertainment': 'tv-outline',
  'Meals': 'restaurant-outline',
  'Extra Legroom': 'body-outline',
  'Priority Boarding': 'flash-outline',
  'Blankets': 'bed-outline',
};

function FlightDetailsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const currency = useCurrency();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [flight, setFlight] = useState<FlightDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const {
    reviews,
    summary: reviewSummary,
    isLoading: reviewsLoading,
    refreshReviews,
  } = useProductReviews({
    productId: id as string,
    autoLoad: true,
  });

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (id) loadFlightDetails();
  }, [id, isAuthenticated, authLoading]);

  const loadFlightDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productsApi.getProductById(id as string);

      if (!response.success || !response.data) {
        if (!isMounted()) return;
        setError('Flight not found');
        return;
      }

      const productData = response.data;
      const isFlight = productData.serviceCategory?.slug === 'flights' ||
                       productData.category?.slug === 'flights' ||
                       productData.name?.toLowerCase().includes('flight');

      if (!isFlight) {
        router.replace(`/product-page?cardId=${id}&cardType=product`);
        return;
      }

      // Helper to read from specifications array
      const specs = productData.specifications || [];
      const getSpec = (key: string) => specs.find((s: any) => s.key === key)?.value || '';

      // Route: prefer specifications, fallback to name parsing
      const specFrom = getSpec('routeFrom');
      const specTo = getSpec('routeTo');
      let from = specFrom || '';
      let to = specTo || '';
      if (!from || !to) {
        const routePatterns = [
          /(.+?)\s+to\s+(.+?)\s+flight/i,
          /(.+?)\s*-\s*(.+?)\s+flight/i,
          /(.+?)\s+→\s+(.+?)\s+flight/i,
          /(.+?)\s+flight\s+to\s+(.+?)/i,
        ];
        for (const pattern of routePatterns) {
          const match = productData.name.match(pattern);
          if (match) {
            if (!from) from = match[1].trim();
            if (!to) to = match[2].trim();
            break;
          }
        }
        if (!from) from = 'Origin';
        if (!to) to = 'Destination';
      }

      const dur = productData.serviceDetails?.duration || 120;

      // Departure/arrival times: prefer specifications, fallback to calculated
      const specDepTime = getSpec('departureTime');
      const specArrTime = getSpec('arrivalTime');
      let depTime = specDepTime;
      let arrTime = specArrTime;
      if (!depTime || !arrTime) {
        const depH = 9, depM = 0;
        const arrH = (depH + Math.floor(dur / 60) + Math.floor((depM + dur % 60) / 60)) % 24;
        const arrM = (depM + dur % 60) % 60;
        const fmt = (h: number, m: number) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if (!depTime) depTime = fmt(depH, depM);
        if (!arrTime) arrTime = fmt(arrH, arrM);
      }

      // Airline: prefer specifications providerName, then store name
      const providerName = getSpec('providerName');
      const airlineName = providerName || productData.store?.name || 'Airline';

      const cashbackPct = productData.cashback?.percentage
        || productData.serviceCategory?.cashbackPercentage
        || productData.category?.maxCashback
        || (typeof productData.cashback === 'number' ? productData.cashback : 15);

      const basePrice = productData.pricing?.selling || productData.pricing?.basePrice || productData.price?.current || 0;
      const origPrice = productData.pricing?.original || productData.pricing?.basePrice || productData.price?.original;
      const disc = origPrice && basePrice && origPrice > basePrice
        ? Math.round(((origPrice - basePrice) / origPrice) * 100)
        : productData.pricing?.discount || 0;

      const processImages = () => {
        if (!productData.images || !Array.isArray(productData.images)) {
          return [];
        }
        const imgs = productData.images
          .map((img: any) => typeof img === 'string' ? img.trim() : img?.url || img?.uri || null)
          .filter((u: string | null): u is string => Boolean(u && u.length > 0));
        return imgs;
      };

      const tags = productData.tags || [];
      const getAmenities = () => {
        if (tags.some((t: string) => t.toLowerCase().includes('premium')))
          return ['Wi-Fi', 'Entertainment', 'Meals', 'Extra Legroom', 'Priority Boarding'];
        if (tags.some((t: string) => t.toLowerCase().includes('business')))
          return ['Wi-Fi', 'Entertainment', 'Meals', 'Extra Legroom'];
        if (dur >= 180) return ['Wi-Fi', 'Entertainment', 'Meals', 'Extra Legroom', 'Blankets'];
        if (dur >= 120) return ['Wi-Fi', 'Entertainment', 'Meals'];
        return ['Wi-Fi', 'Entertainment'];
      };

      // Class options: prefer specifications, fallback to price multipliers
      const specClassOptions = getSpec('classOptions');
      const buildClassOptions = () => {
        const defaults = {
          economy: { price: basePrice, available: true },
          business: { price: Math.round(basePrice * 2), available: true },
          first: { price: Math.round(basePrice * 4), available: true },
        };
        if (!specClassOptions) return defaults;
        // Parse comma-separated class names — prices are still multiples of base
        const classes = specClassOptions.split(',').map((c: string) => c.trim().toLowerCase());
        return {
          economy: { price: basePrice, available: classes.includes('economy') || classes.length === 0 },
          business: { price: Math.round(basePrice * 2), available: classes.includes('business') },
          first: { price: Math.round(basePrice * 4), available: classes.includes('first') },
        };
      };

      if (!isMounted()) return;
      setFlight({
        id: productData.id || productData._id,
        name: productData.name,
        route: { from, to, fromCode: from.substring(0, 3).toUpperCase(), toCode: to.substring(0, 3).toUpperCase() },
        airline: airlineName,
        flightNumber: productData.sku || `SW${(productData.id || productData._id || '').toString().slice(-6).toUpperCase()}`,
        price: basePrice,
        originalPrice: origPrice && origPrice > basePrice ? origPrice : undefined,
        discount: disc > 0 ? disc : undefined,
        images: processImages(),
        description: productData.description || productData.shortDescription || 'Direct flight with excellent service.',
        duration: dur,
        departureTime: depTime,
        arrivalTime: arrTime,
        availableDates: generateAvailableDates(),
        cashback: { percentage: cashbackPct, amount: Math.round(basePrice * cashbackPct / 100) },
        rating: reviewSummary?.averageRating || productData.ratings?.average || 0,
        reviewCount: reviewSummary?.totalReviews || productData.ratings?.count || 0,
        store: {
          id: productData.store?.id || productData.store?._id,
          name: productData.store?.name || airlineName,
          logo: productData.store?.logo,
        },
        amenities: getAmenities(),
        cancellationPolicy: { freeCancellation: true, cancellationDeadline: '24', refundPercentage: 80 },
        baggage: {
          cabin: getSpec('baggageCabin') || '7 kg',
          checked: getSpec('baggageChecked') || '15 kg',
        },
        classOptions: buildClassOptions(),
      });
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load flight details. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const generateAvailableDates = (): string[] => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const handleBookNow = () => setShowBookingFlow(true);

  const handleBookingComplete = (data: BookingData) => {
    if ((data as any).requiresPayment) {
      setShowBookingFlow(false);
      router.push({
        pathname: '/payment-razorpay',
        params: { amount: (data as any).totalAmount, bookingId: data.bookingId, bookingType: 'travel', currency: currency || 'INR' }
      } as any);
    } else {
      setBookingData(data);
      setShowBookingFlow(false);
      setShowConfirmation(true);
    }
  };

  const handleFavorite = async () => {
    if (!flight) return;
    try {
      if (isInWishlist(flight.id)) await removeFromWishlist(flight.id);
      else await addToWishlist(flight.id);
    } catch (_err) { /* silently handle */ }
  };

  const formatDuration = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

  // ─── Loading State ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <DetailPageSkeleton />
      </SafeAreaView>
    );
  }

  // ─── Error State ────────────────────────────────────────────────
  if (error || !flight) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorWrap}>
          <View style={s.errorIcon}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
          </View>
          <Text style={s.errorTitle}>Oops!</Text>
          <Text style={s.errorMsg}>{error || 'Flight not found'}</Text>
          <Pressable style={s.retryBtn} onPress={loadFlightDetails}>
            <Text style={s.retryBtnText}>Try Again</Text>
          </Pressable>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.neutral[500], fontSize: 14 }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = flight.images?.[selectedImageIndex] || flight.images?.[0];
  const hasValidImage = imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0;

  // ─── Main Content ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        {/* ── Hero Image ───────────────────────────────── */}
        <View style={s.hero}>
          {hasValidImage && !imageError ? (
            <CachedImage
              source={imageUrl}
              style={s.heroImg}
              contentFit="cover"
              onError={() => setImageError(true)}
              onLoadStart={() => setImageError(false)}
            />
          ) : (
            <LinearGradient colors={['#1E3A5F', '#0F172A']} style={[s.heroImg, s.heroPlaceholder]}>
              <Ionicons name="airplane" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']} style={s.heroOverlay} />

          {/* Nav bar */}
          <View style={s.heroNav}>
            <Pressable style={s.navBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={22} color={colors.background.primary} />
            </Pressable>
            <View style={s.navRight}>
              <Pressable style={s.navBtn} onPress={handleFavorite}>
                <Ionicons name={isInWishlist(flight.id) ? 'heart' : 'heart-outline'} size={22} color={isInWishlist(flight.id) ? colors.error : colors.background.primary} />
              </Pressable>
              <Pressable style={s.navBtn}>
                <Ionicons name="share-outline" size={22} color={colors.background.primary} />
              </Pressable>
            </View>
          </View>

          {/* Discount badge */}
          {flight.discount && flight.discount > 0 && (
            <View style={s.discBadge}>
              <Text style={s.discBadgeText}>{flight.discount}% OFF</Text>
            </View>
          )}

          {/* Carousel dots */}
          {flight.images.length > 1 && (
            <View style={s.dots}>
              {flight.images.map((_, i) => (
                <Pressable key={i} onPress={() => setSelectedImageIndex(i)}
                  style={[s.dot, selectedImageIndex === i && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── Route Card (overlaps hero) ───────────────── */}
        <View style={s.routeCardWrap}>
          <LinearGradient colors={['#1E40AF', colors.infoScale[400]]} style={s.routeCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.routeRow}>
              {/* From */}
              <View style={s.routeEnd}>
                <View style={s.codeCircle}>
                  <Text style={s.codeText}>{flight.route.fromCode}</Text>
                </View>
                <Text style={s.cityText}>{flight.route.from}</Text>
                <Text style={s.timeText}>{flight.departureTime}</Text>
              </View>

              {/* Middle */}
              <View style={s.routeMiddle}>
                <View style={s.routeLine}>
                  <View style={s.lineDot} />
                  <View style={s.lineDash} />
                  <View style={s.planeWrap}>
                    <Ionicons name="airplane" size={18} color={colors.background.primary} />
                  </View>
                  <View style={s.lineDash} />
                  <View style={s.lineDot} />
                </View>
                <View style={s.durationPill}>
                  <Text style={s.durationText}>{formatDuration(flight.duration)}</Text>
                </View>
                <Text style={s.directText}>Direct</Text>
              </View>

              {/* To */}
              <View style={s.routeEnd}>
                <View style={s.codeCircle}>
                  <Text style={s.codeText}>{flight.route.toCode}</Text>
                </View>
                <Text style={s.cityText}>{flight.route.to}</Text>
                <Text style={s.timeText}>{flight.arrivalTime}</Text>
              </View>
            </View>

            {/* Airline info */}
            <View style={s.routeFooter}>
              <View style={s.routeFooterItem}>
                <Ionicons name="airplane-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={s.routeFooterText}>{flight.airline}</Text>
              </View>
              {flight.flightNumber && (
                <View style={s.routeFooterItem}>
                  <Ionicons name="ticket-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={s.routeFooterText}>{flight.flightNumber}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        <View style={s.body}>

          {/* ── Price + Cashback ────────────────────────── */}
          <View style={s.priceCard}>
            <View style={s.priceTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.priceLabel}>Price per person</Text>
                <View style={s.priceRow}>
                  <Text style={s.priceMain}>{currencySymbol}{flight.price.toLocaleString(locale)}</Text>
                  {flight.originalPrice && flight.originalPrice > flight.price && (
                    <Text style={s.priceOrig}>{currencySymbol}{flight.originalPrice.toLocaleString(locale)}</Text>
                  )}
                </View>
                {flight.discount && flight.discount > 0 && (
                  <View style={s.savePill}>
                    <Text style={s.savePillText}>Save {flight.discount}%</Text>
                  </View>
                )}
              </View>
              <View style={s.cashbackCard}>
                <Ionicons name="gift" size={18} color={colors.warningScale[700]} />
                <Text style={s.cashbackPct}>{flight.cashback.percentage}%</Text>
                <Text style={s.cashbackLabel}>cashback</Text>
                <Text style={s.cashbackAmt}>Earn {currencySymbol}{flight.cashback.amount.toLocaleString(locale)}</Text>
              </View>
            </View>

            {/* Book Now button — inside content flow */}
            <Pressable style={s.bookBtn} onPress={handleBookNow}>
              <LinearGradient colors={[colors.brand.blue, '#1D4ED8']} style={s.bookBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.bookBtnText}>Book Now</Text>
                <View style={s.bookBtnArrow}>
                  <Ionicons name="arrow-forward" size={18} color={colors.brand.blue} />
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          {/* ── Quick Info Strip ────────────────────────── */}
          <View style={s.quickStrip}>
            <View style={s.quickItem}>
              <View style={[s.quickIcon, { backgroundColor: colors.tint.blue }]}>
                <Ionicons name="time-outline" size={20} color={colors.infoScale[400]} />
              </View>
              <Text style={s.quickLabel}>Duration</Text>
              <Text style={s.quickValue}>{formatDuration(flight.duration)}</Text>
            </View>
            <View style={s.quickDivider} />
            <View style={s.quickItem}>
              <View style={[s.quickIcon, { backgroundColor: colors.successScale[50] }]}>
                <Ionicons name="bag-outline" size={20} color={colors.brand.greenDark} />
              </View>
              <Text style={s.quickLabel}>Cabin</Text>
              <Text style={s.quickValue}>{flight.baggage.cabin}</Text>
            </View>
            <View style={s.quickDivider} />
            <View style={s.quickItem}>
              <View style={[s.quickIcon, { backgroundColor: colors.tint.amberLight }]}>
                <Ionicons name="cube-outline" size={20} color={colors.warningScale[700]} />
              </View>
              <Text style={s.quickLabel}>Check-in</Text>
              <Text style={s.quickValue}>{flight.baggage.checked}</Text>
            </View>
          </View>

          {/* ── Airline / Store ─────────────────────────── */}
          {flight.store && (
            <Pressable
              style={s.airlineCard}
              onPress={() => router.push(`/MainStorePage?storeId=${flight.store.id}` as any)}
             
            >
              {flight.store.logo ? (
                <CachedImage source={flight.store.logo} style={s.airlineLogo} contentFit="contain" />
              ) : (
                <View style={[s.airlineLogo, s.airlineLogoFallback]}>
                  <Ionicons name="airplane" size={20} color={colors.infoScale[400]} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.airlineName}>{flight.store.name}</Text>
                <View style={s.airlineMeta}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                  <Text style={s.airlineVerified}>Verified Partner</Text>
                  {flight.rating > 0 && (
                    <>
                      <Text style={s.metaDot}>·</Text>
                      <Ionicons name="star" size={13} color={colors.warningScale[400]} />
                      <Text style={s.airlineRating}>{flight.rating.toFixed(1)}</Text>
                    </>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
            </Pressable>
          )}

          {/* ── Amenities ──────────────────────────────── */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Amenities</Text>
            <View style={s.amenitiesGrid}>
              {flight.amenities.map((a, i) => (
                <View key={i} style={s.amenityChip}>
                  <Ionicons name={amenityIconMap[a] || 'checkmark-circle-outline'} size={18} color={colors.infoScale[400]} />
                  <Text style={s.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── About ──────────────────────────────────── */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>About This Flight</Text>
            <Text style={s.descText}>{flight.description}</Text>
            <View style={s.highlights}>
              {['Direct flight', 'Best price guaranteed', 'Instant confirmation'].map((h, i) => (
                <View key={i} style={s.highlightRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={s.highlightText}>{h}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Cancellation Policy ────────────────────── */}
          <View style={s.sectionCard}>
            <View style={s.cancelHeader}>
              <View style={s.cancelIcon}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              </View>
              <Text style={s.sectionTitle}>Cancellation Policy</Text>
            </View>
            {flight.cancellationPolicy.freeCancellation && (
              <View style={s.cancelRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={s.cancelText}>
                  Free cancellation up to {flight.cancellationPolicy.cancellationDeadline}h before departure
                </Text>
              </View>
            )}
            <View style={s.cancelRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.neutral[500]} />
              <Text style={s.cancelText}>
                {flight.cancellationPolicy.refundPercentage}% refund if cancelled before deadline
              </Text>
            </View>
            <View style={s.cancelRow}>
              <Ionicons name="close-circle-outline" size={16} color={colors.error} />
              <Text style={s.cancelText}>No refund for no-shows</Text>
            </View>
          </View>

          {/* ── Class Options ──────────────────────────── */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Class Options</Text>
            <View style={s.classGrid}>
              {[
                { key: 'economy' as const, label: 'Economy', icon: 'airplane-outline' as const, color: colors.infoScale[400] },
                { key: 'business' as const, label: 'Business', icon: 'diamond-outline' as const, color: colors.brand.purpleLight },
                { key: 'first' as const, label: 'First', icon: 'star-outline' as const, color: colors.warningScale[700] },
              ].filter(cls => flight.classOptions[cls.key].available).map(cls => (
                <View key={cls.key} style={[s.classCard, cls.key === 'economy' && s.classCardActive]}>
                  <Ionicons name={cls.icon} size={22} color={cls.color} />
                  <Text style={s.classLabel}>{cls.label}</Text>
                  <Text style={s.classPrice}>{currencySymbol}{flight.classOptions[cls.key].price.toLocaleString(locale)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Reviews ────────────────────────────────── */}
          <View style={s.sectionCard}>
            <View style={s.reviewHeader}>
              <Text style={s.sectionTitle}>Reviews</Text>
              {flight.rating > 0 && (
                <View style={s.ratingPill}>
                  <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                  <Text style={s.ratingPillText}>{flight.rating.toFixed(1)} ({flight.reviewCount})</Text>
                </View>
              )}
            </View>
            <ProductReviewsSection
              productId={flight.id}
              reviews={reviews}
              summary={reviewSummary}
              isLoading={reviewsLoading}
              onRefresh={refreshReviews}
            />
          </View>

          {/* ── Related Flights ─────────────────────────── */}
          <RelatedFlightsSection currentFlightId={flight.id} route={flight.route} />

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Booking Flow Modal */}
      <Modal visible={showBookingFlow} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBookingFlow(false)}>
        <FlightBookingFlow flight={flight} onComplete={handleBookingComplete} onClose={() => setShowBookingFlow(false)} />
      </Modal>

      {/* Booking Confirmation Modal */}
      <Modal visible={showConfirmation} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowConfirmation(false); router.canGoBack() ? router.back() : router.replace('/(tabs)'); }}>
        {bookingData && (
          <FlightBookingConfirmation
            flight={flight}
            bookingData={bookingData}
            onClose={() => { setShowConfirmation(false); router.canGoBack() ? router.back() : router.replace('/(tabs)'); }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.coolGray },
  scroll: { flex: 1 },

  // ── Loading / Error ───────────────────────────────────────────
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingPlane: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.tint.blue, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loadingTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral[700] },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.errorScale[50], justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: colors.neutral[900], marginBottom: 8 },
  errorMsg: { fontSize: 15, color: colors.neutral[500], textAlign: 'center', marginBottom: 24 },
  retryBtn: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: colors.infoScale[400], borderRadius: 10 },
  retryBtnText: { color: colors.background.primary, fontSize: 15, fontWeight: '600' },

  // ── Hero ──────────────────────────────────────────────────────
  hero: { width: screenWidth, height: 280, position: 'relative', backgroundColor: '#1E3A5F' },
  heroImg: { width: '100%', height: '100%' },
  heroPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroNav: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  navBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', ...Platform.select({ web: { backdropFilter: 'blur(10px)' } as any, default: {} }) },
  navRight: { flexDirection: 'row', gap: 10 },
  discBadge: { position: 'absolute', top: Platform.OS === 'ios' ? 96 : 62, right: 16, backgroundColor: colors.error, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  discBadgeText: { color: colors.background.primary, fontSize: 12, fontWeight: '800' },
  dots: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6, zIndex: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 20, backgroundColor: colors.background.primary },

  // ── Route Card ────────────────────────────────────────────────
  routeCardWrap: { marginHorizontal: 16, marginTop: -44, zIndex: 5, borderRadius: 16, overflow: 'hidden', shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  routeCard: { padding: 24, borderRadius: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  routeEnd: { alignItems: 'center', width: 80 },
  codeCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  codeText: { fontSize: 16, fontWeight: '800', color: colors.background.primary, letterSpacing: 1 },
  cityText: { fontSize: 13, fontWeight: '600', color: colors.background.primary, marginBottom: 4, textAlign: 'center' },
  timeText: { fontSize: 16, fontWeight: '800', color: colors.background.primary },
  routeMiddle: { flex: 1, alignItems: 'center', paddingTop: 14 },
  routeLine: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  lineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  lineDash: { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  planeWrap: { marginHorizontal: 6 },
  durationPill: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  durationText: { fontSize: 11, fontWeight: '700', color: colors.background.primary },
  directText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontWeight: '500' },
  routeFooter: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  routeFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  routeFooterText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  // ── Body ──────────────────────────────────────────────────────
  body: { paddingHorizontal: 16, paddingTop: 20 },

  // ── Price Card ────────────────────────────────────────────────
  priceCard: { backgroundColor: colors.background.primary, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  priceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  priceLabel: { fontSize: 12, color: colors.neutral[500], fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  priceMain: { fontSize: 28, fontWeight: '800', color: colors.neutral[900] },
  priceOrig: { fontSize: 16, color: colors.neutral[400], textDecorationLine: 'line-through' },
  savePill: { alignSelf: 'flex-start', backgroundColor: colors.tint.amberLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 6 },
  savePillText: { fontSize: 11, fontWeight: '700', color: colors.brand.amberDark },
  cashbackCard: { alignItems: 'center', backgroundColor: colors.tint.amber, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.warningScale[200], minWidth: 90 },
  cashbackPct: { fontSize: 18, fontWeight: '800', color: colors.warningScale[700], marginTop: 2 },
  cashbackLabel: { fontSize: 10, color: colors.brand.amberDark, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  cashbackAmt: { fontSize: 10, color: colors.brand.amberDeep, fontWeight: '500', marginTop: 4 },

  // ── Book Button ───────────────────────────────────────────────
  bookBtn: { borderRadius: 12, overflow: 'hidden' },
  bookBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 10, borderRadius: 12 },
  bookBtnText: { color: colors.background.primary, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  bookBtnArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' },

  // ── Quick Strip ───────────────────────────────────────────────
  quickStrip: { flexDirection: 'row', backgroundColor: colors.background.primary, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  quickItem: { flex: 1, alignItems: 'center' },
  quickIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 11, color: colors.neutral[500], fontWeight: '500', marginBottom: 3 },
  quickValue: { fontSize: 14, fontWeight: '700', color: colors.neutral[900] },
  quickDivider: { width: 1, backgroundColor: colors.neutral[200], marginVertical: 4 },

  // ── Airline Card ──────────────────────────────────────────────
  airlineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.primary, borderRadius: 14, padding: 14, marginBottom: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  airlineLogo: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.background.primary, borderWidth: 1, borderColor: colors.neutral[200] },
  airlineLogoFallback: { backgroundColor: colors.tint.blue, justifyContent: 'center', alignItems: 'center', borderColor: colors.tint.blueLight },
  airlineName: { fontSize: 15, fontWeight: '600', color: colors.neutral[900], marginBottom: 3 },
  airlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  airlineVerified: { fontSize: 12, color: colors.brand.greenDark, fontWeight: '500' },
  metaDot: { color: colors.neutral[300], fontSize: 12 },
  airlineRating: { fontSize: 12, color: colors.brand.amberDark, fontWeight: '600' },

  // ── Section Card ──────────────────────────────────────────────
  sectionCard: { backgroundColor: colors.background.primary, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.neutral[900], marginBottom: 14 },

  // ── Amenities ─────────────────────────────────────────────────
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F0F9FF', borderRadius: 8, borderWidth: 1, borderColor: '#E0F2FE' },
  amenityText: { fontSize: 13, color: '#1E40AF', fontWeight: '500' },

  // ── Description ───────────────────────────────────────────────
  descText: { fontSize: 14, lineHeight: 22, color: colors.neutral[600], marginBottom: 16 },
  highlights: { gap: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  highlightText: { fontSize: 14, color: colors.neutral[700], fontWeight: '500' },

  // ── Cancellation ──────────────────────────────────────────────
  cancelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cancelIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.successScale[50], justifyContent: 'center', alignItems: 'center' },
  cancelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  cancelText: { flex: 1, fontSize: 13, color: colors.neutral[600], lineHeight: 19 },

  // ── Class Options ─────────────────────────────────────────────
  classGrid: { flexDirection: 'row', gap: 10 },
  classCard: { flex: 1, alignItems: 'center', padding: 14, backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200] },
  classCardActive: { borderColor: colors.infoScale[400], backgroundColor: colors.tint.blue },
  classLabel: { fontSize: 12, fontWeight: '600', color: colors.neutral[700], marginTop: 6, marginBottom: 4 },
  classPrice: { fontSize: 14, fontWeight: '700', color: colors.neutral[900] },

  // ── Reviews ───────────────────────────────────────────────────
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tint.amberLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  ratingPillText: { fontSize: 13, fontWeight: '600', color: colors.brand.amberDark },
});

export default withErrorBoundary(FlightDetailsPage, 'FlightId');

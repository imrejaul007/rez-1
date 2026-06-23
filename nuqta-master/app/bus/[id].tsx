// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Bus Details Page - Dedicated page for bus bookings
 * Production-ready with complete booking flow
 */

import React, { useState, useEffect} from 'react';
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
  Modal
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import productsApi from '@/services/productsApi';
import { useWishlist } from '@/contexts/WishlistContext';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useProductReviews } from '@/hooks/useProductReviews';
import { useCurrency, useGetCurrencySymbol, useGetLocale, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
import BusBookingFlow from '../../components/bus/BusBookingFlow';
import BusBookingConfirmation from '../../components/bus/BusBookingConfirmation';
import RelatedBusesSection from '../../components/bus/RelatedBusesSection';
import BusInfoCard from '../../components/bus/BusInfoCard';
import BusAmenities from '../../components/bus/BusAmenities';
import BusCancellationPolicy from '../../components/bus/BusCancellationPolicy';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface BusDetails {
  id: string;
  name: string;
  route?: {
    from: string;
    to: string;
    fromTerminal?: string;
    toTerminal?: string;
  };
  busNumber?: string;
  busType?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  description: string;
  duration: number; // in minutes
  departureTime?: string;
  arrivalTime?: string;
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
    cancellationDeadline: string; // hours before departure
    refundPercentage: number;
  };
  classOptions: {
    seater: { price: number; available: boolean };
    sleeper: { price: number; available: boolean };
    semiSleeper: { price: number; available: boolean };
    ac: { price: number; available: boolean };
  };
}

interface BookingData {
  travelDate: Date;
  returnDate?: Date;
  tripType: 'one-way' | 'round-trip';
  passengers: {
    adults: number;
    children: number;
  };
  busClass: 'seater' | 'sleeper' | 'semiSleeper' | 'ac';
  selectedExtras: {
    meals?: boolean;
    insurance?: boolean;
    cancellation?: boolean;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  passengerDetails: Array<{
    firstName: string;
    lastName: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    seatPreference?: 'window' | 'aisle' | 'no-preference';
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

function BusDetailsPage() {
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

  const [bus, setBus] = useState<BusDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  
  // Animation for button
  const buttonScale = useSharedValue(1);
  const buttonScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Reviews
  const {
    reviews,
    summary: reviewSummary,
    isLoading: reviewsLoading,
    refreshReviews } = useProductReviews({
    productId: id as string,
    autoLoad: true });

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (id) {
      loadBusDetails();
    }
  }, [id, isAuthenticated, authLoading]);

  const loadBusDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await productsApi.getProductById(id as string);

      if (!response.success || !response.data) {
        if (!isMounted()) return;
        setError('Bus not found');
        return;
      }

      const productData = response.data;

      // Check if this is a bus service
      const isBus = productData.serviceCategory?.slug === 'bus' || 
                   productData.category?.slug === 'bus' ||
                   productData.name?.toLowerCase().includes('bus');

      if (!isBus) {
        router.replace(`/product-page?cardId=${id}&cardType=product`);
        return;
      }

      // Helper to read from specifications array
      const specs = productData.specifications || [];
      const getSpec = (key: string) => specs.find((s: any) => s.key === key)?.value || '';

      // Route: prefer specs, fallback to name parsing
      const specFrom = getSpec('routeFrom');
      const specTo = getSpec('routeTo');
      let from = specFrom || '';
      let to = specTo || '';
      if (!from || !to) {
        const routePatterns = [
          /(.+?)\s+to\s+(.+?)\s+bus/i,
          /(.+?)\s*-\s*(.+?)\s+bus/i,
          /(.+?)\s+→\s+(.+?)\s+bus/i,
          /(.+?)\s+bus\s+to\s+(.+?)/i,
        ];
        for (const pattern of routePatterns) {
          const match = productData.name.match(pattern);
          if (match) {
            if (!from) from = match[1].trim();
            if (!to) to = match[2] ? match[2].trim() : '';
            break;
          }
        }
        if (!from) {
          if (productData.name.toLowerCase().includes('volvo')) { from = from || 'Bangalore'; to = to || 'Mumbai'; }
          else if (productData.name.toLowerCase().includes('sleeper')) { from = from || 'Delhi'; to = to || 'Jaipur'; }
        }
        if (!from) from = 'Origin';
        if (!to) to = 'Destination';
      }

      // Duration and times: prefer specs
      const rawDuration = productData.serviceDetails?.duration;
      const duration = (typeof rawDuration === 'number' && !isNaN(rawDuration) && rawDuration > 0) ? rawDuration : 480;
      const specDepTime = getSpec('departureTime');
      const specArrTime = getSpec('arrivalTime');
      let departureTime = specDepTime;
      let arrivalTime = specArrTime;
      if (!departureTime || !arrivalTime) {
        const durationHours = Math.floor(duration / 60);
        const durationMins = duration % 60;
        const baseDepartureHour = 8, baseDepartureMin = 0;
        const arrH = (baseDepartureHour + durationHours + Math.floor((baseDepartureMin + durationMins) / 60)) % 24;
        const arrM = (baseDepartureMin + durationMins) % 60;
        const formatTime = (h: number, m: number) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if (!departureTime) departureTime = formatTime(baseDepartureHour, baseDepartureMin);
        if (!arrivalTime) arrivalTime = formatTime(arrH, arrM);
      }

      // Provider name and bus type: prefer specs
      const providerName = getSpec('providerName');
      const specBusType = getSpec('busType');
      const busType = specBusType || (() => {
        if (productData.name.toLowerCase().includes('volvo')) return 'Volvo AC Sleeper';
        if (productData.name.toLowerCase().includes('sleeper')) return 'Sleeper';
        if (productData.name.toLowerCase().includes('seater')) return 'Seater';
        if (productData.name.toLowerCase().includes('ac')) return 'AC Bus';
        return 'Sleeper';
      })();

      // Get cashback
      const cashbackPercentage = (() => {
        if (productData.cashback?.percentage) return productData.cashback.percentage;
        if (productData.serviceCategory?.cashbackPercentage) return productData.serviceCategory.cashbackPercentage;
        if (productData.category?.maxCashback) return productData.category.maxCashback;
        if (typeof productData.cashback === 'number') return productData.cashback;
        return 15;
      })();

      // Calculate price
      const basePrice = productData.pricing?.selling || productData.pricing?.basePrice || productData.price?.current || 0;
      const originalPrice = productData.pricing?.original || productData.pricing?.basePrice || productData.price?.original;
      const calculatedDiscount = originalPrice && basePrice && originalPrice > basePrice
        ? Math.round(((originalPrice - basePrice) / originalPrice) * 100)
        : productData.pricing?.discount || 0;

      const busNumber = getSpec('busNumber') || productData.sku || productData.barcode ||
        `${productData.name.substring(0, 3).toUpperCase()}${(productData.id || productData._id || '').toString().slice(-4)}`;

      // Class options: prefer specs
      const specClassOptions = getSpec('classOptions');
      const buildClassOptions = () => {
        const defaults = {
          seater: { price: basePrice, available: true },
          sleeper: { price: Math.round(basePrice * 1.3), available: true },
          semiSleeper: { price: Math.round(basePrice * 1.2), available: true },
          ac: { price: Math.round(basePrice * 1.5), available: true } };
        if (!specClassOptions) return defaults;
        const classes = specClassOptions.split(',').map((c: string) => c.trim().toLowerCase());
        return {
          seater: { price: basePrice, available: classes.includes('seater') || classes.length === 0 },
          sleeper: { price: Math.round(basePrice * 1.3), available: classes.includes('sleeper') },
          semiSleeper: { price: Math.round(basePrice * 1.2), available: classes.includes('semi-sleeper') || classes.includes('semisleeper') },
          ac: { price: Math.round(basePrice * 1.5), available: classes.includes('ac') } };
      };

      // Transform to BusDetails
      const busDetails: BusDetails = {
        id: productData.id || productData._id,
        name: productData.name,
        route: {
          from,
          to,
          fromTerminal: `${from} Bus Terminal`,
          toTerminal: `${to} Bus Terminal` },
        busNumber,
        busType,
        price: basePrice,
        originalPrice: originalPrice && originalPrice > basePrice ? originalPrice : undefined,
        discount: calculatedDiscount > 0 ? calculatedDiscount : undefined,
        images: (() => {
          if (!productData.images || !Array.isArray(productData.images)) {
            return [];
          }
          const processedImages = productData.images
            .map((img: any) => {
              if (typeof img === 'string') return img.trim();
              if (img && typeof img === 'object') return img.url || img.uri || img.src || null;
              return null;
            })
            .filter((url: string | null): url is string => Boolean(url && typeof url === 'string' && url.length > 0));
          const validatedImages = processedImages.filter(url => {
            if ((url.toLowerCase().includes('train') || url.toLowerCase().includes('cab') ||
                 url.toLowerCase().includes('airplane') || url.toLowerCase().includes('hotel')) &&
                !url.toLowerCase().includes('bus')) {
              return false;
            }
            return true;
          });
          return validatedImages;
        })(),
        description: productData.description || productData.shortDescription || 'Comfortable bus journey with excellent service.',
        duration,
        departureTime,
        arrivalTime,
        cashback: {
          percentage: cashbackPercentage,
          amount: Math.round(basePrice * cashbackPercentage / 100) },
        rating: reviewSummary?.averageRating || productData.ratings?.average || 0,
        reviewCount: reviewSummary?.totalReviews || productData.ratings?.count || 0,
        store: {
          id: productData.store?.id || productData.store?._id,
          name: providerName || productData.store?.name || 'BusConnect',
          logo: productData.store?.logo },
        amenities: (() => {
          const tagAmenities: Record<string, string[]> = {
            'premium': ['AC', 'Wi-Fi', 'Reclining Seats', 'Charging Point', 'Entertainment', 'Meals'],
            'sleeper': ['AC', 'Reclining Seats', 'Charging Point', 'Reading Light', 'Blankets'],
            'seater': ['AC', 'Reclining Seats', 'Charging Point', 'Water'] };
          const tags = productData.tags || [];
          for (const [key, amenities] of Object.entries(tagAmenities)) {
            if (tags.some((tag: string) => tag.toLowerCase().includes(key))) return amenities;
          }
          if (productData.name.toLowerCase().includes('volvo') || productData.name.toLowerCase().includes('ac')) {
            return ['AC', 'Wi-Fi', 'Reclining Seats', 'Charging Point', 'Entertainment'];
          }
          return ['AC', 'Reclining Seats', 'Charging Point', 'Water'];
        })(),
        cancellationPolicy: {
          freeCancellation: productData.specifications?.some((s: any) =>
            s.key?.toLowerCase().includes('cancellation') && s.value?.toLowerCase().includes('free')
          ) || true,
          cancellationDeadline: '24',
          refundPercentage: 80 },
        classOptions: buildClassOptions() };

      if (!isMounted()) return;
      setBus(busDetails);
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load bus details. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleBookNow = () => {
    // Animate button press
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    setShowBookingFlow(true);
  };

  const handleBookingComplete = (data: BookingData) => {
    if ((data as any).requiresPayment) {
      setShowBookingFlow(false);
      router.push({
        pathname: '/payment-razorpay',
        params: {
          amount: (data as any).totalAmount,
          bookingId: data.bookingId,
          bookingType: 'travel',
          currency: currency || 'INR' }
      } as any);
    } else {
      setBookingData(data);
      setShowBookingFlow(false);
      setShowConfirmation(true);
    }
  };

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleFavorite = async () => {
    if (!bus) return;
    
    try {
      if (isInWishlist(bus.id)) {
        await removeFromWishlist(bus.id);
      } else {
        await addToWishlist(bus.id);
      }
    } catch (error) {
      // silently handle
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <DetailPageSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !bus) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Bus not found'}</Text>
          <Pressable style={styles.retryButton} onPress={loadBusDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Image */}
        <View style={styles.headerContainer}>
          {(() => {
            const imageUrl = bus.images?.[selectedImageIndex] || bus.images?.[0];
            const hasValidImage = imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0;
            
            if (hasValidImage && !imageError) {
              return (
                <CachedImage
                  source={imageUrl}
                  style={styles.headerImage}
                  contentFit="cover"
                  onError={() => setImageError(true)}
                  onLoadStart={() => setImageError(false)}
                />
              );
            }
            
            return (
              <View style={[styles.headerImage, styles.placeholderImage]}>
                <Ionicons name="bus" size={64} color={Colors.text.tertiary} />
                <Text style={styles.placeholderText}>Bus Image</Text>
              </View>
            );
          })()}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.headerGradient}
          />
          
          <View style={styles.headerActions}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            
            <View style={styles.headerRightActions}>
              <Pressable style={styles.actionButton} onPress={handleFavorite}>
                <Ionicons
                  name={isInWishlist(bus.id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isInWishlist(bus.id) ? colors.error : colors.background.primary}
                />
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color={Colors.text.inverse} />
              </Pressable>
            </View>
          </View>

          {/* Image Indicators */}
          {bus.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {bus.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    selectedImageIndex === index && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Bus Info Card */}
        <View style={styles.infoCardWrapper}>
          <BusInfoCard bus={bus} />
        </View>

        {/* Store/Provider Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={24} color={colors.brand.orange} />
            <Text style={styles.sectionTitle}>Service Provider</Text>
          </View>
          <View style={styles.storeCard}>
            {bus.store.logo && (
              <CachedImage source={bus.store.logo} style={styles.storeLogo} />
            )}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{bus.store.name}</Text>
              <View style={styles.storeBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.storeBadgeText}>Verified</Text>
              </View>
            </View>
            <Pressable style={styles.viewStoreButton}>
              <Text style={styles.viewStoreButtonText}>View Store</Text>
            </Pressable>
          </View>
        </View>

        {/* Price & Cashback */}
        <View style={styles.section}>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Price</Text>
                <View style={styles.priceValueContainer}>
                  <Text style={styles.priceValue}>{currencySymbol}{bus.price.toLocaleString(locale)}</Text>
                  {bus.originalPrice && bus.originalPrice > bus.price && (
                    <Text style={styles.originalPrice}>{currencySymbol}{bus.originalPrice.toLocaleString(locale)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.cashbackBadge}>
                <Ionicons name="cash" size={20} color={Colors.text.inverse} />
                <Text style={styles.cashbackText}>
                  {bus.cashback.percentage}% Cashback
                </Text>
                <Text style={styles.cashbackAmount}>{currencySymbol}{bus.cashback.amount}</Text>
              </View>
            </View>
            {bus.discount && bus.discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{bus.discount}% OFF</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={colors.brand.orange} />
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time-outline" size={20} color={colors.brand.orange} />
              </View>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {Math.floor(bus.duration / 60)}h {bus.duration % 60}m
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="bus-outline" size={20} color={colors.brand.orange} />
              </View>
              <Text style={styles.detailLabel}>Bus Type</Text>
              <Text style={styles.detailValue}>{bus.busType || 'Sleeper'}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="ticket-outline" size={20} color={colors.brand.orange} />
              </View>
              <Text style={styles.detailLabel}>Bus Number</Text>
              <Text style={styles.detailValue}>{bus.busNumber || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="star" size={20} color={colors.brand.orange} />
              </View>
              <Text style={styles.detailLabel}>Rating</Text>
              <Text style={styles.detailValue}>{bus.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={24} color={colors.brand.orange} />
            <Text style={styles.sectionTitle}>Amenities</Text>
          </View>
          <BusAmenities amenities={bus.amenities} />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.descriptionTitle}>About This Service</Text>
          <Text style={styles.description}>{bus.description}</Text>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <BusCancellationPolicy policy={bus.cancellationPolicy} />
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <ProductReviewsSection
            productId={id as string}
            productName={bus.name}
            reviews={reviews}
            summary={reviewSummary}
            isLoading={reviewsLoading}
            onRefresh={refreshReviews}
          />
        </View>

        {/* Related Buses */}
        <View style={styles.section}>
          <RelatedBusesSection currentBusId={bus.id} route={bus.route} />
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bookButtonContainer}>
        {/* Price Info Card */}
        <View style={styles.priceInfoCard}>
          <View style={styles.priceInfoRow}>
            <View style={styles.priceInfoLeft}>
              <Text style={styles.priceInfoLabel}>Total Price</Text>
              <View style={styles.priceInfoValueContainer}>
                <Text style={styles.priceInfoValue}>
                  {currencySymbol}{bus.price.toLocaleString(locale)}
                </Text>
                {bus.originalPrice && bus.originalPrice > bus.price && (
                  <Text style={styles.priceInfoOriginal}>{currencySymbol}{bus.originalPrice.toLocaleString(locale)}</Text>
                )}
              </View>
            </View>
            <View style={styles.cashbackInfo}>
              <Ionicons name="cash" size={18} color={colors.brand.orange} />
              <Text style={styles.cashbackInfoText}>{bus.cashback.percentage}% Cashback</Text>
            </View>
          </View>
        </View>
        
        {/* Book Now Button */}
        <Animated.View style={buttonScaleStyle}>
          <Pressable 
            style={styles.bookButton} 
            onPress={handleBookNow}
           
          >
            <LinearGradient
              colors={[colors.brand.orange, colors.brand.orangeDark, '#C2410C']}
              style={styles.bookButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.bookButtonContent}>
                <View style={styles.bookButtonLeft}>
                  <Ionicons name="calendar" size={22} color={Colors.text.inverse} />
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </View>
                <View style={styles.bookButtonRight}>
                  <Ionicons name="arrow-forward" size={22} color={Colors.text.inverse} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {/* Booking Flow Modal */}
      <Modal
        visible={showBookingFlow}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingFlow(false)}
      >
        {bus && (
          <BusBookingFlow
            bus={bus}
            onComplete={handleBookingComplete}
            onClose={() => setShowBookingFlow(false)}
          />
        )}
      </Modal>

      {/* Booking Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowConfirmation(false);
          router.canGoBack() ? router.back() : router.replace('/(tabs)');
        }}
      >
        {bookingData && bus && (
          <BusBookingConfirmation
            bus={bus}
            bookingData={bookingData}
            onClose={() => {
              setShowConfirmation(false);
              router.canGoBack() ? router.back() : router.replace('/(tabs)');
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary },
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingBottom: 200 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center' },
  loadingContent: {
    alignItems: 'center' },
  loadingText: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base },
  loadingSubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'] },
  errorText: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.error,
    marginTop: Spacing.base,
    textAlign: 'center' },
  retryButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: colors.brand.orange,
    borderRadius: BorderRadius.md },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600' },
  headerContainer: {
    width: screenWidth,
    height: 300,
    position: 'relative' },
  headerImage: {
    width: '100%',
    height: '100%' },
  placeholderImage: {
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center' },
  placeholderText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginTop: Spacing.md },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150 },
  headerActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center' },
  headerRightActions: {
    flexDirection: 'row',
    gap: Spacing.md },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center' },
  imageIndicators: {
    position: 'absolute',
    bottom: Spacing.base,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)' },
  indicatorActive: {
    backgroundColor: Colors.background.primary,
    width: 24 },
  infoCardWrapper: {
    marginTop: -20,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.base },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md },
  storeInfo: {
    flex: 1 },
  storeName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs },
  storeBadgeText: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '500' },
  viewStoreButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.brand.orange,
    borderRadius: BorderRadius.sm },
  viewStoreButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600' },
  priceContainer: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  priceLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs },
  priceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  priceValue: {
    ...Typography.h1,
    fontWeight: '800',
    color: colors.brand.orange },
  originalPrice: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through' },
  cashbackBadge: {
    backgroundColor: colors.brand.orange,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center' },
  cashbackText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
    marginTop: Spacing.xs },
  cashbackAmount: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '800',
    marginTop: 2 },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md },
  discountText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '700' },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base },
  detailItem: {
    width: (screenWidth - 48) / 2,
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center' },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.tint.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm },
  detailLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs },
  detailValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary },
  descriptionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md },
  description: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text.secondary },
  bookButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 1001 },
  priceInfoCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default },
  priceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  priceInfoLeft: {
    flex: 1 },
  priceInfoLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5 },
  priceInfoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  priceInfoValue: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5 },
  priceInfoOriginal: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
    fontWeight: '600' },
  cashbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.warningScale[200] },
  cashbackInfoText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.amberDark },
  bookButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.brand.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8 },
  bookButtonGradient: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl },
  bookButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  bookButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  bookButtonText: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: '800',
    letterSpacing: 0.5 },
  bookButtonRight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center' } });

export default withErrorBoundary(BusDetailsPage, 'BusId');

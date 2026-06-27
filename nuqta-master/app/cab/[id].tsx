// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Cab Details Page - Dedicated page for cab bookings
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import productsApi from '@/services/productsApi';
import { useWishlist } from '@/contexts/WishlistContext';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useProductReviews } from '@/hooks/useProductReviews';
import { useCurrency, useGetCurrencySymbol, useGetLocale, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
import CabBookingFlow from '../../components/cab/CabBookingFlow';
import CabBookingConfirmation from '../../components/cab/CabBookingConfirmation';
import RelatedCabsSection from '../../components/cab/RelatedCabsSection';
import CabInfoCard from '../../components/cab/CabInfoCard';
import CabAmenities from '../../components/cab/CabAmenities';
import CabCancellationPolicy from '../../components/cab/CabCancellationPolicy';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CabDetails {
  id: string;
  name: string;
  route?: {
    from: string;
    to: string;
  };
  cabType?: string;
  price: number;
  pricePerKm?: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  description: string;
  duration: number; // in minutes
  distance?: number; // in km
  pickupTime?: string;
  dropoffTime?: string;
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
  vehicleOptions: {
    sedan: { price: number; available: boolean };
    suv: { price: number; available: boolean };
    premium: { price: number; available: boolean };
  };
}

interface BookingData {
  pickupDate: Date;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  tripType: 'one-way' | 'round-trip';
  passengers: {
    adults: number;
    children: number;
  };
  vehicleType: 'sedan' | 'suv' | 'premium';
  selectedExtras: {
    driver?: boolean;
    tollCharges?: boolean;
    parking?: boolean;
    waitingTime?: boolean;
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
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

function CabDetailsPage() {
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

  const [cab, setCab] = useState<CabDetails | null>(null);
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
      loadCabDetails();
    }
  }, [id, isAuthenticated, authLoading]);

  const loadCabDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await productsApi.getProductById(id as string);

      if (!response.success || !response.data) {
        if (!isMounted()) return;
        setError('Cab not found');
        return;
      }

      const productData = response.data;

      // Check if this is a cab service
      const isCab = productData.serviceCategory?.slug === 'cab' || 
                   productData.category?.slug === 'cab' ||
                   productData.name?.toLowerCase().includes('cab') ||
                   productData.name?.toLowerCase().includes('taxi');

      if (!isCab) {
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
          /(.+?)\s+to\s+(.+?)\s+cab/i,
          /(.+?)\s*-\s*(.+?)\s+cab/i,
          /(.+?)\s+→\s+(.+?)\s+cab/i,
        ];
        for (const pattern of routePatterns) {
          const match = productData.name.match(pattern);
          if (match) {
            if (!from) from = match[1].trim();
            if (!to) to = match[2] ? match[2].trim() : '';
            break;
          }
        }
        if (!from) from = 'Pickup Location';
        if (!to) to = 'Dropoff Location';
      }

      // Duration and times: prefer specs
      const rawDuration = productData.serviceDetails?.duration;
      const duration = (typeof rawDuration === 'number' && !isNaN(rawDuration) && rawDuration > 0) ? rawDuration : 60;
      const specPickupTime = getSpec('departureTime');
      const specDropoffTime = getSpec('arrivalTime');
      let pickupTime = specPickupTime;
      let dropoffTime = specDropoffTime;
      if (!pickupTime || !dropoffTime) {
        const durationHours = Math.floor(duration / 60);
        const durationMins = duration % 60;
        const basePickupHour = 9, basePickupMin = 0;
        const dropoffHour = (basePickupHour + durationHours + Math.floor((basePickupMin + durationMins) / 60)) % 24;
        const dropoffMin = (basePickupMin + durationMins) % 60;
        const formatTime = (h: number, m: number) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if (!pickupTime) pickupTime = formatTime(basePickupHour, basePickupMin);
        if (!dropoffTime) dropoffTime = formatTime(dropoffHour, dropoffMin);
      }

      // Provider and cab type: prefer specs
      const providerName = getSpec('providerName');
      const specCabType = getSpec('cabType');
      const cabType = specCabType || (() => {
        if (productData.name.toLowerCase().includes('outstation')) return 'Outstation';
        if (productData.name.toLowerCase().includes('airport')) return 'Airport Transfer';
        if (productData.name.toLowerCase().includes('city')) return 'City Ride';
        return 'Intercity';
      })();

      // Get cashback
      const cashbackPercentage = (() => {
        if (productData.cashback?.percentage) return productData.cashback.percentage;
        if (productData.serviceCategory?.cashbackPercentage) return productData.serviceCategory.cashbackPercentage;
        if (typeof productData.cashback === 'number') return productData.cashback;
        return 20;
      })();

      // Calculate price
      const basePrice = productData.pricing?.selling || productData.pricing?.basePrice || productData.price?.current || 0;
      const originalPrice = productData.pricing?.original || productData.pricing?.basePrice || productData.price?.original;
      const calculatedDiscount = originalPrice && basePrice && originalPrice > basePrice
        ? Math.round(((originalPrice - basePrice) / originalPrice) * 100)
        : productData.pricing?.discount || 0;

      // Distance
      let pricePerKm: number | undefined = undefined;
      let estimatedDistance: number | undefined = undefined;
      const specDistance = getSpec('distance');
      if (specDistance) {
        estimatedDistance = parseInt(specDistance) || undefined;
      } else {
        if (productData.price && typeof productData.price === 'number' && productData.price > 0) pricePerKm = productData.price;
        else if (basePrice > 0 && basePrice < 100) pricePerKm = basePrice;
        if (pricePerKm && basePrice > 0 && pricePerKm > 0) {
          const calc = basePrice / pricePerKm;
          if (!isNaN(calc) && isFinite(calc) && calc > 0) estimatedDistance = Math.round(calc);
        }
        if (!estimatedDistance && productData.serviceDetails?.distance) {
          const sd = productData.serviceDetails.distance;
          if (typeof sd === 'number' && !isNaN(sd) && sd > 0) estimatedDistance = Math.round(sd);
        }
      }

      // Vehicle options: prefer specs
      const specVehicleTypes = getSpec('vehicleOptions') || getSpec('classOptions');
      const buildVehicleOptions = () => {
        const defaults = {
          sedan: { price: basePrice, available: true },
          suv: { price: Math.round(basePrice * 1.5), available: true },
          premium: { price: Math.round(basePrice * 2), available: true } };
        if (!specVehicleTypes) return defaults;
        const types = specVehicleTypes.split(',').map((t: string) => t.trim().toLowerCase());
        return {
          sedan: { price: basePrice, available: types.includes('sedan') || types.length === 0 },
          suv: { price: Math.round(basePrice * 1.5), available: types.includes('suv') },
          premium: { price: Math.round(basePrice * 2), available: types.includes('premium') } };
      };

      // Transform to CabDetails
      const cabDetails: CabDetails = {
        id: productData.id || productData._id,
        name: productData.name,
        route: { from, to },
        cabType,
        price: basePrice,
        pricePerKm,
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
            if ((url.toLowerCase().includes('bus') || url.toLowerCase().includes('train') ||
                 url.toLowerCase().includes('airplane') || url.toLowerCase().includes('hotel')) &&
                !url.toLowerCase().includes('cab') && !url.toLowerCase().includes('taxi') && !url.toLowerCase().includes('car')) {
              return false;
            }
            return true;
          });
          return validatedImages;
        })(),
        description: productData.description || productData.shortDescription || 'Comfortable cab service with professional drivers.',
        duration,
        distance: estimatedDistance,
        pickupTime,
        dropoffTime,
        cashback: {
          percentage: cashbackPercentage,
          amount: Math.round(basePrice * cashbackPercentage / 100) },
        rating: reviewSummary?.averageRating || productData.ratings?.average || 0,
        reviewCount: reviewSummary?.totalReviews || productData.ratings?.count || 0,
        store: {
          id: productData.store?.id || productData.store?._id,
          name: providerName || productData.store?.name || 'CityRide Cabs',
          logo: productData.store?.logo },
        amenities: (() => {
          const tagAmenities: Record<string, string[]> = {
            'premium': ['AC', 'GPS', 'Music', 'Wi-Fi', 'Charging Point', 'Professional Driver'],
            'comfort': ['AC', 'GPS', 'Music', 'Professional Driver'],
            'budget': ['AC', 'GPS', 'Professional Driver'] };
          const tags = productData.tags || [];
          for (const [key, amenities] of Object.entries(tagAmenities)) {
            if (tags.some((tag: string) => tag.toLowerCase().includes(key))) return amenities;
          }
          return ['AC', 'GPS', 'Music', 'Professional Driver'];
        })(),
        cancellationPolicy: {
          freeCancellation: productData.specifications?.some((s: any) =>
            s.key?.toLowerCase().includes('cancellation') && s.value?.toLowerCase().includes('free')
          ) || true,
          cancellationDeadline: '2',
          refundPercentage: 90 },
        vehicleOptions: buildVehicleOptions() };

      if (!isMounted()) return;
      setCab(cabDetails);
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load cab details. Please try again.');
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
    if (!cab) return;
    
    try {
      if (isInWishlist(cab.id)) {
        await removeFromWishlist(cab.id);
      } else {
        await addToWishlist(cab.id);
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

  if (error || !cab) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Cab not found'}</Text>
          <Pressable style={styles.retryButton} onPress={loadCabDetails}>
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
            const imageUrl = cab.images?.[selectedImageIndex] || cab.images?.[0];
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
                <Ionicons name="car" size={64} color={Colors.text.tertiary} />
                <Text style={styles.placeholderText}>Cab Image</Text>
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
                  name={isInWishlist(cab.id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isInWishlist(cab.id) ? colors.error : colors.background.primary}
                />
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color={Colors.text.inverse} />
              </Pressable>
            </View>
          </View>

          {/* Image Indicators */}
          {cab.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {cab.images.map((_, index) => (
                <View
                  key={`cab-img-${index}`}
                  style={[
                    styles.indicator,
                    selectedImageIndex === index && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Cab Info Card */}
        <View style={styles.infoCardWrapper}>
          <CabInfoCard cab={cab} />
        </View>

        {/* Store/Provider Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={24} color={colors.brand.amber} />
            <Text style={styles.sectionTitle}>Service Provider</Text>
          </View>
          <View style={styles.storeCard}>
            {cab.store.logo && (
              <CachedImage source={cab.store.logo} style={styles.storeLogo} />
            )}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{cab.store.name}</Text>
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
                  <Text style={styles.priceValue}>
                    {cab.pricePerKm ? `${currencySymbol}${cab.pricePerKm}/km` : `${currencySymbol}${cab.price.toLocaleString(locale)}`}
                  </Text>
                  {cab.originalPrice && cab.originalPrice > cab.price && (
                    <Text style={styles.originalPrice}>{currencySymbol}{cab.originalPrice.toLocaleString(locale)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.cashbackBadge}>
                <Ionicons name="cash" size={20} color={Colors.text.inverse} />
                <Text style={styles.cashbackText}>
                  {cab.cashback.percentage}% Cashback
                </Text>
                <Text style={styles.cashbackAmount}>{currencySymbol}{cab.cashback.amount}</Text>
              </View>
            </View>
            {cab.discount && cab.discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{cab.discount}% OFF</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={colors.brand.amber} />
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time-outline" size={20} color={colors.brand.amber} />
              </View>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {Math.floor(cab.duration / 60)}h {cab.duration % 60}m
              </Text>
            </View>
            {cab.distance && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="location-outline" size={20} color={colors.brand.amber} />
                </View>
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>{cab.distance} km</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="car-outline" size={20} color={colors.brand.amber} />
              </View>
              <Text style={styles.detailLabel}>Cab Type</Text>
              <Text style={styles.detailValue}>{cab.cabType || 'Intercity'}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="star" size={20} color={colors.brand.amber} />
              </View>
              <Text style={styles.detailLabel}>Rating</Text>
              <Text style={styles.detailValue}>{cab.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={24} color={colors.brand.amber} />
            <Text style={styles.sectionTitle}>Amenities</Text>
          </View>
          <CabAmenities amenities={cab.amenities} />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.descriptionTitle}>About This Service</Text>
          <Text style={styles.description}>{cab.description}</Text>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <CabCancellationPolicy policy={cab.cancellationPolicy} />
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <ProductReviewsSection
            productId={id as string}
            productName={cab.name}
            reviews={reviews}
            summary={reviewSummary}
            isLoading={reviewsLoading}
            onRefresh={refreshReviews}
          />
        </View>

        {/* Related Cabs */}
        <View style={styles.section}>
          <RelatedCabsSection currentCabId={cab.id} />
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
                  {cab.pricePerKm ? `${currencySymbol}${cab.pricePerKm}/km` : `${currencySymbol}${cab.price.toLocaleString(locale)}`}
                </Text>
                {cab.originalPrice && cab.originalPrice > cab.price && (
                  <Text style={styles.priceInfoOriginal}>{currencySymbol}{cab.originalPrice.toLocaleString(locale)}</Text>
                )}
              </View>
            </View>
            <View style={styles.cashbackInfo}>
              <Ionicons name="cash" size={18} color={colors.brand.amber} />
              <Text style={styles.cashbackInfoText}>{cab.cashback.percentage}% Cashback</Text>
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
              colors={[colors.brand.amber, '#CA8A04', '#A16207']}
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
        {cab && (
          <CabBookingFlow
            cab={cab}
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
        {bookingData && cab && (
          <CabBookingConfirmation
            cab={cab}
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
    backgroundColor: colors.brand.amber,
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
    backgroundColor: colors.brand.amber,
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
    color: colors.brand.amber },
  originalPrice: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through' },
  cashbackBadge: {
    backgroundColor: colors.brand.amber,
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
    shadowColor: colors.brand.amber,
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

export default withErrorBoundary(CabDetailsPage, 'CabId');

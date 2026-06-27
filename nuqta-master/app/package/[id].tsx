// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Package Details Page - Dedicated page for package bookings
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
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import productsApi from '@/services/productsApi';
import { useWishlist } from '@/contexts/WishlistContext';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useProductReviews } from '@/hooks/useProductReviews';
import { useCurrency, useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
import PackageBookingFlow from '../../components/package/PackageBookingFlow';
import PackageBookingConfirmation from '../../components/package/PackageBookingConfirmation';
import RelatedPackagesSection from '../../components/package/RelatedPackagesSection';
import PackageInfoCard from '../../components/package/PackageInfoCard';
import PackageAmenities from '../../components/package/PackageAmenities';
import PackageCancellationPolicy from '../../components/package/PackageCancellationPolicy';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PackageDetails {
  id: string;
  name: string;
  destination?: string;
  duration?: {
    nights: number;
    days: number;
  };
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  description: string;
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
  inclusions?: string[];
  cancellationPolicy: {
    freeCancellation: boolean;
    cancellationDeadline: string; // days before travel
    refundPercentage: number;
  };
  accommodationOptions: {
    standard: { price: number; available: boolean; description?: string };
    deluxe: { price: number; available: boolean; description?: string };
    luxury: { price: number; available: boolean; description?: string };
  };
}

interface BookingData {
  travelDate: Date;
  returnDate: Date;
  travelers: {
    adults: number;
    children: number;
  };
  accommodationType: 'standard' | 'deluxe' | 'luxury';
  mealPlan: 'none' | 'breakfast' | 'halfBoard' | 'fullBoard';
  selectedAddons: {
    sightseeing?: boolean;
    transfers?: boolean;
    travelInsurance?: boolean;
    guide?: boolean;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  travelerDetails: Array<{
    firstName: string;
    lastName: string;
    age: number;
    gender: 'male' | 'female' | 'other';
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

function PackageDetailsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const currency = useCurrency();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  const [packageData, setPackageData] = useState<PackageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  
  // Animation for button
  const buttonScale = useSharedValue(1);

  // Reviews
  const {
    reviews,
    summary: reviewSummary,
    isLoading: reviewsLoading,
    refreshReviews } = useProductReviews({
    productId: id as string,
    autoLoad: true });

  useEffect(() => {
    if (id) {
      loadPackageDetails();
    }
  }, [id]);

  const loadPackageDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await productsApi.getProductById(id as string);

      if (!response.success || !response.data) {
        if (!isMounted()) return;
        setError('Package not found');
        return;
      }

      const productData = response.data;

      // Check if this is a package service
      const isPackage = productData.serviceCategory?.slug === 'packages' || 
                       productData.category?.slug === 'packages' ||
                       productData.name?.toLowerCase().includes('package') ||
                       productData.name?.toLowerCase().includes('tour');

      if (!isPackage) {
        router.replace(`/product-page?cardId=${id}&cardType=product`);
        return;
      }

      // Helper to read from specifications array
      const specs = productData.specifications || [];
      const getSpec = (key: string) => specs.find((s: any) => s.key === key)?.value || '';

      // Destination: prefer specs, fallback to name parsing
      const specDestination = getSpec('destination');
      let destination = specDestination || '';
      let nights = 3;
      let days = 4;

      // Duration: prefer specs
      const specNights = getSpec('nights');
      const specDays = getSpec('days');
      if (specNights) nights = parseInt(specNights) || 3;
      if (specDays) days = parseInt(specDays) || nights + 1;

      if (!destination) {
        const namePatterns = [
          /(.+?)\s+(\d+)N\/(\d+)D/i,
          /(.+?)\s+(\d+)\s+nights/i,
          /(.+?)\s+package/i,
        ];
        for (const pattern of namePatterns) {
          const match = productData.name.match(pattern);
          if (match) {
            destination = match[1].trim();
            if (!specNights && match[2]) nights = parseInt(match[2]) || 3;
            if (!specDays && match[3]) days = parseInt(match[3]) || nights + 1;
            break;
          }
        }
      }

      // If still no destination, try known names
      if (!destination) {
        const destinations = ['Goa', 'Kerala', 'Rajasthan', 'Himachal', 'Manali', 'Shimla', 'Darjeeling'];
        for (const dest of destinations) {
          if (productData.name.toLowerCase().includes(dest.toLowerCase())) {
            destination = dest;
            break;
          }
        }
        if (!destination) destination = 'Travel Destination';
      }

      // Provider name and inclusions: prefer specs
      const providerName = getSpec('providerName');
      const specInclusions = getSpec('inclusions');
      const inclusions = specInclusions
        ? specInclusions.split(',').map((i: string) => i.trim())
        : ['Hotel Accommodation', 'Meals', 'Transport', 'Sightseeing', 'Entry Tickets'];

      // Meal plan from specs
      const specMealPlan = getSpec('mealPlan');

      // Get cashback
      const cashbackPercentage = (() => {
        if (productData.cashback?.percentage) return productData.cashback.percentage;
        if (productData.serviceCategory?.cashbackPercentage) return productData.serviceCategory.cashbackPercentage;
        if (productData.category?.maxCashback) return productData.category.maxCashback;
        if (typeof productData.cashback === 'number') return productData.cashback;
        return 22;
      })();

      // Calculate price
      const basePrice = productData.pricing?.selling || productData.pricing?.basePrice || productData.price?.current || 0;
      const originalPrice = productData.pricing?.original || productData.pricing?.basePrice || productData.price?.original;
      const calculatedDiscount = originalPrice && basePrice && originalPrice > basePrice
        ? Math.round(((originalPrice - basePrice) / originalPrice) * 100)
        : productData.pricing?.discount || 0;

      // Accommodation options: prefer specs
      const specAccommodation = getSpec('accommodationTypes') || getSpec('roomTypes');
      const buildAccommodationOptions = () => {
        const defaults = {
          standard: { price: basePrice, available: true, description: 'Comfortable standard accommodation' },
          deluxe: { price: Math.round(basePrice * 1.3), available: true, description: 'Premium deluxe accommodation' },
          luxury: { price: Math.round(basePrice * 1.6), available: true, description: 'Luxury accommodation with premium amenities' } };
        if (!specAccommodation) return defaults;
        const types = specAccommodation.split(',').map((t: string) => t.trim().toLowerCase());
        return {
          standard: { ...defaults.standard, available: types.includes('standard') || types.length === 0 },
          deluxe: { ...defaults.deluxe, available: types.includes('deluxe') },
          luxury: { ...defaults.luxury, available: types.includes('luxury') } };
      };

      // Transform to PackageDetails
      const packageDetails: PackageDetails = {
        id: productData.id || productData._id,
        name: productData.name,
        destination,
        duration: { nights, days },
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
          return processedImages;
        })(),
        description: productData.description || productData.shortDescription || 'Complete travel package with hotel, meals, and sightseeing.',
        cashback: {
          percentage: cashbackPercentage,
          amount: Math.round(basePrice * cashbackPercentage / 100) },
        rating: reviewSummary?.averageRating || productData.ratings?.average || 0,
        reviewCount: reviewSummary?.totalReviews || productData.ratings?.count || 0,
        store: {
          id: productData.store?.id || productData.store?._id,
          name: providerName || productData.store?.name || 'Wanderlust Tours',
          logo: productData.store?.logo },
        amenities: (() => {
          const tagAmenities: Record<string, string[]> = {
            'luxury': ['Hotel', 'Meals', 'Transport', 'Sightseeing', 'Guide', 'Wi-Fi', 'AC'],
            'premium': ['Hotel', 'Meals', 'Transport', 'Sightseeing', 'Wi-Fi'],
            'budget': ['Hotel', 'Breakfast', 'Transport', 'Sightseeing'] };
          const tags = productData.tags || [];
          for (const [key, amenities] of Object.entries(tagAmenities)) {
            if (tags.some((tag: string) => tag.toLowerCase().includes(key))) return amenities;
          }
          return ['Hotel', 'Meals', 'Transport', 'Sightseeing', 'Wi-Fi'];
        })(),
        inclusions,
        cancellationPolicy: {
          freeCancellation: productData.specifications?.some((s: any) =>
            s.key?.toLowerCase().includes('cancellation') && s.value?.toLowerCase().includes('free')
          ) || true,
          cancellationDeadline: '7',
          refundPercentage: 80 },
        accommodationOptions: buildAccommodationOptions() };

      if (!isMounted()) return;
      setPackageData(packageDetails);
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load package details. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const buttonScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleBookNow = () => {
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
    if (!packageData) return;
    
    try {
      if (isInWishlist(packageData.id)) {
        await removeFromWishlist(packageData.id);
      } else {
        await addToWishlist(packageData.id);
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

  if (error || !packageData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Package not found'}</Text>
          <Pressable style={styles.retryButton} onPress={loadPackageDetails}>
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
            const imageUrl = packageData.images?.[selectedImageIndex] || packageData.images?.[0];
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
                <Ionicons name="bag" size={64} color={Colors.text.tertiary} />
                <Text style={styles.placeholderText}>Package Image</Text>
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
                  name={isInWishlist(packageData.id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isInWishlist(packageData.id) ? colors.error : colors.background.primary}
                />
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color={Colors.text.inverse} />
              </Pressable>
            </View>
          </View>

          {packageData.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {packageData.images.map((_, index) => (
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

        {/* Package Info Card */}
        <View style={styles.infoCardWrapper}>
          <PackageInfoCard package={packageData} />
        </View>

        {/* Store/Provider Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={24} color={Colors.brand.purpleLight} />
            <Text style={styles.sectionTitle}>Tour Operator</Text>
          </View>
          <View style={styles.storeCard}>
            {packageData.store.logo && (
              <CachedImage source={packageData.store.logo} style={styles.storeLogo} />
            )}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{packageData.store.name}</Text>
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
                  <Text style={styles.priceValue}>{currencySymbol}{packageData.price.toLocaleString(locale)}</Text>
                  {packageData.originalPrice && packageData.originalPrice > packageData.price && (
                    <Text style={styles.originalPrice}>{currencySymbol}{packageData.originalPrice.toLocaleString(locale)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.cashbackBadge}>
                <Ionicons name="cash" size={20} color={Colors.text.inverse} />
                <Text style={styles.cashbackText}>
                  {packageData.cashback.percentage}% Cashback
                </Text>
                <Text style={styles.cashbackAmount}>{currencySymbol}{packageData.cashback.amount}</Text>
              </View>
            </View>
            {packageData.discount && packageData.discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{packageData.discount}% OFF</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={Colors.brand.purpleLight} />
            <Text style={styles.sectionTitle}>Package Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="calendar-outline" size={20} color={Colors.brand.purpleLight} />
              </View>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {packageData.duration?.nights || 3}N/{packageData.duration?.days || 4}D
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="location-outline" size={20} color={Colors.brand.purpleLight} />
              </View>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>{packageData.destination || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="star" size={20} color={Colors.brand.purpleLight} />
              </View>
              <Text style={styles.detailLabel}>Rating</Text>
              <Text style={styles.detailValue}>{packageData.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="people-outline" size={20} color={Colors.brand.purpleLight} />
              </View>
              <Text style={styles.detailLabel}>Reviews</Text>
              <Text style={styles.detailValue}>{packageData.reviewCount}</Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={24} color={Colors.brand.purpleLight} />
            <Text style={styles.sectionTitle}>Inclusions & Amenities</Text>
          </View>
          <PackageAmenities amenities={packageData.amenities} inclusions={packageData.inclusions} />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.descriptionTitle}>About This Package</Text>
          <Text style={styles.description}>{packageData.description}</Text>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <PackageCancellationPolicy policy={packageData.cancellationPolicy} />
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <ProductReviewsSection
            productId={id as string}
            productName={packageData.name}
            reviews={reviews}
            summary={reviewSummary}
            isLoading={reviewsLoading}
            onRefresh={refreshReviews}
          />
        </View>

        {/* Related Packages */}
        <View style={styles.section}>
          <RelatedPackagesSection currentPackageId={packageData.id} />
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bookButtonContainer}>
        <View style={styles.priceInfoCard}>
          <View style={styles.priceInfoRow}>
            <View style={styles.priceInfoLeft}>
              <Text style={styles.priceInfoLabel}>Total Price</Text>
              <View style={styles.priceInfoValueContainer}>
                <Text style={styles.priceInfoValue}>
                  {currencySymbol}{packageData.price.toLocaleString(locale)}
                </Text>
                {packageData.originalPrice && packageData.originalPrice > packageData.price && (
                  <Text style={styles.priceInfoOriginal}>{currencySymbol}{packageData.originalPrice.toLocaleString(locale)}</Text>
                )}
              </View>
            </View>
            <View style={styles.cashbackInfo}>
              <Ionicons name="cash" size={18} color={Colors.brand.purpleLight} />
              <Text style={styles.cashbackInfoText}>{packageData.cashback.percentage}% Cashback</Text>
            </View>
          </View>
        </View>
        
        <Animated.View style={buttonScaleStyle}>
          <Pressable 
            style={styles.bookButton} 
            onPress={handleBookNow}
           
          >
            <LinearGradient
              colors={[colors.brand.purpleLight, colors.brand.purple, colors.brand.purpleDeep]}
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
        {packageData && (
          <PackageBookingFlow
            package={packageData}
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
        {bookingData && packageData && (
          <PackageBookingConfirmation
            package={packageData}
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
    backgroundColor: Colors.brand.purpleLight,
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
    paddingHorizontal: 16 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center' },
  headerRightActions: {
    flexDirection: 'row',
    gap: 12 },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center' },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8 },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)' },
  indicatorActive: {
    backgroundColor: colors.background.primary,
    width: 24 },
  infoCardWrapper: {
    marginTop: -20,
    marginHorizontal: 16,
    marginBottom: 24 },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16 },
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
    backgroundColor: Colors.brand.purpleLight,
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
    gap: 12 },
  priceValue: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.brand.purpleLight },
  originalPrice: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through' },
  cashbackBadge: {
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12 },
  discountText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '700' },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16 },
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
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8 },
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
    gap: 12 },
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
    backgroundColor: colors.tint.pink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF' },
  cashbackInfoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8' },
  bookButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8 },
  bookButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24 },
  bookButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  bookButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 },
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

export default withErrorBoundary(PackageDetailsPage, 'PackageId');

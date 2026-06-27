// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Hotel Details Page - Dedicated page for hotel bookings
 * Production-ready with complete booking flow
 */

import { colors } from '@/constants/theme';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import productsApi from '@/services/productsApi';
import { useWishlist } from '@/contexts/WishlistContext';
import { useProductReviews } from '@/hooks/useProductReviews';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useCurrency, useGetCurrencySymbol, useGetLocale, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
import HotelBookingFlow from '../../components/hotel/HotelBookingFlow';
import HotelBookingConfirmation from '../../components/hotel/HotelBookingConfirmation';
import RelatedHotelsSection from '../../components/hotel/RelatedHotelsSection';
import HotelInfoCard from '../../components/hotel/HotelInfoCard';
import HotelAmenities from '../../components/hotel/HotelAmenities';
import HotelCancellationPolicy from '../../components/hotel/HotelCancellationPolicy';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface HotelDetails {
  id: string;
  name: string;
  location: {
    city: string;
    address?: string;
    coordinates?: [number, number];
  };
  starRating?: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  pricePerNight: number;
  images: string[];
  description: string;
  checkInTime: string;
  checkOutTime: string;
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
    cancellationDeadline: string; // hours before check-in
    refundPercentage: number;
  };
  roomTypes: {
    standard: { price: number; available: boolean; description?: string };
    deluxe: { price: number; available: boolean; description?: string };
    suite: { price: number; available: boolean; description?: string };
  };
  roomFeatures: {
    beds: string;
    size: string;
    maxGuests: number;
  };
}

interface BookingData {
  checkInDate: Date;
  checkOutDate: Date;
  rooms: number;
  guests: {
    adults: number;
    children: number;
  };
  roomType: 'standard' | 'deluxe' | 'suite';
  selectedExtras: {
    breakfast?: boolean;
    wifi?: boolean;
    parking?: boolean;
    lateCheckout?: boolean;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  guestDetails: Array<{
    firstName: string;
    lastName: string;
    email?: string;
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

function HotelDetailsPage() {
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

  const [hotel, setHotel] = useState<HotelDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Reviews
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
    if (id) {
      loadHotelDetails();
    }
  }, [id, isAuthenticated, authLoading]);

  const loadHotelDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await productsApi.getProductById(id as string);

      if (!response.success || !response.data) {
        if (!isMounted()) return;
        setError('Hotel not found');
        return;
      }

      const productData = response.data;

      // Check if this is a hotel service
      const isHotel = productData.serviceCategory?.slug === 'hotels' || 
                       productData.category?.slug === 'hotels' ||
                       productData.name?.toLowerCase().includes('hotel');

      if (!isHotel) {
        // Redirect to regular product page
        router.replace(`/product-page?cardId=${id}&cardType=product`);
        return;
      }

      // Helper to read from specifications array
      const specs = productData.specifications || [];
      const getSpec = (key: string) => specs.find((s: any) => s.key === key)?.value || '';

      // Location: prefer specs, fallback to name parsing
      const specCity = getSpec('location') || getSpec('city');
      const city = specCity || (() => {
        const locationMatch = productData.name.match(/(.+?)\s+(hotel|resort|inn|lodge)/i);
        return locationMatch ? locationMatch[1].trim() : 'City Center';
      })();

      // Check-in/Check-out times: prefer specs
      const checkInTime = getSpec('checkInTime') || '14:00';
      const checkOutTime = getSpec('checkOutTime') || '11:00';

      // Get cashback from multiple sources (handle all possible formats)
      const cashbackPercentage = (() => {
        if (productData.cashback?.percentage) return productData.cashback.percentage;
        if (productData.serviceCategory?.cashbackPercentage) return productData.serviceCategory.cashbackPercentage;
        if (productData.category?.maxCashback) return productData.category.maxCashback;
        if (typeof productData.cashback === 'number') return productData.cashback;
        return 15;
      })();

      // Calculate price properly
      const basePrice = productData.pricing?.selling || productData.pricing?.basePrice || productData.price?.current || 0;
      const originalPrice = productData.pricing?.original || productData.pricing?.basePrice || productData.price?.original;
      const calculatedDiscount = originalPrice && basePrice && originalPrice > basePrice
        ? Math.round(((originalPrice - basePrice) / originalPrice) * 100)
        : productData.pricing?.discount || 0;

      // Star rating: prefer specs, fallback to name/price
      const specStarRating = getSpec('starRating');
      const starRating = specStarRating ? parseInt(specStarRating) : (() => {
        const starMatch = productData.name.match(/(\d+)\s*star/i);
        if (starMatch) return parseInt(starMatch[1]);
        if (basePrice >= 10000) return 5;
        if (basePrice >= 5000) return 4;
        if (basePrice >= 2000) return 3;
        return 2;
      })();

      // Provider name: prefer specs
      const providerName = getSpec('providerName');

      // Room features: prefer specs
      const beds = getSpec('beds') || '1 King Bed';
      const roomSize = getSpec('roomSize') || '25 sqm';
      const maxGuests = getSpec('maxGuests') ? parseInt(getSpec('maxGuests')) : 2;

      // Room types: prefer specs, fallback to all available
      const specRoomTypes = getSpec('roomTypes');
      const buildRoomTypes = () => {
        const defaults = {
          standard: { price: basePrice, available: true, description: 'Comfortable room with essential amenities' },
          deluxe: { price: Math.round(basePrice * 1.5), available: true, description: 'Spacious room with premium amenities' },
          suite: { price: Math.round(basePrice * 2.5), available: true, description: 'Luxury suite with premium features' },
        };
        if (!specRoomTypes) return defaults;
        const types = specRoomTypes.split(',').map((t: string) => t.trim().toLowerCase());
        return {
          standard: { ...defaults.standard, available: types.includes('standard') || types.length === 0 },
          deluxe: { ...defaults.deluxe, available: types.includes('deluxe') },
          suite: { ...defaults.suite, available: types.includes('suite') },
        };
      };

      // Transform to HotelDetails
      const hotelDetails: HotelDetails = {
        id: productData.id || productData._id,
        name: productData.name,
        location: {
          city,
          address: productData.store?.location?.address || `${city} City Center`,
          coordinates: productData.store?.location?.coordinates,
        },
        starRating,
        price: basePrice,
        originalPrice: originalPrice && originalPrice > basePrice ? originalPrice : undefined,
        discount: calculatedDiscount > 0 ? calculatedDiscount : undefined,
        pricePerNight: basePrice,
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
        description: productData.description || productData.shortDescription || 'Comfortable accommodation with excellent service.',
        checkInTime,
        checkOutTime,
        cashback: {
          percentage: cashbackPercentage,
          amount: Math.round(basePrice * cashbackPercentage / 100),
        },
        rating: reviewSummary?.averageRating || productData.ratings?.average || 0,
        reviewCount: reviewSummary?.totalReviews || productData.ratings?.count || 0,
        store: {
          id: productData.store?.id || productData.store?._id,
          name: providerName || productData.store?.name || 'Premium Hotels',
          logo: productData.store?.logo,
        },
        amenities: (() => {
          const tagAmenities: Record<string, string[]> = {
            'luxury': ['Wi-Fi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Room Service', 'Concierge', 'Parking'],
            'budget': ['Wi-Fi', 'Parking', '24/7 Reception'],
            'business': ['Wi-Fi', 'Business Center', 'Meeting Rooms', 'Gym', 'Restaurant'],
          };
          const tags = productData.tags || [];
          for (const [key, amenities] of Object.entries(tagAmenities)) {
            if (tags.some((tag: string) => tag.toLowerCase().includes(key))) return amenities;
          }
          if (basePrice >= 10000) return ['Wi-Fi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Room Service'];
          if (basePrice >= 5000) return ['Wi-Fi', 'Pool', 'Gym', 'Restaurant'];
          return ['Wi-Fi', 'Parking', '24/7 Reception'];
        })(),
        cancellationPolicy: {
          freeCancellation: productData.specifications?.some((s: any) =>
            s.key?.toLowerCase().includes('cancellation') && s.value?.toLowerCase().includes('free')
          ) || true,
          cancellationDeadline: '24',
          refundPercentage: 80,
        },
        roomTypes: buildRoomTypes(),
        roomFeatures: { beds, size: roomSize, maxGuests },
      };

      if (!isMounted()) return;
      setHotel(hotelDetails);
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load hotel details. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleBookNow = () => {
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
          currency: currency || 'INR',
        }
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
    if (!hotel) return;
    
    try {
      if (isInWishlist(hotel.id)) {
        await removeFromWishlist(hotel.id);
      } else {
        await addToWishlist(hotel.id);
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

  if (error || !hotel) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Hotel not found'}</Text>
          <Pressable style={styles.retryButton} onPress={loadHotelDetails}>
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
            const imageUrl = hotel.images?.[selectedImageIndex] || hotel.images?.[0];
            const hasValidImage = imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0;
            
            if (hasValidImage && !imageError) {
              return (
                <CachedImage
                  source={imageUrl}
                  style={styles.headerImage}
                  contentFit="cover"
                  onError={(error) => {
                    setImageError(true);
                  }}
                  onLoadStart={() => {
                    setImageError(false);
                  }}
                  onLoad={() => {
                  }}
                />
              );
            }
            
            return (
              <View style={[styles.headerImage, styles.placeholderImage]}>
                <Ionicons name="bed" size={64} color={Colors.text.tertiary} />
                <Text style={styles.placeholderText}>Hotel Image</Text>
                {imageUrl && (
                  <Text style={styles.placeholderSubtext}>
                    {imageError ? 'Failed to load image' : 'Loading...'}
                  </Text>
                )}
              </View>
            );
          })()}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.headerGradient}
          />
          
          {/* Back and Action Buttons */}
          <View style={styles.headerActions}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            
            <View style={styles.headerRightActions}>
              <Pressable
                style={styles.actionButton}
                onPress={handleFavorite}
              >
                <Ionicons
                  name={isInWishlist(hotel.id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isInWishlist(hotel.id) ? Colors.error : Colors.text.inverse}
                />
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color={Colors.text.inverse} />
              </Pressable>
            </View>
          </View>

          {/* Discount Badge */}
          {hotel.discount && hotel.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{hotel.discount}% OFF</Text>
            </View>
          )}

          {/* Image Carousel Indicators */}
          {hotel.images && hotel.images.length > 1 && (
            <View style={styles.carouselIndicators}>
              {hotel.images.map((_, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.indicator,
                    selectedImageIndex === index && styles.indicatorActive,
                  ]}
                  onPress={() => setSelectedImageIndex(index)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Hotel Info Card */}
        <View style={styles.hotelInfoWrapper}>
          <HotelInfoCard hotel={hotel} />
        </View>

        {/* Store/Hotel Chain Info */}
        {hotel.store && (
          <View style={styles.storeSection}>
            <View style={styles.storeHeader}>
              {hotel.store.logo ? (
                <CachedImage
                  source={hotel.store.logo}
                  style={styles.storeLogo}
                  contentFit="contain"
                  onError={() => {
                    // Logo failed to load
                  }}
                />
              ) : (
                <View style={styles.storeLogoPlaceholder}>
                  <Ionicons name="bed" size={24} color={colors.brand.pink} />
                </View>
              )}
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{hotel.store.name}</Text>
                <View style={styles.storeBadges}>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                  {hotel.rating > 0 && (
                    <View style={styles.ratingBadgeSmall}>
                      <Ionicons name="star" size={14} color={Colors.warning} />
                      <Text style={styles.ratingTextSmall}>
                        {hotel.rating.toFixed(1)} ({hotel.reviewCount})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.viewStoreButton}
                onPress={() => router.push(`/MainStorePage?storeId=${hotel.store.id}` as any)}
              >
                <Text style={styles.viewStoreButtonText}>View</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.brand.pink} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Price and Cashback - Enhanced UI */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <View style={styles.priceLeft}>
              <Text style={styles.priceLabel}>Starting from</Text>
              <View style={styles.priceContainer}>
                {hotel.originalPrice && hotel.originalPrice > hotel.price && (
                  <Text style={styles.originalPrice}>{currencySymbol}{hotel.originalPrice.toLocaleString(locale)}</Text>
                )}
                <Text style={styles.price}>{currencySymbol}{hotel.price.toLocaleString(locale)}</Text>
              </View>
              <Text style={styles.pricePerNight}>per night</Text>
              {hotel.discount && hotel.discount > 0 && (
                <View style={styles.discountTag}>
                  <Text style={styles.discountTagText}>Save {hotel.discount}%</Text>
                </View>
              )}
            </View>
            <View style={styles.cashbackBadge}>
              <View style={styles.cashbackIconContainer}>
                <Ionicons name="gift" size={20} color={Colors.gold} />
              </View>
              <View style={styles.cashbackContent}>
                <Text style={styles.cashbackText}>
                  {hotel.cashback.percentage}% Cashback
                </Text>
                <Text style={styles.cashbackAmount}>
                  Earn {currencySymbol}{hotel.cashback.amount.toLocaleString(locale)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Hotel Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={colors.brand.pink} />
            <Text style={styles.sectionTitle}>Hotel Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time" size={24} color={colors.brand.pink} />
              </View>
              <Text style={styles.detailLabel}>Check-in</Text>
              <Text style={styles.detailValue}>{hotel.checkInTime}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time-outline" size={24} color={colors.brand.pink} />
              </View>
              <Text style={styles.detailLabel}>Check-out</Text>
              <Text style={styles.detailValue}>{hotel.checkOutTime}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="star" size={24} color={colors.brand.pink} />
              </View>
              <Text style={styles.detailLabel}>Rating</Text>
              <Text style={styles.detailValue}>
                {hotel.starRating ? `${hotel.starRating} Star` : 'N/A'}
              </Text>
            </View>
          </View>
          
          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={Colors.text.tertiary} />
              <Text style={styles.infoText}>{hotel.location.address || hotel.location.city}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="bed-outline" size={18} color={Colors.text.tertiary} />
              <Text style={styles.infoText}>{hotel.roomFeatures.beds} • {hotel.roomFeatures.size}</Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <HotelAmenities amenities={hotel.amenities} />

        {/* Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={24} color={colors.brand.pink} />
            <Text style={styles.sectionTitle}>About This Hotel</Text>
          </View>
          <Text style={styles.description}>{hotel.description}</Text>
          
          {/* Key Highlights */}
          <View style={styles.highlightsContainer}>
            <View style={styles.highlightItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
              <Text style={styles.highlightText}>Best price guaranteed</Text>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
              <Text style={styles.highlightText}>Instant confirmation</Text>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
              <Text style={styles.highlightText}>Free cancellation</Text>
            </View>
          </View>
        </View>

        {/* Cancellation Policy */}
        <HotelCancellationPolicy policy={hotel.cancellationPolicy} />

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color={Colors.warning} />
              <Text style={styles.ratingText}>
                {hotel.rating.toFixed(1)} ({hotel.reviewCount})
              </Text>
            </View>
          </View>
          <ProductReviewsSection
            productId={hotel.id}
            reviews={reviews}
            summary={reviewSummary}
            isLoading={reviewsLoading}
            onRefresh={refreshReviews}
          />
        </View>

        {/* Related Hotels */}
        <RelatedHotelsSection
          currentHotelId={hotel.id}
          location={hotel.location}
        />

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bookButtonContainer}>
        <Pressable
          style={styles.bookButton}
          onPress={handleBookNow}
         
        >
          <LinearGradient
            colors={[colors.brand.pink, colors.deepPink]}
            style={styles.bookButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.bookButtonText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Booking Flow Modal */}
      <Modal
        visible={showBookingFlow}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingFlow(false)}
      >
        <HotelBookingFlow
          hotel={hotel}
          onComplete={handleBookingComplete}
          onClose={() => setShowBookingFlow(false)}
        />
      </Modal>

      {/* Booking Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowConfirmation(false); router.canGoBack() ? router.back() : router.replace('/(tabs)'); }}
      >
        {bookingData && (
          <HotelBookingConfirmation
            hotel={hotel}
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
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200, // Extra padding to ensure content is not hidden behind button and nav bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  loadingSubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: colors.brand.pink,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  headerContainer: {
    width: screenWidth,
    height: 320,
    position: 'relative',
    backgroundColor: Colors.border.default,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  placeholderSubtext: {
    marginTop: Spacing.xs,
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  headerActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 100,
    right: Spacing.base,
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    ...Shadows.subtle,
  },
  discountText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    zIndex: 5,
  },
  indicator: {
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    width: Spacing.xl,
    backgroundColor: Colors.background.primary,
  },
  hotelInfoWrapper: {
    marginHorizontal: Spacing.lg,
    marginTop: -40,
    marginBottom: Spacing.lg,
    zIndex: 5,
  },
  storeSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  storeLogo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.pinkMist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  storeBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.linen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  verifiedText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.successScale[700],
  },
  ratingBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warningScale[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  ratingTextSmall: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.warningScale[700],
  },
  viewStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.brand.pink,
    backgroundColor: colors.pinkMist,
  },
  viewStoreButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.brand.pink,
  },
  priceSection: {
    padding: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    ...Shadows.subtle,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.base,
  },
  priceLeft: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: Spacing.xs,
  },
  originalPrice: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  pricePerNight: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  discountTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.warningScale[100],
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    marginTop: Spacing.xs,
  },
  discountTagText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.warningScale[700],
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.linen,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.successScale[200],
    minWidth: 140,
  },
  cashbackIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashbackContent: {
    flex: 1,
  },
  cashbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.successScale[700],
    marginBottom: 2,
  },
  cashbackAmount: {
    ...Typography.bodySmall,
    color: Colors.nileBlue,
    fontWeight: '600',
  },
  section: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    backgroundColor: Colors.background.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  detailItem: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  detailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: colors.pinkMist,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  additionalInfo: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  description: {
    ...Typography.bodyLarge,
    lineHeight: 26,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  highlightsContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  highlightText: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warningScale[100],
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ratingText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.warningScale[700],
  },
  bookButtonContainer: {
    position: 'absolute',
    bottom: 95, // Position above bottom navigation bar (95px height)
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    ...Shadows.strong,
    zIndex: 1001, // Higher than bottom nav (1000)
  },
  bookButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 10,
    borderRadius: BorderRadius.md,
  },
  bookButtonText: {
    color: Colors.text.inverse,
    ...Typography.h4,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default withErrorBoundary(HotelDetailsPage, 'HotelId');

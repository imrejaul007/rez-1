// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Train Details Page - Dedicated page for train bookings
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import productsApi from '@/services/productsApi';
import { useWishlist } from '@/contexts/WishlistContext';
import { useProductReviews } from '@/hooks/useProductReviews';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useCurrency, useGetCurrencySymbol, useGetLocale, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
import TrainBookingFlow from '../../components/train/TrainBookingFlow';
import TrainBookingConfirmation from '../../components/train/TrainBookingConfirmation';
import RelatedTrainsSection from '../../components/train/RelatedTrainsSection';
import TrainInfoCard from '../../components/train/TrainInfoCard';
import TrainAmenities from '../../components/train/TrainAmenities';
import TrainCancellationPolicy from '../../components/train/TrainCancellationPolicy';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TrainDetails {
  id: string;
  name: string;
  route: {
    from: string;
    to: string;
    fromStation?: string;
    toStation?: string;
  };
  trainNumber?: string;
  trainType?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  description: string;
  duration: number; // in minutes
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
    cancellationDeadline: string; // hours before departure
    refundPercentage: number;
  };
  classOptions: {
    sleeper: { price: number; available: boolean };
    ac3: { price: number; available: boolean };
    ac2: { price: number; available: boolean };
    ac1: { price: number; available: boolean };
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
  trainClass: 'sleeper' | 'ac3' | 'ac2' | 'ac1';
  selectedExtras: {
    meals?: boolean;
    bedding?: boolean;
    insurance?: boolean;
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
    berthPreference?: 'lower' | 'middle' | 'upper' | 'side-lower' | 'side-upper';
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

function TrainDetailsPage() {
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

  const [train, setTrain] = useState<TrainDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const isMounted = useIsMounted();

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
      loadTrainDetails();
    }
  }, [id, isAuthenticated, authLoading]);

  const loadTrainDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await productsApi.getProductById(id as string);

      if (!response.success || !response.data) {
        if (!isMounted()) return;
        setError('Train not found');
        return;
      }

      const productData = response.data;

      // Check if this is a train service
      const isTrain = productData.serviceCategory?.slug === 'trains' || 
                       productData.category?.slug === 'trains' ||
                       productData.name?.toLowerCase().includes('train') ||
                       productData.name?.toLowerCase().includes('express');

      if (!isTrain) {
        // Redirect to regular product page
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
          /(.+?)\s+to\s+(.+?)\s+train/i,
          /(.+?)\s*-\s*(.+?)\s+train/i,
          /(.+?)\s+→\s+(.+?)\s+train/i,
          /(.+?)\s+express/i,
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
          if (productData.name.toLowerCase().includes('rajdhani')) { from = from || 'Delhi'; to = to || 'Mumbai'; }
          else if (productData.name.toLowerCase().includes('shatabdi')) { from = from || 'Delhi'; to = to || 'Chandigarh'; }
        }
        if (!from) from = 'Origin';
        if (!to) to = 'Destination';
      }

      // Duration and times: prefer specs
      const dur = productData.serviceDetails?.duration || 480;
      const specDepTime = getSpec('departureTime');
      const specArrTime = getSpec('arrivalTime');
      let departureTime = specDepTime;
      let arrivalTime = specArrTime;
      if (!departureTime || !arrivalTime) {
        const baseDepartureHour = 8, baseDepartureMin = 0;
        const durationHours = Math.floor(dur / 60);
        const durationMins = dur % 60;
        const arrH = (baseDepartureHour + durationHours + Math.floor((baseDepartureMin + durationMins) / 60)) % 24;
        const arrM = (baseDepartureMin + durationMins) % 60;
        const formatTime = (h: number, m: number) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if (!departureTime) departureTime = formatTime(baseDepartureHour, baseDepartureMin);
        if (!arrivalTime) arrivalTime = formatTime(arrH, arrM);
      }

      // Provider name: prefer specs
      const providerName = getSpec('providerName');

      // Train type: prefer specs, fallback to name parsing
      const specTrainType = getSpec('trainType');
      const trainType = specTrainType || (() => {
        if (productData.name.toLowerCase().includes('rajdhani')) return 'Rajdhani Express';
        if (productData.name.toLowerCase().includes('shatabdi')) return 'Shatabdi Express';
        if (productData.name.toLowerCase().includes('duronto')) return 'Duronto Express';
        if (productData.name.toLowerCase().includes('garib')) return 'Garib Rath';
        return 'Express';
      })();

      // Get cashback from multiple sources
      const cashbackPercentage = (() => {
        if (productData.cashback?.percentage) return productData.cashback.percentage;
        if (productData.serviceCategory?.cashbackPercentage) return productData.serviceCategory.cashbackPercentage;
        if (productData.category?.maxCashback) return productData.category.maxCashback;
        if (typeof productData.cashback === 'number') return productData.cashback;
        return 10;
      })();

      // Calculate price properly
      const basePrice = productData.pricing?.selling || productData.pricing?.basePrice || productData.price?.current || 0;
      const originalPrice = productData.pricing?.original || productData.pricing?.basePrice || productData.price?.original;
      const calculatedDiscount = originalPrice && basePrice && originalPrice > basePrice
        ? Math.round(((originalPrice - basePrice) / originalPrice) * 100)
        : productData.pricing?.discount || 0;

      // Train number: prefer specs, fallback to SKU
      const trainNumber = getSpec('trainNumber') || productData.sku || productData.barcode ||
        `${productData.name.substring(0, 3).toUpperCase()}${(productData.id || productData._id || '').toString().slice(-4)}`;

      // Class options: prefer specs, fallback to price multipliers
      const specClassOptions = getSpec('classOptions');
      const buildClassOptions = () => {
        const defaults = {
          sleeper: { price: basePrice, available: true },
          ac3: { price: Math.round(basePrice * 1.5), available: true },
          ac2: { price: Math.round(basePrice * 2), available: true },
          ac1: { price: Math.round(basePrice * 3), available: true },
        };
        if (!specClassOptions) return defaults;
        const classes = specClassOptions.split(',').map((c: string) => c.trim().toLowerCase());
        return {
          sleeper: { price: basePrice, available: classes.includes('sleeper') || classes.length === 0 },
          ac3: { price: Math.round(basePrice * 1.5), available: classes.includes('ac3') || classes.includes('3ac') },
          ac2: { price: Math.round(basePrice * 2), available: classes.includes('ac2') || classes.includes('2ac') },
          ac1: { price: Math.round(basePrice * 3), available: classes.includes('ac1') || classes.includes('1ac') },
        };
      };

      // Transform to TrainDetails
      const trainDetails: TrainDetails = {
        id: productData.id || productData._id,
        name: productData.name,
        route: {
          from,
          to,
          fromStation: `${from} Railway Station`,
          toStation: `${to} Railway Station`,
        },
        trainNumber,
        trainType,
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
            // Remove mismatched bus images from train listings
            if (url.toLowerCase().includes('bus') && !url.toLowerCase().includes('train')) {
              return false;
            }
            return true;
          });
          return validatedImages;
        })(),
        description: productData.description || productData.shortDescription || 'Comfortable train journey with excellent service.',
        duration: dur,
        departureTime,
        arrivalTime,
        availableDates: generateAvailableDates(),
        cashback: {
          percentage: cashbackPercentage,
          amount: Math.round(basePrice * cashbackPercentage / 100),
        },
        rating: reviewSummary?.averageRating || productData.ratings?.average || 0,
        reviewCount: reviewSummary?.totalReviews || productData.ratings?.count || 0,
        store: {
          id: productData.store?.id || productData.store?._id,
          name: providerName || productData.store?.name || 'RailConnect',
          logo: productData.store?.logo,
        },
        amenities: (() => {
          const tagAmenities: Record<string, string[]> = {
            'premium': ['AC Coach', 'Meals', 'Bedding', 'Reading Light', 'Charging Point', 'Wi-Fi'],
            'express': ['AC Coach', 'Meals', 'Reading Light', 'Charging Point'],
            'sleeper': ['Fans', 'Reading Light', 'Charging Point'],
          };
          const tags = productData.tags || [];
          for (const [key, amenities] of Object.entries(tagAmenities)) {
            if (tags.some((tag: string) => tag.toLowerCase().includes(key))) return amenities;
          }
          if (productData.name.toLowerCase().includes('rajdhani') || productData.name.toLowerCase().includes('shatabdi')) {
            return ['AC Coach', 'Meals', 'Bedding', 'Reading Light', 'Charging Point'];
          }
          return ['AC Coach', 'Meals', 'Reading Light', 'Charging Point'];
        })(),
        cancellationPolicy: {
          freeCancellation: productData.specifications?.some((s: any) =>
            s.key?.toLowerCase().includes('cancellation') && s.value?.toLowerCase().includes('free')
          ) || true,
          cancellationDeadline: '24',
          refundPercentage: 80,
        },
        classOptions: buildClassOptions(),
      };

      if (!isMounted()) return;
      setTrain(trainDetails);
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load train details. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const generateAvailableDates = (): string[] => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
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
    if (!train) return;
    
    try {
      if (isInWishlist(train.id)) {
        await removeFromWishlist(train.id);
      } else {
        await addToWishlist(train.id);
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

  if (error || !train) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Train not found'}</Text>
          <Pressable style={styles.retryButton} onPress={loadTrainDetails}>
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
            const imageUrl = train.images?.[selectedImageIndex] || train.images?.[0];
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
                <Ionicons name="train" size={64} color={Colors.text.tertiary} />
                <Text style={styles.placeholderText}>Train Image</Text>
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
                  name={isInWishlist(train.id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isInWishlist(train.id) ? Colors.error : Colors.text.inverse}
                />
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color={Colors.text.inverse} />
              </Pressable>
            </View>
          </View>

          {/* Discount Badge */}
          {train.discount && train.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{train.discount}% OFF</Text>
            </View>
          )}

          {/* Image Carousel Indicators */}
          {train.images && train.images.length > 1 && (
            <View style={styles.carouselIndicators}>
              {train.images.map((_, index) => (
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

        {/* Train Info Card */}
        <View style={styles.trainInfoWrapper}>
          <TrainInfoCard train={train} />
        </View>

        {/* Store/Railway Info */}
        {train.store && (
          <View style={styles.storeSection}>
            <View style={styles.storeHeader}>
              {train.store.logo ? (
                <CachedImage
                  source={train.store.logo}
                  style={styles.storeLogo}
                  contentFit="contain"
                  onError={() => {
                    // Logo failed to load
                  }}
                />
              ) : (
                <View style={styles.storeLogoPlaceholder}>
                  <Ionicons name="train" size={24} color={Colors.gold} />
                </View>
              )}
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{train.store.name}</Text>
                <View style={styles.storeBadges}>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                  {train.rating > 0 && (
                    <View style={styles.ratingBadgeSmall}>
                      <Ionicons name="star" size={14} color={Colors.warning} />
                      <Text style={styles.ratingTextSmall}>
                        {train.rating.toFixed(1)} ({train.reviewCount})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.viewStoreButton}
                onPress={() => router.push(`/MainStorePage?storeId=${train.store.id}` as any)}
              >
                <Text style={styles.viewStoreButtonText}>View</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
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
                {train.originalPrice && train.originalPrice > train.price && (
                  <Text style={styles.originalPrice}>{currencySymbol}{train.originalPrice.toLocaleString(locale)}</Text>
                )}
                <Text style={styles.price}>{currencySymbol}{train.price.toLocaleString(locale)}</Text>
              </View>
              {train.discount && train.discount > 0 && (
                <View style={styles.discountTag}>
                  <Text style={styles.discountTagText}>Save {train.discount}%</Text>
                </View>
              )}
            </View>
            <View style={styles.cashbackBadge}>
              <View style={styles.cashbackIconContainer}>
                <Ionicons name="gift" size={20} color={Colors.gold} />
              </View>
              <View style={styles.cashbackContent}>
                <Text style={styles.cashbackText}>
                  {train.cashback.percentage}% Cashback
                </Text>
                <Text style={styles.cashbackAmount}>
                  Earn {currencySymbol}{train.cashback.amount.toLocaleString(locale)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Train Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={Colors.gold} />
            <Text style={styles.sectionTitle}>Train Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time" size={24} color={Colors.gold} />
              </View>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {Math.floor(train.duration / 60)}h {train.duration % 60}m
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="train" size={24} color={Colors.gold} />
              </View>
              <Text style={styles.detailLabel}>Train Type</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{train.trainType}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="ticket" size={24} color={Colors.gold} />
              </View>
              <Text style={styles.detailLabel}>Train Number</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{train.trainNumber}</Text>
            </View>
          </View>
          
          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.text.tertiary} />
              <Text style={styles.infoText}>Flexible dates available</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={Colors.text.tertiary} />
              <Text style={styles.infoText}>{train.route.fromStation} → {train.route.toStation}</Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <TrainAmenities amenities={train.amenities} />

        {/* Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={24} color={Colors.gold} />
            <Text style={styles.sectionTitle}>About This Train</Text>
          </View>
          <Text style={styles.description}>{train.description}</Text>
          
          {/* Key Highlights */}
          <View style={styles.highlightsContainer}>
            <View style={styles.highlightItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
              <Text style={styles.highlightText}>Confirmed tickets</Text>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
              <Text style={styles.highlightText}>Best price guaranteed</Text>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
              <Text style={styles.highlightText}>Instant confirmation</Text>
            </View>
          </View>
        </View>

        {/* Cancellation Policy */}
        <TrainCancellationPolicy policy={train.cancellationPolicy} />

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color={Colors.warning} />
              <Text style={styles.ratingText}>
                {train.rating.toFixed(1)} ({train.reviewCount})
              </Text>
            </View>
          </View>
          <ProductReviewsSection
            productId={train.id}
            reviews={reviews}
            summary={reviewSummary}
            isLoading={reviewsLoading}
            onRefresh={refreshReviews}
          />
        </View>

        {/* Related Trains */}
        <RelatedTrainsSection
          currentTrainId={train.id}
          route={train.route}
        />

        {/* Bottom Spacing */}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bookButtonContainer}>
        <Pressable
          style={styles.bookButton}
          onPress={handleBookNow}
         
        >
          <LinearGradient
            colors={[colors.lightMustard, '#e6b84d']}
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
        <TrainBookingFlow
          train={train}
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
          <TrainBookingConfirmation
            train={train}
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
    paddingBottom: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: Colors.gold,
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
    top: Platform.OS === 'ios' ? 50 : 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    gap: 8,
    zIndex: 5,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: Colors.background.primary,
  },
  trainInfoWrapper: {
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
    backgroundColor: Colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.successScale[200],
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
    backgroundColor: Colors.linen,
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
    backgroundColor: Colors.warningScale[50],
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
    borderColor: Colors.gold,
    backgroundColor: Colors.linen,
  },
  viewStoreButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gold,
  },
  priceSection: {
    padding: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    marginBottom: 4,
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
    color: Colors.info,
    fontWeight: '600',
  },
  section: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
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
    borderColor: Colors.border.primary,
  },
  detailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: colors.linen,
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
    borderTopColor: Colors.border.primary,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    ...Typography.body,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  description: {
    ...Typography.bodyLarge,
    lineHeight: 26,
    color: Colors.text.secondary,
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
    bottom: 95,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 1001,
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

export default withErrorBoundary(TrainDetailsPage, 'TrainId');

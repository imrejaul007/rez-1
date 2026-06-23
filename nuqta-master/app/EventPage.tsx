// @ts-nocheck
import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  Pressable,
  View,
  Linking,
  ImageBackground,
  SafeAreaView,
  ActivityIndicator} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { showAlert, alertOk, confirmAlert } from "@/utils/alert";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from "expo-router";
import Constants from "expo-constants";
import { ThemedView } from "@/components/ThemedView";
import { EventItem } from "@/types/homepage.types";
import { Ionicons } from "@expo/vector-icons";
import EventBookingModal from "@/components/events/EventBookingModal";
import RelatedEventsSection from "@/components/events/RelatedEventsSection";
import EventReviews from "@/components/events/EventReviews";
import StarRating from "@/components/events/StarRating";
import { useEventBooking } from "@/hooks/useEventBooking";
import eventsApiService from "@/services/eventsApi";
import { useAuthUser, useIsAuthenticated, useGetCurrencySymbol } from '@/stores/selectors';
import { BUSINESS_CONFIG } from "@/config/env";
import stripeApi from "@/services/stripeApi";
import eventAnalytics from "@/services/eventAnalytics";
import { getCategoryTheme, CategoryTheme, DEFAULT_THEME } from "@/constants/categoryThemes";
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { errorReporter } from '@/utils/errorReporter';
// Conditional import for native Stripe service
let stripeReactNativeService: any = null;
if (Platform.OS !== 'web') {
  try {
    stripeReactNativeService = require('@/services/stripeReactNativeService').default;
  } catch (e) { // Silent: non-critical dynamic import for native Stripe
  }
}

interface EventPageProps {
  eventId?: string;
  initialEvent?: EventItem;
}

interface DynamicEventData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  price: {
    amount: number;
    currency: string;
    isFree: boolean;
  };
  location: string;
  date: string;
  time: string;
  category: string;
  organizer: string;
  isOnline: boolean;
  registrationRequired: boolean;
  bookingUrl?: string;
  availableSlots?: {
    id: string;
    time: string;
    available: boolean;
    maxCapacity: number;
    bookedCount: number;
  }[];
  [key: string]: any;
}

function EventPage({ eventId, initialEvent }: EventPageProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Dynamic event data state
  const [eventData, setEventData] = useState<DynamicEventData | null>(null);
  const [isDynamic, setIsDynamic] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [realEventData, setRealEventData] = useState<EventItem | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [relatedEvents, setRelatedEvents] = useState<EventItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewardInfo, setRewardInfo] = useState<{
    rewards: Array<{ action: string; coins: number; description: string }>;
    totalPotential: number;
  } | null>(null);

  // Track page view time and scroll depth for analytics
  const pageViewStartTime = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);

  // Animation values for UX improvements
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const imageOpacity = useSharedValue(0);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Extract specific params to avoid infinite loop from params object reference changes
  // Support both 'eventId' and 'id' parameters (navigation uses 'id')
  const eventIdParam = (params.eventId || params.id) as string | undefined;
  const eventDataParam = params.eventData as string | undefined;
  const eventTypeParam = params.eventType as string | undefined;

  // Parse dynamic event data from navigation params and fetch real data
  useEffect(() => {
    let cancelled = false;
    const loadEventData = async () => {
      setIsLoadingEvent(true);
      setError(null);

      try {
        if (eventDataParam && eventIdParam && eventTypeParam) {
          try {
            const parsedData = JSON.parse(eventDataParam);
            if (cancelled) return;
            setEventData(parsedData);
            setIsDynamic(true);

            // Try to fetch real event data from backend
            try {
              const realData = await eventsApiService.getEventById(eventIdParam);
              if (!cancelled && realData) {
                setRealEventData(realData);
              }
            } catch (err) {
              // Continue with dynamic data if backend fetch fails
              errorReporter.captureError(
                err instanceof Error ? err : new Error('Failed to fetch real event data'),
                { context: 'EventPage.loadEventData.fetchReal' },
                'info'
              );
            }
          } catch (err) {
            if (cancelled) return;
            errorReporter.captureError(
              err instanceof Error ? err : new Error('Failed to parse event data param'),
              { context: 'EventPage.loadEventData.parseParam' },
              'info'
            );
            setIsDynamic(false);
          }
        } else if (eventIdParam) {
          // Direct event ID from params - fetch from backend
          try {
            const realData = await eventsApiService.getEventById(eventIdParam);
            if (cancelled) return;
            if (realData) {
              setRealEventData(realData);
              setIsDynamic(false);
            } else {
              setError("Event not found");
            }
          } catch (err) {
            if (cancelled) return;
            errorReporter.captureError(
              err instanceof Error ? err : new Error('Failed to load event by ID'),
              { context: 'EventPage.loadEventData.fetchById' },
              'warning'
            );
            setError("Failed to load event. Please try again.");
          }
        } else {
          if (cancelled) return;
          setIsDynamic(false);
        }
      } catch (err) {
        if (cancelled) return;
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to load event data'),
          { context: 'EventPage.loadEventData' },
          'warning'
        );
        setError("Failed to load event. Please try again.");
      } finally {
        if (!cancelled) setIsLoadingEvent(false);
      }
    };

    loadEventData();
    return () => { cancelled = true; };
  }, [eventIdParam, eventDataParam, eventTypeParam]);

  // Fetch reward info and favorite status when event loads
  useEffect(() => {
    if (realEventData?.id) {
      eventsApiService.getEventRewardInfo(realEventData.id)
        .then(info => { if (info) setRewardInfo(info); })
        .catch(() => {}); // Silent: non-critical reward info

      // Check if user has favorited this event
      eventsApiService.isFavorited(realEventData.id)
        .then(fav => setIsFavorited(fav))
        .catch(() => {}); // Silent: non-critical favorite status
    }
  }, [realEventData?.id]);

  // Animate content on load
  useEffect(() => {
    if (!isLoadingEvent && realEventData) {
      fadeAnim.value = withTiming(1, { duration: 400 });
      slideAnim.value = withTiming(0, { duration: 400 });
    }
  }, [isLoadingEvent, realEventData, fadeAnim, slideAnim]);

  // Animate image on load
  const handleImageLoad = useCallback(() => {
    imageOpacity.value = withTiming(1, { duration: 300 });
  }, [imageOpacity]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    imageOpacity.value = 1; // Show placeholder immediately
  }, [imageOpacity]);

  // Cleanup retry timeout and mark unmounted
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  // Enhanced retry mechanism with exponential backoff
  const retryWithBackoff = useCallback(async (retryFn: () => Promise<void>, retries = 0) => {
    if (retries >= MAX_RETRIES) {
      if (isMountedRef.current) {
        setError("Failed to load event after multiple attempts. Please check your connection.");
      }
      return;
    }

    try {
      await retryFn();
    } catch (error) {
      if (!isMountedRef.current) return;
      const delay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
      retryTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          retryWithBackoff(retryFn, retries + 1);
        }
      }, delay);
    }
  }, []);

  const HORIZONTAL_PADDING = screenData.width < 375 ? 16 : screenData.width > 768 ? 32 : 20;

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        setScreenData(window);
      }, 100);
    });

    return () => {
      subscription?.remove();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  // Deep link support for event pages
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      try {
        // Parse URL - handle both web and native formats
        let eventId: string | null = null;
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // Web: Use URL API
          const urlObj = new URL(url);
          eventId = urlObj.searchParams.get('eventId');
        } else {
          // Native: Parse manually
          const match = url.match(/[?&]eventId=([^&]+)/);
          if (match) {
            eventId = decodeURIComponent(match[1]);
          }
        }
        
        if (eventId && eventId !== eventIdParam) {
          // Load event from deep link
          setIsLoadingEvent(true);
          setError(null);
          
          eventsApiService.getEventById(eventId)
            .then((data) => {
              if (data) {
                setRealEventData(data);
                setIsDynamic(false);
              } else {
                setError("Event not found");
              }
            })
            .catch((error) => {
              setError("Failed to load event from link");
            })
            .finally(() => {
              setIsLoadingEvent(false);
            });
        }
      } catch (err) {
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to handle deep link'),
          { context: 'EventPage.handleDeepLink' },
          'info'
        );
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    
    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    }).catch(() => {}); // Silent: non-critical initial URL check

    return () => {
      subscription.remove();
    };
  }, [eventIdParam]);

  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Note: error state is already declared at component level (retryCount area)

  // Event data - returns null if no real data available (no hardcoded fallback for production)
  const eventDetails: EventItem | null = useMemo(() => {
    // Priority 1: Real event data from backend API
    if (realEventData) {
      return realEventData;
    }

    // Priority 2: Dynamic event data from navigation params
    if (isDynamic && eventData) {
      return {
        id: eventData.id,
        type: "event",
        title: eventData.title,
        subtitle: eventData.subtitle,
        description: eventData.description,
        image: eventData.image,
        price: eventData.price,
        location: eventData.location,
        date: eventData.date,
        time: eventData.time,
        category: eventData.category,
        organizer: eventData.organizer,
        isOnline: eventData.isOnline,
        registrationRequired: eventData.registrationRequired,
      };
    }

    // Priority 3: Initial event prop (for direct component usage)
    if (initialEvent) {
      return initialEvent;
    }

    // No fallback data - return null for production
    // This will trigger "Event Not Found" screen
    return null;
  }, [initialEvent, isDynamic, eventData, realEventData]);

  // Get category theme based on event category
  const categoryTheme: CategoryTheme = useMemo(() => {
    return getCategoryTheme(eventDetails?.category);
  }, [eventDetails?.category]);

  // Determine if event is truly offline (NOT an online event)
  const isOfflineEvent = useMemo(() => {
    // If no event details, default to offline
    if (!eventDetails) return true;

    // Primary check: use isOnline flag from event data
    // If isOnline is explicitly true, it's NOT an offline event
    if (eventDetails.isOnline === true) {
      return false;
    }

    // Secondary check: if location indicates online
    if (eventDetails.location) {
      const locationLower = eventDetails.location.toLowerCase();
      if (locationLower === 'online' || locationLower === 'online event' || locationLower.includes('virtual')) {
        return false;
      }
    }

    // Default: treat as offline event (venue-based)
    return true;
  }, [eventDetails?.isOnline, eventDetails?.location]);


  // Get available slots for offline events - only use real data, no mock fallback
  const availableSlots = useMemo(() => {
    // Online events don't have slots
    if (!isOfflineEvent) {
      return [];
    }

    // Priority: realEventData > eventData
    // For real backend events, use actual slots (may be empty)
    if (realEventData) {
      // Real event from backend - use its slots (or empty if none defined)
      return realEventData.availableSlots && Array.isArray(realEventData.availableSlots)
        ? realEventData.availableSlots
        : [];
    }

    if (eventData?.availableSlots && Array.isArray(eventData.availableSlots)) {
      return eventData.availableSlots;
    }

    // No mock data for production - return empty array
    // Events without slots will show direct booking without slot selection
    return [];
  }, [isOfflineEvent, eventData, realEventData]);

  const handleSharePress = useCallback(async () => {
    if (!eventDetails) return;

    try {
      setIsLoading(true);

      // Construct share URL - use app URL if available, otherwise use deep link
      const appUrl = BUSINESS_CONFIG.app.website || "https://rezapp.com";
      const shareUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/EventPage?eventId=${eventDetails.id}`
        : `${appUrl}/EventPage?eventId=${eventDetails.id}`;
      
      const shareMessage = `Check out ${eventDetails.title} by ${eventDetails.organizer} on ${eventDetails.date}\n${shareUrl}`;
      
      await Share.share({
        message: shareMessage,
        url: shareUrl,
        title: eventDetails.title,
      });
      
      // Track share analytics and earn sharing reward
      try {
        const shareResult = await eventsApiService.shareEvent(eventDetails.id);
        eventAnalytics.trackShare(eventDetails.id, Platform.OS, 'event_page');
        // Show reward feedback if coins were earned, or helpful hint if not
        if (shareResult?.success && shareResult?.reward?.coinsAwarded) {
          showAlert('Coins Earned!', `You earned +${shareResult.reward.coinsAwarded} coins for sharing this event!`);
        } else if (shareResult?.success && shareResult?.message) {
          // Backend returns helpful message like "Book this event to earn sharing rewards!"
          alertOk('Shared!', shareResult.message);
        }
      } catch (shareError) {
        eventAnalytics.trackShare(eventDetails.id, Platform.OS, 'event_page');
      }
    } catch (err) {
      if (err instanceof Error && err.message !== "User canceled") {
        setError("Failed to share event.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [eventDetails]);

  const handleFavoritePress = useCallback(async () => {
    if (!eventDetails) return;

    if (!isAuthenticated || !user) {
      alertOk("Login Required", "Please login to favorite events");
      return;
    }

    try {
      setIsLoadingFavorite(true);
      const previousState = isFavorited;
      
      // Optimistically update UI
      setIsFavorited(!previousState);
      
      // Call backend API to toggle favorite
      const result = await eventsApiService.toggleEventFavorite(eventDetails.id);

      if (result.success) {
        // Use backend's authoritative state if available
        const newState = result.isFavorited ?? !previousState;
        setIsFavorited(newState);

        // Track analytics
        eventAnalytics.trackFavoriteToggle(eventDetails.id, newState, 'event_page');

        alertOk(
          newState ? "Added to Favorites" : "Removed from Favorites",
          `${eventDetails.title} ${newState ? "added to" : "removed from"} favorites.`
        );
      } else {
        // Revert on failure
        setIsFavorited(previousState);
        throw new Error(result.message || "Failed to update favorite status");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update favorite status");
    } finally {
      setIsLoadingFavorite(false);
    }
  }, [eventDetails?.id, eventDetails?.title, isFavorited, isAuthenticated, user]);

  const handleOnlineBooking = useCallback(async () => {
    if (!eventDetails || !eventDetails.isOnline) return;

    // Check authentication
    if (!isAuthenticated || !user) {
      alertOk("Login Required", "Please login to register for events");
      return;
    }

    // Track booking start
    eventAnalytics.trackBookingStart(eventDetails.id, undefined, 'event_page');

    // Open booking modal (same flow as offline events, just without slot selection)
    setShowBookingModal(true);
  }, [eventDetails, isAuthenticated, user]);

  const handleOfflineBooking = useCallback(async () => {
    if (!eventDetails || eventDetails.isOnline) return;

    // Check if user needs to select a time slot (only if slots are defined)
    if (availableSlots.length > 0 && !selectedSlot) {
      alertOk("Select Time Slot", "Please select a time slot before booking.");
      return;
    }

    // Check authentication
    if (!isAuthenticated || !user) {
      alertOk("Login Required", "Please login to book events");
      return;
    }

    // Track booking start
    eventAnalytics.trackBookingStart(eventDetails.id, selectedSlot || undefined, 'event_page');

    // Open booking modal directly (for both free and paid events)
    setShowBookingModal(true);
  }, [eventDetails, selectedSlot, availableSlots, isAuthenticated, user]);

  const handleBookingSuccess = useCallback((bookingId?: string) => {
    setShowBookingModal(false);

    // Show success message and navigate to my events page
    showAlert(
      "Booking Confirmed!",
      `Your booking has been confirmed${bookingId ? `. Booking Reference: ${bookingId}` : ''}. View your upcoming events in My Events.`,
      [
        { text: "Continue", style: "cancel" },
        {
          text: "My Events",
          onPress: () => {
            if (Platform.OS === 'ios') {
              setTimeout(() => router.push('/my-events' as any), 50);
            } else {
              router.push('/my-events' as any);
            }
          }
        }
      ]
    );
  }, [router]);

  const handleBackPress = useCallback(() => router.canGoBack() ? router.back() : router.replace('/(tabs)'), [router]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 4500);
    return () => clearTimeout(id);
  }, [error]);

  const styles = useMemo(
    () => createStyles(HORIZONTAL_PADDING, screenData),
    [HORIZONTAL_PADDING, screenData]
  );

  // Loading skeleton component with better UX
  if (isLoadingEvent) {
    return (
      <ThemedView style={styles.page}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />
        <SafeAreaView style={{ backgroundColor: "#000000" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.purpleLight} />
          <Text style={styles.loadingText}>Loading event details...</Text>
          <Animated.View
            style={[
              styles.loadingSkeleton,
              {
                opacity: interpolate(fadeAnim.value, [0, 1], [0.3, 0.6]),
              },
            ]}
          />
        </View>
      </ThemedView>
    );
  }

  // Event Not Found screen - when no event data is available after loading
  if (!eventDetails && !isLoadingEvent) {
    return (
      <ThemedView style={styles.page}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />
        <SafeAreaView style={{ backgroundColor: "#000000" }} />
        <View style={styles.notFoundContainer}>
          <LinearGradient
            colors={[colors.neutral[800], colors.neutral[900]]}
            style={styles.notFoundGradient}
          >
            <View style={styles.notFoundContent}>
              <View style={styles.notFoundIconContainer}>
                <Ionicons name="calendar-outline" size={80} color={colors.neutral[500]} />
                <View style={styles.notFoundIconBadge}>
                  <Ionicons name="close" size={24} color={Colors.error} />
                </View>
              </View>
              <Text style={styles.notFoundTitle}>Event Not Found</Text>
              <Text style={styles.notFoundMessage}>
                The event you're looking for doesn't exist or has been removed.
              </Text>
              <View style={styles.notFoundActions}>
                <Pressable
                  style={styles.notFoundBackButton}
                  onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
                 
                >
                  <Ionicons name="arrow-back" size={20} color={colors.background.primary} />
                  <Text style={styles.notFoundBackText}>Go Back</Text>
                </Pressable>
                <Pressable
                  style={styles.notFoundExploreButton}
                  onPress={() => router.push('/events' as any)}
                 
                >
                  <Ionicons name="compass-outline" size={20} color={Colors.brand.purpleLight} />
                  <Text style={styles.notFoundExploreText}>Explore Events</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </View>
      </ThemedView>
    );
  }

  // Error state component
  if (error && !realEventData && !eventData) {
    return (
      <ThemedView style={styles.page}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />
        <SafeAreaView style={{ backgroundColor: "#000000" }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setRetryCount(prev => prev + 1);
              setIsLoadingEvent(true);
              // Enhanced retry with exponential backoff
              const loadEventData = async () => {
                try {
                  if (eventIdParam) {
                    const realData = await eventsApiService.getEventById(eventIdParam);
                    if (realData) {
                      setRealEventData(realData);
                      setRetryCount(0); // Reset on success
                    } else {
                      setError("Event not found");
                    }
                  }
                } catch (error) {
                  if (retryCount < MAX_RETRIES) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                    setTimeout(() => {
                      loadEventData();
                    }, delay);
                  } else {
                    setError(`Failed to load event after ${MAX_RETRIES} attempts. Please check your connection.`);
                    setIsLoadingEvent(false);
                  }
                } finally {
                  if (retryCount >= MAX_RETRIES) {
                    setIsLoadingEvent(false);
                  }
                }
              };
              loadEventData();
            }}
           
          >
            <Ionicons name="refresh" size={18} color={colors.background.primary} style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>
              {retryCount > 0 ? `Retry (${retryCount}/${MAX_RETRIES})` : 'Retry'}
            </Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.page}>
      {/* Hide default navigation header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Non-translucent status bar to avoid overlay */}
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      {/* Top safe area to prevent overlap with the hero header */}
      <SafeAreaView style={{ backgroundColor: "#000000" }} />

      {/* Hero Section - Optimized Image Loading */}
      <View style={styles.heroSection}>
        {!imageError ? (
          <ImageBackground
            source={eventDetails.image}
            style={styles.heroBackground}
            contentFit="cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: imageOpacity,
                },
              ]}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.75)"]}
              style={styles.heroOverlay}
            >
            {/* Header */}
            <View style={styles.header}>
              <Pressable style={styles.backButton} onPress={handleBackPress}>
                <Ionicons name="chevron-back" size={24} color={colors.background.primary} />
              </Pressable>

              <View style={styles.headerActions}>
                <Pressable style={styles.actionButton} onPress={handleSharePress}>
                  <Ionicons name="share-outline" size={20} color={colors.background.primary} />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={handleFavoritePress}
                  disabled={isLoadingFavorite}
                >
                  {isLoadingFavorite ? (
                    <ActivityIndicator size="small" color={colors.background.primary} />
                  ) : (
                    <Ionicons
                      name={isFavorited ? "heart" : "heart-outline"}
                      size={20}
                      color={isFavorited ? Colors.error : Colors.text.inverse}
                    />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Event Info */}
            <View style={styles.heroContent}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryTheme.badgeBackground }]}>
                <Ionicons name={categoryTheme.icon as any} size={14} color={colors.background.primary} style={{ marginRight: 6 }} />
                <Text style={styles.categoryText}>{eventDetails.category}</Text>
              </View>

              <Text style={styles.heroTitle}>{eventDetails.title}</Text>
              <Text style={styles.heroSubtitle}>by {eventDetails.organizer}</Text>

              <View style={styles.heroMeta}>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="calendar-outline" size={16} color={colors.background.primary} />
                  <Text style={styles.heroMetaText}>{eventDetails.date}</Text>
                </View>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.background.primary} />
                  <Text style={styles.heroMetaText}>{eventDetails.time}</Text>
                </View>
                <View style={styles.heroMetaItem}>
                  <Ionicons
                    name={eventDetails.isOnline ? "globe-outline" : "location-outline"}
                    size={16}
                    color={colors.background.primary}
                  />
                  <Text style={styles.heroMetaText}>{eventDetails.location}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
          </ImageBackground>
        ) : (
          <View style={[styles.heroBackground, styles.imagePlaceholder]}>
            <LinearGradient
              colors={categoryTheme.gradientColors}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name={categoryTheme.icon as any} size={80} color="rgba(255,255,255,0.3)" />
            <LinearGradient
              colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)"]}
              style={styles.heroOverlay}
            >
              <View style={styles.heroContent}>
                <View style={[styles.categoryBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name={categoryTheme.icon as any} size={14} color={colors.background.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.categoryText}>{eventDetails.category}</Text>
                </View>
                <Text style={styles.heroTitle}>{eventDetails.title}</Text>
                <Text style={styles.heroSubtitle}>by {eventDetails.organizer}</Text>
              </View>
            </LinearGradient>
          </View>
        )}
      </View>

          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onScroll={(event) => {
              const scrollY = event.nativeEvent.contentOffset.y;
              const contentHeight = event.nativeEvent.contentSize.height;
              const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
              const scrollDepth = Math.min(100, Math.round((scrollY / (contentHeight - scrollViewHeight)) * 100));
              scrollDepthRef.current = Math.max(scrollDepthRef.current, scrollDepth);
            }}
            scrollEventThrottle={16}
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
        {/* Price Card */}
        <View style={styles.priceCard}>
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Entry Fee</Text>
            <Text style={styles.priceValue}>
              {/* ✅ FIX: Add null checks for price access */}
              {/* For online events, use regional currency; for venue events, use event's currency */}
              {eventDetails.price?.isFree
                ? "Free Entry"
                : `${eventDetails.isOnline ? currencySymbol : (eventDetails.price?.currency || currencySymbol)}${eventDetails.price?.amount ?? 0}`}
            </Text>
          </View>
          <View style={styles.priceCardRight}>
            {/* Rating Display */}
            {(realEventData?.rating ?? 0) > 0 && (
              <View style={styles.ratingBadge}>
                <StarRating rating={realEventData?.rating || 0} size={14} showEmpty={false} />
                <Text style={styles.ratingText}>
                  {(realEventData?.rating || 0).toFixed(1)} ({realEventData?.reviewCount || 0})
                </Text>
              </View>
            )}
            <View style={styles.eventTypeBadge}>
              <Ionicons
                name={eventDetails.isOnline ? "globe" : "location"}
                size={14}
                color={eventDetails.isOnline ? Colors.gold : Colors.warning}
              />
              <Text
                style={[
                  styles.eventTypeText,
                  { color: eventDetails.isOnline ? Colors.gold : Colors.warning },
                ]}
              >
                {eventDetails.isOnline ? "Online Event" : "Venue Event"}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Event</Text>
          <Text style={styles.description}>{eventDetails.description}</Text>
        </View>

        {/* Earn Coins Card - from reward config */}
        {rewardInfo && rewardInfo.rewards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Earn Coins</Text>
            <View style={styles.rewardCard}>
              <View style={styles.rewardCardHeader}>
                <View style={styles.rewardIconCircle}>
                  <Ionicons name="gift-outline" size={20} color={Colors.text.inverse} />
                </View>
                <View style={styles.rewardHeaderText}>
                  <Text style={styles.rewardTitle}>
                    Earn up to {rewardInfo.totalPotential} coins
                  </Text>
                  <Text style={styles.rewardSubtitle}>
                    Complete actions to earn rewards
                  </Text>
                </View>
              </View>
              {rewardInfo.rewards.map((reward, index) => (
                <View key={index} style={[styles.rewardRow, index > 0 && styles.rewardRowBorder]}>
                  <Ionicons
                    name={
                      reward.action.includes('checkin') ? 'location-outline' :
                      reward.action.includes('booking') || reward.action.includes('entry') ? 'ticket-outline' :
                      reward.action.includes('sharing') ? 'share-social-outline' :
                      reward.action.includes('review') || reward.action.includes('rating') ? 'star-outline' :
                      'gift-outline'
                    }
                    size={18}
                    color={Colors.brand.purpleLight}
                  />
                  <Text style={styles.rewardDescription}>
                    {reward.description || reward.action.replace(/_/g, ' ')}
                  </Text>
                  <View style={styles.rewardCoinBadge}>
                    <Text style={styles.rewardCoinText}>
                      +{reward.coins}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Schedule Section */}
        {realEventData && (realEventData as any).schedule && (realEventData as any).schedule.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            {(realEventData as any).schedule.map((item: any, index: number) => (
              <View key={index} style={[styles.scheduleRow, index < (realEventData as any).schedule.length - 1 && styles.scheduleRowBorder]}>
                <View style={styles.scheduleTimeCol}>
                  <Ionicons name="time-outline" size={18} color={Colors.brand.purpleLight} />
                  <Text style={styles.scheduleTimeText}>
                    {item.startTime || ''}
                  </Text>
                </View>
                <View style={styles.scheduleContent}>
                  <Text style={styles.scheduleItemTitle}>
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text style={styles.scheduleItemDesc}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sponsors Section */}
        {realEventData && (realEventData as any).sponsors && (realEventData as any).sponsors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sponsors</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sponsorsScroll}>
              {(realEventData as any).sponsors.map((sponsor: any, index: number) => (
                <View key={index} style={styles.sponsorCard}>
                  {sponsor.logo ? (
                    <CachedImage
                      source={sponsor.logo}
                      style={styles.sponsorLogo}
                    />
                  ) : (
                    <View style={styles.sponsorLogoPlaceholder}>
                      <Ionicons name="business-outline" size={20} color={colors.neutral[400]} />
                    </View>
                  )}
                  <Text style={styles.sponsorName}>
                    {sponsor.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Time Slots for Offline Events */}
        {isOfflineEvent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Time Slot</Text>
            <Text style={styles.sectionSubtitle}>Choose your preferred time to attend the event</Text>


            {availableSlots.length > 0 ? (
              <View style={styles.slotsGrid}>
                {availableSlots.map((slot) => (
                  <Pressable
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      selectedSlot === slot.id && styles.slotCardSelected,
                      !slot.available && styles.slotCardDisabled,
                    ]}
                    onPress={() => slot.available && setSelectedSlot(slot.id)}
                    disabled={!slot.available}
                  >
                    <View style={styles.slotHeader}>
                      <Text
                        style={[
                          styles.slotTime,
                          selectedSlot === slot.id && styles.slotTimeSelected,
                          !slot.available && styles.slotTimeDisabled,
                        ]}
                      >
                        {slot.time}
                      </Text>
                      {selectedSlot === slot.id && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.brand.purpleLight} />
                      )}
                    </View>

                    <Text
                      style={[styles.slotCapacity, !slot.available && styles.slotCapacityDisabled]}
                    >
                      {slot.available ? `${slot.maxCapacity - slot.bookedCount} spots left` : "Fully booked"}
                    </Text>

                    <View style={styles.capacityBar}>
                      <View
                        style={[
                          styles.capacityFill,
                          {
                            width: `${(slot.bookedCount / slot.maxCapacity) * 100}%`,
                            backgroundColor: slot.available ? Colors.brand.purpleLight : Colors.text.tertiary,
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.emptySlotsContainer}>
                <Ionicons name="time-outline" size={48} color={colors.neutral[400]} />
                <Text style={styles.emptySlotsText}>No time slots available</Text>
                <Text style={styles.emptySlotsSubtext}>Please check back later or contact the organizer</Text>
              </View>
            )}
          </View>
        )}

        {/* Related Events Section - Lazy Loaded */}
        {relatedEvents.length > 0 && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <RelatedEventsSection
              events={relatedEvents}
              isLoading={isLoadingRelated}
            />
          </Animated.View>
        )}

        {/* Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>

          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="person-outline" size={20} color={colors.neutral[500]} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Organizer</Text>
                <Text style={styles.detailValue}>{eventDetails.organizer}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.neutral[500]} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {eventDetails.date} at {eventDetails.time}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name={eventDetails.isOnline ? "globe-outline" : "location-outline"}
                  size={20}
                  color={colors.neutral[500]}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{eventDetails.location}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="pricetag-outline" size={20} color={colors.neutral[500]} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{eventDetails.category}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reviews Section */}
        {eventDetails.id && (
          <EventReviews
            eventId={eventDetails.id}
            eventTitle={eventDetails.title}
          />
        )}
      </Animated.ScrollView>

      {/* Fixed Action Button */}
      <View style={styles.fixedBottom}>
        <EventActionButton
          onPress={eventDetails.isOnline ? handleOnlineBooking : handleOfflineBooking}
          loading={isLoading}
          disabled={!!error}
          isOnline={eventDetails.isOnline}
          price={{
            amount: eventDetails.price?.amount ?? 0,
            currency: eventDetails.isOnline ? currencySymbol : (eventDetails.price?.currency || currencySymbol),
            isFree: eventDetails.price?.isFree ?? false
          }}
          hasSelectedSlot={eventDetails.isOnline ? true : (availableSlots.length === 0 || !!selectedSlot)}
          theme={categoryTheme}
        />
      </View>

      {error && (
        <Animated.View
          style={[
            styles.errorToast,
            {
              opacity: fadeAnim,
              transform: [{ translateY: interpolate(slideAnim.value, [0, 30], [0, -10])}],
            },
          ]}
        >
          <Pressable onPress={() => setError(null)}>
            <View style={styles.errorInner}>
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={() => setError(null)}
                style={styles.errorCloseButton}
              >
                <Ionicons name="close" size={18} color="#991B1B" />
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* Event Booking Modal */}
      <EventBookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        event={{
          ...eventDetails,
          availableSlots: availableSlots.length > 0 ? availableSlots : eventDetails.availableSlots,
        }}
        onBookingSuccess={handleBookingSuccess}
        initialSelectedSlot={selectedSlot}
      />
    </ThemedView>
  );
}

// Event Action Button Component with Category Theme
function EventActionButton({
  onPress,
  loading,
  disabled,
  isOnline,
  price,
  hasSelectedSlot,
  theme,
}: {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  isOnline: boolean;
  price: { amount: number; currency: string; isFree: boolean };
  hasSelectedSlot: boolean;
  theme: CategoryTheme;
}) {
  const getButtonText = () => {
    if (loading) return "Processing...";
    if (isOnline) {
      return price.isFree ? "Register Free" : `Book Now • ${price.currency}${price.amount}`;
    } else {
      if (!hasSelectedSlot) return "Select Time Slot";
      return `Book Now • ${price.isFree ? "Free" : `${price.currency}${price.amount}`}`;
    }
  };

  const getButtonIcon = () => {
    if (loading) return "hourglass-outline";
    if (isOnline) return "globe-outline";
    if (!hasSelectedSlot) return "time-outline";
    return "ticket-outline";
  };

  // Use theme colors for the button gradient
  const buttonColors: [string, string] = disabled || !hasSelectedSlot
    ? [Colors.text.tertiary, Colors.text.tertiary]
    : theme.buttonGradient;

  return (
    <Pressable
      style={[actionStyles.button, (disabled || !hasSelectedSlot) && actionStyles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled || !hasSelectedSlot}
     
    >
      <LinearGradient
        colors={buttonColors}
        style={actionStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.background.primary} style={{ marginRight: 8 }} />
        ) : (
          <Ionicons name={getButtonIcon() as any} size={20} color={colors.background.primary} style={{ marginRight: 8 }} />
        )}
        <Text style={actionStyles.buttonText}>{getButtonText()}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const createStyles = (
  HORIZONTAL_PADDING: number,
  screenData: { width: number; height: number }
) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: Colors.background.primary,
    },

    // HERO
    heroSection: {
      height: Math.min(Math.max(screenData.height * 0.4, 320), 460),
      position: "relative",
      width: "100%",
      backgroundColor: colors.text.primary,
    },
    heroBackground: {
      flex: 1,
      width: "100%",
    },
    heroOverlay: {
      flex: 1,
      paddingTop: Platform.OS === "ios" ? 0 : 8, // slight breathing room on Android
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingTop: 8,
      paddingBottom: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.xl,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerActions: {
      flexDirection: "row",
      gap: Spacing.md,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.xl,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroContent: {
      flex: 1,
      justifyContent: "flex-end",
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingBottom: Spacing.xl,
    },
    categoryBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(139, 92, 246, 0.9)",
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
    },
    categoryText: {
      color: Colors.text.inverse,
      ...Typography.bodySmall,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    heroTitle: {
      ...Typography.h1,
      fontWeight: "800",
      color: Colors.text.inverse,
      marginBottom: Spacing.sm,
      lineHeight: 34,
    },
    heroSubtitle: {
      ...Typography.bodyLarge,
      color: "rgba(255,255,255,0.9)",
      marginBottom: Spacing.base,
      fontWeight: "500",
    },
    heroMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.base,
    },
    heroMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    heroMetaText: {
      color: Colors.text.inverse,
      ...Typography.body,
      fontWeight: "500",
    },

    // CONTENT
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 0,
      paddingBottom: 180, // ensure content isn't hidden behind the fixed button (button is at 90px from bottom + ~60px button height + 30px spacing)
    },

    priceCard: {
      marginHorizontal: HORIZONTAL_PADDING,
      marginTop: Spacing.base,
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
      zIndex: 1,
    },
    priceInfo: {
      flex: 1,
    },
    priceLabel: {
      ...Typography.body,
      color: Colors.text.tertiary,
      marginBottom: Spacing.xs,
      fontWeight: "500",
    },
    priceValue: {
      ...Typography.h2,
      fontWeight: "800",
      color: Colors.text.primary,
    },
    priceCardRight: {
      alignItems: "flex-end",
      gap: Spacing.sm,
    },
    ratingBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#FFF9E6",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    ratingText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.brand.amberDark,
    },
    eventTypeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: Colors.background.secondary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    eventTypeText: {
      ...Typography.bodySmall,
      fontWeight: "600",
    },

    section: {
      marginHorizontal: HORIZONTAL_PADDING,
      marginTop: Spacing['2xl'],
    },
    sectionTitle: {
      ...Typography.h3,
      fontWeight: "800",
      color: Colors.text.primary,
      marginBottom: Spacing.sm,
    },
    sectionSubtitle: {
      ...Typography.body,
      color: Colors.text.tertiary,
      marginBottom: Spacing.base,
      lineHeight: 20,
    },
    description: {
      ...Typography.bodyLarge,
      color: colors.neutral[700],
      lineHeight: 24,
      fontWeight: "400",
    },

    // Slots
    slotsGrid: {
      gap: Spacing.md,
    },
    slotCard: {
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.base,
      borderWidth: 2,
      borderColor: Colors.border.default,
    },
    slotCardSelected: {
      borderColor: Colors.brand.purpleLight,
      backgroundColor: colors.tint.coolGray,
    },
    slotCardDisabled: {
      backgroundColor: Colors.background.secondary,
      borderColor: Colors.border.default,
    },
    slotHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.sm,
    },
    slotTime: {
      ...Typography.bodyLarge,
      fontWeight: "700",
      color: Colors.text.primary,
    },
    slotTimeSelected: {
      color: Colors.brand.purpleLight,
    },
    slotTimeDisabled: {
      color: Colors.text.tertiary,
    },
    slotCapacity: {
      ...Typography.body,
      color: Colors.text.tertiary,
      marginBottom: Spacing.sm,
      fontWeight: "500",
    },
    slotCapacityDisabled: {
      color: Colors.text.tertiary,
    },
    capacityBar: {
      height: 4,
      backgroundColor: Colors.border.default,
      borderRadius: 2,
      overflow: "hidden",
    },
    capacityFill: {
      height: "100%",
      borderRadius: 2,
    },
    emptySlotsContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptySlotsText: {
      ...Typography.bodyLarge,
      fontWeight: "600",
      color: Colors.text.primary,
      marginTop: Spacing.base,
      marginBottom: Spacing.sm,
    },
    emptySlotsSubtext: {
      ...Typography.body,
      color: Colors.text.tertiary,
      textAlign: "center",
      lineHeight: 20,
    },

    detailsList: {
      gap: Spacing.lg,
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.base,
    },
    detailIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.xl,
      backgroundColor: Colors.background.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      ...Typography.body,
      color: Colors.text.tertiary,
      marginBottom: Spacing.xs,
      fontWeight: "500",
    },
    detailValue: {
      ...Typography.bodyLarge,
      color: Colors.text.primary,
      fontWeight: "600",
    },

    // Bottom UI
    fixedBottom: {
      position: "absolute",
      left: HORIZONTAL_PADDING,
      right: HORIZONTAL_PADDING,
      bottom: 70, // Position above bottom navigation bar (70px nav + 20px spacing)
    },

    // Error toast
    errorToast: {
      position: "absolute",
      left: HORIZONTAL_PADDING,
      right: HORIZONTAL_PADDING,
      top: Platform.OS === "ios" ? 60 : 44,
    },
    errorInner: {
      backgroundColor: Colors.errorScale[50],
      borderLeftWidth: 4,
      borderLeftColor: Colors.error,
      padding: Spacing.base,
      borderRadius: BorderRadius.md,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    errorText: {
      color: "#991B1B",
      ...Typography.body,
      fontWeight: "600",
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    loadingText: {
      marginTop: Spacing.base,
      ...Typography.bodyLarge,
      color: Colors.text.tertiary,
      fontWeight: "500",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    errorTitle: {
      ...Typography.h3,
      fontWeight: "700",
      color: Colors.text.primary,
      marginTop: Spacing.base,
      marginBottom: Spacing.sm,
    },
    errorMessage: {
      ...Typography.bodyLarge,
      color: Colors.text.tertiary,
      textAlign: "center",
      marginBottom: Spacing.xl,
    },
    retryButton: {
      backgroundColor: Colors.brand.purpleLight,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryButtonText: {
      color: Colors.text.inverse,
      ...Typography.bodyLarge,
      fontWeight: "600",
    },
    loadingSkeleton: {
      width: '80%',
      height: 200,
      backgroundColor: Colors.border.default,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.lg,
    },
    imagePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.background.secondary,
    },
    imagePlaceholderText: {
      marginTop: Spacing.md,
      ...Typography.body,
      color: Colors.text.tertiary,
      fontWeight: '500',
    },
    errorCloseButton: {
      padding: Spacing.xs,
      marginLeft: Spacing.sm,
    },

    // Event Not Found styles
    notFoundContainer: {
      flex: 1,
      backgroundColor: Colors.text.primary,
    },
    notFoundGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notFoundContent: {
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    notFoundIconContainer: {
      position: 'relative',
      marginBottom: 24,
    },
    notFoundIconBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: Colors.text.primary,
      borderRadius: 14,
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notFoundTitle: {
      ...Typography.h1,
      fontWeight: '800',
      color: Colors.text.inverse,
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    notFoundMessage: {
      ...Typography.bodyLarge,
      color: Colors.text.tertiary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: Spacing['2xl'],
    },
    notFoundActions: {
      flexDirection: 'row',
      gap: Spacing.base,
    },
    notFoundBackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[700],
      paddingHorizontal: Spacing.lg,
      paddingVertical: 14,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    notFoundBackText: {
      color: Colors.text.inverse,
      ...Typography.bodyLarge,
      fontWeight: '600',
    },
    notFoundExploreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      borderWidth: 1,
      borderColor: Colors.brand.purpleLight,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 14,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    notFoundExploreText: {
      color: Colors.brand.purpleLight,
      ...Typography.bodyLarge,
      fontWeight: '600',
    },

    // Extracted inline styles
    rewardCard: { backgroundColor: colors.tint.purpleLight, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: '#E0D4FC' },
    rewardCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    rewardIconCircle: { width: 40, height: 40, borderRadius: BorderRadius.xl, backgroundColor: Colors.brand.purpleLight, justifyContent: 'center', alignItems: 'center' },
    rewardHeaderText: { marginLeft: Spacing.md, flex: 1 },
    rewardTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.primary },
    rewardSubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary },
    rewardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
    rewardRowBorder: { borderTopWidth: 1, borderTopColor: '#E0D4FC' },
    rewardDescription: { flex: 1, marginLeft: 10, ...Typography.body, color: colors.neutral[700] },
    rewardCoinBadge: { backgroundColor: Colors.brand.purpleLight, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 10 },
    rewardCoinText: { ...Typography.bodySmall, fontWeight: '700', color: Colors.text.inverse },
    scheduleRow: { flexDirection: 'row', paddingVertical: Spacing.md },
    scheduleRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border.default },
    scheduleTimeCol: { width: 44, alignItems: 'center' },
    scheduleTimeText: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2, textAlign: 'center' },
    scheduleContent: { flex: 1, marginLeft: Spacing.md },
    scheduleItemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
    scheduleItemDesc: { fontSize: 13, color: Colors.text.tertiary, marginTop: 2 },
    sponsorsScroll: { marginTop: 8 },
    sponsorCard: { alignItems: 'center', marginRight: Spacing.base, padding: Spacing.md, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, minWidth: 80 },
    sponsorLogo: { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
    sponsorLogoPlaceholder: { width: 40, height: 40, borderRadius: BorderRadius.xl, backgroundColor: Colors.border.default, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
    sponsorName: { ...Typography.bodySmall, fontWeight: '600', color: colors.neutral[700], textAlign: 'center' },
  });

const actionStyles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    gap: 10,
  },
  buttonText: {
    ...Typography.bodyLarge,
    fontWeight: "700",
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(EventPage, 'Event');

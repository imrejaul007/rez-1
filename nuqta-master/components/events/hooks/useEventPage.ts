/**
 * Custom hook for EventPage state and logic
 *
 * Extracts all state management, API calls, animations,
 * and event handling from the monolithic EventPage.
 */
import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Dimensions,
  Platform,
  Share,
  Linking,
} from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { showAlert, alertOk, confirmAlert } from '@/utils/alert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { EventItem } from '@/types/homepage.types';
import eventsApiService from '@/services/eventsApi';
import { useAuthUser, useIsAuthenticated, useGetCurrencySymbol } from '@/stores/selectors';
import { BUSINESS_CONFIG } from '@/config/env';
import eventAnalytics from '@/services/eventAnalytics';
import { getCategoryTheme, CategoryTheme } from '@/constants/categoryThemes';
import { errorReporter } from '@/utils/errorReporter';

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

export interface EventPageHookReturn {
  // Data
  eventDetails: EventItem | null;
  realEventData: EventItem | null;
  categoryTheme: CategoryTheme;
  isOfflineEvent: boolean;
  availableSlots: any[];
  rewardInfo: any;
  relatedEvents: EventItem[];
  isLoadingRelated: boolean;
  currencySymbol: string;

  // State
  selectedSlot: string | null;
  setSelectedSlot: (slot: string | null) => void;
  showBookingModal: boolean;
  setShowBookingModal: (show: boolean) => void;
  isLoadingEvent: boolean;
  isLoadingFavorite: boolean;
  isFavorited: boolean;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  retryCount: number;
  imageError: boolean;
  setImageError: (err: boolean) => void;

  // Animation
  fadeAnim: Animated.SharedValue<number>;
  slideAnim: Animated.SharedValue<number>;
  imageOpacity: Animated.SharedValue<number>;

  // Layout
  screenData: { width: number; height: number };
  HORIZONTAL_PADDING: number;

  // Handlers
  handleSharePress: () => Promise<void>;
  handleFavoritePress: () => Promise<void>;
  handleOnlineBooking: () => Promise<void>;
  handleOfflineBooking: () => Promise<void>;
  handleBookingSuccess: (bookingId?: string) => void;
  handleBackPress: () => void;
  handleImageLoad: () => void;
  handleImageError: () => void;
  handleRetry: () => void;

  // Params
  eventIdParam: string | undefined;
}

const MAX_RETRIES = 3;

export function useEventPage(props?: { eventId?: string; initialEvent?: EventItem }): EventPageHookReturn {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
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

  const pageViewStartTime = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const imageOpacity = useSharedValue(0);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const eventIdParam = (params.eventId || params.id || props?.eventId) as string | undefined;
  const eventDataParam = params.eventData as string | undefined;
  const eventTypeParam = params.eventType as string | undefined;

  // Parse dynamic event data and fetch real data
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
            try {
              const realData = await eventsApiService.getEventById(eventIdParam);
              if (!cancelled && realData) setRealEventData(realData);
            } catch (err) {
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
          try {
            const realData = await eventsApiService.getEventById(eventIdParam);
            if (cancelled) return;
            if (realData) {
              setRealEventData(realData);
              setIsDynamic(false);
            } else {
              setError('Event not found');
            }
          } catch (err) {
            if (cancelled) return;
            errorReporter.captureError(
              err instanceof Error ? err : new Error('Failed to load event by ID'),
              { context: 'EventPage.loadEventData.fetchById' },
              'warning'
            );
            setError('Failed to load event. Please try again.');
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
        setError('Failed to load event. Please try again.');
      } finally {
        if (!cancelled) setIsLoadingEvent(false);
      }
    };
    loadEventData();
    return () => { cancelled = true; };
  }, [eventIdParam, eventDataParam, eventTypeParam]);

  // Fetch reward info and favorite status
  useEffect(() => {
    if (realEventData?.id) {
      eventsApiService.getEventRewardInfo(realEventData.id)
        .then(info => { if (info) setRewardInfo(info); })
        .catch(() => {});
      eventsApiService.isFavorited(realEventData.id)
        .then(fav => setIsFavorited(fav))
        .catch(() => {});
    }
  }, [realEventData?.id]);

  // Animate content on load
  useEffect(() => {
    if (!isLoadingEvent && realEventData) {
      fadeAnim.value = withTiming(1, { duration: 400 });
      slideAnim.value = withTiming(0, { duration: 400 });
    }
  }, [isLoadingEvent, realEventData, fadeAnim, slideAnim]);

  const handleImageLoad = useCallback(() => {
    imageOpacity.value = withTiming(1, { duration: 300 });
  }, [imageOpacity]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    imageOpacity.value = 1;
  }, [imageOpacity]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  const HORIZONTAL_PADDING = screenData.width < 375 ? 16 : screenData.width > 768 ? 32 : 20;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => setScreenData(window), 100);
    });
    return () => {
      subscription?.remove();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  // Deep link support
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      try {
        let deepLinkEventId: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const urlObj = new URL(url);
          deepLinkEventId = urlObj.searchParams.get('eventId');
        } else {
          const match = url.match(/[?&]eventId=([^&]+)/);
          if (match) deepLinkEventId = decodeURIComponent(match[1]);
        }
        if (deepLinkEventId && deepLinkEventId !== eventIdParam) {
          setIsLoadingEvent(true);
          setError(null);
          eventsApiService.getEventById(deepLinkEventId)
            .then((data) => {
              if (data) { setRealEventData(data); setIsDynamic(false); }
              else setError('Event not found');
            })
            .catch(() => setError('Failed to load event from link'))
            .finally(() => setIsLoadingEvent(false));
        }
      } catch (err) {
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to handle deep link'),
          { context: 'EventPage.handleDeepLink' },
          'info'
        );
      }
    };
    const subscription = Linking.addEventListener('url', (event) => handleDeepLink(event.url));
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); }).catch(() => {});
    return () => subscription.remove();
  }, [eventIdParam]);

  // Event data
  const eventDetails: EventItem | null = useMemo(() => {
    if (realEventData) return realEventData;
    if (isDynamic && eventData) {
      return {
        id: eventData.id,
        type: 'event',
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
    if (props?.initialEvent) return props.initialEvent;
    return null;
  }, [props?.initialEvent, isDynamic, eventData, realEventData]);

  const categoryTheme = useMemo(() => getCategoryTheme(eventDetails?.category), [eventDetails?.category]);

  const isOfflineEvent = useMemo(() => {
    if (!eventDetails) return true;
    if (eventDetails.isOnline === true) return false;
    if (eventDetails.location) {
      const locationLower = eventDetails.location.toLowerCase();
      if (locationLower === 'online' || locationLower === 'online event' || locationLower.includes('virtual')) return false;
    }
    return true;
  }, [eventDetails?.isOnline, eventDetails?.location]);

  const availableSlots = useMemo(() => {
    if (!isOfflineEvent) return [];
    if (realEventData) {
      return realEventData.availableSlots && Array.isArray(realEventData.availableSlots)
        ? realEventData.availableSlots : [];
    }
    if (eventData?.availableSlots && Array.isArray(eventData.availableSlots)) return eventData.availableSlots;
    return [];
  }, [isOfflineEvent, eventData, realEventData]);

  const handleSharePress = useCallback(async () => {
    if (!eventDetails) return;
    try {
      setIsLoading(true);
      const appUrl = BUSINESS_CONFIG.app.website || 'https://rezapp.com';
      const shareUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/EventPage?eventId=${eventDetails.id}`
        : `${appUrl}/EventPage?eventId=${eventDetails.id}`;
      const shareMessage = `Check out ${eventDetails.title} by ${eventDetails.organizer} on ${eventDetails.date}\n${shareUrl}`;
      await Share.share({ message: shareMessage, url: shareUrl, title: eventDetails.title });
      try {
        const shareResult = await eventsApiService.shareEvent(eventDetails.id);
        eventAnalytics.trackShare(eventDetails.id, Platform.OS, 'event_page');
        if (shareResult?.success && shareResult?.reward?.coinsAwarded) {
          showAlert('Coins Earned!', `You earned +${shareResult.reward.coinsAwarded} coins for sharing this event!`);
        } else if (shareResult?.success && shareResult?.message) {
          alertOk('Shared!', shareResult.message);
        }
      } catch {
        eventAnalytics.trackShare(eventDetails.id, Platform.OS, 'event_page');
      }
    } catch (err) {
      if (err instanceof Error && err.message !== 'User canceled') setError('Failed to share event.');
    } finally {
      setIsLoading(false);
    }
  }, [eventDetails]);

  const handleFavoritePress = useCallback(async () => {
    if (!eventDetails) return;
    if (!isAuthenticated || !user) { alertOk('Login Required', 'Please login to favorite events'); return; }
    try {
      setIsLoadingFavorite(true);
      const previousState = isFavorited;
      setIsFavorited(!previousState);
      const result = await eventsApiService.toggleEventFavorite(eventDetails.id);
      if (result.success) {
        const newState = result.isFavorited ?? !previousState;
        setIsFavorited(newState);
        eventAnalytics.trackFavoriteToggle(eventDetails.id, newState, 'event_page');
        alertOk(
          newState ? 'Added to Favorites' : 'Removed from Favorites',
          `${eventDetails.title} ${newState ? 'added to' : 'removed from'} favorites.`
        );
      } else {
        setIsFavorited(previousState);
        throw new Error(result.message || 'Failed to update favorite status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite status');
    } finally {
      setIsLoadingFavorite(false);
    }
  }, [eventDetails?.id, eventDetails?.title, isFavorited, isAuthenticated, user]);

  const handleOnlineBooking = useCallback(async () => {
    if (!eventDetails || !eventDetails.isOnline) return;
    if (!isAuthenticated || !user) { alertOk('Login Required', 'Please login to register for events'); return; }
    eventAnalytics.trackBookingStart(eventDetails.id, undefined, 'event_page');
    setShowBookingModal(true);
  }, [eventDetails, isAuthenticated, user]);

  const handleOfflineBooking = useCallback(async () => {
    if (!eventDetails || eventDetails.isOnline) return;
    if (availableSlots.length > 0 && !selectedSlot) {
      alertOk('Select Time Slot', 'Please select a time slot before booking.');
      return;
    }
    if (!isAuthenticated || !user) { alertOk('Login Required', 'Please login to book events'); return; }
    eventAnalytics.trackBookingStart(eventDetails.id, selectedSlot || undefined, 'event_page');
    setShowBookingModal(true);
  }, [eventDetails, selectedSlot, availableSlots, isAuthenticated, user]);

  const handleBookingSuccess = useCallback((bookingId?: string) => {
    setShowBookingModal(false);
    showAlert(
      'Booking Confirmed!',
      `Your booking has been confirmed${bookingId ? `. Booking Reference: ${bookingId}` : ''}. View your upcoming events in My Events.`,
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'My Events',
          onPress: () => {
            if (Platform.OS === 'ios') setTimeout(() => router.push('/my-events' as any), 50);
            else router.push('/my-events' as any);
          },
        },
      ]
    );
  }, [router]);

  const handleBackPress = useCallback(
    () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')),
    [router]
  );

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 4500);
    return () => clearTimeout(id);
  }, [error]);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
    setIsLoadingEvent(true);
    const loadEventData = async () => {
      try {
        if (eventIdParam) {
          const realData = await eventsApiService.getEventById(eventIdParam);
          if (realData) { setRealEventData(realData); setRetryCount(0); }
          else setError('Event not found');
        }
      } catch {
        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => loadEventData(), delay);
        } else {
          setError(`Failed to load event after ${MAX_RETRIES} attempts. Please check your connection.`);
          setIsLoadingEvent(false);
        }
      } finally {
        if (retryCount >= MAX_RETRIES) setIsLoadingEvent(false);
      }
    };
    loadEventData();
  }, [eventIdParam, retryCount]);

  return {
    eventDetails,
    realEventData,
    categoryTheme,
    isOfflineEvent,
    availableSlots,
    rewardInfo,
    relatedEvents,
    isLoadingRelated,
    currencySymbol,
    selectedSlot,
    setSelectedSlot,
    showBookingModal,
    setShowBookingModal,
    isLoadingEvent,
    isLoadingFavorite,
    isFavorited,
    isLoading,
    error,
    setError,
    retryCount,
    imageError,
    setImageError,
    fadeAnim,
    slideAnim,
    imageOpacity,
    screenData,
    HORIZONTAL_PADDING,
    handleSharePress,
    handleFavoritePress,
    handleOnlineBooking,
    handleOfflineBooking,
    handleBookingSuccess,
    handleBackPress,
    handleImageLoad,
    handleImageError,
    handleRetry,
    eventIdParam,
  };
}

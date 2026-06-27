// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import storesApi, { Store } from '@/services/storesApi';
import storeVisitApi from '@/services/storeVisitApi';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import SkeletonLoader from '@/components/common/SkeletonLoader';
import analyticsService from '@/services/analyticsService';
import StoreVisitLoadingSkeleton from '@/components/store-visit/StoreVisitLoadingSkeleton';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

// Get screen dimensions for responsive design
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

type CrowdLevel = 'Low' | 'Medium' | 'High';

interface VisitDetails {
  name: string;
  phone: string;
  email: string;
  visitDate: Date | null;
  visitTime: string;
}

// Input Validation Utilities
const validateEmail = (email: string): boolean => {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validatePhone = (phone: string): { valid: boolean; message?: string } => {
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length === 0) {
    return { valid: false, message: 'Phone number is required' };
  }

  if (cleanPhone.length < 10) {
    return { valid: false, message: 'Phone number must be at least 10 digits' };
  }

  if (cleanPhone.length > 15) {
    return { valid: false, message: 'Phone number is too long' };
  }

  return { valid: true };
};

const validateName = (name: string): { valid: boolean; message?: string } => {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { valid: false, message: 'Name is required' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' };
  }

  if (trimmedName.length > 50) {
    return { valid: false, message: 'Name is too long (max 50 characters)' };
  }

  // Allow letters, spaces, hyphens, apostrophes, and common international characters
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { valid: false, message: 'Name contains invalid characters' };
  }

  return { valid: true };
};

const sanitizeInput = (input: string): string => {
  // Remove potential XSS characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .trim();
};

function StoreVisitPageInner() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const rescheduleVisitId = params.rescheduleVisitId as string | undefined;
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  // State
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>('Medium');
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [visitDetails, setVisitDetails] = useState<VisitDetails>({
    name: user?.name || '',
    phone: user?.phoneNumber || '',
    email: user?.email || '',
    visitDate: null,
    visitTime: '',
  });
  const [schedulingVisit, setSchedulingVisit] = useState(false);
  const [gettingQueue, setGettingQueue] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_store' | 'none'>('none');
  const [queueEstimatedWait, setQueueEstimatedWait] = useState<string>('');
  const [queueSize, setQueueSize] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const refreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Memoized next 7 days for date selection - returns array directly
  const next7DaysArray = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  // Legacy function wrapper for compatibility
  const getNext7Days = useCallback(() => next7DaysArray, [next7DaysArray]);

  // Time slots
  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
  ];

  // Check if a time slot is in the past for the selected date
  const isTimeInPast = (timeString: string, dateToCheck: Date): boolean => {
    const now = new Date();
    const selectedDate = new Date(dateToCheck);

    // If selected date is not today, it can't be in the past (assuming future dates only)
    if (selectedDate.toDateString() !== now.toDateString()) {
      return false;
    }

    // Parse the time string (e.g., "02:00 PM")
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }

    // Create a date object for the selected time
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(hour24, minutes, 0, 0);

    // Check if this time has passed
    return selectedDateTime <= now;
  };

  // Helper function to convert time string to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }

    return hour24 * 60 + minutes;
  };

  // Helper to get store hours for a given day from keyed object
  const getHoursForDay = useCallback((dayName: string) => {
    const dayKey = dayName.toLowerCase();
    // Try operationalInfo.hours first (raw backend), then unified hours object
    const hoursObj = (store as any)?.operationalInfo?.hours || store?.hours;
    if (!hoursObj || typeof hoursObj !== 'object') return null;
    const dayData = hoursObj[dayKey];
    if (!dayData) return null;
    return {
      open: dayData.open || '09:00 AM',
      close: dayData.close || '09:00 PM',
      closed: dayData.closed ?? !dayData.isOpen ?? false,
    };
  }, [store]);

  // Memoized available time slots based on selected date and store hours
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) {
      return timeSlots;
    }

    // Get store hours for selected date
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayHours = getHoursForDay(dayName);

    // If store is closed on this day, return empty array
    if (dayHours?.closed) {
      return [];
    }

    // Filter slots based on store hours and past time
    return timeSlots.filter(time => {
      // First check if time is in the past
      if (isTimeInPast(time, selectedDate)) {
        return false;
      }

      // If no store hours available, allow all future times
      if (!dayHours?.open || !dayHours?.close) {
        return true;
      }

      // Check if time falls within store hours
      const timeMinutes = timeToMinutes(time);
      const openMinutes = timeToMinutes(dayHours.open);
      const closeMinutes = timeToMinutes(dayHours.close);

      return timeMinutes >= openMinutes && timeMinutes <= closeMinutes;
    });
  }, [selectedDate, store, timeSlots, getHoursForDay]);

  // Legacy function wrapper for compatibility
  const getAvailableTimeSlots = useCallback(() => availableTimeSlots, [availableTimeSlots]);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated) {
      showAlert(
        'Login Required',
        'You need to be logged in to visit a store. Please sign in to continue.',
        [
          {
            text: 'Go to Login',
            onPress: () => router.push('/sign-in'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)'),
          },
        ],
        'warning'
      );
    }
  }, [isAuthenticated]);

  // Pre-fill user details when user data loads
  useEffect(() => {
    if (user) {
      setVisitDetails(prev => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phoneNumber || prev.phone,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // Clear selected time if it becomes invalid when date changes
  useEffect(() => {
    if (selectedDate && selectedTime && isTimeInPast(selectedTime, selectedDate)) {
      setSelectedTime('');
      showAlert(
        'Time Slot No Longer Available',
        'The selected time has passed. Please choose another time slot.',
        undefined,
        'info'
      );
    }
  }, [selectedDate]);

  // Fetch available slots from backend when date changes
  useEffect(() => {
    if (!selectedDate || !storeId) {
      setAvailableSlots([]);
      setSlotsLoaded(false);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setSlotsLoaded(false);
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await storeVisitApi.getAvailableSlots(storeId, dateStr);
        if (response.success && response.data) {
          setAvailableSlots(response.data.availableSlots);
        } else {
          if (!isMounted()) return;
          setAvailableSlots([]);
        }
      } catch (err) {
        if (!isMounted()) return;
        setAvailableSlots([]);
      } finally {
        if (!isMounted()) return;
        setLoadingSlots(false);
        if (!isMounted()) return;
        setSlotsLoaded(true);
      }
    };

    fetchSlots();
  }, [selectedDate, storeId]);

  // Memoized fetch store details function
  const fetchStoreDetails = useCallback(async () => {
    if (!storeId) {
      setError('Store ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await storesApi.getStoreById(storeId);

      if (response.success && response.data) {
        // Backend returns { store, products, productsCount }, extract just the store
        const storeData = (response.data as any).store || response.data;
        if (!isMounted()) return;
        setStore(storeData);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to load store details');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to connect to server');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [storeId]);

  // Memoized fetch store availability function
  const fetchStoreAvailability = useCallback(async () => {
    if (!storeId) {
      return;
    }

    try {
      const response = await storeVisitApi.checkStoreAvailability(storeId);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setCrowdLevel(response.data.crowdStatus);
        if (!isMounted()) return;
        setLastUpdated(new Date());
      } else {
        // Keep default 'Medium' if API fails
      }
    } catch (err) {
      // Keep default 'Medium' if error occurs
    }
  }, [storeId]);

  // Fetch store details and availability
  useEffect(() => {
    // Track page view
    if (storeId) {
      analyticsService.trackPageView('store_visit', {
        storeId,
        timestamp: new Date().toISOString(),
      });
    }

    fetchStoreDetails();
    fetchStoreAvailability();
  }, [fetchStoreDetails, fetchStoreAvailability, storeId]);

  // Set up periodic refresh of crowd data (every 30 seconds)
  useEffect(() => {
    if (!storeId) return;

    // Start auto-refresh
    const intervalId = setInterval(() => {
      fetchStoreAvailability();
    }, 30000); // Refresh every 30 seconds

    refreshIntervalRef.current = intervalId;

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [storeId]);

  // Memoized today's store hours
  const todayHours = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const hours = getHoursForDay(today);
    return hours || { open: '09:00 AM', close: '09:00 PM', closed: false };
  }, [getHoursForDay]);

  const isOpen = !todayHours.closed;

  // Memoized handle queue number generation
  const handleGetQueueNumber = useCallback(async () => {
    // Check authentication
    if (!isAuthenticated) {
      showAlert(
        'Login Required',
        'You need to be logged in to get a queue number. Please sign in to continue.',
        [{ text: 'Go to Login', onPress: () => router.push('/sign-in') }],
        'warning'
      );
      return;
    }

    // Validate name
    const nameValidation = validateName(visitDetails.name);
    if (!nameValidation.valid) {
      showAlert('Invalid Name', nameValidation.message || 'Please enter a valid name', undefined, 'error');
      return;
    }

    // Validate phone
    const phoneValidation = validatePhone(visitDetails.phone);
    if (!phoneValidation.valid) {
      showAlert('Invalid Phone', phoneValidation.message || 'Please enter a valid phone number', undefined, 'error');
      return;
    }

    // Validate email if provided
    if (visitDetails.email && !validateEmail(visitDetails.email)) {
      showAlert('Invalid Email', 'Please enter a valid email address', undefined, 'error');
      return;
    }

    try {
      setGettingQueue(true);

      // Track queue number request initiated
      analyticsService.track('queue_number_requested', {
        storeId,
        storeName: store?.name,
        crowdLevel,
        timestamp: new Date().toISOString(),
      });

      const response = await storeVisitApi.getQueueNumber({
        storeId: storeId as string,
        customerName: visitDetails.name,
        customerPhone: visitDetails.phone,
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setQueueNumber(response.data.queueNumber);
        if (!isMounted()) return;
        setQueueEstimatedWait(response.data.estimatedWaitTime);
        if (!isMounted()) return;
        setQueueSize(response.data.currentQueueSize);

        // Track queue number success
        analyticsService.track('queue_number_success', {
          storeId,
          storeName: store?.name,
          queueNumber: response.data.queueNumber,
          estimatedWaitTime: response.data.estimatedWaitTime,
          currentQueueSize: response.data.currentQueueSize,
          crowdLevel,
          timestamp: new Date().toISOString(),
          status: 'success',
        });
      } else {
        // Track queue number error
        analyticsService.track('queue_number_error', {
          storeId,
          storeName: store?.name,
          errorMessage: response.message || 'Unknown error',
          crowdLevel,
          timestamp: new Date().toISOString(),
          status: 'failed',
        });

        showAlert('Failed', response.message || 'Unable to get queue number. Please try again.', undefined, 'error');
      }
    } catch (error: any) {
      // Track error occurred
      analyticsService.track('error_occurred', {
        context: 'queue_number_generation',
        storeId,
        storeName: store?.name,
        errorMessage: error.message,
        crowdLevel,
        timestamp: new Date().toISOString(),
      });

      showAlert('Error', error.message || 'Unable to get queue number. Please try again.', undefined, 'error');
    } finally {
      if (!isMounted()) return;
      setGettingQueue(false);
    }
  }, [isAuthenticated, visitDetails, storeId, router, store, crowdLevel]);

  // Memoized handle visit scheduling
  const handleScheduleVisit = useCallback(async () => {
    // Check authentication
    if (!isAuthenticated) {
      showAlert(
        'Login Required',
        'You need to be logged in to schedule a visit. Please sign in to continue.',
        [{ text: 'Go to Login', onPress: () => router.push('/sign-in') }],
        'warning'
      );
      return;
    }

    // Validate name
    const nameValidation = validateName(visitDetails.name);
    if (!nameValidation.valid) {
      showAlert('Invalid Name', nameValidation.message || 'Please enter a valid name', undefined, 'error');
      return;
    }

    // Validate phone
    const phoneValidation = validatePhone(visitDetails.phone);
    if (!phoneValidation.valid) {
      showAlert('Invalid Phone', phoneValidation.message || 'Please enter a valid phone number', undefined, 'error');
      return;
    }

    // Validate email if provided
    if (visitDetails.email && !validateEmail(visitDetails.email)) {
      showAlert('Invalid Email', 'Please enter a valid email address', undefined, 'error');
      return;
    }

    // Validate date & time selection
    if (!selectedDate || !selectedTime) {
      showAlert('Select Date & Time', 'Please select your preferred visit date and time', undefined, 'warning');
      return;
    }

    // Validate that the selected time is not in the past
    if (isTimeInPast(selectedTime, selectedDate)) {
      showAlert(
        'Invalid Time',
        'The selected time has already passed. Please choose a future time slot.',
        undefined,
        'error'
      );
      return;
    }

    // Validate that the date is not in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);

    if (selectedDateOnly < now) {
      showAlert(
        'Invalid Date',
        'Cannot schedule a visit in the past. Please select a future date.',
        undefined,
        'error'
      );
      return;
    }

    try {
      setSchedulingVisit(true);

      // Track visit scheduling initiated
      analyticsService.track('visit_scheduling_initiated', {
        storeId,
        storeName: store?.name,
        visitDate: selectedDate?.toISOString(),
        visitTime: selectedTime,
        crowdLevel,
        timestamp: new Date().toISOString(),
      });
      let response;
      if (rescheduleVisitId) {
        response = await storeVisitApi.rescheduleVisit(
          rescheduleVisitId,
          selectedDate.toISOString(),
          selectedTime,
        );
      } else {
        response = await storeVisitApi.scheduleStoreVisit({
          storeId: storeId as string,
          visitDate: selectedDate.toISOString(),
          visitTime: selectedTime,
          customerName: visitDetails.name,
          customerPhone: visitDetails.phone,
          customerEmail: visitDetails.email || undefined,
          paymentMethod,
        });
      }

      if (response.success && response.data) {
        const dateStr = selectedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        // Track visit scheduled success
        analyticsService.track(rescheduleVisitId ? 'visit_rescheduled' : 'visit_scheduled', {
          storeId,
          storeName: store?.name,
          visitNumber: response.data.visitNumber,
          visitDate: selectedDate?.toISOString(),
          visitTime: selectedTime,
          crowdLevel,
          timestamp: new Date().toISOString(),
          status: 'success',
        });

        showAlert(
          rescheduleVisitId ? 'Visit Rescheduled!' : 'Visit Scheduled!',
          `Your visit has been ${rescheduleVisitId ? 'rescheduled' : 'scheduled'}!\n\nVisit Number: ${response.data.visitNumber}\nDate: ${dateStr}\nTime: ${selectedTime}\n\nYou'll receive a confirmation SMS shortly.`,
          [{
            text: 'OK',
            style: 'default',
            onPress: () => {
              // Reset form
              setSelectedDate(null);
              setSelectedTime('');
              router.canGoBack() ? router.back() : router.replace('/(tabs)');
            }
          }],
          'success'
        );
      } else {
        // Track visit scheduling error
        analyticsService.track('visit_scheduling_error', {
          storeId,
          storeName: store?.name,
          visitDate: selectedDate?.toISOString(),
          visitTime: selectedTime,
          errorMessage: response.message || 'Unknown error',
          crowdLevel,
          timestamp: new Date().toISOString(),
          status: 'failed',
        });

        showAlert('Failed', response.message || 'Unable to schedule visit. Please try again.', undefined, 'error');
      }
    } catch (error: any) {
      // Track error occurred
      analyticsService.track('error_occurred', {
        context: 'visit_scheduling',
        storeId,
        storeName: store?.name,
        errorMessage: error.message,
        crowdLevel,
        timestamp: new Date().toISOString(),
      });

      showAlert('Error', error.message || 'Unable to schedule visit. Please try again.', undefined, 'error');
    } finally {
      if (!isMounted()) return;
      setSchedulingVisit(false);
    }
  }, [isAuthenticated, visitDetails, selectedDate, selectedTime, storeId, router, store, crowdLevel, rescheduleVisitId, paymentMethod]);

  // Memoized handle directions
  const handleGetDirections = useCallback(() => {
    if (!store?.location?.address && !store?.location?.city) {
      showAlert('Address Not Available', 'Store address information is not available', undefined, 'warning');
      return;
    }

    // Track directions clicked
    analyticsService.track('directions_clicked', {
      storeId,
      storeName: store?.name,
      address: [store.location?.address, store.location?.city].filter(Boolean).join(', '),
      crowdLevel,
      timestamp: new Date().toISOString(),
    });

    const address = [store.location?.address, store.location?.city, store.location?.state, store.location?.pincode].filter(Boolean).join(', ');
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    });

    Linking.openURL(url).catch(() => {
      // Track error opening maps
      analyticsService.track('error_occurred', {
        context: 'directions_opening',
        storeId,
        storeName: store?.name,
        errorMessage: 'Unable to open maps application',
        crowdLevel,
        timestamp: new Date().toISOString(),
      });

      showAlert('Error', 'Unable to open maps application', undefined, 'error');
    });
  }, [store, storeId, crowdLevel]);

  // Memoized get crowd status color and badge
  const getCrowdStatusColor = useCallback((level: CrowdLevel) => {
    switch (level) {
      case 'Low': return Colors.gold;
      case 'Medium': return Colors.warning;
      case 'High': return Colors.error;
    }
  }, []);

  // Memoized get time since last update
  const getTimeSinceUpdate = useCallback(() => {
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);

    if (secondsAgo < 60) return 'Just now';
    if (secondsAgo < 120) return '1 minute ago';
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `${minutesAgo} minutes ago`;
  }, [lastUpdated]);

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Loading state - show skeleton screens
  if (loading) {
    return <StoreVisitLoadingSkeleton onBackPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />;
  }

  // Error state
  if (error || !store) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient
          colors={[Colors.gold, colors.brand.teal]}
          style={styles.header}
        >
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Store Visit</ThemedText>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Store not found'}</Text>
          <Pressable onPress={fetchStoreDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gold, colors.brand.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Store Visit</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.storeCard}>
          <View style={styles.storeCardRow}>
            <View style={styles.storeIconContainer}>
              <Ionicons name="storefront" size={22} color={Colors.gold} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.storeName}>{store.name}</Text>
              {store.category?.name && (
                <Text style={styles.storeCategory}>{store.category.name}</Text>
              )}
              {(store.location?.address || store.location?.city) && (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={12} color={Colors.text.tertiary} />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {[store.location?.address, store.location?.city].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Live Availability Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={18} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Live Availability</Text>
                <View style={styles.lastUpdatedContainer}>
                  <Ionicons name="time-outline" size={10} color={Colors.text.tertiary} />
                  <Text style={styles.lastUpdatedText}>{getTimeSinceUpdate()}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.crowdStatusContainer}>
            <View style={[styles.crowdBadge, { backgroundColor: getCrowdStatusColor(crowdLevel) + '20' }]}>
              <View style={[styles.crowdDot, { backgroundColor: getCrowdStatusColor(crowdLevel) }]} />
              <Text style={[styles.crowdText, { color: getCrowdStatusColor(crowdLevel) }]}>{crowdLevel} Crowd</Text>
            </View>
            {queueNumber && (
              <View style={styles.queueNumberDisplay}>
                <Text style={styles.queueNumberLabel}>Your Queue Number</Text>
                <Text style={styles.queueNumberValue}>#{queueNumber}</Text>
                {queueEstimatedWait ? (
                  <View style={styles.queueWaitRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.gold} />
                    <Text style={styles.queueWaitText}>
                      Est. wait: {queueEstimatedWait}
                    </Text>
                  </View>
                ) : null}
                {queueSize > 0 ? (
                  <Text style={styles.queueSizeText}>
                    {queueSize} {queueSize === 1 ? 'person' : 'people'} in queue
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => router.push('/my-visits')}
                  style={styles.viewMyVisitsBtn}
                >
                  <Ionicons name="list-outline" size={14} color={Colors.nileBlue} />
                  <Text style={styles.viewMyVisitsText}>View My Visits</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Store Hours Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="time-outline" size={18} color={Colors.gold} />
            </View>
            <Text style={styles.cardTitle}>Store Hours (Today)</Text>
          </View>
          <View style={styles.hoursContainer}>
            <LinearGradient
              colors={isOpen ? [Colors.gold, Colors.nileBlue] : [Colors.error, Colors.error]}
              style={styles.statusBadge}
            >
              <Ionicons name={isOpen ? "checkmark-circle" : "close-circle"} size={16} color="white" />
              <Text style={styles.statusText}>{isOpen ? 'Open Now' : 'Closed'}</Text>
            </LinearGradient>
            {isOpen && (
              <View style={styles.hoursTextContainer}>
                <Ionicons name="time" size={18} color={Colors.nileBlue} />
                <Text style={styles.hoursText}>
                  {todayHours.open} - {todayHours.close}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer Details Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-outline" size={18} color={Colors.gold} />
            </View>
            <Text style={styles.cardTitle}>Your Details</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              <Ionicons name="person" size={14} color={Colors.nileBlue} /> Name *
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#aaa"
                value={visitDetails.name}
                onChangeText={(text) => setVisitDetails({ ...visitDetails, name: sanitizeInput(text) })}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              <Ionicons name="call" size={14} color={Colors.nileBlue} /> Phone Number *
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                maxLength={15}
                value={visitDetails.phone}
                onChangeText={(text) => setVisitDetails({ ...visitDetails, phone: text.replace(/[^0-9]/g, '') })}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              <Ionicons name="mail" size={14} color={Colors.text.tertiary} /> Email (Optional)
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={visitDetails.email}
                onChangeText={(text) => setVisitDetails({ ...visitDetails, email: sanitizeInput(text.trim()) })}
              />
            </View>
          </View>
        </View>

        {/* Payment Method Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet-outline" size={18} color={Colors.gold} />
            </View>
            <Text style={styles.cardTitle}>Payment Option</Text>
          </View>

          <View style={styles.paymentOptionsRow}>
            <Pressable
              style={[
                styles.paymentOption,
                paymentMethod === 'none' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('none')}
             
            >
              {paymentMethod === 'none' ? (
                <View style={styles.paymentOptionInner}>
                  <Ionicons name="walk-outline" size={20} color={Colors.gold} />
                  <Text style={[styles.paymentOptionText, { color: Colors.nileBlue }]}>No Payment Required</Text>
                  <Text style={styles.paymentOptionSubtext}>Just visiting</Text>
                </View>
              ) : (
                <View style={styles.paymentOptionInner}>
                  <Ionicons name="walk-outline" size={22} color={Colors.text.tertiary} />
                  <Text style={styles.paymentOptionText}>No Payment Required</Text>
                  <Text style={styles.paymentOptionSubtext}>Just visiting</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.paymentOption,
                paymentMethod === 'pay_at_store' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('pay_at_store')}
             
            >
              {paymentMethod === 'pay_at_store' ? (
                <View style={styles.paymentOptionInner}>
                  <Ionicons name="storefront-outline" size={20} color={Colors.gold} />
                  <Text style={[styles.paymentOptionText, { color: Colors.nileBlue }]}>Pay at Store</Text>
                  <Text style={styles.paymentOptionSubtext}>Pay when you arrive</Text>
                </View>
              ) : (
                <View style={styles.paymentOptionInner}>
                  <Ionicons name="storefront-outline" size={22} color={Colors.text.tertiary} />
                  <Text style={styles.paymentOptionText}>Pay at Store</Text>
                  <Text style={styles.paymentOptionSubtext}>Pay when you arrive</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Plan Visit Time */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar-outline" size={18} color={Colors.gold} />
            </View>
            <Text style={styles.cardTitle}>Plan Your Visit</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={16} color={Colors.nileBlue} />
            <Text style={styles.sectionLabel}>Select Date</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {getNext7Days().map((date, index) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    setSelectedDate(date);
                    // Track date selected
                    analyticsService.track('date_selected', {
                      storeId,
                      storeName: store?.name,
                      selectedDate: date.toISOString(),
                      dateFormatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      crowdLevel,
                      timestamp: new Date().toISOString(),
                    });
                  }}
                 
                >
                  {isSelected ? (
                    <View style={[styles.dateCard, styles.dateCardSelected]}>
                      <Text style={[styles.dateDay, styles.dateDaySelected]}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </Text>
                      <Text style={[styles.dateNumber, styles.dateNumberSelected]}>{date.getDate()}</Text>
                      <Text style={[styles.dateLabel, styles.dateLabelSelected]}>{formatDate(date)}</Text>
                    </View>
                  ) : (
                    <View style={styles.dateCard}>
                      <Text style={styles.dateDay}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </Text>
                      <Text style={styles.dateNumber}>{date.getDate()}</Text>
                      <Text style={styles.dateLabel}>{formatDate(date)}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
            <Ionicons name="time" size={16} color={Colors.nileBlue} />
            <Text style={styles.sectionLabel}>Select Time</Text>
            {loadingSlots && (
              <ActivityIndicator size="small" color={Colors.gold} style={{ marginLeft: 8 }} />
            )}
          </View>
          <View style={styles.timeGrid}>
            {getAvailableTimeSlots().map((time) => {
              const isSelected = selectedTime === time;
              const isBooked = slotsLoaded && availableSlots.length > 0 && !availableSlots.includes(time);
              return (
                <Pressable
                  key={time}
                  onPress={() => {
                    if (isBooked) return;
                    setSelectedTime(time);
                    // Track time selected
                    analyticsService.track('time_selected', {
                      storeId,
                      storeName: store?.name,
                      selectedTime: time,
                      selectedDate: selectedDate?.toISOString(),
                      crowdLevel,
                      timestamp: new Date().toISOString(),
                    });
                  }}
                 
                  disabled={isBooked}
                >
                  {isBooked ? (
                    <View style={[styles.timeSlot, styles.timeSlotBooked]}>
                      <Text style={[styles.timeText, { color: Colors.text.tertiary }]}>{time}</Text>
                      <Text style={styles.bookedText}>Booked</Text>
                    </View>
                  ) : isSelected ? (
                    <View style={[styles.timeSlot, styles.timeSlotSelected]}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
                      <Text style={[styles.timeText, styles.timeTextSelected]}>{time}</Text>
                    </View>
                  ) : (
                    <View style={styles.timeSlot}>
                      <Text style={styles.timeText}>{time}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {slotsLoaded && availableSlots.length === 0 && !loadingSlots && (
            <View style={styles.allBookedBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.allBookedText}>All time slots are booked for this date. Please try another day.</Text>
            </View>
          )}
          {selectedDate && getAvailableTimeSlots().length === 0 && (() => {
            const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
            const dayHoursInfo = getHoursForDay(dayName);
            const isClosed = dayHoursInfo?.closed;
            const isToday = selectedDate.toDateString() === new Date().toDateString();

            return (
              <View style={styles.noTimeSlotsContainer}>
                <Ionicons
                  name={isClosed ? "close-circle-outline" : "time-outline"}
                  size={24}
                  color={isClosed ? Colors.error : Colors.text.tertiary}
                />
                <Text style={styles.noTimeSlotsText}>
                  {isClosed
                    ? `Store is closed on ${dayName}. Please select another day.`
                    : isToday
                      ? 'All time slots for today have passed. Please select another date.'
                      : 'No time slots available. Please select another date.'
                  }
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Action Buttons */}
        <View style={styles.bottomActions}>
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.secondaryButton, (gettingQueue || queueNumber) && styles.buttonDisabled]}
              onPress={queueNumber ? undefined : handleGetQueueNumber}
              disabled={gettingQueue || !!queueNumber}
             
            >
              <View style={styles.buttonContent}>
                {gettingQueue ? (
                  <ActivityIndicator size="small" color={Colors.nileBlue} />
                ) : (
                  <Ionicons name="ticket" size={20} color={Colors.nileBlue} />
                )}
                <Text style={styles.secondaryButtonText}>
                  {gettingQueue ? 'Getting...' : queueNumber ? `Queue #${queueNumber}` : 'Get Queue'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.directionsButton}
              onPress={handleGetDirections}
             
            >
              <View style={styles.directionsButtonInner}>
                <Ionicons name="navigate" size={18} color="white" />
                <Text style={styles.directionsButtonText}>Directions</Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryButton, schedulingVisit && styles.buttonDisabled]}
            onPress={handleScheduleVisit}
            disabled={schedulingVisit}
           
          >
            <View style={styles.primaryButtonInner}>
              {schedulingVisit ? (
                <ActivityIndicator size="small" color={Colors.nileBlue} />
              ) : (
                <Ionicons name="calendar" size={20} color={Colors.nileBlue} />
              )}
              <Text style={styles.primaryButtonText}>
                {schedulingVisit
                  ? (rescheduleVisitId ? 'Rescheduling...' : 'Scheduling Visit...')
                  : (rescheduleVisitId ? 'Reschedule Visit' : 'Schedule Visit')
                }
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/my-visits')}
            style={styles.viewPlannedVisitsBtn}
          >
            <Ionicons name="list-outline" size={16} color={Colors.nileBlue} />
            <Text style={styles.viewPlannedVisitsText}>View My Planned Visits</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  storeCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginTop: Spacing.md,
  },
  storeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gold + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  storeCategory: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  addressText: {
    color: Colors.text.tertiary,
    fontSize: 12,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.nileBlue,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.nileBlue,
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.gold + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  lastUpdatedText: {
    fontSize: 10,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  crowdStatusContainer: {
    gap: 10,
  },
  crowdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  crowdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  crowdText: {
    fontSize: 13,
    fontWeight: '700',
  },
  queueNumberDisplay: {
    padding: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    backgroundColor: Colors.background.secondary,
  },
  queueNumberLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 4,
    fontWeight: '600',
  },
  queueNumberValue: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.nileBlue,
    letterSpacing: 1,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.lg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  hoursTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  hoursText: {
    fontSize: 14,
    color: Colors.nileBlue,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.nileBlue,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  dateScroll: {
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  dateCard: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    width: 64,
    height: 84,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  dateDay: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  dateDaySelected: {
    color: 'white',
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginVertical: 2,
  },
  dateNumberSelected: {
    color: 'white',
  },
  dateLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  dateLabelSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.xs,
  },
  timeSlot: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    width: (SCREEN_WIDTH - 32 - 24) / 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  timeSlotSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '10',
  },
  timeSlotBooked: {
    opacity: 0.4,
    backgroundColor: Colors.background.secondary,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timeTextSelected: {
    color: Colors.gold,
    fontWeight: '700',
  },
  noTimeSlotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  noTimeSlotsText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  bottomActions: {
    gap: 10,
    marginTop: Spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 100 : 90,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.md,
  },
  primaryButtonText: {
    color: Colors.nileBlue,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: Colors.nileBlue,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  secondaryButtonText: {
    color: Colors.nileBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  directionsButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  directionsButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.md,
  },
  directionsButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  paymentOption: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  paymentOptionSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '10',
  },
  paymentOptionInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: 8,
    gap: 4,
  },
  paymentOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  paymentOptionTextSelected: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.nileBlue,
    textAlign: 'center',
  },

  // Extracted inline styles
  flex1: { flex: 1 },
  headerSpacer: { width: 44 },
  storeCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  queueWaitRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  queueWaitText: { fontSize: 13, color: Colors.gold, fontWeight: '600' },
  queueSizeText: { fontSize: 12, color: Colors.text.tertiary, marginTop: Spacing.xs },
  viewMyVisitsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.gold + '15' },
  viewMyVisitsText: { fontSize: 13, color: Colors.nileBlue, fontWeight: '700' },
  paymentOptionsRow: { flexDirection: 'row', gap: 10 },
  paymentOptionSubtext: { fontSize: 11, color: Colors.text.tertiary, textAlign: 'center' },
  sectionHeaderSpaced: { marginTop: 24 },
  bookedText: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600' },
  allBookedBanner: { backgroundColor: Colors.errorScale[50], padding: Spacing.md, borderRadius: BorderRadius.sm, marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8 },
  allBookedText: { color: Colors.error, fontSize: 13, flex: 1 },
  viewPlannedVisitsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
  viewPlannedVisitsText: { fontSize: 14, color: Colors.nileBlue, fontWeight: '700' },
});

// Wrap component with ErrorBoundary for production safety
function StoreVisitPage() {
  const isMounted = useIsMounted();
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
      }}
      onReset={() => {
      }}
    >
      <StoreVisitPageInner />
    </ErrorBoundary>
  );
}

export default withErrorBoundary(StoreVisitPage, 'StoreVisit');

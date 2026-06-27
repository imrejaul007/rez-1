// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Dimensions,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { FormPageSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import storesApi from '@/services/storesApi';
import productsApi from '@/services/productsApi';
import cartApi from '@/services/cartApi';
import { campaignsApi } from '@/services/campaignsApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import analytics from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import { colors } from '@/constants/theme';
import BookingRewardBanner from '@/components/booking/BookingRewardBanner';
import serviceBookingService from '@/services/serviceBookingApi';
import tableBookingApi from '@/services/tableBookingApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ReZ Brand Colors

interface Store {
  id?: string;
  _id?: string;
  name: string;
  logo?: string;
  category: string | { _id: string; name: string; slug?: string };
  contact?: {
    phone?: string;
    email?: string;
  };
  businessHours?: {
    [key: string]: { open: string; close: string; isClosed?: boolean };
  };
}

interface Service {
  _id: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  images?: Array<{ url: string; alt?: string }>;
  serviceDetails?: {
    duration: number; // in minutes
    serviceType: 'home' | 'store' | 'online';
  };
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

// Booking types
type BookingType = 'table' | 'service';

// Active deal info interface
interface ActiveDeal {
  redemptionCode: string;
  redemptionId: string;
  cashback?: string;
  coins?: string;
  discount?: string;
}

function BookingPage() {
  const isMounted = useIsMounted();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  // URL params: storeId (required), bookingType ('table' | 'service'), productId (for service)
  // Redemption params: redemptionCode, redemptionId, dealCashback, dealCoins, dealDiscount
  const {
    storeId,
    bookingType: bookingTypeParam,
    productId,
    redemptionCode,
    redemptionId,
    dealCashback,
    dealCoins,
    dealDiscount,
  } = useLocalSearchParams();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // Determine booking type: 'service' if productId is provided, otherwise 'table'
  const bookingType: BookingType = bookingTypeParam === 'service' || productId ? 'service' : 'table';
  const isServiceBooking = bookingType === 'service';

  // Check if there's an active deal being applied
  const activeDeal: ActiveDeal | null = redemptionCode && redemptionId ? {
    redemptionCode: redemptionCode as string,
    redemptionId: redemptionId as string,
    cashback: dealCashback as string | undefined,
    coins: dealCoins as string | undefined,
    discount: dealDiscount as string | undefined,
  } : null;

  const [store, setStore] = useState<Store | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null); // Display format: "9:00 AM"
  const [selectedTime24h, setSelectedTime24h] = useState<string | null>(null); // 24-hour format: "09:00"
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('2');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAddedToCartModal, setShowAddedToCartModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dealValidationError, setDealValidationError] = useState<string | null>(null);
  const [validatedDeal, setValidatedDeal] = useState<ActiveDeal | null>(activeDeal);

  // Close modals on back press instead of leaving the page
  const handleBackPress = useCallback(() => {
    if (showConfirmModal) { setShowConfirmModal(false); return true; }
    if (showSuccessModal) { setShowSuccessModal(false); return true; }
    if (showAddedToCartModal) { setShowAddedToCartModal(false); return true; }
    if (submitting) { return true; }
    return false;
  }, [showConfirmModal, showSuccessModal, showAddedToCartModal, submitting]);
  useBackButton(handleBackPress);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadDetails();
  }, [storeId, productId, authLoading, isAuthenticated]);

  // Deep-link parameter validation guard
  if (!storeId || typeof storeId !== 'string') {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
    return null;
  }

  const loadDetails = async () => {
    try {
      setLoading(true);

      // Load store details
      const storeResponse = await storesApi.getStoreById(storeId as string);
      if (storeResponse.success && storeResponse.data) {
        setStore(storeResponse.data);
      }

      // If service booking, also load service details
      if (isServiceBooking && productId) {
        const serviceResponse = await productsApi.getProductById(productId as string);
        if (serviceResponse.success && serviceResponse.data) {
          const productData = serviceResponse.data;
          setService({
            _id: productData.id || productData._id,
            name: productData.name,
            description: productData.description,
            price: productData.pricing?.selling || productData.pricing?.original || productData.price?.current || productData.price?.original || 0,
            comparePrice: productData.pricing?.original || productData.pricing?.comparePrice,
            images: productData.images,
            serviceDetails: productData.serviceDetails,
          });
        }
      }

      // Validate redemption if present
      if (activeDeal?.redemptionCode) {
        try {
          const redemptionResponse = await campaignsApi.getRedemptionByCode(activeDeal.redemptionCode);
          if (redemptionResponse.success && redemptionResponse.data) {
            const redemption = redemptionResponse.data;
            // Check if still valid
            if (redemption.status === 'active') {
              // Check if expired
              const expiresAt = new Date(redemption.expiresAt);
              if (expiresAt < new Date()) {
                setDealValidationError('This deal has expired');
                setValidatedDeal(null);
              } else {
                // Valid deal - keep it
                setValidatedDeal(activeDeal);
              }
            } else if (redemption.status === 'used') {
              setDealValidationError('This deal has already been used');
              setValidatedDeal(null);
            } else if (redemption.status === 'cancelled') {
              setDealValidationError('This deal was cancelled');
              setValidatedDeal(null);
            } else if (redemption.status === 'expired') {
              setDealValidationError('This deal has expired');
              setValidatedDeal(null);
            }
          } else {
            if (!isMounted()) return;
            setDealValidationError('Deal not found');
            if (!isMounted()) return;
            setValidatedDeal(null);
          }
        } catch (err) {
          // Don't block booking if validation fails, but warn user
          if (!isMounted()) return;
          setDealValidationError('Could not verify deal status');
        }
      }
    } catch (error) {
      if (!isMounted()) return;
      setErrorMessage('Failed to load details. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  // Generate time slots (9 AM to 9 PM in 30-minute intervals)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 21;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = `${hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;

        // Simple availability logic
        const isPast = selectedDate.toDateString() === new Date().toDateString() &&
                       hour < new Date().getHours();

        slots.push({
          id: timeString,
          time: displayTime,
          available: !isPast,
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Generate next 14 days for date selection
  const getNextDays = (count: number) => {
    const days = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const nextDays = getNextDays(14);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const handleBooking = () => {
    // Validate form
    if (!selectedTime) {
      setErrorMessage('Please select a time slot');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Please enter your phone number');
      return;
    }

    // Clear any previous error and show confirmation modal
    setErrorMessage('');
    setShowConfirmModal(true);
  };

  const confirmBooking = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      if (isServiceBooking && service) {
        // --- Service Booking: POST /api/service-bookings ---
        const durationMinutes = service.serviceDetails?.duration || 60;
        const [startH, startM] = (selectedTime24h || '09:00').split(':').map(Number);
        const endDate = new Date(2000, 0, 1, startH, startM + durationMinutes);
        const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        // Format date as YYYY-MM-DD
        const bookingDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

        const response = await serviceBookingService.createBooking({
          serviceId: service._id,
          bookingDate: bookingDateStr,
          timeSlot: { start: selectedTime24h || '09:00', end: endTime },
          serviceType: service.serviceDetails?.serviceType || 'store',
          customerNotes: JSON.stringify({
            customerName,
            customerPhone,
            customerEmail,
            numberOfPeople: parseInt(numberOfPeople),
            notes,
            ...(validatedDeal && {
              redemptionCode: validatedDeal.redemptionCode,
              redemptionId: validatedDeal.redemptionId,
            }),
          }),
          paymentMethod: 'cash',
        });

        if (!response.success) {
          if (!isMounted()) return;
          setSubmitting(false);
          platformAlertSimple('Booking Failed', response.error || 'Failed to create booking. Please try again.');
          return;
        }
      } else {
        // --- Table Booking: POST /api/table-bookings ---
        const bookingDateStr = selectedDate.toISOString();

        const response = await tableBookingApi.createTableBooking({
          storeId: storeId as string,
          bookingDate: bookingDateStr,
          bookingTime: selectedTime24h || '09:00',
          partySize: parseInt(numberOfPeople),
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          specialRequests: notes || undefined,
        });

        if (!response.success) {
          if (!isMounted()) return;
          setSubmitting(false);
          platformAlertSimple('Booking Failed', response.message || 'Failed to create booking. Please try again.');
          return;
        }
      }

      // Mark redemption as used if there was a validated deal
      if (validatedDeal) {
        try {
          await campaignsApi.useRedemption(validatedDeal.redemptionCode);
        } catch (err) {
          // silently handle — booking already succeeded
        }
      }

      if (!isMounted()) return;
      setSubmitting(false);
      if (!isMounted()) return;
      setShowSuccessModal(true);

      // Track booking_complete event
      try { analytics.trackEvent(ANALYTICS_EVENTS.BOOKING_COMPLETED, { store_id: storeId, date: selectedDate?.toISOString(), time: selectedTime, party_size: parseInt(numberOfPeople) }); } catch {}
    } catch (error: any) {
      if (!isMounted()) return;
      setSubmitting(false);
      const message = error?.message || 'Failed to create booking. Please try again.';
      platformAlertSimple('Booking Error', message);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  // Calculate end time based on service duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  // Handle Add to Cart for service booking
  const handleAddToCart = async () => {
    // Validate
    if (!selectedTime) {
      setErrorMessage('Please select a time slot');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Please enter your phone number');
      return;
    }

    if (!service || !store) {
      setErrorMessage('Service or store information missing');
      return;
    }

    setErrorMessage('');
    setAddingToCart(true);

    try {
      if (!selectedTime24h) {
        setErrorMessage('Please select a time slot');
        return;
      }
      
      const duration = service.serviceDetails?.duration || 60;
      const endTime = calculateEndTime(selectedTime24h, duration);

      const response = await cartApi.addServiceToCart({
        productId: service._id,
        storeId: store.id || store._id || '',
        serviceBookingDetails: {
          bookingDate: selectedDate.toISOString(),
          timeSlot: {
            start: selectedTime24h, // Use 24-hour format
            end: endTime,
          },
          duration: duration,
          serviceType: service.serviceDetails?.serviceType || 'store',
          customerNotes: notes || undefined,
          customerName: customerName,
          customerPhone: customerPhone,
          customerEmail: customerEmail || undefined,
        },
      });

      if (response.success) {
        if (!isMounted()) return;
        setShowAddedToCartModal(true);
      } else {
        if (!isMounted()) return;
        setErrorMessage(response.message || 'Failed to add service to cart');
      }
    } catch (error) {
      if (!isMounted()) return;
      setErrorMessage('Failed to add service to cart. Please try again.');
    } finally {
      if (!isMounted()) return;
      setAddingToCart(false);
    }
  };

  // Handle navigation after adding to cart
  const handleViewCart = () => {
    setShowAddedToCartModal(false);
    router.push('/cart');
  };

  const handleContinueShopping = () => {
    setShowAddedToCartModal(false);
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const getCategoryName = () => {
    if (!store?.category) return 'Restaurant';
    return typeof store.category === 'string' ? store.category : store.category?.name || 'Restaurant';
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <FormPageSkeleton />
        </View>
      </ThemedView>
    );
  }

  if (!store) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <ThemedText style={styles.errorText}>Store not found</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <ThemedText style={styles.retryText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Calculate bottom padding: button height (60) + button padding (32) + tab bar (~80) + safe area
  const bottomPadding = 60 + 32 + 80 + insets.bottom;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header with Glassmorphism */}
        <LinearGradient
          colors={[Colors.gold, Colors.nileBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}
        >
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>
              {isServiceBooking ? 'Book Service' : 'Book a Table'}
            </ThemedText>
            <View style={{ width: 44 }} />
          </View>

          {/* Store/Service Info Card */}
          <View style={styles.storeCard}>
            <View style={styles.storeIconContainer}>
              <Ionicons
                name={isServiceBooking ? 'cut' : 'restaurant'}
                size={24}
                color={Colors.gold}
              />
            </View>
            <View style={styles.storeDetails}>
              {isServiceBooking && service ? (
                <>
                  <ThemedText style={styles.storeName}>{service.name}</ThemedText>
                  <ThemedText style={styles.storeCategory}>{store.name}</ThemedText>
                  <View style={styles.servicePriceRow}>
                    <ThemedText style={styles.servicePrice}>{currencySymbol}{service.price.toLocaleString()}</ThemedText>
                    {service.serviceDetails?.duration && (
                      <ThemedText style={styles.serviceDuration}>
                        • {service.serviceDetails.duration} min
                      </ThemedText>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <ThemedText style={styles.storeName}>{store.name}</ThemedText>
                  <ThemedText style={styles.storeCategory}>{getCategoryName()}</ThemedText>
                </>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Reward Banner — prominent cashback/coins display */}
        {validatedDeal && !dealValidationError && (
          <BookingRewardBanner
            cashback={validatedDeal.cashback ? parseFloat(validatedDeal.cashback) : undefined}
            coins={validatedDeal.coins ? parseFloat(validatedDeal.coins) : undefined}
            storeName={store?.name}
          />
        )}

        {/* Deal Validation Error Banner */}
        {dealValidationError && (
          <View style={styles.dealErrorBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <ThemedText style={styles.dealErrorText}>{dealValidationError}</ThemedText>
          </View>
        )}

        {/* Active Deal Banner - Only show if validated */}
        {validatedDeal && !dealValidationError && (
          <View style={styles.activeDealBanner}>
            <LinearGradient
              colors={[colors.success, colors.brand.greenDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeDealGradient}
            >
              <View style={styles.activeDealIcon}>
                <Ionicons name="gift" size={20} color={Colors.text.inverse} />
              </View>
              <View style={styles.activeDealContent}>
                <ThemedText style={styles.activeDealTitle}>Deal Applied!</ThemedText>
                <ThemedText style={styles.activeDealCode}>{validatedDeal.redemptionCode}</ThemedText>
              </View>
              <View style={styles.activeDealValue}>
                {validatedDeal.cashback && (
                  <ThemedText style={styles.activeDealValueText}>{validatedDeal.cashback} Cashback</ThemedText>
                )}
                {validatedDeal.coins && (
                  <ThemedText style={styles.activeDealValueText}>{validatedDeal.coins} Coins</ThemedText>
                )}
                {validatedDeal.discount && (
                  <ThemedText style={styles.activeDealValueText}>{validatedDeal.discount} Off</ThemedText>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color={Colors.gold} />
              <ThemedText style={styles.sectionTitle}>Select Date</ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScrollContent}
            >
              {nextDays.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <Pressable
                    key={date.toISOString()}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                      setSelectedTime24h(null);
                    }}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                    ]}
                   
                  >
                    <ThemedText style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </ThemedText>
                    <ThemedText style={[styles.dateNumber, isSelected && styles.dateTextSelected]}>
                      {date.getDate()}
                    </ThemedText>
                    <ThemedText style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </ThemedText>
                    {isToday && (
                      <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Time Slots */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color={Colors.gold} />
              <ThemedText style={styles.sectionTitle}>Select Time</ThemedText>
            </View>
            <View style={styles.timeGrid}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    onPress={() => {
                      if (slot.available) {
                        setSelectedTime(slot.time); // Display format
                        setSelectedTime24h(slot.id); // 24-hour format for calculation
                      }
                    }}
                    disabled={!slot.available}
                    style={[
                      styles.timeSlot,
                      isSelected && styles.timeSlotSelected,
                      !slot.available && styles.timeSlotDisabled,
                    ]}
                   
                  >
                    <ThemedText
                      style={[
                        styles.timeText,
                        isSelected && styles.timeTextSelected,
                        !slot.available && styles.timeTextDisabled,
                      ]}
                    >
                      {slot.time}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Number of People - Only for Table Booking */}
          {!isServiceBooking && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color={Colors.gold} />
                <ThemedText style={styles.sectionTitle}>Number of Guests</ThemedText>
              </View>
              <View style={styles.peopleSelector}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => setNumberOfPeople(num.toString())}
                    style={[
                      styles.peopleButton,
                      numberOfPeople === num.toString() && styles.peopleButtonSelected,
                    ]}
                   
                  >
                    <ThemedText
                      style={[
                        styles.peopleText,
                        numberOfPeople === num.toString() && styles.peopleTextSelected,
                      ]}
                    >
                      {num}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Customer Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={Colors.gold} />
              <ThemedText style={styles.sectionTitle}>Your Details</ThemedText>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Full Name *"
                placeholderTextColor={Colors.text.tertiary}
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Phone Number *"
                placeholderTextColor={Colors.text.tertiary}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Email (Optional)"
                placeholderTextColor={Colors.text.tertiary}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Ionicons name="chatbubble" size={18} color={Colors.text.tertiary} style={[styles.inputIcon, { marginTop: 14 }]} />
              <TextInput
                style={[styles.input, styles.textArea, { color: textColor }]}
                placeholder="Special Requests (Optional)"
                placeholderTextColor={Colors.text.tertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Summary Card */}
          {selectedTime && (
            <View style={styles.section}>
              <View style={styles.summaryCard}>
                <ThemedText style={styles.summaryTitle}>
                  {isServiceBooking ? 'Service Summary' : 'Booking Summary'}
                </ThemedText>

                {/* Service Name - Only for service booking */}
                {isServiceBooking && service && (
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Service</ThemedText>
                    <ThemedText style={styles.summaryValue}>{service.name}</ThemedText>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Date</ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatDate(selectedDate)}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Time</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {selectedTime || timeSlots.find(s => s.id === selectedTime24h)?.time}
                  </ThemedText>
                </View>

                {/* Duration - Only for service booking */}
                {isServiceBooking && service?.serviceDetails?.duration && (
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Duration</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {service.serviceDetails.duration} min
                    </ThemedText>
                  </View>
                )}

                {/* Guests - Only for table booking */}
                {!isServiceBooking && (
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Guests</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {numberOfPeople} {parseInt(numberOfPeople) === 1 ? 'person' : 'people'}
                    </ThemedText>
                  </View>
                )}

                {/* Price - Only for service booking */}
                {isServiceBooking && service && (
                  <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                    <ThemedText style={styles.summaryLabelTotal}>Total</ThemedText>
                    <ThemedText style={styles.summaryValueTotal}>{currencySymbol}{service.price.toLocaleString()}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Error Message */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <ThemedText style={styles.errorBannerText}>{errorMessage}</ThemedText>
            <Pressable onPress={() => setErrorMessage('')}>
              <Ionicons name="close" size={18} color={Colors.error} />
            </Pressable>
          </View>
        ) : null}

        {/* Bottom Button - Fixed above tab bar */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 80 }]}>
          {isServiceBooking ? (
            /* Add to Cart Button for Service Booking */
            <Pressable
              onPress={handleAddToCart}
              style={styles.bookButton}
             
              disabled={addingToCart}
            >
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bookButtonGradient}
              >
                {addingToCart ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="cart" size={20} color={Colors.text.inverse} />
                    <ThemedText style={styles.bookButtonText}>
                      Add to Cart{service ? ` - ${currencySymbol}${service.price.toLocaleString()}` : ''}
                    </ThemedText>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          ) : (
            /* Confirm Booking Button for Table Booking */
            <Pressable
              onPress={handleBooking}
              style={styles.bookButton}
             
              disabled={submitting}
            >
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bookButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <>
                    <ThemedText style={styles.bookButtonText}>Confirm Booking</ThemedText>
                    <View style={styles.bookButtonIcon}>
                      <Ionicons name="checkmark" size={18} color={Colors.gold} />
                    </View>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="calendar" size={32} color={Colors.gold} />
            </View>
            <ThemedText style={styles.modalTitle}>Confirm Booking</ThemedText>
            <ThemedText style={styles.modalMessage}>
              Book a table for {numberOfPeople} {parseInt(numberOfPeople) === 1 ? 'person' : 'people'} on {formatDate(selectedDate)} at {timeSlots.find(s => s.id === selectedTime)?.time}?
            </ThemedText>

            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Ionicons name="restaurant" size={16} color={Colors.text.tertiary} />
                <ThemedText style={styles.modalDetailText}>{store?.name}</ThemedText>
              </View>
              <View style={styles.modalDetailRow}>
                <Ionicons name="person" size={16} color={Colors.text.tertiary} />
                <ThemedText style={styles.modalDetailText}>{customerName}</ThemedText>
              </View>
              <View style={styles.modalDetailRow}>
                <Ionicons name="call" size={16} color={Colors.text.tertiary} />
                <ThemedText style={styles.modalDetailText}>{customerPhone}</ThemedText>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={styles.modalConfirmButton}
                onPress={confirmBooking}
              >
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmGradient}
                >
                  <ThemedText style={styles.modalConfirmText}>Confirm</ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, styles.successIconContainer]}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.gold} />
            </View>
            <ThemedText style={styles.modalTitle}>Booking Confirmed!</ThemedText>
            <ThemedText style={styles.modalMessage}>
              Your table has been reserved. You will receive a confirmation shortly.
            </ThemedText>

            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successLabel}>Date</ThemedText>
                <ThemedText style={styles.successValue}>{formatDate(selectedDate)}</ThemedText>
              </View>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successLabel}>Time</ThemedText>
                <ThemedText style={styles.successValue}>{timeSlots.find(s => s.id === selectedTime)?.time}</ThemedText>
              </View>
              <View style={styles.successDetailRow}>
                <ThemedText style={styles.successLabel}>Guests</ThemedText>
                <ThemedText style={styles.successValue}>{numberOfPeople}</ThemedText>
              </View>
            </View>

            <Pressable
              style={styles.successButton}
              onPress={handleSuccessClose}
            >
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.successButtonGradient}
              >
                <ThemedText style={styles.successButtonText}>Done</ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Added to Cart Modal - For Service Booking */}
      <Modal
        visible={showAddedToCartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddedToCartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, styles.successIconContainer]}>
              <Ionicons name="cart" size={40} color={Colors.gold} />
            </View>
            <ThemedText style={styles.modalTitle}>Added to Cart!</ThemedText>
            <ThemedText style={styles.modalMessage}>
              Your service has been added to cart. Proceed to checkout to complete your booking.
            </ThemedText>

            {service && (
              <View style={styles.successDetails}>
                <View style={styles.successDetailRow}>
                  <ThemedText style={styles.successLabel}>Service</ThemedText>
                  <ThemedText style={styles.successValue}>{service.name}</ThemedText>
                </View>
                <View style={styles.successDetailRow}>
                  <ThemedText style={styles.successLabel}>Date</ThemedText>
                  <ThemedText style={styles.successValue}>{formatDate(selectedDate)}</ThemedText>
                </View>
                <View style={styles.successDetailRow}>
                  <ThemedText style={styles.successLabel}>Time</ThemedText>
                  <ThemedText style={styles.successValue}>
                    {timeSlots.find(s => s.id === selectedTime)?.time}
                  </ThemedText>
                </View>
                <View style={[styles.successDetailRow, { borderBottomWidth: 0 }]}>
                  <ThemedText style={styles.successLabel}>Price</ThemedText>
                  <ThemedText style={[styles.successValue, { color: Colors.gold, fontWeight: '700' }]}>
                    {currencySymbol}{service.price.toLocaleString()}
                  </ThemedText>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={handleContinueShopping}
              >
                <ThemedText style={styles.modalCancelText}>Continue</ThemedText>
              </Pressable>
              <Pressable
                style={styles.modalConfirmButton}
                onPress={handleViewCart}
              >
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmGradient}
                >
                  <ThemedText style={styles.modalConfirmText}>View Cart</ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  header: {
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
    fontFamily: 'Poppins',
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  storeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.gold}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 2,
  },
  storeCategory: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  servicePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  servicePrice: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.gold,
  },
  serviceDuration: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginLeft: 6,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginLeft: Spacing.sm,
    fontFamily: 'Poppins',
  },
  dateScrollContent: {
    paddingRight: Spacing.base,
  },
  dateCard: {
    width: 68,
    height: 88,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dateCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOpacity: 0.3,
  },
  dateDay: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  dateNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  dateMonth: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  dateTextSelected: {
    color: Colors.text.inverse,
  },
  todayDot: {
    position: 'absolute',
    bottom: 8,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  todayDotSelected: {
    backgroundColor: Colors.background.primary,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    width: (SCREEN_WIDTH - 32 - 30) / 4,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.default,
  },
  timeSlotSelected: {
    borderColor: Colors.gold,
    backgroundColor: `${Colors.gold}10`,
  },
  timeSlotDisabled: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.default,
    opacity: 0.5,
  },
  timeText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  timeTextSelected: {
    color: Colors.gold,
    fontWeight: '600',
  },
  timeTextDisabled: {
    color: Colors.text.tertiary,
  },
  peopleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  peopleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.default,
  },
  peopleButtonSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  peopleText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  peopleTextSelected: {
    color: Colors.text.inverse,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    ...Typography.body,
    fontFamily: 'Inter',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  textArea: {
    height: 90,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: `${Colors.gold}20`,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gold,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  summaryValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  summaryRowTotal: {
    borderBottomWidth: 0,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  summaryLabelTotal: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  summaryValueTotal: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.gold,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  bookButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: 10,
  },
  bookButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
    fontFamily: 'Inter',
  },
  bookButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Error Banner
  errorBanner: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    zIndex: 100,
  },
  errorBannerText: {
    flex: 1,
    ...Typography.body,
    color: Colors.error,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.gold}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  modalDetails: {
    width: '100%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  modalDetailText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  modalCancelText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  successDetails: {
    width: '100%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  successLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  successValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  successButton: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  successButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  successButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Deal Error Banner
  dealErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: colors.errorScale[100],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.errorScale[200],
    gap: 10,
  },
  dealErrorText: {
    flex: 1,
    ...Typography.body,
    color: Colors.error,
    fontWeight: '500',
  },

  // Active Deal Banner
  activeDealBanner: {
    marginHorizontal: Spacing.base,
    marginTop: -8,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  activeDealGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: Spacing.md,
  },
  activeDealIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDealContent: {
    flex: 1,
  },
  activeDealTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  activeDealCode: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  activeDealValue: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  activeDealValueText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(BookingPage, 'Booking');

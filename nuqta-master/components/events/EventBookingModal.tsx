// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { showAlert, alertOk } from '@/utils/alert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { EventItem } from '@/types/homepage.types';
import { useEventBooking, BookingFormData } from '@/hooks/useEventBooking';
import { useAuthUser, useGetCurrency, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import eventsApiService from '@/services/eventsApi';
import stripeApi from '@/services/stripeApi';
import eventAnalytics from '@/services/eventAnalytics';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
// Conditional import for native Stripe service
let stripeReactNativeService: any = null;
if (Platform.OS !== 'web') {
  try {
    stripeReactNativeService = require('@/services/stripeReactNativeService').default;
  } catch (e) {
    // silently handle
  }
}
// Conditional import for web Stripe Elements
let StripeElements: any = null;
let loadStripe: any = null;
let useStripe: any = null;
let useElements: any = null;
let CardNumberElement: any = null;
let CardExpiryElement: any = null;
let CardCvcElement: any = null;
if (Platform.OS === 'web') {
  try {
    const stripeReact = require('@stripe/react-stripe-js');
    const stripeJs = require('@stripe/stripe-js');
    StripeElements = stripeReact.Elements;
    loadStripe = stripeJs.loadStripe;
    useStripe = stripeReact.useStripe;
    useElements = stripeReact.useElements;
    CardNumberElement = stripeReact.CardNumberElement;
    CardExpiryElement = stripeReact.CardExpiryElement;
    CardCvcElement = stripeReact.CardCvcElement;
  } catch (e) {
    // silently handle
  }
}

interface EventBookingModalProps {
  visible: boolean;
  onClose: () => void;
  event: EventItem | null;
  onBookingSuccess?: (bookingId?: string) => void;
  initialSelectedSlot?: string | null; // Slot ID selected on EventPage
}

// Web Payment Form Component (only rendered on web)
function WebPaymentForm({ 
  clientSecret, 
  amount, 
  currency,
  onSuccess, 
  onError 
}: { 
  clientSecret: string; 
  amount: number; 
  currency: string;
  onSuccess: (paymentIntentId: string) => void; 
  onError: (error: string) => void;
}) {
  if (Platform.OS !== 'web' || !useStripe || !useElements) {
    return null;
  }

  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string>('');
  const isMounted = useIsMounted();

  const handlePayment = async () => {
    if (!stripe || !elements) {
      onError('Stripe.js has not loaded yet. Please try again.');
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      onError('Card input not found. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setCardError('');

    try {
      // First, create a payment method with all card details
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
      });

      if (pmError) {
        const errorMessage = pmError.message || 'Failed to process card details';
        if (!isMounted()) return;
        setCardError(errorMessage);
        onError(errorMessage);
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setCardError('Failed to create payment method');
        onError('Failed to create payment method');
        setIsProcessing(false);
        return;
      }

      // Then, confirm the payment with the payment method
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (confirmError) {
        const errorMessage = confirmError.message || 'Payment failed';
        if (!isMounted()) return;
        setCardError(errorMessage);
        onError(errorMessage);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else {
        onError('Payment was not completed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Payment failed';
      if (!isMounted()) return;
      setCardError(errorMessage);
      onError(errorMessage);
    } finally {
      if (!isMounted()) return;
      setIsProcessing(false);
    }
  };

  const textColor = colors.neutral[900];
  const tintColor = colors.brand.purpleLight;
  const placeholderColor = colors.neutral[400];

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: colors.neutral[900],
        '::placeholder': { color: colors.neutral[400] },
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      invalid: {
        color: colors.error,
        iconColor: colors.error,
      },
    },
  };

  return (
    <View style={styles.paymentSection}>
      <ThemedText style={[styles.paymentTitle, { color: textColor }]}>
        Payment Details
      </ThemedText>

      {/* Card Number */}
      <View style={styles.paymentFieldGroup}>
        <ThemedText style={[styles.paymentFieldLabel, { color: placeholderColor }]}>
          Card Number
        </ThemedText>
        <View style={{ 
          borderWidth: 1, 
          borderColor: cardError ? colors.error : colors.neutral[200], 
          borderRadius: 8, 
          padding: 15, 
          backgroundColor: colors.background.primary,
          minHeight: 50
        }}>
          {CardNumberElement && (
            <CardNumberElement options={cardElementOptions} />
          )}
        </View>
      </View>

      {/* Expiry and CVC Row */}
      <View style={styles.paymentRow}>
        <View style={styles.paymentRowItem}>
          <ThemedText style={[styles.paymentFieldLabel, { color: placeholderColor }]}>
            Expiry Date
          </ThemedText>
          <View style={{ 
            borderWidth: 1, 
            borderColor: cardError ? colors.error : colors.neutral[200], 
            borderRadius: 8, 
            padding: 15, 
            backgroundColor: colors.background.primary,
            minHeight: 50
          }}>
            {CardExpiryElement && (
              <CardExpiryElement options={cardElementOptions} />
            )}
          </View>
        </View>
        
        <View style={styles.paymentRowItem}>
          <ThemedText style={[styles.paymentFieldLabel, { color: placeholderColor }]}>
            CVC
          </ThemedText>
          <View style={{ 
            borderWidth: 1, 
            borderColor: cardError ? colors.error : colors.neutral[200], 
            borderRadius: 8, 
            padding: 15, 
            backgroundColor: colors.background.primary,
            minHeight: 50
          }}>
            {CardCvcElement && (
              <CardCvcElement options={cardElementOptions} />
            )}
          </View>
        </View>
      </View>

      {cardError && (
        <View style={styles.cardErrorBox}>
          <ThemedText style={styles.cardErrorText}>
            {cardError}
          </ThemedText>
        </View>
      )}

      <Pressable
        style={{
          backgroundColor: tintColor,
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
          opacity: isProcessing ? 0.6 : 1,
        }}
        onPress={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color={colors.background.primary} />
        ) : (
          <ThemedText style={styles.payBtnText}>
            Pay {currency}{amount}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

function EventBookingModal({
  visible,
  onClose,
  event,
  onBookingSuccess,
  initialSelectedSlot = null
}: EventBookingModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    attendeeInfo: {
      name: '',
      email: '',
      phone: '',
      age: undefined,
      specialRequirements: ''
    }
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    age?: string;
    slot?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    email?: boolean;
    phone?: boolean;
    age?: boolean;
  }>({});
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    bookingId: string;
    paymentIntentId: string;
    bookingReference?: string;
  } | null>(null);
  const [bookingResultData, setBookingResultData] = useState<any>(null);
  const router = useRouter();

  const { isBooking, bookEvent, clearBookingState } = useEventBooking();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getCurrency = useGetCurrency();
  const currencySymbol = getCurrencySymbol();
  const currencyCode = getCurrency().toLowerCase(); // For Stripe (e.g., 'inr', 'aed')

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: colors.neutral[200], dark: colors.neutral[700] }, 'border');
  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({ light: colors.background.primary, dark: colors.neutral[800] }, 'background');
  const placeholderColor = useThemeColor({ light: colors.neutral[400], dark: colors.neutral[500] }, 'text');
  const errorColor = colors.error;

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (name.trim().length > 100) return 'Name must be less than 100 characters';
    if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) return undefined; // Phone is optional
    // Allow various phone formats: +91 1234567890, (123) 456-7890, 123-456-7890, 1234567890
    const phoneRegex = /^[+]?[\d\s()-]{10,15}$/;
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) return 'Phone number must have at least 10 digits';
    if (digitsOnly.length > 15) return 'Phone number is too long';
    if (!phoneRegex.test(phone.trim())) return 'Please enter a valid phone number';
    return undefined;
  };

  const validateAge = (age: number | undefined): string | undefined => {
    if (age === undefined || age === null) return undefined; // Age is optional
    if (isNaN(age) || age < 1) return 'Please enter a valid age';
    if (age > 120) return 'Please enter a valid age';
    // Check if event has minimum age requirement (if applicable)
    const minAge = (event as any)?.minAge;
    if (minAge && age < minAge) return `You must be at least ${minAge} years old for this event`;
    return undefined;
  };

  const validateField = (field: string, value: string | number | undefined) => {
    let error: string | undefined;
    switch (field) {
      case 'name':
        error = validateName(value as string);
        break;
      case 'email':
        error = validateEmail(value as string);
        break;
      case 'phone':
        error = validatePhone(value as string);
        break;
      case 'age':
        error = validateAge(value as number | undefined);
        break;
    }
    setFormErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData.attendeeInfo[field as keyof typeof formData.attendeeInfo] as string | number | undefined);
  };

  useEffect(() => {
    if (visible && event) {
      // Reset form when modal opens, but preserve initial selected slot if provided
      setFormData({
        attendeeInfo: {
          name: '',
          email: '',
          phone: '',
          age: undefined,
          specialRequirements: ''
        },
        slotId: initialSelectedSlot || undefined
      });
      setSelectedSlot(initialSelectedSlot || null);
      setFormErrors({});
      setTouched({});
      clearBookingState();
    }
  }, [visible, event, initialSelectedSlot, clearBookingState]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      attendeeInfo: {
        ...prev.attendeeInfo,
        [field]: value
      }
    }));
    // Validate on change if field has been touched
    if (touched[field as keyof typeof touched]) {
      validateField(field, value);
    }
  };

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlot(slotId);
    setFormData(prev => ({
      ...prev,
      slotId
    }));
    
    // Track slot selection
    if (event) {
      eventAnalytics.trackSlotSelect(event.id, slotId, 'booking_modal');
    }
  };

  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleBookingSubmit = async () => {
    if (!event) {
      return;
    }

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      phone: true,
      age: true,
    });

    // Validate all fields
    const nameError = validateName(formData.attendeeInfo.name);
    const emailError = validateEmail(formData.attendeeInfo.email);
    const phoneError = validatePhone(formData.attendeeInfo.phone || '');
    const ageError = validateAge(formData.attendeeInfo.age);
    let slotError: string | undefined;

    // For slot-based events, validate slot selection
    if (event.availableSlots && event.availableSlots.length > 0 && !selectedSlot) {
      slotError = 'Please select a time slot';
    }

    // Update errors state
    const errors = {
      name: nameError,
      email: emailError,
      phone: phoneError,
      age: ageError,
      slot: slotError,
    };
    setFormErrors(errors);

    // Check if form has errors
    if (nameError || emailError || phoneError || ageError || slotError) {
      // Show alert for the first error found
      const firstError = nameError || emailError || phoneError || ageError || slotError;
      alertOk('Validation Error', firstError || 'Please fix the errors in the form');
      return;
    }

    // Update form data with selected slot
    const finalFormData = {
      ...formData,
      slotId: selectedSlot || undefined,
    };

    // If event is free, book directly
    if (event.price.isFree) {
      const bookingId = await bookEvent(event, finalFormData);
      if (bookingId) {
        // Track booking completion
        eventAnalytics.trackBookingComplete(event.id, bookingId, selectedSlot || undefined, 'booking_modal');
        onBookingSuccess?.(bookingId);
        onClose();
      } else {
        // Alert should have been shown by useEventBooking, but add backup
        if (typeof window !== 'undefined') {
        }
      }
      return;
    }

    // For paid events, handle payment
    let bookingResult: any = null;
    try {
      if (!isMounted()) return;
      setIsProcessingPayment(true);

      // Create booking (backend will create payment intent for paid events)
      bookingResult = await eventsApiService.bookEventSlot(event.id, finalFormData);
      
      if (!bookingResult.success || !bookingResult.booking) {
        throw new Error(bookingResult.message || 'Failed to create booking');
      }

      const bookingId = bookingResult.booking?.id || bookingResult.booking?._id || '';
      
      // Store booking result for success modal
      if (!isMounted()) return;
      setBookingResultData(bookingResult);
      
      // Track payment start
      eventAnalytics.trackPaymentStart(event.id, event.price.amount, bookingId, 'booking_modal');

      // Use payment data from backend response (if available)
      if (!bookingResult.payment) {
        throw new Error('Payment information not available. Please try again.');
      }

      const paymentData = bookingResult.payment;

      // Process payment based on platform
      let paymentSuccess = false;
      
      if (Platform.OS === 'web') {
        // Web: Use Stripe Elements for payment
        if (!paymentData.clientSecret) {
          throw new Error('Payment client secret not available');
        }

        // Load Stripe for web
        if (loadStripe) {
          const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
          if (!publishableKey) {
            throw new Error('Stripe publishable key not configured');
          }
          
          const stripe = await loadStripe(publishableKey);
          if (!isMounted()) return;
          setStripePromise(stripe);
          setPaymentClientSecret(paymentData.clientSecret);
          setPaymentBookingId(bookingId);
          setShowPaymentForm(true);
          
          // Don't mark as success yet - wait for payment completion
          setIsProcessingPayment(false);
          return; // Exit early, payment form will handle completion
        } else {
          throw new Error('Stripe Elements not available');
        }
      } else {
        // Native: Use Payment Sheet
        if (!stripeReactNativeService) {
          throw new Error('Payment service not available on this platform');
        }
        
        if (!paymentData.clientSecret) {
          throw new Error('Payment client secret not available');
        }

        const paymentResult = await stripeReactNativeService.presentPaymentSheet(
          {
            id: paymentData.paymentIntentId || '',
            clientSecret: paymentData.clientSecret,
            amount: event.price.amount * 100, // Convert to cents
            currency: event.price.currency?.toLowerCase() || currencyCode,
            status: 'requires_payment_method',
            paymentMethodTypes: ['card'],
          },
          {
            name: formData.attendeeInfo.name,
            email: formData.attendeeInfo.email,
            phone: formData.attendeeInfo.phone,
          }
        );

        paymentSuccess = paymentResult?.success || false;
      }

      if (paymentSuccess) {
        // Track payment completion
        const paymentIntentId = paymentData.paymentIntentId || paymentData.sessionId || '';
        eventAnalytics.trackPaymentComplete(event.id, paymentIntentId, event.price.amount, bookingId, 'booking_modal');
        
        // Immediately confirm booking after payment succeeds
        try {
          await eventsApiService.confirmBooking(bookingId, paymentIntentId);
        } catch (confirmError) {
          // Continue anyway - webhook will handle it as backup
        }

        // Track booking completion
        eventAnalytics.trackBookingComplete(event.id, bookingId, selectedSlot || undefined, 'booking_modal');

        showAlert(
          'Booking Confirmed!',
          `Your booking for "${event.title}" has been confirmed. Payment successful!`,
          [{ text: 'OK', onPress: () => {
            onBookingSuccess?.(bookingId);
            onClose();
          }}]
        );
      } else {
        throw new Error('Payment was not completed');
      }
    } catch (error) {
      
      // Track payment failure
      const bookingId = (bookingResult as any)?.booking?.id || (bookingResult as any)?.booking?._id || '';
      if (event && bookingId) {
        eventAnalytics.trackPaymentFailed(
          event.id,
          error instanceof Error ? error.message : 'Unknown error',
          event.price.amount,
          bookingId,
          'booking_modal'
        );
      }
      
      alertOk(
        'Payment Failed',
        error instanceof Error ? error.message : 'Failed to process payment. Please try again.'
      );
    } finally {
      if (!isMounted()) return;
      setIsProcessingPayment(false);
    }
  };

  const formatPrice = () => {
    if (!event) return '';
    if (event.price.isFree) return 'Free';
    return `${event.price.currency}${event.price.amount}`;
  };

  const getAvailableSlots = () => {
    if (!event || !event.availableSlots) return [];
    return event.availableSlots.filter(slot => slot.available);
  };

  const isFormValid = () => {
    // Check required fields have values
    const hasRequiredFields = formData.attendeeInfo.name.trim() &&
           formData.attendeeInfo.email.trim() &&
           (!event?.availableSlots || event.availableSlots.length === 0 || selectedSlot);

    // Check for validation errors (only if fields are touched)
    const hasNoErrors = !formErrors.name && !formErrors.email && !formErrors.phone && !formErrors.age;

    return hasRequiredFields && hasNoErrors;
  };

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={textColor} />
          </Pressable>
          
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            Book Event
          </ThemedText>
          
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Info */}
          <ThemedView style={[styles.eventInfo, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText style={[styles.eventTitle, { color: textColor }]}>
              {event.title}
            </ThemedText>
            
            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={tintColor} />
                <ThemedText style={[styles.metaText, { color: textColor }]}>
                  {event.date} at {event.time}
                </ThemedText>
              </View>
              
              <View style={styles.metaItem}>
                <Ionicons
                  name={event.isOnline ? "globe-outline" : "location-outline"}
                  size={16}
                  color={tintColor}
                />
                <ThemedText style={[styles.metaText, { color: textColor }]}>
                  {event.location}
                </ThemedText>
              </View>
              
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={16} color={tintColor} />
                <ThemedText style={[styles.metaText, { color: textColor }]}>
                  {formatPrice()}
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Time Slots (if applicable) */}
          {event.availableSlots && event.availableSlots.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                Select Time Slot
              </ThemedText>
              
              <View style={styles.slotsContainer}>
                {getAvailableSlots().map((slot) => (
                  <Pressable
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      { backgroundColor: cardBackground, borderColor },
                      selectedSlot === slot.id && { borderColor: tintColor, backgroundColor: `${tintColor}10` }
                    ]}
                    onPress={() => handleSlotSelect(slot.id)}
                  >
                    <View style={styles.slotHeader}>
                      <ThemedText
                        style={[
                          styles.slotTime,
                          { color: textColor },
                          selectedSlot === slot.id && { color: tintColor }
                        ]}
                      >
                        {slot.time}
                      </ThemedText>
                      
                      {selectedSlot === slot.id && (
                        <Ionicons name="checkmark-circle" size={20} color={tintColor} />
                      )}
                    </View>
                    
                    <ThemedText style={[styles.slotCapacity, { color: placeholderColor }]}>
                      {slot.maxCapacity - slot.bookedCount} spots left
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Attendee Information */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Attendee Information
            </ThemedText>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: textColor }]}>
                  Full Name *
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: cardBackground, borderColor: touched.name && formErrors.name ? errorColor : borderColor, color: textColor }
                  ]}
                  placeholder="Enter your full name"
                  placeholderTextColor={placeholderColor}
                  value={formData.attendeeInfo.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  onBlur={() => handleBlur('name')}
                />
                {touched.name && formErrors.name && (
                  <ThemedText style={styles.errorText}>{formErrors.name}</ThemedText>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: textColor }]}>
                  Email Address *
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: cardBackground, borderColor: touched.email && formErrors.email ? errorColor : borderColor, color: textColor }
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={placeholderColor}
                  value={formData.attendeeInfo.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  onBlur={() => handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {touched.email && formErrors.email && (
                  <ThemedText style={styles.errorText}>{formErrors.email}</ThemedText>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: textColor }]}>
                  Phone Number
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: cardBackground, borderColor: touched.phone && formErrors.phone ? errorColor : borderColor, color: textColor }
                  ]}
                  placeholder="Enter your phone number (e.g., +91 9876543210)"
                  placeholderTextColor={placeholderColor}
                  value={formData.attendeeInfo.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  onBlur={() => handleBlur('phone')}
                  keyboardType="phone-pad"
                />
                {touched.phone && formErrors.phone && (
                  <ThemedText style={styles.errorText}>{formErrors.phone}</ThemedText>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: textColor }]}>
                  Age
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: cardBackground, borderColor: touched.age && formErrors.age ? errorColor : borderColor, color: textColor }
                  ]}
                  placeholder="Enter your age"
                  placeholderTextColor={placeholderColor}
                  value={formData.attendeeInfo.age?.toString() || ''}
                  onChangeText={(value) => {
                    const numValue = value === '' ? undefined : parseInt(value);
                    handleInputChange('age', numValue as any);
                  }}
                  onBlur={() => handleBlur('age')}
                  keyboardType="numeric"
                  maxLength={3}
                />
                {touched.age && formErrors.age && (
                  <ThemedText style={styles.errorText}>{formErrors.age}</ThemedText>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: textColor }]}>
                  Special Requirements
                </ThemedText>
                <TextInput
                  style={[styles.textArea, { backgroundColor: cardBackground, borderColor, color: textColor }]}
                  placeholder="Any special requirements or accessibility needs"
                  placeholderTextColor={placeholderColor}
                  value={formData.attendeeInfo.specialRequirements}
                  onChangeText={(value) => handleInputChange('specialRequirements', value)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>

          {/* Payment Form (Web only) */}
          {Platform.OS === 'web' && showPaymentForm && paymentClientSecret && stripePromise && StripeElements && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                Complete Payment
              </ThemedText>
              <StripeElements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
                <WebPaymentForm
                  clientSecret={paymentClientSecret}
                  amount={event.price.amount}
                  currency={event.price.currency}
                  onSuccess={async (paymentIntentId: string) => {
                    // Payment successful
                    const bookingId = paymentBookingId || '';
                    eventAnalytics.trackPaymentComplete(event.id, paymentIntentId, event.price.amount, bookingId, 'booking_modal');
                    
                    // Immediately confirm booking after payment succeeds
                    try {
                      await eventsApiService.confirmBooking(bookingId, paymentIntentId);
                    } catch (confirmError) {
                      // Continue anyway - webhook will handle it as backup
                    }
                    
                    eventAnalytics.trackBookingComplete(event.id, bookingId, selectedSlot || undefined, 'booking_modal');
                    
                    // Show success modal
                    if (!isMounted()) return;
                    setSuccessData({
                      bookingId,
                      paymentIntentId,
                      bookingReference: bookingResultData?.booking?.bookingReference
                    });
                    if (!isMounted()) return;
                    setShowSuccessModal(true);
                    setShowPaymentForm(false);
                  }}
                  onError={(error: string) => {
                    eventAnalytics.trackPaymentFailed(event.id, error, event.price.amount, paymentBookingId || '', 'booking_modal');
                    showAlert('Payment Failed', error, [{ text: 'OK' }]);
                  }}
                />
              </StripeElements>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        {!showPaymentForm && (
          <View style={[styles.footer, { backgroundColor: cardBackground, borderTopColor: borderColor }]}>
            <Pressable
              style={[
                styles.bookButton,
                { backgroundColor: isFormValid() ? tintColor : placeholderColor }
              ]}
              onPress={handleBookingSubmit}
              disabled={!isFormValid() || isBooking}
            >
            {isProcessingPayment ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator size="small" color={colors.background.primary} />
                  <ThemedText style={styles.bookButtonText}>
                    Processing Payment...
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.bookButtonText}>
                  {isBooking ? 'Booking...' : `Book Event - ${formatPrice()}`}
                </ThemedText>
              )}
          </Pressable>
        </View>
        )}
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          onBookingSuccess?.(successData?.bookingId);
          onClose();
        }}
      >
        <View style={styles.successOverlay}>
          <View style={[styles.successModal, { backgroundColor: cardBackground }]}>
            {/* Success Icon */}
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={50} color={colors.background.primary} />
            </View>

            {/* Success Title */}
            <ThemedText style={[styles.successTitle, { color: textColor }]}>
              Payment Successful!
            </ThemedText>

            {/* Success Message */}
            <ThemedText style={[styles.successMessage, { color: placeholderColor }]}>
              Your booking for "{event?.title}" has been confirmed.
            </ThemedText>

            {/* Booking Details */}
            {successData && (
              <View style={[styles.bookingDetailsBox, { backgroundColor: backgroundColor }]}>
                {successData.bookingReference && (
                  <View style={styles.bookingDetailRow}>
                    <ThemedText style={[styles.bookingDetailLabel, { color: placeholderColor }]}>Booking Reference:</ThemedText>
                    <ThemedText style={[styles.bookingDetailValue, { color: textColor }]}>
                      {successData.bookingReference}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.bookingDetailRowNoBtm}>
                  <ThemedText style={[styles.bookingDetailLabel, { color: placeholderColor }]}>Amount Paid:</ThemedText>
                  <ThemedText style={[styles.bookingDetailValue, { color: textColor }]}>
                    {event?.price.currency}{event?.price.amount}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.successActionsRow}>
              <Pressable
                style={[styles.successActionBtn, { backgroundColor: tintColor }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  onBookingSuccess?.(successData?.bookingId);
                  onClose();
                  // Navigate to my events page
                  router.push('/my-events' as any);
                }}
              >
                <ThemedText style={styles.successActionBtnText}>
                  View Bookings
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.successActionBtn, { backgroundColor: borderColor }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  onBookingSuccess?.(successData?.bookingId);
                  onClose();
                }}
              >
                <ThemedText style={[styles.successActionBtnTextAlt, { color: textColor }]}>
                  Done
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventInfo: {
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  eventMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  slotsContainer: {
    gap: 12,
  },
  slotCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  slotCapacity: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bookButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Extracted inline styles
  paymentSection: { marginTop: 20 },
  paymentTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  paymentFieldGroup: { marginBottom: 15 },
  paymentFieldLabel: { fontSize: 14, marginBottom: 8 },
  paymentRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  paymentRowItem: { flex: 1 },
  cardErrorBox: { backgroundColor: colors.errorScale[100], borderColor: colors.error, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 15 },
  cardErrorText: { color: colors.error, fontSize: 14 },
  payBtnText: { color: colors.background.primary, fontSize: 16, fontWeight: '600' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successModal: { borderRadius: 20, padding: 30, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.lightMustard, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  successMessage: { fontSize: 16, textAlign: 'center', marginBottom: 20, lineHeight: 24 },
  bookingDetailsBox: { width: '100%', borderRadius: 12, padding: 15, marginBottom: 20 },
  bookingDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bookingDetailRowNoBtm: { flexDirection: 'row', justifyContent: 'space-between' },
  bookingDetailLabel: { fontSize: 14 },
  bookingDetailValue: { fontSize: 14, fontWeight: '600' },
  successActionsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  successActionBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
  successActionBtnText: { color: colors.background.primary, fontSize: 16, fontWeight: '600' },
  successActionBtnTextAlt: { fontSize: 16, fontWeight: '600' },
});


export default React.memo(EventBookingModal);

import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FormPageSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import storesApi, { Store } from '@/services/storesApi';
import servicesApi, { ServiceItem } from '@/services/servicesApi';
import bookingApi from '@/services/bookingApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Service type icon mapping
const SERVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  haircut: 'cut',
  'hair styling': 'cut',
  'color treatment': 'color-palette',
  coloring: 'color-palette',
  facial: 'sparkles',
  massage: 'hand-left',
  spa: 'water',
  manicure: 'hand-right',
  pedicure: 'footsteps',
  waxing: 'flash',
  makeup: 'brush',
  'hair treatment': 'flask',
  threading: 'remove',
  'nail art': 'color-fill',
  default: 'cut-outline',
};

// Helper function to get icon for service
const getServiceIcon = (serviceName: string): keyof typeof Ionicons.glyphMap => {
  const name = serviceName.toLowerCase();
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (name.includes(key)) {
      return icon;
    }
  }
  return SERVICE_ICONS.default;
};

interface TimeSlot {
  id: string;
  time: string;
  displayTime: string;
  available: boolean;
}

function AppointmentBookingPage() {
  const isMounted = useIsMounted();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // State management
  const [store, setStore] = useState<Store | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Booking selections
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    if (storeId) {
      loadStoreDetails();
      loadStoreServices();
    }
  }, [storeId]);

  const loadStoreDetails = async () => {
    try {
      setLoading(true);
      const response = await storesApi.getStoreById(storeId);
      if (response.success && response.data) {
        setStore(response.data);
      } else {
        platformAlertSimple('Error', 'Failed to load store details');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load store details');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const loadStoreServices = async () => {
    try {
      setServicesLoading(true);
      const response = await servicesApi.getStoreServices(storeId);
      if (response.success && response.data?.services) {
        setServices(response.data.services);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setServicesLoading(false);
    }
  };

  // Generate next 30 days for date selection
  const getNextDays = (count: number = 30): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Generate time slots based on working hours (60-minute intervals)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];

    // Default working hours: 9 AM to 8 PM
    let startHour = 9;
    let endHour = 20;

    // If store has working hours, use them
    if (store?.hours && store.hours.length > 0) {
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const todayHours = store.hours.find(h => h.day.toLowerCase() === dayName.toLowerCase());

      if (todayHours && !todayHours.closed) {
        const openTime = todayHours.open.split(':');
        const closeTime = todayHours.close.split(':');
        startHour = parseInt(openTime[0]);
        endHour = parseInt(closeTime[0]);
      }
    }

    // Generate 60-minute slots
    for (let hour = startHour; hour < endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayTime = `${displayHour}:00 ${period}`;

      // Check if slot is in the past for today
      const isToday = selectedDate.toDateString() === new Date().toDateString();
      const isPast = isToday && hour <= new Date().getHours();

      slots.push({
        id: timeString,
        time: timeString,
        displayTime,
        available: !isPast,
      });
    }

    return slots;
  };

  const nextDays = getNextDays();
  const timeSlots = generateTimeSlots();

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const validateForm = (): boolean => {
    if (!selectedService) {
      platformAlertSimple('Missing Information', 'Please select a service');
      return false;
    }
    if (!selectedTime) {
      platformAlertSimple('Missing Information', 'Please select a time slot');
      return false;
    }
    if (!customerName.trim()) {
      platformAlertSimple('Missing Information', 'Please enter your full name');
      return false;
    }
    if (!customerPhone.trim()) {
      platformAlertSimple('Missing Information', 'Please enter your phone number');
      return false;
    }
    if (customerPhone.trim().length < 10) {
      platformAlertSimple('Invalid Phone', 'Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleConfirmAppointment = async () => {
    if (!validateForm()) return;

    // Show confirmation dialog with summary
    const summary = `
Service: ${selectedService?.name}
Date: ${formatDate(selectedDate)}
Time: ${selectedTime?.displayTime}
Duration: ${selectedService?.duration ? formatDuration(selectedService.duration) : 'N/A'}
Price: ${currencySymbol}${selectedService?.price}
    `.trim();

    platformAlertConfirm(
      'Confirm Appointment',
      summary,
      submitBooking,
      'Confirm'
    );
  };

  const submitBooking = async () => {
    if (!selectedService || !selectedTime) return;

    try {
      setSubmitting(true);

      const bookingData = {
        serviceId: selectedService.id,
        storeId: storeId,
        date: selectedDate.toISOString().split('T')[0],
        timeSlot: selectedTime.time,
        notes: specialInstructions.trim() || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
      };

      const response = await bookingApi.createBooking(bookingData);

      if (response.success) {
        // Get appointment number/ID from response
        const appointmentNumber = response.data?.id || 'N/A';

        // Success alert with appointment details
        const successMessage = `
Your appointment has been confirmed!

Appointment Number: ${appointmentNumber}
Service: ${selectedService.name}
Date: ${formatDate(selectedDate)}
Time: ${selectedTime.displayTime}
Store: ${store?.name}

You will receive a confirmation message at ${customerPhone}${customerEmail ? ` and ${customerEmail}` : ''}.
        `.trim();

        platformAlertConfirm(
          'Appointment Confirmed!',
          successMessage,
          () => router.canGoBack() ? router.back() : router.replace('/(tabs)'),
          'OK'
        );
      } else {
        platformAlertSimple('Booking Failed', response.error || 'Unable to create appointment. Please try again.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to submit booking. Please try again.');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <FormPageSkeleton />
      </ThemedView>
    );
  }

  if (!store) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedText style={styles.errorText}>Store not found</ThemedText>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backToStoreButton}>
          <ThemedText style={styles.backToStoreText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with Purple Gradient */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Book Appointment</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.storeInfo}>
          <ThemedText style={styles.storeName}>{store.name}</ThemedText>
          {store.category && (
            <ThemedText style={styles.storeCategory}>{store.category.name}</ThemedText>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Service Selection */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Select Service</ThemedText>

          {servicesLoading ? (
            <ActivityIndicator color={colors.brand.purpleLight} style={{ marginVertical: 20 }} />
          ) : services.length > 0 ? (
            <View style={styles.servicesGrid}>
              {services.map((service) => {
                const isSelected = selectedService?.id === service.id;
                const iconName = getServiceIcon(service.name);

                return (
                  <Pressable
                    key={service.id}
                    onPress={() => {
                      setSelectedService(service);
                      setSelectedTime(null); // Reset time when service changes
                    }}
                    style={[
                      styles.serviceCard,
                      isSelected && styles.serviceCardSelected,
                    ]}
                  >
                    <View style={[
                      styles.serviceIconContainer,
                      isSelected && styles.serviceIconContainerSelected,
                    ]}>
                      <Ionicons
                        name={iconName}
                        size={28}
                        color={isSelected ? colors.background.primary : colors.brand.purpleLight}
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.serviceName,
                        isSelected && styles.serviceNameSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {service.name}
                    </ThemedText>
                    {service.duration && (
                      <ThemedText
                        style={[
                          styles.serviceDuration,
                          isSelected && styles.serviceDurationSelected,
                        ]}
                      >
                        {formatDuration(service.duration)}
                      </ThemedText>
                    )}
                    <ThemedText
                      style={[
                        styles.servicePrice,
                        isSelected && styles.servicePriceSelected,
                      ]}
                    >
                      {currencySymbol}{service.price}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ThemedText style={styles.noDataText}>No services available</ThemedText>
          )}
        </View>

        {/* Date Selection */}
        {selectedService && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Select Date</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateScroll}
              contentContainerStyle={styles.dateScrollContent}
            >
              {nextDays.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const isToday = index === 0;

                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedTime(null); // Reset time when date changes
                    }}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                    ]}
                  >
                    {isToday && (
                      <View style={styles.todayBadge}>
                        <ThemedText style={styles.todayBadgeText}>Today</ThemedText>
                      </View>
                    )}
                    <ThemedText
                      style={[
                        styles.dateDay,
                        isSelected && styles.dateTextSelected
                      ]}
                    >
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dateNumber,
                        isSelected && styles.dateTextSelected
                      ]}
                    >
                      {date.getDate()}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dateMonth,
                        isSelected && styles.dateTextSelected
                      ]}
                    >
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Time Slot Selection */}
        {selectedService && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Select Time</ThemedText>
            <View style={styles.timeGrid}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTime?.id === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    onPress={() => slot.available && setSelectedTime(slot)}
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
                      {slot.displayTime}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Customer Details Form */}
        {selectedService && selectedTime && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Your Details</ThemedText>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Full Name *"
                placeholderTextColor={Colors.text.tertiary}
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
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
              <Ionicons name="mail-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
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
              <Ionicons name="document-text-outline" size={20} color={Colors.text.tertiary} style={styles.inputIconTop} />
              <TextInput
                style={[styles.input, styles.textArea, { color: textColor }]}
                placeholder="Special Instructions (Optional)"
                placeholderTextColor={Colors.text.tertiary}
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}

        {/* Booking Summary */}
        {selectedService && selectedTime && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Booking Summary</ThemedText>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Service</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedService.name}</ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Date</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Time</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedTime.displayTime}</ThemedText>
              </View>
              {selectedService.duration && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Duration</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {formatDuration(selectedService.duration)}
                    </ThemedText>
                  </View>
                </>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabelBold}>Total Price</ThemedText>
                <ThemedText style={styles.summaryValueBold}>{currencySymbol}{selectedService.price}</ThemedText>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Fixed Button */}
      {selectedService && selectedTime && (
        <View style={[styles.bottomContainer, { backgroundColor }]}>
          <Pressable
            onPress={handleConfirmAppointment}
            style={styles.confirmButton}
            disabled={submitting}
          >
            <LinearGradient
              colors={[colors.brand.purpleLight, colors.brand.purple]}
              style={styles.confirmButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.background.primary} />
              ) : (
                <>
                  <ThemedText style={styles.confirmButtonText}>Confirm Appointment</ThemedText>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.background.primary} />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingIndicator: {
    marginTop: 100,
  },
  errorText: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    marginTop: 100,
    paddingHorizontal: Spacing.lg,
  },
  backToStoreButton: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: colors.brand.purpleLight,
    borderRadius: BorderRadius.sm,
  },
  backToStoreText: {
    color: Colors.background.primary,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  storeInfo: {
    alignItems: 'center',
  },
  storeName: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.background.primary,
    marginBottom: Spacing.xs,
  },
  storeCategory: {
    ...Typography.body,
    color: '#E9D5FF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    marginBottom: Spacing.base,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  serviceCard: {
    width: '31%',
    aspectRatio: 0.85,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
  },
  serviceCardSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tint.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  serviceIconContainerSelected: {
    backgroundColor: colors.brand.purpleLight,
  },
  serviceName: {
    ...Typography.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.xs,
    color: Colors.text.primary,
  },
  serviceNameSelected: {
    color: colors.brand.purple,
  },
  serviceDuration: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  serviceDurationSelected: {
    color: colors.brand.purpleLight,
  },
  servicePrice: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  servicePriceSelected: {
    color: colors.brand.purple,
  },
  noDataText: {
    textAlign: 'center',
    ...Typography.body,
    color: Colors.text.tertiary,
    paddingVertical: Spacing.lg,
  },
  dateScroll: {
    marginHorizontal: -20,
    paddingHorizontal: Spacing.lg,
  },
  dateScrollContent: {
    paddingRight: Spacing.lg,
  },
  dateCard: {
    width: 80,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    backgroundColor: Colors.background.primary,
    position: 'relative',
  },
  dateCardSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  todayBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: colors.successScale[400],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  dateDay: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  dateNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  dateMonth: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  dateTextSelected: {
    color: colors.brand.purpleLight,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    width: '31%',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  timeSlotSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  timeSlotDisabled: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.default,
    opacity: 0.5,
  },
  timeText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timeTextSelected: {
    color: colors.brand.purpleLight,
    fontWeight: '700',
  },
  timeTextDisabled: {
    color: Colors.text.tertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  inputIconTop: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  input: {
    flex: 1,
    height: 50,
    ...Typography.bodyLarge,
  },
  textArea: {
    height: 100,
    paddingTop: 0,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border.default,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  summaryValue: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  summaryLabelBold: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  summaryValueBold: {
    ...Typography.h4,
    fontWeight: '700',
    color: colors.brand.purpleLight,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    ...Shadows.medium,
  },
  confirmButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  confirmButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.background.primary,
  },
});

export default withErrorBoundary(AppointmentBookingPage, 'BookingAppointment');

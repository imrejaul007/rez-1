// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { FormPageSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import storesApi from '@/services/storesApi';
import tableBookingApi from '@/services/tableBookingApi';
import CountryCodePicker, { CountryCode, COUNTRY_CODES } from '@/components/common/CountryCodePicker';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface Store {
  _id: string;
  name: string;
  logo?: string;
  category: string;
  contact?: {
    phone?: string;
    email?: string;
  };
  businessHours?: {
    [key: string]: { open: string; close: string; isClosed?: boolean };
  };
  bookingConfig?: {
    enabled: boolean;
    slotDuration: number; // in minutes
    maxPartySize: number;
    minPartySize: number;
    advanceBookingDays: number;
  };
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  tablesLeft?: number;
}

interface DateItem {
  id: string;
  date: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  fullDate: Date;
}

function TableBookingPage() {
  const isMounted = useIsMounted();
  const { storeId } = useLocalSearchParams();
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState<Record<string, number>>({});

  useEffect(() => {
    loadStoreDetails();
  }, [storeId]);

  // Fetch real slot availability when date or store changes
  useEffect(() => {
    if (!storeId || !selectedDate) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    tableBookingApi.checkAvailability(storeId as string, dateStr)
      .then((response) => {
        if (!isMounted()) return;
        if (response.success && response.data) {
          // Map slot availability: { "14:00": 3, "15:30": 1, ... }
          const availability: Record<string, number> = {};
          const slots = response.data.slots || response.data;
          if (Array.isArray(slots)) {
            slots.forEach((s: any) => {
              if (s.time || s.id) {
                availability[s.time || s.id] = s.tablesLeft ?? s.availableTables ?? 0;
              }
            });
          }
          setSlotAvailability(availability);
        }
      })
      .catch(() => {
        // Silently fallback — slots will show without real availability
      });
  }, [storeId, selectedDate]);

  const loadStoreDetails = async () => {
    try {
      setLoading(true);
      const response = await storesApi.getStoreById(storeId as string);
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

  // Generate next 14 days for date selection
  const availableDates: DateItem[] = useMemo(() => {
    const days = store?.bookingConfig?.advanceBookingDays || 14;
    const dates: DateItem[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        id: date.toISOString().split('T')[0],
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        monthName: date.toLocaleDateString('en-US', { month: 'short' }),
        fullDate: date,
      });
    }
    return dates;
  }, [store]);

  // Generate time slots based on store working hours (90-minute slots)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const slotDuration = store?.bookingConfig?.slotDuration || 90; // default 90 minutes

    // Get today's day name
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const hours = store?.businessHours?.[dayOfWeek];

    if (hours && !hours.isClosed) {
      // Parse opening and closing hours
      const [openHour, openMinute] = hours.open.split(':').map(Number);
      const [closeHour, closeMinute] = hours.close.split(':').map(Number);

      let currentHour = openHour;
      let currentMinute = openMinute;

      while (
        currentHour < closeHour ||
        (currentHour === closeHour && currentMinute < closeMinute)
      ) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        const hour12 = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour;
        const displayTime = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${currentHour >= 12 ? 'PM' : 'AM'}`;

        // Check if slot is in the past
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        const now = new Date();
        const isPast = isToday &&
          (currentHour < now.getHours() ||
           (currentHour === now.getHours() && currentMinute <= now.getMinutes()));

        const realTablesLeft = slotAvailability[timeString];
        const hasAvailability = realTablesLeft !== undefined ? realTablesLeft > 0 : true;
        slots.push({
          id: timeString,
          time: displayTime,
          available: !isPast && hasAvailability,
          tablesLeft: realTablesLeft ?? undefined,
        });

        // Add slot duration
        currentMinute += slotDuration;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }
      }
    } else {
      // Default slots if no business hours configured (9 AM to 9 PM, 90-minute slots)
      for (let hour = 9; hour <= 21; hour += 1.5) {
        const wholeHour = Math.floor(hour);
        const minutes = (hour % 1) * 60;
        const timeString = `${wholeHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const displayHour = wholeHour > 12 ? wholeHour - 12 : wholeHour;
        const displayTime = `${displayHour}:${minutes.toString().padStart(2, '0')} ${wholeHour >= 12 ? 'PM' : 'AM'}`;

        const isToday = selectedDate.toDateString() === new Date().toDateString();
        const isPast = isToday && wholeHour < new Date().getHours();

        const realTablesLeft = slotAvailability[timeString];
        const hasAvailability = realTablesLeft !== undefined ? realTablesLeft > 0 : true;
        slots.push({
          id: timeString,
          time: displayTime,
          available: !isPast && hasAvailability,
          tablesLeft: realTablesLeft ?? undefined,
        });
      }
    }

    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), [selectedDate, store, slotAvailability]);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handlePartySizeChange = (increment: boolean) => {
    const maxSize = store?.bookingConfig?.maxPartySize || 10;
    const minSize = store?.bookingConfig?.minPartySize || 1;

    if (increment) {
      setPartySize(Math.min(partySize + 1, maxSize));
    } else {
      setPartySize(Math.max(partySize - 1, minSize));
    }
  };

  const handleBooking = () => {
    // Validate form
    if (!selectedTime) {
      platformAlertSimple('Missing Information', 'Please select a time slot');
      return;
    }
    if (!customerName.trim()) {
      platformAlertSimple('Missing Information', 'Please enter your name');
      return;
    }
    if (!customerPhone.trim()) {
      platformAlertSimple('Missing Information', 'Please enter your phone number');
      return;
    }

    const selectedTimeSlot = timeSlots.find(s => s.id === selectedTime);

    // Show confirmation
    platformAlertConfirm(
      'Confirm Booking',
      `Book a table for ${partySize} ${partySize === 1 ? 'person' : 'people'} on ${formatDate(selectedDate)} at ${selectedTimeSlot?.time}?`,
      handleConfirmBooking,
      'Confirm'
    );
  };

  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true);
      const response = await tableBookingApi.createTableBooking({
        storeId: storeId as string,
        bookingDate: selectedDate.toISOString().split('T')[0],
        bookingTime: selectedTime!,
        partySize,
        customerName: customerName.trim(),
        customerPhone: `${selectedCountry.dialCode}${customerPhone.trim()}`,
        customerEmail: customerEmail.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
      });

      if (response.success && response.data) {
        const selectedTimeSlot = timeSlots.find(s => s.id === selectedTime);
        platformAlertConfirm(
          'Booking Confirmed!',
          `Your table has been booked!\nBooking Number: ${response.data.bookingId || response.data.confirmationCode || 'N/A'}\nDate: ${formatDate(selectedDate)}\nTime: ${selectedTimeSlot?.time}\nParty Size: ${partySize}`,
          () => router.canGoBack() ? router.back() : router.replace('/(tabs)'),
          'OK'
        );
      } else {
        platformAlertSimple('Booking Failed', response.message || 'Please try again.');
      }
    } catch (error: any) {
      platformAlertSimple('Booking Failed', error.message || 'Unable to create booking. Please try again.');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[Colors.brand.purple, Colors.brand.purple]}
          style={styles.loadingHeader}
        >
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
        </LinearGradient>
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
        <LinearGradient
          colors={[Colors.brand.purple, Colors.brand.purple]}
          style={styles.loadingHeader}
        >
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="restaurant-outline" size={64} color={Colors.border.default} />
          <ThemedText style={styles.errorText}>Restaurant not found</ThemedText>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.errorButton}>
            <ThemedText style={styles.errorButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const maxPartySize = store?.bookingConfig?.maxPartySize || 10;
  const quickPartySizes = Array.from(
    { length: Math.min(4, maxPartySize) },
    (_, i) => (i + 1) * 2
  ).filter(size => size <= maxPartySize);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with Purple Gradient */}
      <LinearGradient
        colors={[Colors.brand.purple, Colors.brand.purple]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Book a Table</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.storeInfo}>
          <ThemedText style={styles.storeName}>{store.name}</ThemedText>
          <ThemedText style={styles.storeCategory}>{store.category}</ThemedText>
          {store.bookingConfig && (
            <View style={styles.bookingInfoBadge}>
              <Ionicons name="time-outline" size={14} color={Colors.text.inverse} />
              <ThemedText style={styles.bookingInfoText}>
                {store.bookingConfig.slotDuration || 90} min slots
              </ThemedText>
              <ThemedText style={styles.bookingInfoDivider}>•</ThemedText>
              <Ionicons name="people-outline" size={14} color={Colors.text.inverse} />
              <ThemedText style={styles.bookingInfoText}>
                Up to {store.bookingConfig.maxPartySize || 10} guests
              </ThemedText>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Date Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color={Colors.brand.purple} />
            <ThemedText style={styles.sectionTitle}>Select Date</ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
            contentContainerStyle={styles.dateScrollContent}
          >
            {availableDates.map((dateItem) => {
              const isSelected = dateItem.date === selectedDate.toISOString().split('T')[0];
              const isToday = dateItem.date === new Date().toISOString().split('T')[0];

              return (
                <Pressable
                  key={dateItem.id}
                  onPress={() => {
                    setSelectedDate(dateItem.fullDate);
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
                  <ThemedText style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                    {dateItem.dayName}
                  </ThemedText>
                  <ThemedText style={[styles.dateNumber, isSelected && styles.dateTextSelected]}>
                    {dateItem.dayNumber}
                  </ThemedText>
                  <ThemedText style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                    {dateItem.monthName}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Slots */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color={Colors.brand.purple} />
            <ThemedText style={styles.sectionTitle}>Select Time</ThemedText>
          </View>
          {timeSlots.length > 0 ? (
            <View style={styles.timeGrid}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    onPress={() => slot.available && setSelectedTime(slot.id)}
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
                    {slot.available && slot.tablesLeft && slot.tablesLeft <= 3 && (
                      <ThemedText style={styles.tablesLeftText}>
                        {slot.tablesLeft} left
                      </ThemedText>
                    )}
                    {!slot.available && (
                      <ThemedText style={styles.bookedText}>Booked</ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Colors.border.default} />
              <ThemedText style={styles.emptyStateText}>
                No time slots available for this date
              </ThemedText>
            </View>
          )}
        </View>

        {/* Party Size */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color={Colors.brand.purple} />
            <ThemedText style={styles.sectionTitle}>Party Size</ThemedText>
          </View>

          <View style={styles.partySizeContainer}>
            <Pressable
              style={styles.partySizeButton}
              onPress={() => handlePartySizeChange(false)}
              disabled={partySize <= (store?.bookingConfig?.minPartySize || 1)}
            >
              <Ionicons
                name="remove-circle"
                size={40}
                color={partySize <= (store?.bookingConfig?.minPartySize || 1) ? Colors.border.default : Colors.brand.purple}
              />
            </Pressable>

            <View style={styles.partySizeDisplay}>
              <ThemedText style={styles.partySizeNumber}>{partySize}</ThemedText>
              <ThemedText style={styles.partySizeLabel}>
                {partySize === 1 ? 'Guest' : 'Guests'}
              </ThemedText>
            </View>

            <Pressable
              style={styles.partySizeButton}
              onPress={() => handlePartySizeChange(true)}
              disabled={partySize >= maxPartySize}
            >
              <Ionicons
                name="add-circle"
                size={40}
                color={partySize >= maxPartySize ? Colors.border.default : Colors.brand.purple}
              />
            </Pressable>
          </View>

          {quickPartySizes.length > 0 && (
            <View style={styles.quickSizeContainer}>
              {quickPartySizes.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => setPartySize(size)}
                  style={[
                    styles.quickSizeButton,
                    partySize === size && styles.quickSizeButtonSelected,
                  ]}
                >
                  <Ionicons
                    name="people"
                    size={16}
                    color={partySize === size ? Colors.text.inverse : Colors.brand.purple}
                  />
                  <ThemedText
                    style={[
                      styles.quickSizeText,
                      partySize === size && styles.quickSizeTextSelected,
                    ]}
                  >
                    {size}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color={Colors.brand.purple} />
            <ThemedText style={styles.sectionTitle}>Your Details</ThemedText>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Full Name *"
                placeholderTextColor={colors.neutral[400]}
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
              <CountryCodePicker
                selectedCountry={selectedCountry}
                onSelect={setSelectedCountry}
                style={styles.countryPicker}
              />
              <View style={styles.phoneDivider} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Phone Number *"
                placeholderTextColor={colors.neutral[400]}
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
                placeholderTextColor={colors.neutral[400]}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Ionicons name="create-outline" size={20} color={Colors.text.tertiary} style={[styles.inputIcon, styles.textAreaIcon]} />
              <TextInput
                style={[styles.input, styles.textArea, { color: textColor }]}
                placeholder="Special Requests (Optional)"
                placeholderTextColor={colors.neutral[400]}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Fixed Button */}
      <View style={[styles.bottomContainer, { backgroundColor }]}>
        <Pressable
          onPress={handleBooking}
          style={styles.bookButton}
         
          disabled={submitting}
        >
          <LinearGradient
            colors={submitting ? [Colors.text.tertiary, Colors.text.tertiary] : [Colors.brand.purple, Colors.brand.purple]}
            style={styles.bookButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color={Colors.text.inverse} />
                <ThemedText style={styles.bookButtonText}>Confirming...</ThemedText>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={Colors.text.inverse} />
                <ThemedText style={styles.bookButtonText}>Confirm Booking</ThemedText>
                <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  loadingHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  storeInfo: {
    alignItems: 'center',
  },
  storeName: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  storeCategory: {
    ...Typography.body,
    color: '#E9D5FF',
    marginBottom: Spacing.sm,
  },
  bookingInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.xs,
  },
  bookingInfoText: {
    ...Typography.caption,
    color: Colors.text.inverse,
    marginLeft: Spacing.xs,
  },
  bookingInfoDivider: {
    ...Typography.caption,
    color: Colors.text.inverse,
    marginHorizontal: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    ...Typography.h4,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
    color: Colors.text.tertiary,
  },
  errorButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  dateScroll: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  dateScrollContent: {
    paddingRight: Spacing.lg,
  },
  dateCard: {
    width: 80,
    height: 100,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    backgroundColor: Colors.text.inverse,
    position: 'relative',
  },
  dateCardSelected: {
    borderColor: Colors.brand.purple,
    backgroundColor: colors.tint.pink,
  },
  todayBadge: {
    position: 'absolute',
    top: Spacing.xs,
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  dateDay: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  dateNumber: {
    ...Typography.h1,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  dateMonth: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  dateTextSelected: {
    color: Colors.brand.purple,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  timeSlot: {
    width: (width - 64) / 3,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    backgroundColor: Colors.text.inverse,
  },
  timeSlotSelected: {
    borderColor: Colors.brand.purple,
    backgroundColor: colors.tint.pink,
  },
  timeSlotDisabled: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.default,
    opacity: 0.6,
  },
  timeText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timeTextSelected: {
    color: Colors.brand.purple,
    fontWeight: '700',
  },
  timeTextDisabled: {
    color: Colors.text.tertiary,
  },
  tablesLeftText: {
    fontSize: 11,
    color: Colors.warning,
    marginTop: 4,
  },
  bookedText: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  partySizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.text.inverse,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
  },
  partySizeButton: {
    padding: Spacing.sm,
  },
  partySizeDisplay: {
    alignItems: 'center',
  },
  partySizeNumber: {
    fontSize: 52,
    fontWeight: 'bold',
    color: Colors.brand.purple,
  },
  partySizeLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  quickSizeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickSizeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.brand.purple,
    backgroundColor: Colors.text.inverse,
    gap: 6,
  },
  quickSizeButtonSelected: {
    backgroundColor: Colors.brand.purple,
    borderColor: Colors.brand.purple,
  },
  quickSizeText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purple,
  },
  quickSizeTextSelected: {
    color: Colors.text.inverse,
  },
  formContainer: {
    gap: Spacing.base,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text.inverse,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.base,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  countryPicker: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border.default,
    marginHorizontal: Spacing.sm,
  },
  textAreaIcon: {
    marginTop: Spacing.base,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bookButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  bookButtonText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(TableBookingPage, 'BookingTable');

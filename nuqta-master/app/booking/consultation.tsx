// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FormPageSkeleton } from '@/components/skeletons';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import storesApi, { Store } from '@/services/storesApi';
import consultationApi from '@/services/consultationApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Medical consultation types with icons
const CONSULTATION_TYPES = [
  { id: 'general', name: 'General Physician', icon: 'medical' as const, color: colors.brand.purpleLight },
  { id: 'pediatrician', name: 'Pediatrician', icon: 'people' as const, color: colors.brand.pink },
  { id: 'dentist', name: 'Dentist', icon: 'happy' as const, color: colors.successScale[400] },
  { id: 'eye', name: 'Eye Care', icon: 'eye' as const, color: colors.infoScale[400] },
  { id: 'cardio', name: 'Cardiologist', icon: 'heart' as const, color: colors.error },
  { id: 'derma', name: 'Dermatologist', icon: 'body' as const, color: colors.warningScale[400] },
  { id: 'ortho', name: 'Orthopedic', icon: 'walk' as const, color: colors.brand.indigo },
  { id: 'gynae', name: 'Gynecologist', icon: 'woman' as const, color: colors.brand.pink },
];

interface TimeSlot {
  time: string;
  available: boolean;
  isPast?: boolean;
}

function ConsultationBookingScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  // Store data
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking form state
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Patient details
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch store details
  useEffect(() => {
    const fetchStoreDetails = async () => {
      if (!storeId) {
        setError('Store ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await storesApi.getStoreById(storeId);

        if (response.success && response.data) {
          if (!isMounted()) return;
          setStore(response.data);
          if (!isMounted()) return;
          setError(null);
        } else {
          if (!isMounted()) return;
          setError(response.error || 'Failed to load clinic details');
        }
      } catch (err) {
        if (!isMounted()) return;
        setError('Failed to connect to server');
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchStoreDetails();
  }, [storeId]);

  // Generate next 60 days
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    return dates;
  }, []);

  // Generate time slots based on clinic hours
  const timeSlots = useMemo(() => {
    if (!selectedDate || !store?.hours) {
      return [];
    }

    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayHours = store.hours.find(h => h.day === dayName);

    if (!dayHours || dayHours.closed) {
      return [];
    }

    // Parse hours (assuming format "09:00")
    const [openHour] = dayHours.open.split(':').map(Number);
    const [closeHour] = dayHours.close.split(':').map(Number);

    const slots: TimeSlot[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    // Generate 30-minute slots
    for (let hour = openHour; hour < closeHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Check if slot is in the past for today
        let isPast = false;
        if (isToday) {
          const slotTime = new Date(selectedDate);
          slotTime.setHours(hour, minute, 0, 0);
          isPast = slotTime < now;
        }

        slots.push({
          time: timeString,
          available: !isPast,
          isPast,
        });
      }
    }

    return slots;
  }, [selectedDate, store]);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format day for date selector
  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Validate form
  const validateForm = () => {
    if (!selectedConsultation) {
      platformAlertSimple('Validation Error', 'Please select a consultation type');
      return false;
    }
    if (!selectedDate) {
      platformAlertSimple('Validation Error', 'Please select a date');
      return false;
    }
    if (!selectedTime) {
      platformAlertSimple('Validation Error', 'Please select a time slot');
      return false;
    }
    if (!patientName.trim()) {
      platformAlertSimple('Validation Error', 'Patient name is required');
      return false;
    }
    if (!age.trim() || isNaN(Number(age)) || Number(age) <= 0) {
      platformAlertSimple('Validation Error', 'Please enter a valid age');
      return false;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      platformAlertSimple('Validation Error', 'Please enter a valid phone number');
      return false;
    }
    if (!reason.trim()) {
      platformAlertSimple('Validation Error', 'Reason for consultation is required');
      return false;
    }
    return true;
  };

  // Handle booking submission
  const handleConfirmBooking = async () => {
    if (!validateForm() || !store || !selectedDate) {
      return;
    }

    try {
      setIsSubmitting(true);

      const consultationType = CONSULTATION_TYPES.find(c => c.id === selectedConsultation);

      // Prepare consultation data for the API
      const consultationData = {
        storeId: store.id,
        date: selectedDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
        time: selectedTime!,
        type: 'in-person' as const, // Default to in-person, can be made selectable later
        duration: 30, // Default 30 minutes consultation
        reason: reason.trim(),
        notes: `Consultation Type: ${consultationType?.name}\nAge: ${age}${medicalHistory.trim() ? `\nMedical History: ${medicalHistory.trim()}` : ''}`,
        customerName: patientName.trim(),
        customerPhone: phoneNumber.trim(),
        customerEmail: email.trim() || patientName.trim().toLowerCase().replace(/\s+/g, '') + '@temp.com', // Email is required by API
      };

      const response = await consultationApi.createConsultation(consultationData);

      if (response.success && response.data) {
        platformAlertConfirm(
          'Consultation Confirmed!',
          `Your ${consultationType?.name} consultation has been successfully booked!\n\n` +
          `Confirmation Code: ${response.data.confirmationCode || 'Pending'}\n` +
          `Date: ${formatDate(selectedDate)}\n` +
          `Time: ${selectedTime}\n` +
          `Patient: ${patientName}\n\n` +
          `You will receive a confirmation message shortly.`,
          () => router.canGoBack() ? router.back() : router.replace('/(tabs)'),
          'OK'
        );
      } else {
        platformAlertSimple('Booking Failed', response.error || 'Unable to book consultation. Please try again.');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to book consultation. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient
          colors={[Colors.brand.purpleLight, Colors.brand.purple]}
          style={styles.header}
        >
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Book Consultation</ThemedText>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <FormPageSkeleton />
        </View>
      </ThemedView>
    );
  }

  // Error state
  if (error || !store) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient
          colors={[Colors.brand.purpleLight, Colors.brand.purple]}
          style={styles.header}
        >
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Book Consultation</ThemedText>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <ThemedText style={styles.errorText}>{error || 'Clinic not found'}</ThemedText>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const selectedConsultationType = CONSULTATION_TYPES.find(c => c.id === selectedConsultation);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.brand.purpleLight, Colors.brand.purple]}
        style={styles.header}
      >
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </Pressable>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Book Consultation</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{store.name}</ThemedText>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Consultation Type Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={20} color={Colors.brand.purple} />
            <ThemedText style={styles.sectionTitle}>Select Consultation Type</ThemedText>
          </View>
          <View style={styles.consultationGrid}>
            {CONSULTATION_TYPES.map((type) => (
              <Pressable
                key={type.id}
                style={[
                  styles.consultationCard,
                  selectedConsultation === type.id && styles.consultationCardSelected,
                ]}
                onPress={() => setSelectedConsultation(type.id)}
              >
                <View style={[styles.consultationIcon, { backgroundColor: type.color + '20' }]}>
                  <Ionicons name={type.icon} size={24} color={type.color} />
                </View>
                <Text
                  style={[
                    styles.consultationName,
                    selectedConsultation === type.id && styles.consultationNameSelected,
                  ]}
                  numberOfLines={2}
                >
                  {type.name}
                </Text>
                {selectedConsultation === type.id && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.brand.purple} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

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
          >
            {availableDates.map((date, index) => (
              <Pressable
                key={index}
                style={[
                  styles.dateCard,
                  selectedDate?.toDateString() === date.toDateString() && styles.dateCardSelected,
                ]}
                onPress={() => {
                  setSelectedDate(date);
                  setSelectedTime(null); // Reset time when date changes
                }}
              >
                <Text style={[
                  styles.dateDay,
                  selectedDate?.toDateString() === date.toDateString() && styles.dateDaySelected,
                ]}>
                  {formatDay(date)}
                </Text>
                <Text style={[
                  styles.dateNumber,
                  selectedDate?.toDateString() === date.toDateString() && styles.dateNumberSelected,
                ]}>
                  {date.getDate()}
                </Text>
                <Text style={[
                  styles.dateMonth,
                  selectedDate?.toDateString() === date.toDateString() && styles.dateMonthSelected,
                ]}>
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Time Slot Selection */}
        {selectedDate && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color={Colors.brand.purple} />
              <ThemedText style={styles.sectionTitle}>Select Time Slot</ThemedText>
            </View>
            {timeSlots.length > 0 ? (
              <View style={styles.timeGrid}>
                {timeSlots.map((slot, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.timeSlot,
                      !slot.available && styles.timeSlotDisabled,
                      selectedTime === slot.time && styles.timeSlotSelected,
                    ]}
                    onPress={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        !slot.available && styles.timeSlotTextDisabled,
                        selectedTime === slot.time && styles.timeSlotTextSelected,
                      ]}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.noSlotsContainer}>
                <Ionicons name="close-circle" size={32} color={Colors.error} />
                <ThemedText style={styles.noSlotsText}>
                  Clinic is closed on this day
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Patient Details Form */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color={Colors.brand.purple} />
            <ThemedText style={styles.sectionTitle}>Patient Details</ThemedText>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Patient Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter patient's full name"
              placeholderTextColor={Colors.text.tertiary}
              value={patientName}
              onChangeText={setPatientName}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={styles.input}
                placeholder="Age"
                placeholderTextColor={Colors.text.tertiary}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.formGroup, { flex: 2 }]}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor={Colors.text.tertiary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor={Colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Reason for Consultation *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your symptoms or reason for visit"
              placeholderTextColor={Colors.text.tertiary}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Medical History (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any relevant medical history, allergies, or current medications"
              placeholderTextColor={Colors.text.tertiary}
              value={medicalHistory}
              onChangeText={setMedicalHistory}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Booking Summary */}
        {selectedConsultationType && selectedDate && selectedTime && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="document-text" size={20} color={Colors.brand.purple} />
              <ThemedText style={styles.summaryTitle}>Booking Summary</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Clinic</Text>
              <Text style={styles.summaryValue}>{store.name}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consultation</Text>
              <Text style={styles.summaryValue}>{selectedConsultationType.name}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>

            {patientName && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Patient</Text>
                <Text style={styles.summaryValue}>{patientName}</Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom spacing for fixed button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomButtonContainer}>
        <Pressable
          onPress={handleConfirmBooking}
          disabled={isSubmitting || !selectedConsultation || !selectedDate || !selectedTime}
        >
          <LinearGradient
            colors={
              isSubmitting || !selectedConsultation || !selectedDate || !selectedTime
                ? [Colors.border.default, Colors.text.tertiary]
                : [Colors.brand.purpleLight, Colors.brand.purple]
            }
            style={styles.confirmButton}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={Colors.text.inverse} />
                <Text style={styles.confirmButtonText}>Confirm Consultation</Text>
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
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    marginBottom: 10,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.bodyLarge,
    color: '#E9D5FF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.sm,
  },
  errorButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
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
    color: Colors.text.primary,
  },
  consultationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  consultationCard: {
    width: (width - 64) / 2,
    margin: 6,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    position: 'relative',
  },
  consultationCardSelected: {
    borderColor: Colors.brand.purple,
    backgroundColor: colors.tint.pink,
  },
  consultationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  consultationName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    textAlign: 'center',
    minHeight: 36,
  },
  consultationNameSelected: {
    color: Colors.brand.purple,
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  dateScroll: {
    marginHorizontal: -20,
    paddingHorizontal: Spacing.lg,
  },
  dateCard: {
    width: 70,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  dateCardSelected: {
    borderColor: Colors.brand.purple,
    backgroundColor: colors.tint.pink,
  },
  dateDay: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  dateDaySelected: {
    color: Colors.brand.purple,
    fontWeight: '600',
  },
  dateNumber: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  dateNumberSelected: {
    color: Colors.brand.purple,
  },
  dateMonth: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  dateMonthSelected: {
    color: Colors.brand.purple,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  timeSlot: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    margin: Spacing.xs,
    minWidth: 80,
    alignItems: 'center',
  },
  timeSlotSelected: {
    borderColor: Colors.brand.purple,
    backgroundColor: colors.tint.pink,
  },
  timeSlotDisabled: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.default,
    opacity: 0.5,
  },
  timeSlotText: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  timeSlotTextSelected: {
    color: Colors.brand.purple,
  },
  timeSlotTextDisabled: {
    color: Colors.text.tertiary,
  },
  noSlotsContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  noSlotsText: {
    marginTop: Spacing.sm,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  formGroup: {
    marginBottom: Spacing.base,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Shadows.medium,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  summaryTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    color: Colors.text.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  summaryValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  bottomSpacing: {
    height: Spacing.lg,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    ...Shadows.medium,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  confirmButtonText: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    marginLeft: Spacing.sm,
  },
});

export default withErrorBoundary(ConsultationBookingScreen, 'BookingConsultation');

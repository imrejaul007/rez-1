import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView} from 'react-native';
import { platformAlertSimple, platformAlert } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import serviceBookingApi, {
  TimeSlot,
  ServiceAddress,
  CreateBookingData,
  AvailableSlotsResponse,
} from '@/services/serviceBookingApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ServiceInfo {
  _id: string;
  name: string;
  price: number;
  originalPrice?: number;
  duration: number;
  serviceType: 'home' | 'store' | 'online';
  cashbackPercentage?: number;
  currency?: string;
  storeName?: string;
}

interface ServiceBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (booking: any) => void;
  service: ServiceInfo | null;
}

// Generate next 14 days for date selection
const generateDates = () => {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Format date for display
const formatDate = (date: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    day: days[date.getDay()],
    date: date.getDate(),
    month: months[date.getMonth()],
    isToday: date.toDateString() === new Date().toDateString(),
  };
};

// Format date for API
const formatDateForApi = (date: Date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Date Picker Component
const DatePicker = memo(({
  dates,
  selectedDate,
  onSelect
}: {
  dates: Date[];
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.datePickerContent}
    >
      {dates.map((date, index) => {
        const formatted = formatDate(date);
        const isSelected = selectedDate?.toDateString() === date.toDateString();

        return (
          <Pressable
            key={index}
            style={[
              styles.dateCard,
              isSelected && styles.dateCardSelected
            ]}
            onPress={() => onSelect(date)}
           
          >
            <ThemedText style={[
              styles.dateDayText,
              isSelected && styles.dateTextSelected
            ]}>
              {formatted.day}
            </ThemedText>
            <ThemedText style={[
              styles.dateNumberText,
              isSelected && styles.dateTextSelected
            ]}>
              {formatted.date}
            </ThemedText>
            <ThemedText style={[
              styles.dateMonthText,
              isSelected && styles.dateTextSelected
            ]}>
              {formatted.month}
            </ThemedText>
            {formatted.isToday && (
              <View style={[
                styles.todayIndicator,
                isSelected && styles.todayIndicatorSelected
              ]} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

// Time Slot Picker Component
const TimeSlotPicker = memo(({
  slots,
  selectedSlot,
  onSelect,
  loading
}: {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <View style={styles.slotLoadingContainer}>
        <ActivityIndicator size="small" color={colors.brand.purple} />
        <ThemedText style={styles.slotLoadingText}>Loading available slots...</ThemedText>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={styles.noSlotsContainer}>
        <Ionicons name="time-outline" size={32} color={colors.neutral[400]} />
        <ThemedText style={styles.noSlotsText}>No slots available for this date</ThemedText>
        <ThemedText style={styles.noSlotsSubtext}>Please select another date</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.slotsGrid}>
      {slots.map((slot, index) => {
        const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;

        return (
          <Pressable
            key={`${slot.start}-${slot.end}-${index}`}
            style={[
              styles.slotCard,
              isSelected && styles.slotCardSelected
            ]}
            onPress={() => onSelect(slot)}
           
          >
            <ThemedText style={[
              styles.slotText,
              isSelected && styles.slotTextSelected
            ]}>
              {slot.start} - {slot.end}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
});

// Address Form Component
const AddressForm = memo(({
  address,
  onChange
}: {
  address: ServiceAddress;
  onChange: (field: keyof ServiceAddress, value: string) => void;
}) => {
  return (
    <View style={styles.addressForm}>
      <View style={styles.inputRow}>
        <View style={[styles.inputContainer, styles.inputFull]}>
          <ThemedText style={styles.inputLabel}>Street Address *</ThemedText>
          <TextInput
            style={styles.input}
            value={address.street}
            onChangeText={(text) => onChange('street', text)}
            placeholder="Enter street address"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputContainer, styles.inputFull]}>
          <ThemedText style={styles.inputLabel}>Apartment/Floor (Optional)</ThemedText>
          <TextInput
            style={styles.input}
            value={address.apartment || ''}
            onChangeText={(text) => onChange('apartment', text)}
            placeholder="Apt, Floor, Building"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputContainer, styles.inputHalf]}>
          <ThemedText style={styles.inputLabel}>City *</ThemedText>
          <TextInput
            style={styles.input}
            value={address.city}
            onChangeText={(text) => onChange('city', text)}
            placeholder="City"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>
        <View style={[styles.inputContainer, styles.inputHalf]}>
          <ThemedText style={styles.inputLabel}>State *</ThemedText>
          <TextInput
            style={styles.input}
            value={address.state}
            onChangeText={(text) => onChange('state', text)}
            placeholder="State"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputContainer, styles.inputHalf]}>
          <ThemedText style={styles.inputLabel}>Pincode *</ThemedText>
          <TextInput
            style={styles.input}
            value={address.pincode}
            onChangeText={(text) => onChange('pincode', text)}
            placeholder="Pincode"
            placeholderTextColor={colors.neutral[400]}
            keyboardType="numeric"
            maxLength={6}
          />
        </View>
        <View style={[styles.inputContainer, styles.inputHalf]}>
          <ThemedText style={styles.inputLabel}>Landmark (Optional)</ThemedText>
          <TextInput
            style={styles.input}
            value={address.landmark || ''}
            onChangeText={(text) => onChange('landmark', text)}
            placeholder="Nearby landmark"
            placeholderTextColor={colors.neutral[400]}
          />
        </View>
      </View>
    </View>
  );
});

function ServiceBookingModal({
  visible,
  onClose,
  onSuccess,
  service,
}: ServiceBookingModalProps) {
  const [step, setStep] = useState<'datetime' | 'address' | 'confirm'>('datetime');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const isMounted = useIsMounted();
  const [address, setAddress] = useState<ServiceAddress>({
    street: '',
    apartment: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  const dates = generateDates();

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('datetime');
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setCustomerNotes('');
      setAddress({
        street: '',
        apartment: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
      });
    }
  }, [visible]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && service) {
      fetchAvailableSlots();
    }
  }, [selectedDate, service]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !service) return;

    try {
      setSlotsLoading(true);
      const response = await serviceBookingApi.getAvailableSlots(
        service._id,
        formatDateForApi(selectedDate)
      );

      if (response.success && response.data) {
        if (!isMounted()) return;
        setAvailableSlots(response.data.slots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      if (!isMounted()) return;
      setAvailableSlots([]);
    } finally {
      if (!isMounted()) return;
      setSlotsLoading(false);
    }
  };

  const handleAddressChange = useCallback((field: keyof ServiceAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNext = () => {
    if (step === 'datetime') {
      if (!selectedDate || !selectedSlot) {
        platformAlertSimple('Required', 'Please select a date and time slot');
        return;
      }

      if (service?.serviceType === 'home') {
        setStep('address');
      } else {
        setStep('confirm');
      }
    } else if (step === 'address') {
      if (!address.street || !address.city || !address.state || !address.pincode) {
        platformAlertSimple('Required', 'Please fill in all required address fields');
        return;
      }
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'address') {
      setStep('datetime');
    } else if (step === 'confirm') {
      if (service?.serviceType === 'home') {
        setStep('address');
      } else {
        setStep('datetime');
      }
    }
  };

  const handleBooking = async () => {
    if (!service || !selectedDate || !selectedSlot) return;

    try {
      setBooking(true);

      const bookingData: CreateBookingData = {
        serviceId: service._id,
        bookingDate: formatDateForApi(selectedDate),
        timeSlot: selectedSlot,
        serviceType: service.serviceType,
        customerNotes: customerNotes || undefined,
      };

      if (service.serviceType === 'home') {
        bookingData.serviceAddress = address;
      }

      const response = await serviceBookingApi.createBooking(bookingData);

      if (response.success && response.data) {
        platformAlert('Booking Confirmed!', `Your service has been booked for ${formatDate(selectedDate).month} ${formatDate(selectedDate).date} at ${selectedSlot.start}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.(response.data);
                onClose();
              }
            }
          ]
        );
      } else {
        platformAlertSimple('Error', response.error || 'Failed to create booking');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to create booking. Please try again.');
    } finally {
      if (!isMounted()) return;
      setBooking(false);
    }
  };

  if (!service) return null;

  const cashbackAmount = service.cashbackPercentage
    ? Math.round((service.price * service.cashbackPercentage) / 100)
    : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
             
            >
              <Ionicons name="close" size={24} color={colors.neutral[700]} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Book Service</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step !== 'datetime' && styles.stepDotCompleted]} />
            {service.serviceType === 'home' && (
              <>
                <View style={[styles.stepLine, step !== 'datetime' && styles.stepLineCompleted]} />
                <View style={[
                  styles.stepDot,
                  step === 'confirm' && styles.stepDotCompleted,
                  step === 'address' && styles.stepDotActive
                ]} />
              </>
            )}
            <View style={[styles.stepLine, step === 'confirm' && styles.stepLineCompleted]} />
            <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
          </View>

          {/* Service Info */}
          <View style={styles.serviceInfo}>
            <ThemedText style={styles.serviceName} numberOfLines={2}>
              {service.name}
            </ThemedText>
            {service.storeName && (
              <ThemedText style={styles.storeName}>{service.storeName}</ThemedText>
            )}
            <View style={styles.serviceDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={colors.neutral[500]} />
                <ThemedText style={styles.detailText}>{service.duration} min</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <Ionicons
                  name={service.serviceType === 'home' ? 'home-outline' : 'storefront-outline'}
                  size={16}
                  color={colors.neutral[500]}
                />
                <ThemedText style={styles.detailText}>
                  {service.serviceType === 'home' ? 'At your location' : 'At store'}
                </ThemedText>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Step 1: Date & Time */}
            {step === 'datetime' && (
              <View style={styles.stepContent}>
                <ThemedText style={styles.sectionTitle}>Select Date</ThemedText>
                <DatePicker
                  dates={dates}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                />

                {selectedDate && (
                  <>
                    <ThemedText style={styles.sectionTitle}>Select Time Slot</ThemedText>
                    <TimeSlotPicker
                      slots={availableSlots}
                      selectedSlot={selectedSlot}
                      onSelect={setSelectedSlot}
                      loading={slotsLoading}
                    />
                  </>
                )}

                <View style={styles.notesSection}>
                  <ThemedText style={styles.sectionTitle}>Notes (Optional)</ThemedText>
                  <TextInput
                    style={styles.notesInput}
                    value={customerNotes}
                    onChangeText={setCustomerNotes}
                    placeholder="Any special requests or notes..."
                    placeholderTextColor={colors.neutral[400]}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}

            {/* Step 2: Address (for home services) */}
            {step === 'address' && (
              <View style={styles.stepContent}>
                <ThemedText style={styles.sectionTitle}>Service Address</ThemedText>
                <ThemedText style={styles.sectionSubtitle}>
                  Enter the address where you want the service
                </ThemedText>
                <AddressForm
                  address={address}
                  onChange={handleAddressChange}
                />
              </View>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirm' && selectedDate && selectedSlot && (
              <View style={styles.stepContent}>
                <ThemedText style={styles.sectionTitle}>Booking Summary</ThemedText>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Date</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {formatDate(selectedDate).day}, {formatDate(selectedDate).date} {formatDate(selectedDate).month}
                    </ThemedText>
                  </View>
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Time</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {selectedSlot.start} - {selectedSlot.end}
                    </ThemedText>
                  </View>
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Duration</ThemedText>
                    <ThemedText style={styles.summaryValue}>{service.duration} minutes</ThemedText>
                  </View>
                  {service.serviceType === 'home' && address.street && (
                    <View style={styles.summaryRow}>
                      <ThemedText style={styles.summaryLabel}>Location</ThemedText>
                      <ThemedText style={styles.summaryValue} numberOfLines={2}>
                        {address.street}, {address.city}, {address.state} - {address.pincode}
                      </ThemedText>
                    </View>
                  )}
                  {customerNotes && (
                    <View style={styles.summaryRow}>
                      <ThemedText style={styles.summaryLabel}>Notes</ThemedText>
                      <ThemedText style={styles.summaryValue} numberOfLines={2}>
                        {customerNotes}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.pricingCard}>
                  <View style={styles.priceRow}>
                    <ThemedText style={styles.priceLabel}>Service Price</ThemedText>
                    <ThemedText style={styles.priceValue}>
                      {service.currency || 'INR'} {service.price.toLocaleString()}
                    </ThemedText>
                  </View>
                  {service.originalPrice && service.originalPrice > service.price && (
                    <View style={styles.priceRow}>
                      <ThemedText style={styles.priceLabel}>Discount</ThemedText>
                      <ThemedText style={styles.discountValue}>
                        -{service.currency || 'INR'} {(service.originalPrice - service.price).toLocaleString()}
                      </ThemedText>
                    </View>
                  )}
                  {cashbackAmount > 0 && (
                    <View style={styles.cashbackRow}>
                      <View style={styles.cashbackInfo}>
                        <Ionicons name="gift-outline" size={16} color={colors.brand.purple} />
                        <ThemedText style={styles.cashbackLabel}>
                          Cashback ({service.cashbackPercentage}%)
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.cashbackValue}>
                        +{service.currency || 'INR'} {cashbackAmount.toLocaleString()}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.totalRow}>
                    <ThemedText style={styles.totalLabel}>Total</ThemedText>
                    <ThemedText style={styles.totalValue}>
                      {service.currency || 'INR'} {service.price.toLocaleString()}
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {step !== 'datetime' && (
              <Pressable
                style={styles.backButton}
                onPress={handleBack}
               
              >
                <Ionicons name="arrow-back" size={20} color={colors.brand.purple} />
                <ThemedText style={styles.backButtonText}>Back</ThemedText>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.nextButton,
                step === 'datetime' && styles.nextButtonFull,
                booking && styles.nextButtonDisabled
              ]}
              onPress={step === 'confirm' ? handleBooking : handleNext}
              disabled={booking}
             
            >
              {booking ? (
                <ActivityIndicator size="small" color={colors.background.primary} />
              ) : (
                <ThemedText style={styles.nextButtonText}>
                  {step === 'confirm' ? 'Confirm Booking' : 'Continue'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  headerSpacer: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.neutral[200],
  },
  stepDotActive: {
    backgroundColor: colors.brand.purple,
  },
  stepDotCompleted: {
    backgroundColor: colors.successScale[400],
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 4,
  },
  stepLineCompleted: {
    backgroundColor: colors.successScale[400],
  },
  serviceInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  scrollContent: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 16,
    marginTop: -8,
  },
  datePickerContent: {
    paddingRight: 20,
    marginBottom: 24,
  },
  dateCard: {
    width: 64,
    height: 80,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  dateCardSelected: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },
  dateDayText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  dateNumberText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginVertical: 2,
  },
  dateMonthText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  dateTextSelected: {
    color: colors.background.primary,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.purple,
  },
  todayIndicatorSelected: {
    backgroundColor: colors.background.primary,
  },
  slotLoadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  slotLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
  noSlotsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noSlotsText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  noSlotsSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: colors.neutral[400],
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  slotCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  slotCardSelected: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },
  slotText: {
    fontSize: 13,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  slotTextSelected: {
    color: colors.background.primary,
  },
  notesSection: {
    marginTop: 8,
  },
  notesInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 12,
    fontSize: 14,
    color: colors.neutral[800],
    minHeight: 80,
  },
  addressForm: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputFull: {
    flex: 1,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.neutral[700],
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral[800],
  },
  summaryCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  summaryValue: {
    fontSize: 14,
    color: colors.neutral[800],
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  pricingCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  priceValue: {
    fontSize: 14,
    color: colors.neutral[800],
  },
  discountValue: {
    fontSize: 14,
    color: colors.successScale[400],
    fontWeight: '500',
  },
  cashbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.tint.pink,
    marginHorizontal: -16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cashbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashbackLabel: {
    fontSize: 14,
    color: colors.brand.purple,
    fontWeight: '500',
  },
  cashbackValue: {
    fontSize: 14,
    color: colors.brand.purple,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand.purple,
    gap: 6,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  nextButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.purple,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default memo(ServiceBookingModal);

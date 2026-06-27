// @ts-nocheck
/**
 * Hotel Booking Flow - Multi-step booking process
 * Steps: 1. Dates & Guests, 2. Room Selection, 3. Extras, 4. Contact & Review
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import serviceBookingApi from '@/services/serviceBookingApi';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface HotelDetails {
  id: string;
  name: string;
  price: number;
  pricePerNight: number;
  roomTypes: {
    standard: { price: number; available: boolean; description?: string };
    deluxe: { price: number; available: boolean; description?: string };
    suite: { price: number; available: boolean; description?: string };
  };
}

interface BookingData {
  checkInDate: Date;
  checkOutDate: Date;
  rooms: number;
  guests: {
    adults: number;
    children: number;
  };
  roomType: 'standard' | 'deluxe' | 'suite';
  selectedExtras: {
    breakfast?: boolean;
    wifi?: boolean;
    parking?: boolean;
    lateCheckout?: boolean;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  guestDetails: Array<{
    firstName: string;
    lastName: string;
    email?: string;
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

interface HotelBookingFlowProps {
  hotel: HotelDetails;
  onComplete: (data: BookingData) => void;
  onClose: () => void;
}

const HotelBookingFlow: React.FC<HotelBookingFlowProps> = ({
  hotel,
  onComplete,
  onClose,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useIsMounted();
  
  // Step 1: Dates & Guests
  const [checkInDate, setCheckInDate] = useState(new Date());
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Step 2: Room Type
  const [roomType, setRoomType] = useState<'standard' | 'deluxe' | 'suite'>('standard');

  // Step 3: Extras
  const [breakfast, setBreakfast] = useState(false);
  const [wifi, setWifi] = useState(false);
  const [parking, setParking] = useState(false);
  const [lateCheckout, setLateCheckout] = useState(false);

  // Step 4: Contact Info
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [guestDetails, setGuestDetails] = useState<Array<{ firstName: string; lastName: string; email?: string }>>([]);

  const calculateNights = () => {
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const calculateTotalPrice = () => {
    const nights = calculateNights();
    const basePrice = hotel.roomTypes[roomType].price * nights * rooms;
    let extrasPrice = 0;
    
    if (breakfast) extrasPrice += 500 * nights * rooms;
    if (wifi) extrasPrice += 200 * nights * rooms;
    if (parking) extrasPrice += 300 * nights * rooms;
    if (lateCheckout) extrasPrice += 1000;
    
    return basePrice + extrasPrice;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (checkOutDate <= checkInDate) {
        platformAlertSimple('Invalid Dates', 'Check-out date must be after check-in date');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
      // Initialize guest details
      const totalGuests = adults + children;
      setGuestDetails(Array.from({ length: totalGuests }, () => ({ firstName: '', lastName: '' })));
    } else if (currentStep === 4) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      platformAlertSimple('Missing Information', 'Please fill in all contact details');
      return;
    }

    if (guestDetails.some(g => !g.firstName.trim() || !g.lastName.trim())) {
      platformAlertSimple('Missing Information', 'Please fill in all guest details');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData: BookingData = {
        checkInDate,
        checkOutDate,
        rooms,
        guests: { adults, children },
        roomType,
        selectedExtras: {
          breakfast,
          wifi,
          parking,
          lateCheckout,
        },
        contactInfo: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
        },
        guestDetails,
      };

      // Calculate time slot (check-in time default 14:00, check-out 11:00)
      const checkInHour = 14;
      const checkInMin = 0;
      const checkOutHour = 11;
      const checkOutMin = 0;

      // Format booking date as YYYY-MM-DD
      const bookingDateStr = checkInDate.toISOString().split('T')[0];

      // Prepare customer notes with all booking details
      const customerNotes = JSON.stringify({
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        rooms,
        roomType,
        guests: {
          adults: bookingData.guests.adults,
          children: bookingData.guests.children,
        },
        selectedExtras: bookingData.selectedExtras,
        guestDetails: bookingData.guestDetails,
        contactInfo: bookingData.contactInfo,
        totalPrice: calculateTotalPrice(),
      });

      // Call booking API with correct format matching backend
      const response = await serviceBookingApi.createBooking({
        serviceId: hotel.id,
        bookingDate: bookingDateStr, // YYYY-MM-DD format
        timeSlot: {
          start: `${checkInHour.toString().padStart(2, '0')}:${checkInMin.toString().padStart(2, '0')}`,
          end: `${checkOutHour.toString().padStart(2, '0')}:${checkOutMin.toString().padStart(2, '0')}`,
        },
        serviceType: 'online', // Hotels are online bookings
        customerNotes, // All additional info goes here
        paymentMethod: 'online', // Default payment method
      });

      if (response.success && response.data) {
        // Add booking ID and number from API response
        const bookingResponse: BookingData = {
          ...bookingData,
          bookingId: response.data._id || response.data.id,
          bookingNumber: response.data.bookingNumber,
        };
        (bookingResponse as any).requiresPayment = response.requiresPayment || response.data?.requiresPaymentUpfront;
        (bookingResponse as any).totalAmount = calculateTotalPrice();
        onComplete(bookingResponse);
      } else {
        platformAlertSimple('Booking Failed', response.error || 'Please try again');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to complete booking. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Dates & Guests</Text>
      
      {/* Check-in Date */}
      <View style={styles.dateSection}>
        <Text style={styles.label}>Check-in Date</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowCheckInPicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.brand.pink} />
          <Text style={styles.dateText}>
            {checkInDate.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </Pressable>
        {showCheckInPicker && (
          <DateTimePicker
            value={checkInDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowCheckInPicker(Platform.OS === 'ios');
              if (date) setCheckInDate(date);
            }}
          />
        )}
      </View>

      {/* Check-out Date */}
      <View style={styles.dateSection}>
        <Text style={styles.label}>Check-out Date</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowCheckOutPicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.brand.pink} />
          <Text style={styles.dateText}>
            {checkOutDate.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </Pressable>
        {showCheckOutPicker && (
          <DateTimePicker
            value={checkOutDate}
            mode="date"
            display="default"
            minimumDate={new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000)}
            onChange={(event, date) => {
              setShowCheckOutPicker(Platform.OS === 'ios');
              if (date) setCheckOutDate(date);
            }}
          />
        )}
      </View>

      {/* Nights Display */}
      <View style={styles.nightsBadge}>
        <Ionicons name="moon" size={16} color={colors.brand.pink} />
        <Text style={styles.nightsText}>{calculateNights()} {calculateNights() === 1 ? 'Night' : 'Nights'}</Text>
      </View>

      {/* Rooms */}
      <View style={styles.counterSection}>
        <Text style={styles.label}>Number of Rooms</Text>
        <View style={styles.counter}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setRooms(Math.max(1, rooms - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.brand.pink} />
          </Pressable>
          <Text style={styles.counterValue}>{rooms}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setRooms(rooms + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.pink} />
          </Pressable>
        </View>
      </View>

      {/* Adults */}
      <View style={styles.counterSection}>
        <Text style={styles.label}>Adults</Text>
        <View style={styles.counter}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(Math.max(1, adults - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.brand.pink} />
          </Pressable>
          <Text style={styles.counterValue}>{adults}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(adults + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.pink} />
          </Pressable>
        </View>
      </View>

      {/* Children */}
      <View style={styles.counterSection}>
        <Text style={styles.label}>Children (0-12 years)</Text>
        <View style={styles.counter}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(Math.max(0, children - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.brand.pink} />
          </Pressable>
          <Text style={styles.counterValue}>{children}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(children + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.pink} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Room Type</Text>
      
      {(['standard', 'deluxe', 'suite'] as const).map((type) => {
        const room = hotel.roomTypes[type];
        if (!room.available) return null;
        
        const nights = calculateNights();
        const totalPrice = room.price * nights * rooms;
        const isSelected = roomType === type;

        return (
          <Pressable
            key={type}
            style={[styles.roomCard, isSelected && styles.roomCardSelected]}
            onPress={() => setRoomType(type)}
          >
            <View style={styles.roomCardHeader}>
              <Text style={styles.roomTypeName}>
                {type.charAt(0).toUpperCase() + type.slice(1)} Room
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={colors.brand.pink} />
              )}
            </View>
            {room.description && (
              <Text style={styles.roomDescription}>{room.description}</Text>
            )}
            <Text style={styles.roomPrice}>
              {currencySymbol}{room.price.toLocaleString(locale)}/night × {nights} nights × {rooms} {rooms === 1 ? 'room' : 'rooms'}
            </Text>
            <Text style={styles.roomTotalPrice}>
              Total: {currencySymbol}{totalPrice.toLocaleString(locale)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderStep3 = () => {
    const nights = calculateNights();
    const extras = [
      { key: 'breakfast', label: 'Breakfast', price: 500 * nights * rooms, selected: breakfast, onToggle: setBreakfast },
      { key: 'wifi', label: 'Wi-Fi', price: 200 * nights * rooms, selected: wifi, onToggle: setWifi },
      { key: 'parking', label: 'Parking', price: 300 * nights * rooms, selected: parking, onToggle: setParking },
      { key: 'lateCheckout', label: 'Late Check-out (2 PM)', price: 1000, selected: lateCheckout, onToggle: setLateCheckout },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Add Extras</Text>
        
        {extras.map((extra) => (
          <Pressable
            key={extra.key}
            style={[styles.extraCard, extra.selected && styles.extraCardSelected]}
            onPress={() => extra.onToggle(!extra.selected)}
          >
            <View style={styles.extraInfo}>
              <Text style={styles.extraLabel}>{extra.label}</Text>
              <Text style={styles.extraPrice}>+ {currencySymbol}{extra.price.toLocaleString(locale)}</Text>
            </View>
            <View style={[styles.checkbox, extra.selected && styles.checkboxSelected]}>
              {extra.selected && <Ionicons name="checkmark" size={16} color={colors.background.primary} />}
            </View>
          </Pressable>
        ))}

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Room ({calculateNights()} nights)</Text>
            <Text style={styles.priceValue}>
              {currencySymbol}{(hotel.roomTypes[roomType].price * calculateNights() * rooms).toLocaleString(locale)}
            </Text>
          </View>
          {extras.filter(e => e.selected).map((extra) => (
            <View key={extra.key} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{extra.label}</Text>
              <Text style={styles.priceValue}>+ {currencySymbol}{extra.price.toLocaleString(locale)}</Text>
            </View>
          ))}
          <View style={[styles.priceRow, styles.priceTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{currencySymbol}{calculateTotalPrice().toLocaleString(locale)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Contact & Guest Details</Text>
      
      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={contactName}
          onChangeText={setContactName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />
      </View>

      {/* Guest Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Guest Details</Text>
        {guestDetails.map((guest, index) => (
          <View key={index} style={styles.guestCard}>
            <Text style={styles.guestNumber}>Guest {index + 1}</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={guest.firstName}
              onChangeText={(text) => {
                const updated = [...guestDetails];
                updated[index].firstName = text;
                setGuestDetails(updated);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={guest.lastName}
              onChangeText={(text) => {
                const updated = [...guestDetails];
                updated[index].lastName = text;
                setGuestDetails(updated);
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>Book Hotel</Text>
        <Pressable onPress={onClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.neutral[900]} />
        </Pressable>
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <View style={[styles.progressStep, currentStep >= step && styles.progressStepActive]}>
              <Text style={[styles.progressStepText, currentStep >= step && styles.progressStepTextActive]}>
                {step}
              </Text>
            </View>
            {step < 4 && (
              <View style={[styles.progressLine, currentStep > step && styles.progressLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>{currencySymbol}{calculateTotalPrice().toLocaleString(locale)}</Text>
        </View>
        <Pressable
          style={[styles.nextButton, isSubmitting && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background.primary} />
          ) : (
            <LinearGradient
              colors={[colors.brand.pink, colors.deepPink]}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? 'Complete Booking' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
            </LinearGradient>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.neutral[50],
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: colors.brand.pink,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  progressStepTextActive: {
    color: colors.background.primary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: colors.brand.pink,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 12,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  nightsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.pinkMist,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  nightsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.pink,
  },
  counterSection: {
    marginBottom: 20,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pinkMist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  counterValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    minWidth: 40,
    textAlign: 'center',
  },
  roomCard: {
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    marginBottom: 16,
  },
  roomCardSelected: {
    borderColor: colors.brand.pink,
    backgroundColor: colors.pinkMist,
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  roomDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 12,
  },
  roomPrice: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  roomTotalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.pink,
  },
  extraCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    marginBottom: 12,
  },
  extraCardSelected: {
    borderColor: colors.brand.pink,
    backgroundColor: colors.pinkMist,
  },
  extraInfo: {
    flex: 1,
  },
  extraLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  extraPrice: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.brand.pink,
    borderColor: colors.brand.pink,
  },
  priceSummary: {
    marginTop: 24,
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  priceTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brand.pink,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  input: {
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    fontSize: 16,
    color: colors.neutral[900],
    marginBottom: 12,
  },
  guestCard: {
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: 12,
  },
  guestNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.pink,
    marginBottom: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  footerPrice: {
    marginBottom: 16,
  },
  footerPriceLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  footerPriceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.brand.pink,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default React.memo(HotelBookingFlow);

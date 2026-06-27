// @ts-nocheck
/**
 * Bus Booking Flow - Multi-step booking process
 * Steps: 1. Date & Passengers, 2. Seat/Class Selection, 3. Extras, 4. Contact & Passenger Details
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

interface BusDetails {
  id: string;
  name: string;
  price: number;
  duration?: number;
  classOptions: {
    seater: { price: number; available: boolean };
    sleeper: { price: number; available: boolean };
    semiSleeper: { price: number; available: boolean };
    ac: { price: number; available: boolean };
  };
}

interface BookingData {
  travelDate: Date;
  returnDate?: Date;
  tripType: 'one-way' | 'round-trip';
  passengers: {
    adults: number;
    children: number;
  };
  busClass: 'seater' | 'sleeper' | 'semiSleeper' | 'ac';
  selectedExtras: {
    meals?: boolean;
    insurance?: boolean;
    cancellation?: boolean;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  passengerDetails: Array<{
    firstName: string;
    lastName: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    seatPreference?: 'window' | 'aisle' | 'no-preference';
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

interface BusBookingFlowProps {
  bus: BusDetails;
  onComplete: (data: BookingData) => void;
  onClose: () => void;
}

const BusBookingFlow: React.FC<BusBookingFlowProps> = ({
  bus,
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
  
  // Step 1: Date & Passengers
  const [travelDate, setTravelDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showTravelDatePicker, setShowTravelDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Step 2: Class Selection
  const [busClass, setBusClass] = useState<'seater' | 'sleeper' | 'semiSleeper' | 'ac'>('sleeper');

  // Step 3: Extras
  const [meals, setMeals] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [cancellation, setCancellation] = useState(false);

  // Step 4: Contact & Passenger Details
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [passengerDetails, setPassengerDetails] = useState<Array<{
    firstName: string;
    lastName: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    seatPreference?: 'window' | 'aisle' | 'no-preference';
  }>>([]);

  const totalSteps = 4;
  const totalPassengers = adults + children;

  const calculateTotalPrice = () => {
    const basePrice = bus.classOptions[busClass].price;
    const totalPassengers = adults + children;
    let total = basePrice * adults + (basePrice * 0.5 * children); // Children at 50% price
    
    // Add return trip if round-trip
    if (tripType === 'round-trip') {
      total = total * 2;
    }
    
    // Add extras
    if (meals) total += 150 * totalPassengers;
    if (insurance) total += 100 * totalPassengers;
    if (cancellation) total += 50 * totalPassengers;
    
    return total;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (tripType === 'round-trip' && returnDate <= travelDate) {
        platformAlertSimple('Invalid Date', 'Return date must be after travel date');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
      // Initialize passenger details
      const totalPassengers = adults + children;
      setPassengerDetails(Array.from({ length: totalPassengers }, () => ({
        firstName: '',
        lastName: '',
        age: 0,
        gender: 'male',
        seatPreference: 'no-preference',
      })));
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
    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      platformAlertSimple('Missing Information', 'Please fill in all contact details');
      return;
    }

    if (passengerDetails.some(p => !p.firstName.trim() || !p.lastName.trim() || p.age === 0)) {
      platformAlertSimple('Missing Information', 'Please fill in all passenger details');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData: BookingData = {
        travelDate,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
        tripType,
        passengers: { adults, children },
        busClass,
        selectedExtras: {
          meals,
          insurance,
          cancellation,
        },
        contactInfo: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
        },
        passengerDetails,
      };

      // Calculate time slot based on bus departure time (default 08:00)
      const departureHour = 8;
      const departureMin = 0;
      const tripDuration = bus.duration || 480; // 8 hours default
      const arrivalHour = (departureHour + Math.floor(tripDuration / 60)) % 24;
      const arrivalMin = (departureMin + (tripDuration % 60)) % 60;
      
      const formatTime = (hours: number, mins: number) => {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };

      // Format booking date as YYYY-MM-DD
      const bookingDateStr = travelDate.toISOString().split('T')[0];

      // Prepare customer notes with all booking details
      const customerNotes = JSON.stringify({
        tripType,
        returnDate: bookingData.returnDate?.toISOString().split('T')[0],
        passengers: {
          adults: bookingData.passengers.adults,
          children: bookingData.passengers.children,
        },
        busClass,
        selectedExtras: bookingData.selectedExtras,
        passengerDetails: bookingData.passengerDetails,
        contactInfo: bookingData.contactInfo,
        totalPrice: calculateTotalPrice(),
      });

      // Call booking API with correct format matching backend
      const response = await serviceBookingApi.createBooking({
        serviceId: bus.id,
        bookingDate: bookingDateStr,
        timeSlot: {
          start: formatTime(departureHour, departureMin),
          end: formatTime(arrivalHour, arrivalMin),
        },
        serviceType: 'online',
        customerNotes,
        paymentMethod: 'online',
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
      <Text style={styles.stepTitle}>Travel Date & Passengers</Text>
      
      {/* Trip Type */}
      <View style={styles.tripTypeContainer}>
        <Pressable
          style={[styles.tripTypeButton, tripType === 'one-way' && styles.tripTypeButtonActive]}
          onPress={() => setTripType('one-way')}
        >
          <Ionicons name="arrow-forward" size={20} color={tripType === 'one-way' ? colors.background.primary : colors.brand.orange} />
          <Text style={[styles.tripTypeText, tripType === 'one-way' && styles.tripTypeTextActive]}>
            One Way
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tripTypeButton, tripType === 'round-trip' && styles.tripTypeButtonActive]}
          onPress={() => setTripType('round-trip')}
        >
          <Ionicons name="swap-horizontal" size={20} color={tripType === 'round-trip' ? colors.background.primary : colors.brand.orange} />
          <Text style={[styles.tripTypeText, tripType === 'round-trip' && styles.tripTypeTextActive]}>
            Round Trip
          </Text>
        </Pressable>
      </View>

      {/* Travel Date */}
      <View style={styles.dateSection}>
        <Text style={styles.label}>Travel Date</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowTravelDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.brand.orange} />
          <Text style={styles.dateText}>
            {travelDate.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </Pressable>
        {showTravelDatePicker && (
          <DateTimePicker
            value={travelDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowTravelDatePicker(Platform.OS === 'ios');
              if (date) setTravelDate(date);
            }}
          />
        )}
      </View>

      {/* Return Date (if round-trip) */}
      {tripType === 'round-trip' && (
        <View style={styles.dateSection}>
          <Text style={styles.label}>Return Date</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowReturnDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color={colors.brand.orange} />
            <Text style={styles.dateText}>
              {returnDate.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          </Pressable>
          {showReturnDatePicker && (
            <DateTimePicker
              value={returnDate}
              mode="date"
              display="default"
              minimumDate={travelDate}
              onChange={(event, date) => {
                setShowReturnDatePicker(Platform.OS === 'ios');
                if (date) setReturnDate(date);
              }}
            />
          )}
        </View>
      )}

      {/* Passengers */}
      <View style={styles.counterSection}>
        <Text style={styles.label}>Adults</Text>
        <View style={styles.counter}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(Math.max(1, adults - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.brand.orange} />
          </Pressable>
          <Text style={styles.counterValue}>{adults}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(adults + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.orange} />
          </Pressable>
        </View>
      </View>

      <View style={styles.counterSection}>
        <Text style={styles.label}>Children (5-12 years)</Text>
        <View style={styles.counter}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(Math.max(0, children - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.brand.orange} />
          </Pressable>
          <Text style={styles.counterValue}>{children}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(children + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.orange} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Bus Class</Text>
      
      {(['seater', 'sleeper', 'semiSleeper', 'ac'] as const).map((type) => {
        const busClassOption = bus.classOptions[type];
        if (!busClassOption.available) return null;
        
        const isSelected = busClass === type;
        const classNames: Record<string, string> = {
          seater: 'Seater',
          sleeper: 'Sleeper',
          semiSleeper: 'Semi Sleeper',
          ac: 'AC Sleeper',
        };

        return (
          <Pressable
            key={type}
            style={[styles.classCard, isSelected && styles.classCardSelected]}
            onPress={() => setBusClass(type)}
          >
            <View style={styles.classCardHeader}>
              <View style={styles.classIcon}>
                <Ionicons name="bus" size={28} color={isSelected ? colors.background.primary : colors.brand.orange} />
              </View>
              <View style={styles.classInfo}>
                <Text style={[styles.classTypeName, isSelected && styles.classTypeNameSelected]}>
                  {classNames[type]}
                </Text>
                <Text style={[styles.classDescription, isSelected && styles.classDescriptionSelected]}>
                  {type === 'seater' && 'Comfortable seats'}
                  {type === 'sleeper' && 'Full sleeper berths'}
                  {type === 'semiSleeper' && 'Semi-sleeper seats'}
                  {type === 'ac' && 'AC with sleeper berths'}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={colors.background.primary} />
              )}
            </View>
            <View style={styles.classPrice}>
              <Text style={[styles.classPriceLabel, isSelected && styles.classPriceLabelSelected]}>
                Price
              </Text>
              <Text style={[styles.classPriceValue, isSelected && styles.classPriceValueSelected]}>
                {currencySymbol}{busClassOption.price.toLocaleString(locale)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderStep3 = () => {
    const extras = [
      { key: 'meals', label: 'Meals', price: 150, selected: meals, onToggle: setMeals },
      { key: 'insurance', label: 'Travel Insurance', price: 100, selected: insurance, onToggle: setInsurance },
      { key: 'cancellation', label: 'Free Cancellation', price: 50, selected: cancellation, onToggle: setCancellation },
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
            <Text style={styles.priceLabel}>
              {busClass.toUpperCase()} ({totalPassengers} {totalPassengers === 1 ? 'passenger' : 'passengers'})
            </Text>
            <Text style={styles.priceValue}>
              {currencySymbol}{(bus.classOptions[busClass].price * adults + bus.classOptions[busClass].price * 0.5 * children).toLocaleString(locale)}
            </Text>
          </View>
          {tripType === 'round-trip' && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Return Trip</Text>
              <Text style={styles.priceValue}>
                {currencySymbol}{(bus.classOptions[busClass].price * adults + bus.classOptions[busClass].price * 0.5 * children).toLocaleString(locale)}
              </Text>
            </View>
          )}
          {extras.filter(e => e.selected).map((extra) => (
            <View key={extra.key} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{extra.label}</Text>
              <Text style={styles.priceValue}>+ {currencySymbol}{(extra.price * totalPassengers).toLocaleString(locale)}</Text>
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
      <Text style={styles.stepTitle}>Contact & Passenger Details</Text>
      
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

      {/* Passenger Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Passenger Details</Text>
        {passengerDetails.map((passenger, index) => (
          <View key={index} style={styles.passengerCard}>
            <Text style={styles.passengerNumber}>Passenger {index + 1}</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={passenger.firstName}
              onChangeText={(text) => {
                const updated = [...passengerDetails];
                updated[index].firstName = text;
                setPassengerDetails(updated);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={passenger.lastName}
              onChangeText={(text) => {
                const updated = [...passengerDetails];
                updated[index].lastName = text;
                setPassengerDetails(updated);
              }}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Age"
                value={passenger.age > 0 ? passenger.age.toString() : ''}
                onChangeText={(text) => {
                  const updated = [...passengerDetails];
                  updated[index].age = parseInt(text) || 0;
                  setPassengerDetails(updated);
                }}
                keyboardType="number-pad"
              />
              <View style={[styles.input, styles.halfInput, styles.genderContainer]}>
                <Pressable
                  style={[styles.genderButton, passenger.gender === 'male' && styles.genderButtonActive]}
                  onPress={() => {
                    const updated = [...passengerDetails];
                    updated[index].gender = 'male';
                    setPassengerDetails(updated);
                  }}
                >
                  <Text style={[styles.genderText, passenger.gender === 'male' && styles.genderTextActive]}>Male</Text>
                </Pressable>
                <Pressable
                  style={[styles.genderButton, passenger.gender === 'female' && styles.genderButtonActive]}
                  onPress={() => {
                    const updated = [...passengerDetails];
                    updated[index].gender = 'female';
                    setPassengerDetails(updated);
                  }}
                >
                  <Text style={[styles.genderText, passenger.gender === 'female' && styles.genderTextActive]}>Female</Text>
                </Pressable>
              </View>
            </View>
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
        <Text style={styles.headerTitle}>Book Bus</Text>
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
              colors={[colors.brand.orange, colors.brand.orangeDark]}
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
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
    backgroundColor: colors.brand.orange,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[400],
  },
  progressStepTextActive: {
    color: colors.background.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.neutral[200],
  },
  progressLineActive: {
    backgroundColor: colors.brand.orange,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: 24,
  },
  tripTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  tripTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brand.orange,
    backgroundColor: colors.background.primary,
  },
  tripTypeButtonActive: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  tripTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.orange,
  },
  tripTypeTextActive: {
    color: colors.background.primary,
  },
  dateSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
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
    color: colors.neutral[900],
    fontWeight: '500',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.brand.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    minWidth: 40,
    textAlign: 'center',
  },
  classCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    marginBottom: 16,
  },
  classCardSelected: {
    borderColor: colors.brand.orange,
    backgroundColor: colors.brand.orange,
  },
  classCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  classIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.tint.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
  },
  classTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  classTypeNameSelected: {
    color: colors.background.primary,
  },
  classDescription: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  classDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  classPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  classPriceLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  classPriceLabelSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  classPriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brand.orange,
  },
  classPriceValueSelected: {
    color: colors.background.primary,
  },
  extraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    marginBottom: 12,
  },
  extraCardSelected: {
    borderColor: colors.brand.orange,
    backgroundColor: colors.tint.amberLight,
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
    color: colors.brand.orange,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  priceSummary: {
    marginTop: 24,
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  priceTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.neutral[200],
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.brand.orange,
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
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
    marginBottom: 0,
  },
  genderContainer: {
    flexDirection: 'row',
    padding: 0,
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  genderTextActive: {
    color: colors.background.primary,
  },
  passengerCard: {
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    marginBottom: 12,
  },
  passengerNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.orange,
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
    color: colors.brand.orange,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  nextButtonText: {
    color: colors.background.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});

export default React.memo(BusBookingFlow);

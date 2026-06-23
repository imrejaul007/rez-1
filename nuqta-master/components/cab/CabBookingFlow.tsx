// @ts-nocheck
/**
 * Cab Booking Flow - Multi-step booking process
 * Steps: 1. Pickup/Dropoff & Date, 2. Vehicle Selection, 3. Extras, 4. Contact & Passenger Details
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
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import serviceBookingApi from '@/services/serviceBookingApi';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CabDetails {
  id: string;
  name: string;
  price: number;
  pricePerKm?: number;
  duration?: number; // in minutes
  vehicleOptions: {
    sedan: { price: number; available: boolean };
    suv: { price: number; available: boolean };
    premium: { price: number; available: boolean };
  };
}

interface BookingData {
  pickupDate: Date;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  tripType: 'one-way' | 'round-trip';
  passengers: {
    adults: number;
    children: number;
  };
  vehicleType: 'sedan' | 'suv' | 'premium';
  selectedExtras: {
    driver?: boolean;
    tollCharges?: boolean;
    parking?: boolean;
    waitingTime?: boolean;
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
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

interface CabBookingFlowProps {
  cab: CabDetails;
  onComplete: (data: BookingData) => void;
  onClose: () => void;
}

const CabBookingFlow: React.FC<CabBookingFlowProps> = ({
  cab,
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
  
  // Step 1: Pickup/Dropoff & Date
  const [pickupDate, setPickupDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickupTime, setPickupTime] = useState('09:00');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Step 2: Vehicle Selection
  const [vehicleType, setVehicleType] = useState<'sedan' | 'suv' | 'premium'>('sedan');

  // Step 3: Extras
  const [driver, setDriver] = useState(true); // Default included
  const [tollCharges, setTollCharges] = useState(false);
  const [parking, setParking] = useState(false);
  const [waitingTime, setWaitingTime] = useState(false);

  // Step 4: Contact & Passenger Details
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [passengerDetails, setPassengerDetails] = useState<Array<{
    firstName: string;
    lastName: string;
    age: number;
  }>>([]);

  const totalSteps = 4;
  const totalPassengers = adults + children;

  const calculateTotalPrice = () => {
    const basePrice = cab.vehicleOptions[vehicleType].price;
    let total = basePrice;
    
    // Add return trip if round-trip
    if (tripType === 'round-trip') {
      total = total * 2;
    }
    
    // Add extras
    if (tollCharges) total += 500;
    if (parking) total += 200;
    if (waitingTime) total += 300;
    
    return total;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!pickupLocation.trim() || !dropoffLocation.trim()) {
        platformAlertSimple('Missing Information', 'Please enter pickup and dropoff locations');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
      // Initialize passenger details
      setPassengerDetails(Array.from({ length: totalPassengers }, () => ({
        firstName: '',
        lastName: '',
        age: 0,
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
        pickupDate,
        pickupTime,
        pickupLocation,
        dropoffLocation,
        tripType,
        passengers: { adults, children },
        vehicleType,
        selectedExtras: {
          driver,
          tollCharges,
          parking,
          waitingTime,
        },
        contactInfo: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
        },
        passengerDetails,
      };

      // Calculate time slot - use cab duration if available, otherwise default to 60 minutes
      const [hours, mins] = pickupTime.split(':').map(Number);
      const tripDuration = (cab.duration && typeof cab.duration === 'number' && cab.duration > 0) 
        ? cab.duration 
        : 60; // Default to 60 minutes if not available
      const endHour = (hours + Math.floor(tripDuration / 60)) % 24;
      const endMin = (mins + (tripDuration % 60)) % 60;
      
      const formatTime = (h: number, m: number) => {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      const bookingDateStr = pickupDate.toISOString().split('T')[0];
      const customerNotes = JSON.stringify({
        tripType,
        pickupLocation,
        dropoffLocation,
        pickupTime,
        passengers: bookingData.passengers,
        vehicleType,
        selectedExtras: bookingData.selectedExtras,
        passengerDetails: bookingData.passengerDetails,
        contactInfo: bookingData.contactInfo,
        totalPrice: calculateTotalPrice(),
      });

      const response = await serviceBookingApi.createBooking({
        serviceId: cab.id,
        bookingDate: bookingDateStr,
        timeSlot: {
          start: formatTime(hours, mins),
          end: formatTime(endHour, endMin),
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
      <Text style={styles.stepTitle}>Pickup & Dropoff Details</Text>
      
      {/* Trip Type */}
      <View style={styles.tripTypeContainer}>
        <Pressable
          style={[styles.tripTypeButton, tripType === 'one-way' && styles.tripTypeButtonActive]}
          onPress={() => setTripType('one-way')}
        >
          <Ionicons name="arrow-forward" size={20} color={tripType === 'one-way' ? colors.background.primary : colors.brand.amber} />
          <Text style={[styles.tripTypeText, tripType === 'one-way' && styles.tripTypeTextActive]}>
            One Way
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tripTypeButton, tripType === 'round-trip' && styles.tripTypeButtonActive]}
          onPress={() => setTripType('round-trip')}
        >
          <Ionicons name="swap-horizontal" size={20} color={tripType === 'round-trip' ? colors.background.primary : colors.brand.amber} />
          <Text style={[styles.tripTypeText, tripType === 'round-trip' && styles.tripTypeTextActive]}>
            Round Trip
          </Text>
        </Pressable>
      </View>

      {/* Pickup Location */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Pickup Location</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="location" size={20} color={colors.brand.amber} />
          <TextInput
            style={styles.input}
            placeholder="Enter pickup address"
            value={pickupLocation}
            onChangeText={setPickupLocation}
          />
        </View>
      </View>

      {/* Dropoff Location */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Dropoff Location</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="flag" size={20} color={colors.brand.amber} />
          <TextInput
            style={styles.input}
            placeholder="Enter dropoff address"
            value={dropoffLocation}
            onChangeText={setDropoffLocation}
          />
        </View>
      </View>

      {/* Pickup Date */}
      <View style={styles.dateSection}>
        <Text style={styles.label}>Pickup Date</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.brand.amber} />
          <Text style={styles.dateText}>
            {pickupDate.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={pickupDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setPickupDate(date);
            }}
          />
        )}
      </View>

      {/* Pickup Time */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Pickup Time</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="time" size={20} color={colors.brand.amber} />
          <TextInput
            style={styles.input}
            placeholder="09:00"
            value={pickupTime}
            onChangeText={setPickupTime}
          />
        </View>
      </View>

      {/* Passengers */}
      <View style={styles.counterSection}>
        <Text style={styles.label}>Adults</Text>
        <View style={styles.counter}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(Math.max(1, adults - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.brand.amber} />
          </Pressable>
          <Text style={styles.counterValue}>{adults}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(adults + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.amber} />
          </Pressable>
        </View>
      </View>

      <View style={styles.counterSection}>
        <Text style={styles.label}>Children</Text>
        <View style={styles.counter}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(Math.max(0, children - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.brand.amber} />
          </Pressable>
          <Text style={styles.counterValue}>{children}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(children + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.amber} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Vehicle Type</Text>
      
      {(['sedan', 'suv', 'premium'] as const).map((type) => {
        const vehicle = cab.vehicleOptions[type];
        if (!vehicle.available) return null;
        
        const isSelected = vehicleType === type;

        return (
          <Pressable
            key={type}
            style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
            onPress={() => setVehicleType(type)}
          >
            <View style={styles.vehicleCardHeader}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car" size={28} color={isSelected ? colors.background.primary : colors.brand.amber} />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={[styles.vehicleTypeName, isSelected && styles.vehicleTypeNameSelected]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
                <Text style={[styles.vehicleDescription, isSelected && styles.vehicleDescriptionSelected]}>
                  {type === 'sedan' && 'Comfortable 4-seater'}
                  {type === 'suv' && 'Spacious 6-seater'}
                  {type === 'premium' && 'Luxury sedan'}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={colors.background.primary} />
              )}
            </View>
            <View style={styles.vehiclePrice}>
              <Text style={[styles.vehiclePriceLabel, isSelected && styles.vehiclePriceLabelSelected]}>
                Price
              </Text>
              <Text style={[styles.vehiclePriceValue, isSelected && styles.vehiclePriceValueSelected]}>
                {currencySymbol}{vehicle.price.toLocaleString(locale)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderStep3 = () => {
    const extras = [
      { key: 'tollCharges', label: 'Toll Charges', price: 500, selected: tollCharges, onToggle: setTollCharges },
      { key: 'parking', label: 'Parking', price: 200, selected: parking, onToggle: setParking },
      { key: 'waitingTime', label: 'Waiting Time (1 hour)', price: 300, selected: waitingTime, onToggle: setWaitingTime },
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
              {vehicleType.toUpperCase()} ({totalPassengers} {totalPassengers === 1 ? 'passenger' : 'passengers'})
            </Text>
            <Text style={styles.priceValue}>
              {currencySymbol}{cab.vehicleOptions[vehicleType].price.toLocaleString(locale)}
            </Text>
          </View>
          {tripType === 'round-trip' && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Return Trip</Text>
              <Text style={styles.priceValue}>
                {currencySymbol}{cab.vehicleOptions[vehicleType].price.toLocaleString(locale)}
              </Text>
            </View>
          )}
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
            <TextInput
              style={styles.input}
              placeholder="Age"
              value={passenger.age > 0 ? passenger.age.toString() : ''}
              onChangeText={(text) => {
                const updated = [...passengerDetails];
                updated[index].age = parseInt(text) || 0;
                setPassengerDetails(updated);
              }}
              keyboardType="number-pad"
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
        <Text style={styles.headerTitle}>Book Cab</Text>
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
              colors={[colors.brand.amber, '#CA8A04']}
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
    backgroundColor: colors.brand.amber,
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
    backgroundColor: colors.brand.amber,
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
    borderColor: colors.brand.amber,
    backgroundColor: colors.background.primary,
  },
  tripTypeButtonActive: {
    backgroundColor: colors.brand.amber,
    borderColor: colors.brand.amber,
  },
  tripTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.amber,
  },
  tripTypeTextActive: {
    color: colors.background.primary,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[900],
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
    borderColor: colors.brand.amber,
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
  vehicleCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    marginBottom: 16,
  },
  vehicleCardSelected: {
    borderColor: colors.brand.amber,
    backgroundColor: colors.brand.amber,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  vehicleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.tint.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  vehicleTypeNameSelected: {
    color: colors.background.primary,
  },
  vehicleDescription: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  vehicleDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  vehiclePrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  vehiclePriceLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  vehiclePriceLabelSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  vehiclePriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brand.amber,
  },
  vehiclePriceValueSelected: {
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
    borderColor: colors.brand.amber,
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
    color: colors.brand.amber,
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
    backgroundColor: colors.brand.amber,
    borderColor: colors.brand.amber,
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
    color: colors.brand.amber,
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
  passengerCard: {
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    marginBottom: 12,
  },
  passengerNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.amber,
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
    color: colors.brand.amber,
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

export default React.memo(CabBookingFlow);

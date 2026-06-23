// @ts-nocheck
/**
 * Flight Booking Flow - Multi-step booking process
 * Steps: 1. Trip Selection, 2. Passengers, 3. Extras, 4. Review & Payment
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

interface FlightDetails {
  id: string;
  name: string;
  route: {
    from: string;
    to: string;
    fromCode: string;
    toCode: string;
  };
  price: number;
  classOptions: {
    economy: { price: number; available: boolean };
    business: { price: number; available: boolean };
    first: { price: number; available: boolean };
  };
}

interface BookingData {
  departureDate: Date;
  returnDate?: Date;
  tripType: 'one-way' | 'round-trip';
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  flightClass: 'economy' | 'business' | 'first';
  selectedExtras: {
    baggage?: string;
    meals?: string[];
    seatSelection?: boolean;
    specialAssistance?: string;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  passengerDetails: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    passportNumber?: string;
    nationality?: string;
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

interface FlightBookingFlowProps {
  flight: FlightDetails;
  onComplete: (data: BookingData) => void;
  onClose: () => void;
}

const FlightBookingFlow: React.FC<FlightBookingFlowProps> = ({
  flight,
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
  
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [departureDate, setDepartureDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [flightClass, setFlightClass] = useState<'economy' | 'business' | 'first'>('economy');

  const [selectedBaggage, setSelectedBaggage] = useState<string>('standard');
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [seatSelection, setSeatSelection] = useState(false);
  const [specialAssistance, setSpecialAssistance] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [passengerDetails, setPassengerDetails] = useState<BookingData['passengerDetails']>([]);

  const totalSteps = 4;
  const totalPassengers = adults + children + infants;

  // Calculate price
  const getBasePrice = () => {
    return flight.classOptions[flightClass].price;
  };

  const getTotalPrice = () => {
    const basePrice = getBasePrice();
    const total = basePrice * adults + basePrice * 0.75 * children + basePrice * 0.1 * infants;
    
    // Add return trip if round-trip
    if (tripType === 'round-trip') {
      return total * 2;
    }
    
    return total;
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      // Validate current step
      if (currentStep === 1) {
        if (tripType === 'round-trip' && returnDate <= departureDate) {
          platformAlertSimple('Invalid Date', 'Return date must be after departure date');
          return;
        }
      } else if (currentStep === 2) {
        if (totalPassengers === 0) {
          platformAlertSimple('Invalid Selection', 'Please select at least one passenger');
          return;
        }
      } else if (currentStep === 3) {
        // Validate contact info
        if (!contactName || !contactEmail || !contactPhone) {
          platformAlertSimple('Missing Information', 'Please fill in all contact details');
          return;
        }
        if (!contactEmail.includes('@')) {
          platformAlertSimple('Invalid Email', 'Please enter a valid email address');
          return;
        }
        // Initialize passenger details
        const details: BookingData['passengerDetails'] = [];
        for (let i = 0; i < adults; i++) {
          details.push({
            firstName: '',
            lastName: '',
            dateOfBirth: new Date(),
            gender: 'male',
          });
        }
        for (let i = 0; i < children; i++) {
          details.push({
            firstName: '',
            lastName: '',
            dateOfBirth: new Date(),
            gender: 'male',
          });
        }
        for (let i = 0; i < infants; i++) {
          details.push({
            firstName: '',
            lastName: '',
            dateOfBirth: new Date(),
            gender: 'male',
          });
        }
        setPassengerDetails(details);
      }
      setCurrentStep(currentStep + 1);
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
    // Validate passenger details
    for (let i = 0; i < passengerDetails.length; i++) {
      const passenger = passengerDetails[i];
      if (!passenger.firstName || !passenger.lastName) {
        platformAlertSimple('Missing Information', `Please fill in details for passenger ${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const bookingData: BookingData = {
        departureDate,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
        tripType,
        passengers: { adults, children, infants },
        flightClass,
        selectedExtras: {
          baggage: selectedBaggage,
          meals: selectedMeals,
          seatSelection,
          specialAssistance: specialAssistance || undefined,
        },
        contactInfo: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
        },
        passengerDetails,
      };

      // Calculate time slot based on flight departure time (default 09:00)
      const departureHour = 9;
      const departureMin = 0;
      const duration = 120; // 2 hours default
      const arrivalHour = (departureHour + Math.floor(duration / 60)) % 24;
      const arrivalMin = (departureMin + (duration % 60)) % 60;
      
      const formatTime = (hours: number, mins: number) => {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };

      // Format booking date as YYYY-MM-DD
      const bookingDateStr = departureDate.toISOString().split('T')[0];

      // Prepare customer notes with all booking details
      const customerNotes = JSON.stringify({
        tripType,
        returnDate: bookingData.returnDate?.toISOString().split('T')[0],
        passengers: bookingData.passengers,
        flightClass,
        selectedExtras: bookingData.selectedExtras,
        passengerDetails,
        contactInfo: bookingData.contactInfo,
        totalPrice: getTotalPrice(),
      });

      // Call booking API with correct format matching backend
      const response = await serviceBookingApi.createBooking({
        serviceId: flight.id,
        bookingDate: bookingDateStr, // YYYY-MM-DD format
        timeSlot: {
          start: formatTime(departureHour, departureMin),
          end: formatTime(arrivalHour, arrivalMin),
        },
        serviceType: 'online', // Flights are online bookings
        customerNotes, // All additional info goes here (backend gets customer info from req.user)
        paymentMethod: 'online', // Default payment method
      });

      if (response.success && response.data) {
        // Add booking ID and number from API response
        const bookingResponse: BookingData = {
          ...bookingData,
          bookingId: response.data._id || response.data.id,
          bookingNumber: response.data.bookingNumber,
        };
        // Pass payment requirement info for travel bookings
        (bookingResponse as any).requiresPayment = response.requiresPayment || response.data?.requiresPaymentUpfront;
        (bookingResponse as any).totalAmount = getTotalPrice();
        onComplete(bookingResponse);
      } else {
        platformAlertSimple('Booking Failed', response.error || 'Failed to create booking');
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to create booking');
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.stepContainer}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= step && styles.stepCircleActive,
              ]}
            >
              {currentStep > step ? (
                <Ionicons name="checkmark" size={16} color={colors.background.primary} />
              ) : (
                <Text style={styles.stepNumber}>{step}</Text>
              )}
            </View>
            {step < totalSteps && (
              <View
                style={[
                  styles.stepLine,
                  currentStep > step && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Your Trip</Text>
      
      {/* Trip Type */}
      <View style={styles.tripTypeContainer}>
        <Pressable
          style={[styles.tripTypeButton, tripType === 'one-way' && styles.tripTypeButtonActive]}
          onPress={() => setTripType('one-way')}
        >
          <Ionicons
            name="airplane-outline"
            size={24}
            color={tripType === 'one-way' ? colors.infoScale[400] : colors.neutral[500]}
          />
          <Text style={[styles.tripTypeText, tripType === 'one-way' && styles.tripTypeTextActive]}>
            One Way
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tripTypeButton, tripType === 'round-trip' && styles.tripTypeButtonActive]}
          onPress={() => setTripType('round-trip')}
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={24}
            color={tripType === 'round-trip' ? colors.infoScale[400] : colors.neutral[500]}
          />
          <Text style={[styles.tripTypeText, tripType === 'round-trip' && styles.tripTypeTextActive]}>
            Round Trip
          </Text>
        </Pressable>
      </View>

      {/* Route Display */}
      <View style={styles.routeCard}>
        <View style={styles.routeItem}>
          <View style={styles.routeCode}>
            <Text style={styles.routeCodeText}>{flight.route.fromCode}</Text>
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeCity}>{flight.route.from}</Text>
            <Text style={styles.routeLabel}>Departure</Text>
          </View>
        </View>
        <Ionicons name="airplane" size={24} color={colors.infoScale[400]} />
        <View style={styles.routeItem}>
          <View style={styles.routeCode}>
            <Text style={styles.routeCodeText}>{flight.route.toCode}</Text>
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeCity}>{flight.route.to}</Text>
            <Text style={styles.routeLabel}>Arrival</Text>
          </View>
        </View>
      </View>

      {/* Date Selection */}
      <View style={styles.dateSection}>
        <Text style={styles.sectionLabel}>Departure Date</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowDeparturePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.neutral[500]} />
          <Text style={styles.dateText}>
            {departureDate.toLocaleDateString(locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </Pressable>
        {showDeparturePicker && (
          <DateTimePicker
            value={departureDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDeparturePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setDepartureDate(selectedDate);
              }
            }}
          />
        )}
      </View>

      {tripType === 'round-trip' && (
        <View style={styles.dateSection}>
          <Text style={styles.sectionLabel}>Return Date</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowReturnPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.neutral[500]} />
            <Text style={styles.dateText}>
              {returnDate.toLocaleDateString(locale, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </Pressable>
          {showReturnPicker && (
            <DateTimePicker
              value={returnDate}
              mode="date"
              display="default"
              minimumDate={new Date(departureDate.getTime() + 24 * 60 * 60 * 1000)}
              onChange={(event, selectedDate) => {
                setShowReturnPicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setReturnDate(selectedDate);
                }
              }}
            />
          )}
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Passengers & Class</Text>

      {/* Passenger Selection */}
      <View style={styles.passengerSection}>
        <Text style={styles.sectionLabel}>Adults (12+ years)</Text>
        <View style={styles.counterContainer}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(Math.max(1, adults - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.infoScale[400]} />
          </Pressable>
          <Text style={styles.counterValue}>{adults}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(Math.min(9, adults + 1))}
          >
            <Ionicons name="add" size={20} color={colors.infoScale[400]} />
          </Pressable>
        </View>
      </View>

      <View style={styles.passengerSection}>
        <Text style={styles.sectionLabel}>Children (2-11 years)</Text>
        <View style={styles.counterContainer}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(Math.max(0, children - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.infoScale[400]} />
          </Pressable>
          <Text style={styles.counterValue}>{children}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(Math.min(9, children + 1))}
          >
            <Ionicons name="add" size={20} color={colors.infoScale[400]} />
          </Pressable>
        </View>
      </View>

      <View style={styles.passengerSection}>
        <Text style={styles.sectionLabel}>Infants (Under 2 years)</Text>
        <View style={styles.counterContainer}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setInfants(Math.max(0, infants - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.infoScale[400]} />
          </Pressable>
          <Text style={styles.counterValue}>{infants}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setInfants(Math.min(adults, infants + 1))}
          >
            <Ionicons name="add" size={20} color={colors.infoScale[400]} />
          </Pressable>
        </View>
        {infants > 0 && (
          <Text style={styles.infoText}>
            Infants must be accompanied by an adult
          </Text>
        )}
      </View>

      {/* Flight Class */}
      <View style={styles.classSection}>
        <Text style={styles.sectionLabel}>Flight Class</Text>
        {(['economy', 'business', 'first'] as const).map((cls) => (
          <Pressable
            key={cls}
            style={[
              styles.classOption,
              flightClass === cls && styles.classOptionActive,
            ]}
            onPress={() => setFlightClass(cls)}
          >
            <View style={styles.classOptionContent}>
              <Text style={[styles.className, flightClass === cls && styles.classNameActive]}>
                {cls.charAt(0).toUpperCase() + cls.slice(1)}
              </Text>
              <Text style={styles.classPrice}>
                {currencySymbol}{flight.classOptions[cls].price}
              </Text>
            </View>
            {flightClass === cls && (
              <Ionicons name="checkmark-circle" size={24} color={colors.infoScale[400]} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Contact Information</Text>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={contactName}
          onChangeText={setContactName}
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your.email@example.com"
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+91 9876543210"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />
      </View>

      {/* Extras */}
      <View style={styles.extrasSection}>
        <Text style={styles.sectionLabel}>Add-ons (Optional)</Text>

        <View style={styles.extraItem}>
          <Text style={styles.extraLabel}>Extra Baggage</Text>
          <View style={styles.extraOptions}>
            {['standard', '15kg', '20kg', '30kg'].map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.extraOption,
                  selectedBaggage === option && styles.extraOptionActive,
                ]}
                onPress={() => setSelectedBaggage(option)}
              >
                <Text
                  style={[
                    styles.extraOptionText,
                    selectedBaggage === option && styles.extraOptionTextActive,
                  ]}
                >
                  {option === 'standard' ? 'Standard' : option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.extraItem}>
          <Text style={styles.extraLabel}>Meals</Text>
          {['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Special Meal'].map((meal) => (
            <Pressable
              key={meal}
              style={styles.checkboxOption}
              onPress={() => {
                if (selectedMeals.includes(meal)) {
                  setSelectedMeals(selectedMeals.filter((m) => m !== meal));
                } else {
                  setSelectedMeals([...selectedMeals, meal]);
                }
              }}
            >
              <Ionicons
                name={selectedMeals.includes(meal) ? 'checkbox' : 'checkbox-outline'}
                size={24}
                color={selectedMeals.includes(meal) ? colors.infoScale[400] : colors.neutral[400]}
              />
              <Text style={styles.checkboxLabel}>{meal}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.extraItem}>
          <Pressable
            style={styles.checkboxOption}
            onPress={() => setSeatSelection(!seatSelection)}
          >
            <Ionicons
              name={seatSelection ? 'checkbox' : 'checkbox-outline'}
              size={24}
              color={seatSelection ? colors.infoScale[400] : colors.neutral[400]}
            />
            <Text style={styles.checkboxLabel}>Seat Selection ({currencySymbol}500)</Text>
          </Pressable>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Special Assistance (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Wheelchair, medical assistance, etc."
            value={specialAssistance}
            onChangeText={setSpecialAssistance}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Passenger Details</Text>
      <Text style={styles.stepSubtitle}>
        Please provide details for all {totalPassengers} passenger(s)
      </Text>

      <ScrollView style={styles.passengerDetailsList}>
        {passengerDetails.map((passenger, index) => (
          <View key={index} style={styles.passengerDetailCard}>
            <Text style={styles.passengerNumber}>
              Passenger {index + 1}
              {index < adults && ' (Adult)'}
              {index >= adults && index < adults + children && ' (Child)'}
              {index >= adults + children && ' (Infant)'}
            </Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputSection, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First name"
                  value={passenger.firstName}
                  onChangeText={(text) => {
                    const updated = [...passengerDetails];
                    updated[index].firstName = text;
                    setPassengerDetails(updated);
                  }}
                />
              </View>
              <View style={[styles.inputSection, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last name"
                  value={passenger.lastName}
                  onChangeText={(text) => {
                    const updated = [...passengerDetails];
                    updated[index].lastName = text;
                    setPassengerDetails(updated);
                  }}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputSection, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  value={passenger.dateOfBirth.toLocaleDateString('en-GB')}
                  editable={false}
                />
              </View>
              <View style={[styles.inputSection, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderOptions}>
                  {(['male', 'female', 'other'] as const).map((gender) => (
                    <Pressable
                      key={gender}
                      style={[
                        styles.genderOption,
                        passenger.gender === gender && styles.genderOptionActive,
                      ]}
                      onPress={() => {
                        const updated = [...passengerDetails];
                        updated[index].gender = gender;
                        setPassengerDetails(updated);
                      }}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          passenger.gender === gender && styles.genderOptionTextActive,
                        ]}
                      >
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Price Summary */}
      <View style={styles.priceSummary}>
        <Text style={styles.priceSummaryTitle}>Price Summary</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>
            {adults} Adult(s) × {currencySymbol}{getBasePrice()}
          </Text>
          <Text style={styles.priceValue}>{currencySymbol}{getBasePrice() * adults}</Text>
        </View>
        {children > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {children} Child(ren) × {currencySymbol}{Math.round(getBasePrice() * 0.75)}
            </Text>
            <Text style={styles.priceValue}>
              {currencySymbol}{Math.round(getBasePrice() * 0.75 * children)}
            </Text>
          </View>
        )}
        {infants > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {infants} Infant(s) × {currencySymbol}{Math.round(getBasePrice() * 0.1)}
            </Text>
            <Text style={styles.priceValue}>
              {currencySymbol}{Math.round(getBasePrice() * 0.1 * infants)}
            </Text>
          </View>
        )}
        {tripType === 'round-trip' && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Round Trip</Text>
            <Text style={styles.priceValue}>× 2</Text>
          </View>
        )}
        {seatSelection && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Seat Selection</Text>
            <Text style={styles.priceValue}>{currencySymbol}{500 * totalPassengers}</Text>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {currencySymbol}{getTotalPrice() + (seatSelection ? 500 * totalPassengers : 0)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>
          Step {currentStep} of {totalSteps}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {currentStep < totalSteps ? (
          <Pressable
            style={styles.nextButton}
            onPress={handleNext}
           
          >
            <LinearGradient
              colors={[colors.infoScale[400], colors.brand.blue]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={styles.nextButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
           
          >
            <LinearGradient
              colors={[colors.success, colors.brand.greenDark]}
              style={styles.nextButtonGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.background.primary} />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Confirm Booking</Text>
                  <Ionicons name="checkmark-circle" size={20} color={colors.background.primary} />
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.infoScale[400],
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.infoScale[400],
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.neutral[500],
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
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    backgroundColor: colors.background.primary,
  },
  tripTypeButtonActive: {
    borderColor: colors.infoScale[400],
    backgroundColor: colors.tint.blue,
  },
  tripTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  tripTypeTextActive: {
    color: colors.infoScale[400],
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    marginBottom: 24,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeCode: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.infoScale[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
  routeInfo: {
    flex: 1,
  },
  routeCity: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  routeLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  dateSection: {
    marginBottom: 20,
  },
  sectionLabel: {
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
  passengerSection: {
    marginBottom: 20,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.infoScale[400],
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
  infoText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 4,
    fontStyle: 'italic',
  },
  classSection: {
    marginTop: 8,
  },
  classOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.background.primary,
  },
  classOptionActive: {
    borderColor: colors.infoScale[400],
    backgroundColor: colors.tint.blue,
  },
  classOptionContent: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  classNameActive: {
    color: colors.infoScale[400],
  },
  classPrice: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 4,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  input: {
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    fontSize: 16,
    color: colors.neutral[900],
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  extrasSection: {
    marginTop: 24,
  },
  extraItem: {
    marginBottom: 20,
  },
  extraLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 12,
  },
  extraOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extraOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 8,
    backgroundColor: colors.background.primary,
  },
  extraOptionActive: {
    borderColor: colors.infoScale[400],
    backgroundColor: colors.tint.blue,
  },
  extraOptionText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  extraOptionTextActive: {
    color: colors.infoScale[400],
    fontWeight: '600',
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.neutral[900],
  },
  passengerDetailsList: {
    maxHeight: 400,
  },
  passengerDetailCard: {
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    marginBottom: 16,
  },
  passengerNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  genderOptionActive: {
    borderColor: colors.infoScale[400],
    backgroundColor: colors.tint.blue,
  },
  genderOptionText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  genderOptionTextActive: {
    color: colors.infoScale[400],
    fontWeight: '600',
  },
  priceSummary: {
    marginTop: 24,
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  priceSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 16,
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
  totalRow: {
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
    fontWeight: '700',
    color: colors.infoScale[400],
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
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
    fontSize: 18,
    fontWeight: '700',
  },
});

export default React.memo(FlightBookingFlow);

// @ts-nocheck
/**
 * Package Booking Flow - Multi-step booking process
 * Steps: 1. Travel Dates & Travelers, 2. Accommodation, 3. Meal Plans & Add-ons, 4. Contact & Traveler Details
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

interface PackageDetails {
  id: string;
  name: string;
  price: number;
  duration?: {
    nights: number;
    days: number;
  };
  accommodationOptions: {
    standard: { price: number; available: boolean; description?: string };
    deluxe: { price: number; available: boolean; description?: string };
    luxury: { price: number; available: boolean; description?: string };
  };
}

interface BookingData {
  travelDate: Date;
  returnDate: Date;
  travelers: {
    adults: number;
    children: number;
  };
  accommodationType: 'standard' | 'deluxe' | 'luxury';
  mealPlan: 'none' | 'breakfast' | 'halfBoard' | 'fullBoard';
  selectedAddons: {
    sightseeing?: boolean;
    transfers?: boolean;
    travelInsurance?: boolean;
    guide?: boolean;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  travelerDetails: Array<{
    firstName: string;
    lastName: string;
    age: number;
    gender: 'male' | 'female' | 'other';
  }>;
  bookingId?: string;
  bookingNumber?: string;
}

interface PackageBookingFlowProps {
  package: PackageDetails;
  onComplete: (data: BookingData) => void;
  onClose: () => void;
}

const PackageBookingFlow: React.FC<PackageBookingFlowProps> = ({
  package: pkg,
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
  
  // Step 1: Travel Dates & Travelers
  const [travelDate, setTravelDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000));
  const [showTravelDatePicker, setShowTravelDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Step 2: Accommodation
  const [accommodationType, setAccommodationType] = useState<'standard' | 'deluxe' | 'luxury'>('standard');

  // Step 3: Meal Plans & Add-ons
  const [mealPlan, setMealPlan] = useState<'none' | 'breakfast' | 'halfBoard' | 'fullBoard'>('breakfast');
  const [sightseeing, setSightseeing] = useState(true); // Usually included
  const [transfers, setTransfers] = useState(false);
  const [travelInsurance, setTravelInsurance] = useState(false);
  const [guide, setGuide] = useState(false);

  // Step 4: Contact & Traveler Details
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [travelerDetails, setTravelerDetails] = useState<Array<{
    firstName: string;
    lastName: string;
    age: number;
    gender: 'male' | 'female' | 'other';
  }>>([]);

  const totalSteps = 4;
  const totalTravelers = adults + children;

  const calculateNights = () => {
    const diffTime = returnDate.getTime() - travelDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : pkg.duration?.nights || 3;
  };

  const calculateTotalPrice = () => {
    const nights = calculateNights();
    const basePrice = pkg.accommodationOptions[accommodationType].price;
    let total = basePrice * totalTravelers;
    
    // Meal plan pricing
    const mealPrices: Record<string, number> = {
      none: 0,
      breakfast: 500 * nights * totalTravelers,
      halfBoard: 1500 * nights * totalTravelers,
      fullBoard: 2500 * nights * totalTravelers,
    };
    total += mealPrices[mealPlan];
    
    // Add-ons
    if (transfers) total += 2000;
    if (travelInsurance) total += 1000 * totalTravelers;
    if (guide) total += 3000 * nights;
    
    return total;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (returnDate <= travelDate) {
        platformAlertSimple('Invalid Dates', 'Return date must be after travel date');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
      // Initialize traveler details
      const totalTravelers = adults + children;
      setTravelerDetails(Array.from({ length: totalTravelers }, () => ({
        firstName: '',
        lastName: '',
        age: 0,
        gender: 'male',
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

    if (travelerDetails.some(t => !t.firstName.trim() || !t.lastName.trim() || t.age === 0)) {
      platformAlertSimple('Missing Information', 'Please fill in all traveler details');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData: BookingData = {
        travelDate,
        returnDate,
        travelers: { adults, children },
        accommodationType,
        mealPlan,
        selectedAddons: {
          sightseeing,
          transfers,
          travelInsurance,
          guide,
        },
        contactInfo: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
        },
        travelerDetails,
      };

      // Calculate time slot (default 10:00 AM to 6:00 PM for package start)
      const formatTime = (hours: number, mins: number) => {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };

      const bookingDateStr = travelDate.toISOString().split('T')[0];

      // Prepare customer notes with all booking details
      const customerNotes = JSON.stringify({
        travelDate: bookingData.travelDate.toISOString().split('T')[0],
        returnDate: bookingData.returnDate.toISOString().split('T')[0],
        nights: calculateNights(),
        travelers: {
          adults: bookingData.travelers.adults,
          children: bookingData.travelers.children,
        },
        accommodationType: bookingData.accommodationType,
        mealPlan: bookingData.mealPlan,
        selectedAddons: bookingData.selectedAddons,
        travelerDetails: bookingData.travelerDetails,
        contactInfo: bookingData.contactInfo,
        totalPrice: calculateTotalPrice(),
      });

      // Call booking API
      const response = await serviceBookingApi.createBooking({
        serviceId: pkg.id,
        bookingDate: bookingDateStr,
        timeSlot: {
          start: formatTime(10, 0),
          end: formatTime(18, 0),
        },
        serviceType: 'online',
        customerNotes,
        paymentMethod: 'online',
      });

      if (response.success && response.data) {
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
      <Text style={styles.stepTitle}>Travel Dates & Travelers</Text>
      
      {/* Travel Date */}
      <View style={styles.dateSection}>
        <Text style={styles.label}>Travel Date (Check-in)</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowTravelDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.brand.purpleLight} />
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

      {/* Return Date */}
      <View style={styles.dateSection}>
        <Text style={styles.label}>Return Date (Check-out)</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowReturnDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.brand.purpleLight} />
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

      {/* Nights Display */}
      <View style={styles.nightsDisplay}>
        <Ionicons name="moon" size={20} color={colors.brand.purpleLight} />
        <Text style={styles.nightsText}>
          {calculateNights()} Night{calculateNights() !== 1 ? 's' : ''} / {calculateNights() + 1} Day{calculateNights() !== 0 ? 's' : ''}
        </Text>
      </View>

      {/* Travelers */}
      <View style={styles.counterSection}>
        <Text style={styles.label}>Adults</Text>
        <View style={styles.counter}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(Math.max(1, adults - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.brand.purpleLight} />
          </Pressable>
          <Text style={styles.counterValue}>{adults}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults(adults + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.purpleLight} />
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
            <Ionicons name="remove" size={20} color={colors.brand.purpleLight} />
          </Pressable>
          <Text style={styles.counterValue}>{children}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren(children + 1)}
          >
            <Ionicons name="add" size={20} color={colors.brand.purpleLight} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Accommodation</Text>
      
      {(['standard', 'deluxe', 'luxury'] as const).map((type) => {
        const option = pkg.accommodationOptions[type];
        if (!option.available) return null;
        
        const isSelected = accommodationType === type;
        const typeNames: Record<string, string> = {
          standard: 'Standard',
          deluxe: 'Deluxe',
          luxury: 'Luxury',
        };

        return (
          <Pressable
            key={type}
            style={[styles.accommodationCard, isSelected && styles.accommodationCardSelected]}
            onPress={() => setAccommodationType(type)}
          >
            <View style={styles.accommodationCardHeader}>
              <View style={styles.accommodationIcon}>
                <Ionicons name="bed" size={28} color={isSelected ? colors.background.primary : colors.brand.purpleLight} />
              </View>
              <View style={styles.accommodationInfo}>
                <Text style={[styles.accommodationTypeName, isSelected && styles.accommodationTypeNameSelected]}>
                  {typeNames[type]}
                </Text>
                {option.description && (
                  <Text style={[styles.accommodationDescription, isSelected && styles.accommodationDescriptionSelected]}>
                    {option.description}
                  </Text>
                )}
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={colors.background.primary} />
              )}
            </View>
            <View style={styles.accommodationPrice}>
              <Text style={[styles.accommodationPriceLabel, isSelected && styles.accommodationPriceLabelSelected]}>
                Price per person
              </Text>
              <Text style={[styles.accommodationPriceValue, isSelected && styles.accommodationPriceValueSelected]}>
                {currencySymbol}{option.price.toLocaleString(locale)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderStep3 = () => {
    const mealPlans = [
      { key: 'none', label: 'No Meals', price: 0 },
      { key: 'breakfast', label: 'Breakfast Only', price: 500 },
      { key: 'halfBoard', label: 'Half Board (Breakfast + Dinner)', price: 1500 },
      { key: 'fullBoard', label: 'Full Board (All Meals)', price: 2500 },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Meal Plans & Add-ons</Text>
        
        {/* Meal Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Plan</Text>
          {mealPlans.map((plan) => {
            const isSelected = mealPlan === plan.key;
            return (
              <Pressable
                key={plan.key}
                style={[styles.mealPlanCard, isSelected && styles.mealPlanCardSelected]}
                onPress={() => setMealPlan(plan.key as any)}
              >
                <View style={styles.mealPlanInfo}>
                  <Text style={[styles.mealPlanLabel, isSelected && styles.mealPlanLabelSelected]}>
                    {plan.label}
                  </Text>
                  {plan.price > 0 && (
                    <Text style={[styles.mealPlanPrice, isSelected && styles.mealPlanPriceSelected]}>
                      + {currencySymbol}{plan.price}/night/person
                    </Text>
                  )}
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color={colors.background.primary} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Add-ons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add-ons</Text>
          <Pressable
            style={[styles.addonCard, sightseeing && styles.addonCardSelected]}
            onPress={() => setSightseeing(!sightseeing)}
          >
            <View style={styles.addonInfo}>
              <Text style={styles.addonLabel}>Sightseeing Tours</Text>
              <Text style={styles.addonDescription}>Included in package</Text>
            </View>
            <View style={[styles.checkbox, sightseeing && styles.checkboxSelected]}>
              {sightseeing && <Ionicons name="checkmark" size={16} color={colors.background.primary} />}
            </View>
          </Pressable>

          <Pressable
            style={[styles.addonCard, transfers && styles.addonCardSelected]}
            onPress={() => setTransfers(!transfers)}
          >
            <View style={styles.addonInfo}>
              <Text style={styles.addonLabel}>Airport Transfers</Text>
              <Text style={styles.addonPrice}>+ {currencySymbol}2,000</Text>
            </View>
            <View style={[styles.checkbox, transfers && styles.checkboxSelected]}>
              {transfers && <Ionicons name="checkmark" size={16} color={colors.background.primary} />}
            </View>
          </Pressable>

          <Pressable
            style={[styles.addonCard, travelInsurance && styles.addonCardSelected]}
            onPress={() => setTravelInsurance(!travelInsurance)}
          >
            <View style={styles.addonInfo}>
              <Text style={styles.addonLabel}>Travel Insurance</Text>
              <Text style={styles.addonPrice}>+ {currencySymbol}1,000/person</Text>
            </View>
            <View style={[styles.checkbox, travelInsurance && styles.checkboxSelected]}>
              {travelInsurance && <Ionicons name="checkmark" size={16} color={colors.background.primary} />}
            </View>
          </Pressable>

          <Pressable
            style={[styles.addonCard, guide && styles.addonCardSelected]}
            onPress={() => setGuide(!guide)}
          >
            <View style={styles.addonInfo}>
              <Text style={styles.addonLabel}>Professional Guide</Text>
              <Text style={styles.addonPrice}>+ {currencySymbol}3,000/day</Text>
            </View>
            <View style={[styles.checkbox, guide && styles.checkboxSelected]}>
              {guide && <Ionicons name="checkmark" size={16} color={colors.background.primary} />}
            </View>
          </Pressable>
        </View>

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {accommodationType.toUpperCase()} ({totalTravelers} {totalTravelers === 1 ? 'person' : 'people'})
            </Text>
            <Text style={styles.priceValue}>
              {currencySymbol}{(pkg.accommodationOptions[accommodationType].price * totalTravelers).toLocaleString(locale)}
            </Text>
          </View>
          {mealPlan !== 'none' && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {mealPlans.find(p => p.key === mealPlan)?.label} ({calculateNights()} nights)
              </Text>
              <Text style={styles.priceValue}>
                + {currencySymbol}{(() => {
                  const plan = mealPlans.find(p => p.key === mealPlan);
                  return plan ? (plan.price * calculateNights() * totalTravelers).toLocaleString(locale) : '0';
                })()}
              </Text>
            </View>
          )}
          {transfers && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Airport Transfers</Text>
              <Text style={styles.priceValue}>+ {currencySymbol}2,000</Text>
            </View>
          )}
          {travelInsurance && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Travel Insurance</Text>
              <Text style={styles.priceValue}>+ {currencySymbol}{(1000 * totalTravelers).toLocaleString(locale)}</Text>
            </View>
          )}
          {guide && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Professional Guide</Text>
              <Text style={styles.priceValue}>+ {currencySymbol}{(3000 * calculateNights()).toLocaleString(locale)}</Text>
            </View>
          )}
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
      <Text style={styles.stepTitle}>Contact & Traveler Details</Text>
      
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

      {/* Traveler Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Traveler Details</Text>
        {travelerDetails.map((traveler, index) => (
          <View key={index} style={styles.travelerCard}>
            <Text style={styles.travelerNumber}>Traveler {index + 1}</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={traveler.firstName}
              onChangeText={(text) => {
                const updated = [...travelerDetails];
                updated[index].firstName = text;
                setTravelerDetails(updated);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={traveler.lastName}
              onChangeText={(text) => {
                const updated = [...travelerDetails];
                updated[index].lastName = text;
                setTravelerDetails(updated);
              }}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Age"
                value={traveler.age > 0 ? traveler.age.toString() : ''}
                onChangeText={(text) => {
                  const updated = [...travelerDetails];
                  updated[index].age = parseInt(text) || 0;
                  setTravelerDetails(updated);
                }}
                keyboardType="number-pad"
              />
              <View style={[styles.input, styles.halfInput, styles.genderContainer]}>
                <Pressable
                  style={[styles.genderButton, traveler.gender === 'male' && styles.genderButtonActive]}
                  onPress={() => {
                    const updated = [...travelerDetails];
                    updated[index].gender = 'male';
                    setTravelerDetails(updated);
                  }}
                >
                  <Text style={[styles.genderText, traveler.gender === 'male' && styles.genderTextActive]}>Male</Text>
                </Pressable>
                <Pressable
                  style={[styles.genderButton, traveler.gender === 'female' && styles.genderButtonActive]}
                  onPress={() => {
                    const updated = [...travelerDetails];
                    updated[index].gender = 'female';
                    setTravelerDetails(updated);
                  }}
                >
                  <Text style={[styles.genderText, traveler.gender === 'female' && styles.genderTextActive]}>Female</Text>
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
        <Text style={styles.headerTitle}>Book Package</Text>
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
              colors={[colors.brand.purpleLight, colors.brand.purple]}
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
    backgroundColor: colors.brand.purpleLight,
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
    backgroundColor: colors.brand.purpleLight,
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
  nightsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: colors.tint.pink,
    borderRadius: 12,
    marginBottom: 20,
  },
  nightsText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purpleLight,
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
    borderColor: colors.brand.purpleLight,
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
  accommodationCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    marginBottom: 16,
  },
  accommodationCardSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.brand.purpleLight,
  },
  accommodationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  accommodationIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accommodationInfo: {
    flex: 1,
  },
  accommodationTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  accommodationTypeNameSelected: {
    color: colors.background.primary,
  },
  accommodationDescription: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  accommodationDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  accommodationPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  accommodationPriceLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  accommodationPriceLabelSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  accommodationPriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brand.purpleLight,
  },
  accommodationPriceValueSelected: {
    color: colors.background.primary,
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
  mealPlanCard: {
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
  mealPlanCardSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  mealPlanInfo: {
    flex: 1,
  },
  mealPlanLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  mealPlanLabelSelected: {
    color: colors.brand.purpleLight,
  },
  mealPlanPrice: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  mealPlanPriceSelected: {
    color: colors.brand.purple,
  },
  addonCard: {
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
  addonCardSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  addonInfo: {
    flex: 1,
  },
  addonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  addonDescription: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '500',
  },
  addonPrice: {
    fontSize: 14,
    color: colors.brand.purpleLight,
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
    backgroundColor: colors.brand.purpleLight,
    borderColor: colors.brand.purpleLight,
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
    color: colors.brand.purpleLight,
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
    backgroundColor: colors.brand.purpleLight,
    borderColor: colors.brand.purpleLight,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  genderTextActive: {
    color: colors.background.primary,
  },
  travelerCard: {
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    marginBottom: 12,
  },
  travelerNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleLight,
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
    color: colors.brand.purpleLight,
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

export default React.memo(PackageBookingFlow);

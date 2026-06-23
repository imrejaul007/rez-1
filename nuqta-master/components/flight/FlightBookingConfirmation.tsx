/**
 * Flight Booking Confirmation - Shows booking success with details
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface FlightDetails {
  id: string;
  name: string;
  route: {
    from: string;
    to: string;
    fromCode: string;
    toCode: string;
  };
  airline?: string;
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
  bookingId?: string;
  bookingNumber?: string;
}

interface FlightBookingConfirmationProps {
  flight: FlightDetails;
  bookingData: BookingData;
  onClose: () => void;
}

const FlightBookingConfirmation: React.FC<FlightBookingConfirmationProps> = ({
  flight,
  bookingData,
  onClose,
}) => {
  const router = useRouter();
  const bookingNumber = bookingData.bookingNumber || 'N/A';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your flight has been successfully booked
          </Text>
        </View>

        {/* Booking Number */}
        <View style={styles.bookingNumberCard}>
          <Text style={styles.bookingNumberLabel}>Booking Number</Text>
          <Text style={styles.bookingNumber}>{bookingNumber}</Text>
          <Text style={styles.bookingNote}>
            Please save this number for your records
          </Text>
        </View>

        {/* Flight Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Details</Text>
          
          <View style={styles.routeCard}>
            <View style={styles.routeItem}>
              <View style={styles.routeCode}>
                <Text style={styles.routeCodeText}>{flight.route.fromCode}</Text>
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeCity}>{flight.route.from}</Text>
                <Text style={styles.routeDate}>
                  {bookingData.departureDate.toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            </View>
            
            <Ionicons name="airplane" size={24} color={colors.infoScale[400]} />
            
            <View style={styles.routeItem}>
              <View style={styles.routeCode}>
                <Text style={styles.routeCodeText}>{flight.route.toCode}</Text>
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeCity}>{flight.route.to}</Text>
                <Text style={styles.routeDate}>
                  {bookingData.returnDate
                    ? bookingData.returnDate.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Same day'}
                </Text>
              </View>
            </View>
          </View>

          {bookingData.returnDate && (
            <View style={styles.returnTrip}>
              <Ionicons name="return-down-back" size={20} color={colors.neutral[500]} />
              <Text style={styles.returnTripText}>Return trip included</Text>
            </View>
          )}
        </View>

        {/* Passenger Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passengers</Text>
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerText}>
              {bookingData.passengers.adults} Adult(s)
            </Text>
            {bookingData.passengers.children > 0 && (
              <Text style={styles.passengerText}>
                {bookingData.passengers.children} Child(ren)
              </Text>
            )}
            {bookingData.passengers.infants > 0 && (
              <Text style={styles.passengerText}>
                {bookingData.passengers.infants} Infant(s)
              </Text>
            )}
            <Text style={styles.classText}>
              Class: {bookingData.flightClass.charAt(0).toUpperCase() + bookingData.flightClass.slice(1)}
            </Text>
          </View>
        </View>

        {/* Important Information */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.infoScale[400]} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>What's Next?</Text>
            <Text style={styles.infoText}>
              • You will receive a confirmation email shortly{'\n'}
              • Check-in opens 24 hours before departure{'\n'}
              • Please arrive at the airport 2 hours before departure{'\n'}
              • Keep your booking number handy for check-in
            </Text>
          </View>
        </View>

        {/* Support */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            Contact our support team at support@rez.com or call +91 1800-123-4567
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            onClose();
            router.push('/my-bookings' as any);
          }}
        >
          <Text style={styles.secondaryButtonText}>View My Bookings</Text>
        </Pressable>
        <Pressable
          style={styles.primaryButton}
          onPress={onClose}
        >
          <LinearGradient
            colors={[colors.infoScale[400], colors.brand.blue]}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </LinearGradient>
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
  scrollView: {
    flex: 1,
  },
  successHeader: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.successScale[50],
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  bookingNumberCard: {
    margin: 20,
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.infoScale[400],
    alignItems: 'center',
  },
  bookingNumberLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  bookingNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.infoScale[400],
    marginBottom: 8,
    letterSpacing: 2,
  },
  bookingNote: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  routeDate: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 4,
  },
  returnTrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.tint.blue,
    borderRadius: 8,
  },
  returnTripText: {
    fontSize: 14,
    color: colors.infoScale[400],
    fontWeight: '600',
  },
  passengerInfo: {
    gap: 8,
  },
  passengerText: {
    fontSize: 16,
    color: colors.neutral[700],
    marginBottom: 4,
  },
  classText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    margin: 20,
    padding: 20,
    backgroundColor: colors.tint.blue,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 22,
  },
  supportCard: {
    margin: 20,
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  secondaryButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default React.memo(FlightBookingConfirmation);

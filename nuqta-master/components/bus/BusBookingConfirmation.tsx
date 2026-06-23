/**
 * Bus Booking Confirmation - Displays booking success and details
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface BusDetails {
  id: string;
  name: string;
  route: {
    from: string;
    to: string;
    fromTerminal?: string;
    toTerminal?: string;
  };
  busNumber?: string;
  busType?: string;
  departureTime?: string;
  arrivalTime?: string;
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
  bookingId?: string;
  bookingNumber?: string;
}

interface BusBookingConfirmationProps {
  bus: BusDetails;
  bookingData: BookingData;
  onClose: () => void;
}

const BusBookingConfirmation: React.FC<BusBookingConfirmationProps> = ({
  bus,
  bookingData,
  onClose,
}) => {
  const router = useRouter();
  const bookingNumber = bookingData.bookingNumber || `BUS-${Date.now().toString().slice(-8)}`;
  
  const handleViewBookings = () => {
    onClose();
    router.push('/my-bookings' as any);
  };

  const classNames: Record<string, string> = {
    seater: 'Seater',
    sleeper: 'Sleeper',
    semiSleeper: 'Semi Sleeper',
    ac: 'AC Sleeper',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.neutral[900]} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.brand.orange} />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your bus ticket has been confirmed
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

        {/* Booking Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="bus" size={24} color={colors.brand.orange} />
            <Text style={styles.cardTitle}>Booking Details</Text>
          </View>

          {/* Bus Name */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bus</Text>
            <Text style={styles.detailValue}>{bus.name}</Text>
          </View>

          {/* Route */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Route</Text>
            <View>
              <Text style={styles.detailValue}>{bus.route.from}</Text>
              <Text style={styles.detailSubtext}>to {bus.route.to}</Text>
            </View>
          </View>

          {/* Travel Date & Time */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Travel Date</Text>
            <View>
              <Text style={styles.detailValue}>
                {bookingData.travelDate.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.detailSubtext}>Departure: {bus.departureTime || '08:00'}</Text>
            </View>
          </View>

          {/* Return Date (if round-trip) */}
          {bookingData.returnDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Return Date</Text>
              <Text style={styles.detailValue}>
                {bookingData.returnDate.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {/* Bus Class */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Class</Text>
            <Text style={styles.detailValue}>
              {classNames[bookingData.busClass] || bookingData.busClass}
            </Text>
          </View>

          {/* Passengers */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Passengers</Text>
            <Text style={styles.detailValue}>
              {bookingData.passengers.adults} Adult{bookingData.passengers.adults !== 1 ? 's' : ''}
              {bookingData.passengers.children > 0 && `, ${bookingData.passengers.children} Child${bookingData.passengers.children !== 1 ? 'ren' : ''}`}
            </Text>
          </View>

          {/* Trip Type */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trip Type</Text>
            <Text style={styles.detailValue}>
              {bookingData.tripType === 'one-way' ? 'One Way' : 'Round Trip'}
            </Text>
          </View>

          {/* Extras */}
          {Object.values(bookingData.selectedExtras).some(v => v) && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Extras</Text>
              <View>
                {bookingData.selectedExtras.meals && (
                  <Text style={styles.detailValue}>• Meals</Text>
                )}
                {bookingData.selectedExtras.insurance && (
                  <Text style={styles.detailValue}>• Travel Insurance</Text>
                )}
                {bookingData.selectedExtras.cancellation && (
                  <Text style={styles.detailValue}>• Free Cancellation</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={24} color={colors.brand.orange} />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{bookingData.contactInfo.name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{bookingData.contactInfo.email}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{bookingData.contactInfo.phone}</Text>
          </View>
        </View>

        {/* Important Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.brand.orange} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Information</Text>
            <Text style={styles.infoText}>
              • Arrive at the bus terminal 30 minutes before departure{'\n'}
              • Keep your booking number handy for boarding{'\n'}
              • Valid ID proof required for all passengers{'\n'}
              • Cancellation policies apply as per terms
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <Pressable 
            style={[styles.footerButton, styles.viewBookingsButton]} 
            onPress={handleViewBookings}
          >
            <Text style={styles.viewBookingsButtonText}>View Bookings</Text>
          </Pressable>
          <Pressable style={[styles.footerButton, styles.doneButton]} onPress={onClose}>
            <LinearGradient
              colors={[colors.brand.orange, colors.brand.orangeDark]}
              style={styles.doneButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </LinearGradient>
          </Pressable>
        </View>
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
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.neutral[500],
  },
  bookingNumberCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    backgroundColor: colors.tint.amberLight,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brand.orange,
  },
  bookingNumberLabel: {
    fontSize: 14,
    color: colors.brand.orangeDark,
    fontWeight: '600',
    marginBottom: 8,
  },
  bookingNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.brand.orangeDark,
    letterSpacing: 2,
    marginBottom: 8,
  },
  bookingNote: {
    fontSize: 12,
    color: colors.brand.amberDark,
  },
  detailsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    flex: 1,
    textAlign: 'right',
  },
  detailSubtext: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'right',
    marginTop: 4,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: colors.tint.amberLight,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.orangeDark,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.brand.amberDark,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewBookingsButton: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingVertical: 18,
    alignItems: 'center',
  },
  viewBookingsButtonText: {
    color: colors.neutral[900],
    fontSize: 18,
    fontWeight: '700',
  },
  doneButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  doneButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.background.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});

export default React.memo(BusBookingConfirmation);

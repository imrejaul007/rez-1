/**
 * Package Booking Confirmation - Displays booking success and details
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface PackageDetails {
  id: string;
  name: string;
  destination?: string;
  duration?: {
    nights: number;
    days: number;
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
  bookingId?: string;
  bookingNumber?: string;
}

interface PackageBookingConfirmationProps {
  package: PackageDetails;
  bookingData: BookingData;
  onClose: () => void;
}

const PackageBookingConfirmation: React.FC<PackageBookingConfirmationProps> = ({
  package: pkg,
  bookingData,
  onClose,
}) => {
  const router = useRouter();
  const bookingNumber = bookingData.bookingNumber || `PKG-${Date.now().toString().slice(-8)}`;
  
  const handleViewBookings = () => {
    onClose();
    router.push('/my-bookings' as any);
  };

  const accommodationNames: Record<string, string> = {
    standard: 'Standard',
    deluxe: 'Deluxe',
    luxury: 'Luxury',
  };

  const mealPlanNames: Record<string, string> = {
    none: 'No Meals',
    breakfast: 'Breakfast Only',
    halfBoard: 'Half Board',
    fullBoard: 'Full Board',
  };

  const calculateNights = () => {
    const diffTime = bookingData.returnDate.getTime() - bookingData.travelDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : pkg.duration?.nights || 3;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.neutral[900]} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.brand.purpleLight} />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your travel package has been confirmed
          </Text>
        </View>

        <View style={styles.bookingNumberCard}>
          <Text style={styles.bookingNumberLabel}>Booking Number</Text>
          <Text style={styles.bookingNumber}>{bookingNumber}</Text>
          <Text style={styles.bookingNote}>
            Please save this number for your records
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="bag" size={24} color={colors.brand.purpleLight} />
            <Text style={styles.cardTitle}>Package Details</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Package</Text>
            <Text style={styles.detailValue}>{pkg.name}</Text>
          </View>

          {pkg.destination && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>{pkg.destination}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Travel Date</Text>
            <Text style={styles.detailValue}>
              {bookingData.travelDate.toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>

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

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {calculateNights()} Night{calculateNights() !== 1 ? 's' : ''} / {calculateNights() + 1} Day{calculateNights() !== 0 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Travelers</Text>
            <Text style={styles.detailValue}>
              {bookingData.travelers.adults} Adult{bookingData.travelers.adults !== 1 ? 's' : ''}
              {bookingData.travelers.children > 0 && `, ${bookingData.travelers.children} Child${bookingData.travelers.children !== 1 ? 'ren' : ''}`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Accommodation</Text>
            <Text style={styles.detailValue}>
              {accommodationNames[bookingData.accommodationType]}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meal Plan</Text>
            <Text style={styles.detailValue}>
              {mealPlanNames[bookingData.mealPlan]}
            </Text>
          </View>

          {Object.values(bookingData.selectedAddons).some(v => v) && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Add-ons</Text>
              <View>
                {bookingData.selectedAddons.sightseeing && (
                  <Text style={styles.detailValue}>• Sightseeing Tours</Text>
                )}
                {bookingData.selectedAddons.transfers && (
                  <Text style={styles.detailValue}>• Airport Transfers</Text>
                )}
                {bookingData.selectedAddons.travelInsurance && (
                  <Text style={styles.detailValue}>• Travel Insurance</Text>
                )}
                {bookingData.selectedAddons.guide && (
                  <Text style={styles.detailValue}>• Professional Guide</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={24} color={colors.brand.purpleLight} />
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

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.brand.purpleLight} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Information</Text>
            <Text style={styles.infoText}>
              • Confirmation voucher will be sent to your email{'\n'}
              • Arrive at the meeting point 30 minutes before departure{'\n'}
              • Keep your booking number handy{'\n'}
              • Valid ID proof required for all travelers{'\n'}
              • Cancellation policies apply as per terms
            </Text>
          </View>
        </View>
      </ScrollView>

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
              colors={[colors.brand.purpleLight, colors.brand.purple]}
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
    backgroundColor: colors.tint.pink,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brand.purpleLight,
  },
  bookingNumberLabel: {
    fontSize: 14,
    color: colors.brand.purple,
    fontWeight: '600',
    marginBottom: 8,
  },
  bookingNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.brand.purple,
    letterSpacing: 2,
    marginBottom: 8,
  },
  bookingNote: {
    fontSize: 12,
    color: '#6B21A8',
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
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: colors.tint.pink,
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
    color: colors.brand.purple,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B21A8',
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

export default React.memo(PackageBookingConfirmation);

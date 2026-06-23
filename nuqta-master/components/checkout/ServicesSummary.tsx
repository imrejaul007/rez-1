import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface ServiceItem {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  serviceBookingDetails?: {
    bookingDate?: string;
    timeSlot?: { start?: string; end?: string };
    duration?: number;
  };
}

interface ServicesSummaryProps {
  serviceItems: ServiceItem[];
  currencySymbol: string;
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function ServicesSummary({ serviceItems, currencySymbol }: ServicesSummaryProps) {
  if (serviceItems.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Services Booked</ThemedText>
      {serviceItems.map((item) => {
        const bookingDetails = item.serviceBookingDetails || {};
        const bookingDate = bookingDetails.bookingDate
          ? new Date(bookingDetails.bookingDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : '';
        const timeSlot = bookingDetails.timeSlot?.start
          ? `${formatTime(bookingDetails.timeSlot.start)}${bookingDetails.timeSlot.end ? ` - ${formatTime(bookingDetails.timeSlot.end)}` : ''}`
          : '';

        return (
          <View key={item.id || item._id} style={styles.serviceCard}>
            <View style={styles.serviceCardHeader}>
              <Ionicons name="cut" size={20} color={Colors.gold} />
              <ThemedText style={styles.serviceName}>{item.name}</ThemedText>
            </View>
            <View style={styles.serviceDetails}>
              <View style={styles.serviceDetailRow}>
                <ThemedText style={styles.serviceDetailIcon}>&#x1F4C5;</ThemedText>
                <ThemedText style={styles.serviceDetailText}>{bookingDate}</ThemedText>
              </View>
              <View style={styles.serviceDetailRow}>
                <ThemedText style={styles.serviceDetailIcon}>&#x1F550;</ThemedText>
                <ThemedText style={styles.serviceDetailText}>{timeSlot}</ThemedText>
              </View>
              {bookingDetails.duration && (
                <View style={styles.serviceDetailRow}>
                  <ThemedText style={styles.serviceDetailIcon}>&#x23F1;&#xFE0F;</ThemedText>
                  <ThemedText style={styles.serviceDetailText}>{bookingDetails.duration} min</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.servicePrice}>
              <ThemedText style={styles.servicePriceText}>
                {currencySymbol}{(item.price || 0).toLocaleString()}
              </ThemedText>
            </View>
          </View>
        );
      })}
      <View style={styles.serviceNotice}>
        <Ionicons name="information-circle" size={16} color={colors.warningScale[400]} />
        <ThemedText style={styles.serviceNoticeText}>
          Service bookings require online payment. Cash on Delivery is not available.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  serviceCard: {
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.successScale[200],
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  serviceName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  serviceDetails: {
    gap: 6,
    marginBottom: Spacing.md,
  },
  serviceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  serviceDetailIcon: {
    ...Typography.body,
    width: 20,
  },
  serviceDetailText: {
    ...Typography.body,
    color: Colors.neutral[700],
    fontWeight: '500',
  },
  servicePrice: {
    borderTopWidth: 1,
    borderTopColor: Colors.successScale[200],
    paddingTop: Spacing.md,
    alignItems: 'flex-end',
  },
  servicePriceText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.gold,
  },
  serviceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3E2',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  serviceNoticeText: {
    fontSize: 13,
    color: colors.brand.amberDark,
    flex: 1,
    lineHeight: 18,
  },
});

export default React.memo(ServicesSummary);

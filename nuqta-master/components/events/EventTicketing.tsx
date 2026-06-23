/**
 * EventTicketing - Price card, time slot selection, and booking button
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EventItem } from '@/types/homepage.types';
import { CategoryTheme } from '@/constants/categoryThemes';
import StarRating from '@/components/events/StarRating';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface EventTicketingProps {
  eventDetails: EventItem;
  realEventData: EventItem | null;
  categoryTheme: CategoryTheme;
  isOfflineEvent: boolean;
  availableSlots: any[];
  selectedSlot: string | null;
  currencySymbol: string;
  isLoading: boolean;
  error: string | null;
  HORIZONTAL_PADDING: number;
  onSelectSlot: (slotId: string) => void;
  onBook: () => void;
}

const EventTicketing = React.memo(function EventTicketing({
  eventDetails,
  realEventData,
  categoryTheme,
  isOfflineEvent,
  availableSlots,
  selectedSlot,
  currencySymbol,
  isLoading,
  error,
  HORIZONTAL_PADDING,
  onSelectSlot,
  onBook,
}: EventTicketingProps) {
  // Determine button text
  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    if (eventDetails.isOnline) {
      return eventDetails.price?.isFree ? 'Register Free' : `Book Now \u2022 ${currencySymbol}${eventDetails.price?.amount}`;
    } else {
      const hasSelectedSlot = availableSlots.length === 0 || !!selectedSlot;
      if (!hasSelectedSlot) return 'Select Time Slot';
      return `Book Now \u2022 ${eventDetails.price?.isFree ? 'Free' : `${currencySymbol}${eventDetails.price?.amount}`}`;
    }
  };

  const getButtonIcon = () => {
    if (isLoading) return 'hourglass-outline';
    if (eventDetails.isOnline) return 'globe-outline';
    if (availableSlots.length > 0 && !selectedSlot) return 'time-outline';
    return 'ticket-outline';
  };

  const hasSelectedSlot = eventDetails.isOnline ? true : (availableSlots.length === 0 || !!selectedSlot);
  const isDisabled = !!error || !hasSelectedSlot;

  const buttonColors: [string, string] = isDisabled
    ? [Colors.text.tertiary, Colors.text.tertiary]
    : categoryTheme.buttonGradient;

  return (
    <>
      {/* Price Card */}
      <View style={[styles.priceCard, { marginHorizontal: HORIZONTAL_PADDING }]}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Entry Fee</Text>
          <Text style={styles.priceValue}>
            {eventDetails.price?.isFree
              ? 'Free Entry'
              : `${eventDetails.isOnline ? currencySymbol : (eventDetails.price?.currency || currencySymbol)}${eventDetails.price?.amount ?? 0}`}
          </Text>
        </View>
        <View style={styles.priceCardRight}>
          {(realEventData?.rating ?? 0) > 0 && (
            <View style={styles.ratingBadge}>
              <StarRating rating={realEventData?.rating || 0} size={14} showEmpty={false} />
              <Text style={styles.ratingText}>
                {(realEventData?.rating || 0).toFixed(1)} ({realEventData?.reviewCount || 0})
              </Text>
            </View>
          )}
          <View style={styles.eventTypeBadge}>
            <Ionicons
              name={eventDetails.isOnline ? 'globe' : 'location'}
              size={14}
              color={eventDetails.isOnline ? Colors.gold : Colors.warning}
            />
            <Text style={[styles.eventTypeText, { color: eventDetails.isOnline ? Colors.gold : Colors.warning }]}>
              {eventDetails.isOnline ? 'Online Event' : 'Venue Event'}
            </Text>
          </View>
        </View>
      </View>

      {/* Time Slots for Offline Events */}
      {isOfflineEvent && (
        <View style={[styles.section, { marginHorizontal: HORIZONTAL_PADDING }]}>
          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          <Text style={styles.sectionSubtitle}>Choose your preferred time to attend the event</Text>
          {availableSlots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot) => (
                <Pressable
                  key={slot.id}
                  style={[
                    styles.slotCard,
                    selectedSlot === slot.id && styles.slotCardSelected,
                    !slot.available && styles.slotCardDisabled,
                  ]}
                  onPress={() => slot.available && onSelectSlot(slot.id)}
                  disabled={!slot.available}
                >
                  <View style={styles.slotHeader}>
                    <Text
                      style={[
                        styles.slotTime,
                        selectedSlot === slot.id && styles.slotTimeSelected,
                        !slot.available && styles.slotTimeDisabled,
                      ]}
                    >
                      {slot.time}
                    </Text>
                    {selectedSlot === slot.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.brand.purpleLight} />
                    )}
                  </View>
                  <Text style={[styles.slotCapacity, !slot.available && styles.slotCapacityDisabled]}>
                    {slot.available ? `${slot.maxCapacity - slot.bookedCount} spots left` : 'Fully booked'}
                  </Text>
                  <View style={styles.capacityBar}>
                    <View
                      style={[
                        styles.capacityFill,
                        {
                          width: `${(slot.bookedCount / slot.maxCapacity) * 100}%`,
                          backgroundColor: slot.available ? Colors.brand.purpleLight : Colors.text.tertiary,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptySlotsContainer}>
              <Ionicons name="time-outline" size={48} color={colors.neutral[400]} />
              <Text style={styles.emptySlotsText}>No time slots available</Text>
              <Text style={styles.emptySlotsSubtext}>Please check back later or contact the organizer</Text>
            </View>
          )}
        </View>
      )}

      {/* Fixed Action Button */}
      <View style={[styles.fixedBottom, { left: HORIZONTAL_PADDING, right: HORIZONTAL_PADDING }]}>
        <Pressable
          style={[styles.actionButtonContainer, isDisabled && styles.actionButtonDisabled]}
          onPress={onBook}
          disabled={isLoading || isDisabled}
        >
          <LinearGradient
            colors={buttonColors}
            style={styles.actionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.background.primary} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name={getButtonIcon() as any} size={20} color={colors.background.primary} style={{ marginRight: 8 }} />
            )}
            <Text style={styles.actionButtonText}>{getButtonText()}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  priceCard: {
    marginTop: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 1,
  },
  priceInfo: { flex: 1 },
  priceLabel: { ...Typography.body, color: Colors.text.tertiary, marginBottom: Spacing.xs, fontWeight: '500' },
  priceValue: { ...Typography.h2, fontWeight: '800', color: Colors.text.primary },
  priceCardRight: { alignItems: 'flex-end', gap: Spacing.sm },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ratingText: { fontSize: 13, fontWeight: '600', color: colors.brand.amberDark },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  eventTypeText: { ...Typography.bodySmall, fontWeight: '600' },
  section: { marginTop: Spacing['2xl'] },
  sectionTitle: { ...Typography.h3, fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  sectionSubtitle: { ...Typography.body, color: Colors.text.tertiary, marginBottom: Spacing.base, lineHeight: 20 },
  slotsGrid: { gap: Spacing.md },
  slotCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  slotCardSelected: { borderColor: Colors.brand.purpleLight, backgroundColor: colors.tint.coolGray },
  slotCardDisabled: { backgroundColor: Colors.background.secondary, borderColor: Colors.border.default },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  slotTime: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.primary },
  slotTimeSelected: { color: Colors.brand.purpleLight },
  slotTimeDisabled: { color: Colors.text.tertiary },
  slotCapacity: { ...Typography.body, color: Colors.text.tertiary, marginBottom: Spacing.sm, fontWeight: '500' },
  slotCapacityDisabled: { color: Colors.text.tertiary },
  capacityBar: { height: 4, backgroundColor: Colors.border.default, borderRadius: 2, overflow: 'hidden' },
  capacityFill: { height: '100%', borderRadius: 2 },
  emptySlotsContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptySlotsText: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginTop: Spacing.base, marginBottom: Spacing.sm },
  emptySlotsSubtext: { ...Typography.body, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 },
  fixedBottom: { position: 'absolute', bottom: 70 },
  actionButtonContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButtonDisabled: { shadowOpacity: 0, elevation: 0 },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    gap: 10,
  },
  actionButtonText: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse },
});

export default EventTicketing;

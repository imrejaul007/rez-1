import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface DeliveryDetails {
  estimatedTime?: string;
  deliveryRadius?: number;
  deliveryFee?: number;
  freeDeliveryAbove?: number;
  deliveryPartner?: string;
  availableAreas?: string[];
  deliverySlots?: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    midnight: boolean;
  };
  expressDelivery?: {
    available: boolean;
    time?: string;
    extraCharge?: number;
  };
  packagingInfo?: string;
  trackingAvailable?: boolean;
}

interface DeliveryInfoProps {
  deliveryInfo: DeliveryDetails;
  storeType?: 'product' | 'service' | 'restaurant';
}

const DeliveryInfo: React.FC<DeliveryInfoProps> = ({
  deliveryInfo,
  storeType = 'product',
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [showDeliveryDate, setShowDeliveryDate] = useState(false);

  const getDeliveryIcon = (): string => {
    switch (storeType) {
      case 'restaurant':
        return 'fast-food-outline';
      case 'service':
        return 'person-outline';
      default:
        return 'cube-outline';
    }
  };

  const getDeliveryLabel = (): string => {
    switch (storeType) {
      case 'restaurant':
        return 'Food Delivery';
      case 'service':
        return 'Service Delivery';
      default:
        return 'Product Delivery';
    }
  };

  const calculateDeliveryDate = (): string => {
    const today = new Date();
    const deliveryDate = new Date(today);

    // Extract hours from estimatedTime (e.g., "30-45 mins" or "2-3 hours")
    const timeStr = deliveryInfo.estimatedTime || '';
    const hasHours = timeStr.toLowerCase().includes('hour') || timeStr.toLowerCase().includes('day');

    if (hasHours) {
      if (timeStr.toLowerCase().includes('day')) {
        const days = parseInt(timeStr) || 2;
        deliveryDate.setDate(today.getDate() + days);
      } else {
        deliveryDate.setHours(today.getHours() + 2);
      }
    } else {
      deliveryDate.setHours(today.getHours() + 1);
    }

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    return deliveryDate.toLocaleDateString('en-IN', options);
  };

  const renderDeliverySlot = (
    slotName: string,
    slotTime: string,
    isAvailable: boolean,
    icon: string
  ) => {
    return (
      <View
        style={[
          styles.deliverySlot,
          isAvailable ? styles.slotAvailable : styles.slotUnavailable,
        ]}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={isAvailable ? colors.brand.purple : colors.neutral[400]}
        />
        <View style={styles.slotInfo}>
          <Text
            style={[
              styles.slotName,
              !isAvailable && styles.slotDisabledText,
            ]}
          >
            {slotName}
          </Text>
          <Text
            style={[
              styles.slotTime,
              !isAvailable && styles.slotDisabledText,
            ]}
          >
            {slotTime}
          </Text>
        </View>
        {isAvailable && (
          <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
        )}
      </View>
    );
  };

  const visibleAreas = showAllAreas
    ? deliveryInfo.availableAreas
    : deliveryInfo.availableAreas?.slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={getDeliveryIcon() as any} size={24} color={colors.brand.purple} />
          <Text style={styles.headerTitle}>{getDeliveryLabel()}</Text>
        </View>
        {deliveryInfo.trackingAvailable && (
          <View style={styles.trackingBadge}>
            <Ionicons name="location-outline" size={14} color={colors.brand.purple} />
            <Text style={styles.trackingText}>Track Order</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Delivery Time Badge */}
        {deliveryInfo.estimatedTime && (
          <View style={styles.deliveryTimeBadge}>
            <Ionicons name="time-outline" size={24} color={colors.background.primary} />
            <View style={styles.deliveryTimeInfo}>
              <Text style={styles.deliveryTimeLabel}>Estimated Delivery</Text>
              <Text style={styles.deliveryTimeValue}>
                {deliveryInfo.estimatedTime}
              </Text>
            </View>
          </View>
        )}

        {/* Express Delivery */}
        {deliveryInfo.expressDelivery?.available && (
          <View style={styles.expressDeliveryCard}>
            <Ionicons name="flash" size={20} color={colors.warningScale[400]} />
            <View style={styles.expressDeliveryInfo}>
              <Text style={styles.expressDeliveryTitle}>
                Express Delivery Available
              </Text>
              <Text style={styles.expressDeliveryDetails}>
                Get it in {deliveryInfo.expressDelivery.time} for{' '}
                {deliveryInfo.expressDelivery.extraCharge
                  ? `${currencySymbol}${deliveryInfo.expressDelivery.extraCharge} extra`
                  : 'free'}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Fee Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="cash-outline" size={20} color={colors.neutral[500]} />
              <Text style={styles.infoLabel}>Delivery Fee</Text>
            </View>
            <Text style={styles.infoValue}>
              {deliveryInfo.deliveryFee === 0
                ? 'FREE'
                : `${currencySymbol}${deliveryInfo.deliveryFee}`}
            </Text>
          </View>

          {deliveryInfo.freeDeliveryAbove && deliveryInfo.deliveryFee !== 0 && (
            <View style={styles.freeDeliveryBanner}>
              <Ionicons name="gift-outline" size={16} color={colors.successScale[400]} />
              <Text style={styles.freeDeliveryText}>
                Free delivery on orders above {currencySymbol}{deliveryInfo.freeDeliveryAbove}
              </Text>
            </View>
          )}
        </View>

        {/* Delivery Radius */}
        {deliveryInfo.deliveryRadius && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="navigate-circle-outline" size={20} color={colors.neutral[500]} />
                <Text style={styles.infoLabel}>Delivery Radius</Text>
              </View>
              <Text style={styles.infoValue}>
                {deliveryInfo.deliveryRadius} km
              </Text>
            </View>
            <View style={styles.radiusVisualization}>
              <View style={styles.radiusCenter}>
                <Ionicons name="storefront" size={16} color={colors.brand.purple} />
              </View>
              <View style={styles.radiusCircle} />
              <Text style={styles.radiusLabel}>
                {deliveryInfo.deliveryRadius}km radius
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Partner */}
        {deliveryInfo.deliveryPartner && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="bicycle-outline" size={20} color={colors.neutral[500]} />
                <Text style={styles.infoLabel}>Delivery Partner</Text>
              </View>
              <Text style={styles.infoValue}>{deliveryInfo.deliveryPartner}</Text>
            </View>
          </View>
        )}

        {/* Delivery Slots */}
        {deliveryInfo.deliverySlots && (
          <View style={styles.slotsContainer}>
            <Text style={styles.sectionTitle}>Available Delivery Slots</Text>
            <View style={styles.slotsGrid}>
              {renderDeliverySlot(
                'Morning',
                '6 AM - 12 PM',
                deliveryInfo.deliverySlots.morning,
                'sunny-outline'
              )}
              {renderDeliverySlot(
                'Afternoon',
                '12 PM - 5 PM',
                deliveryInfo.deliverySlots.afternoon,
                'partly-sunny-outline'
              )}
              {renderDeliverySlot(
                'Evening',
                '5 PM - 9 PM',
                deliveryInfo.deliverySlots.evening,
                'moon-outline'
              )}
              {renderDeliverySlot(
                'Night',
                '9 PM - 12 AM',
                deliveryInfo.deliverySlots.midnight,
                'moon'
              )}
            </View>
          </View>
        )}

        {/* Estimated Delivery Date */}
        <Pressable
          style={styles.deliveryDateCard}
          onPress={() => setShowDeliveryDate(!showDeliveryDate)}
        >
          <View style={styles.deliveryDateHeader}>
            <Ionicons name="calendar-outline" size={20} color={colors.brand.purple} />
            <Text style={styles.deliveryDateTitle}>Estimated Delivery Date</Text>
            <Ionicons
              name={showDeliveryDate ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.neutral[500]}
            />
          </View>
          {showDeliveryDate && (
            <View style={styles.deliveryDateContent}>
              <Text style={styles.deliveryDateValue}>
                {calculateDeliveryDate()}
              </Text>
              <Text style={styles.deliveryDateNote}>
                Order within the next 2 hours for delivery by this date
              </Text>
            </View>
          )}
        </Pressable>

        {/* Available Areas */}
        {deliveryInfo.availableAreas && deliveryInfo.availableAreas.length > 0 && (
          <View style={styles.areasContainer}>
            <Text style={styles.sectionTitle}>Delivery Available In</Text>
            <View style={styles.areasList}>
              {visibleAreas?.map((area, index) => (
                <View key={index} style={styles.areaItem}>
                  <Ionicons name="location" size={14} color={colors.brand.purple} />
                  <Text style={styles.areaName}>{area}</Text>
                </View>
              ))}
            </View>
            {deliveryInfo.availableAreas.length > 5 && (
              <Pressable
                style={styles.showMoreButton}
                onPress={() => setShowAllAreas(!showAllAreas)}
              >
                <Text style={styles.showMoreText}>
                  {showAllAreas
                    ? 'Show Less'
                    : `+${deliveryInfo.availableAreas.length - 5} more areas`}
                </Text>
                <Ionicons
                  name={showAllAreas ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.brand.purple}
                />
              </Pressable>
            )}
          </View>
        )}

        {/* Packaging Info */}
        {deliveryInfo.packagingInfo && (
          <View style={styles.packagingCard}>
            <Ionicons name="cube-outline" size={20} color={colors.neutral[500]} />
            <View style={styles.packagingInfo}>
              <Text style={styles.packagingTitle}>Packaging Information</Text>
              <Text style={styles.packagingText}>
                {deliveryInfo.packagingInfo}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Note */}
        <View style={styles.deliveryNote}>
          <Ionicons name="information-circle-outline" size={18} color={colors.neutral[500]} />
          <Text style={styles.deliveryNoteText}>
            Delivery times may vary based on traffic and weather conditions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.purple,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  trackingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  deliveryTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.purple,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  deliveryTimeInfo: {
    flex: 1,
  },
  deliveryTimeLabel: {
    fontSize: 13,
    color: '#E9D5FF',
    fontWeight: '500',
  },
  deliveryTimeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.white,
    marginTop: 2,
  },
  expressDeliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  expressDeliveryInfo: {
    flex: 1,
  },
  expressDeliveryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.amberDark,
  },
  expressDeliveryDetails: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tint.green,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  freeDeliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.successScale[700],
    flex: 1,
  },
  radiusVisualization: {
    marginTop: 16,
    height: 120,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusCenter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  radiusCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.brand.purpleSoft,
    borderStyle: 'dashed',
  },
  radiusLabel: {
    position: 'absolute',
    bottom: 10,
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  slotsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 12,
  },
  slotsGrid: {
    gap: 10,
  },
  deliverySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  slotAvailable: {
    backgroundColor: colors.tint.purpleLight,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  slotUnavailable: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  slotInfo: {
    flex: 1,
  },
  slotName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  slotTime: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  slotDisabledText: {
    color: colors.neutral[400],
  },
  deliveryDateCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  deliveryDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deliveryDateTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  deliveryDateContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  deliveryDateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purple,
    marginBottom: 6,
  },
  deliveryDateNote: {
    fontSize: 12,
    color: colors.neutral[500],
    fontStyle: 'italic',
  },
  areasContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  areasList: {
    gap: 8,
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  areaName: {
    fontSize: 13,
    color: colors.neutral[700],
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  packagingCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[50],
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  packagingInfo: {
    flex: 1,
  },
  packagingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 4,
  },
  packagingText: {
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  deliveryNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.tint.amberLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  deliveryNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
});

// Mock Data for Different Store Types

export const mockProductDelivery: DeliveryDetails = {
  estimatedTime: '2-3 Days',
  deliveryRadius: 25,
  deliveryFee: 50,
  freeDeliveryAbove: 499,
  deliveryPartner: 'Delhivery',
  availableAreas: [
    'Koramangala',
    'Indiranagar',
    'HSR Layout',
    'BTM Layout',
    'Jayanagar',
    'JP Nagar',
    'Electronic City',
    'Whitefield',
    'Marathahalli',
    'Bellandur',
  ],
  deliverySlots: {
    morning: true,
    afternoon: true,
    evening: true,
    midnight: false,
  },
  expressDelivery: {
    available: true,
    time: '4-6 hours',
    extraCharge: 100,
  },
  packagingInfo:
    'Products are packed securely with bubble wrap and tamper-proof packaging',
  trackingAvailable: true,
};

export const mockRestaurantDelivery: DeliveryDetails = {
  estimatedTime: '30-45 mins',
  deliveryRadius: 5,
  deliveryFee: 0,
  freeDeliveryAbove: 0,
  deliveryPartner: 'Swiggy',
  availableAreas: [
    'Koramangala 5th Block',
    'Koramangala 6th Block',
    'Koramangala 7th Block',
    'HSR Layout Sector 1',
    'HSR Layout Sector 2',
  ],
  deliverySlots: {
    morning: true,
    afternoon: true,
    evening: true,
    midnight: true,
  },
  expressDelivery: {
    available: true,
    time: '20 mins',
    extraCharge: 25,
  },
  packagingInfo: 'Food is packed in food-grade, eco-friendly containers',
  trackingAvailable: true,
};

export const mockServiceDelivery: DeliveryDetails = {
  estimatedTime: 'Same Day',
  deliveryRadius: 15,
  deliveryFee: 100,
  freeDeliveryAbove: 1000,
  deliveryPartner: 'In-house Team',
  availableAreas: [
    'Koramangala',
    'Indiranagar',
    'HSR Layout',
    'BTM Layout',
    'Jayanagar',
    'JP Nagar',
  ],
  deliverySlots: {
    morning: true,
    afternoon: true,
    evening: true,
    midnight: false,
  },
  expressDelivery: {
    available: false,
  },
  packagingInfo: 'Professional service at your doorstep',
  trackingAvailable: false,
};

export default React.memo(DeliveryInfo);

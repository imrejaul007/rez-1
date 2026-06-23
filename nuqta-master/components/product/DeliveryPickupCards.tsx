/**
 * DeliveryPickupCards Component
 *
 * Two side-by-side cards comparing:
 * - Delivery: 60-min delivery, Live tracking, Easy cancellation
 * - Pickup: Reserved at store, Skip waiting, Faster checkout
 *
 * Based on reference design from ProductPage redesign
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface DeliveryPickupCardsProps {
  /** Custom style */
  style?: any;
}

// Delivery features
const DELIVERY_FEATURES = [
  '60-min delivery',
  'Live tracking',
  'Easy cancellation',
];

// Pickup features
const PICKUP_FEATURES = [
  'Reserved at store',
  'Skip waiting',
  'Faster checkout',
];

export const DeliveryPickupCards: React.FC<DeliveryPickupCardsProps> = ({
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionTitle}>Delivery & Pickup</Text>

      <View style={styles.cardsRow}>
        {/* Delivery Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={[colors.tint.pink, '#E9D5FF']}
            style={styles.cardGradient}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="bicycle" size={26} color={colors.brand.purpleMedium} />
            </View>
          </LinearGradient>

          <Text style={styles.cardTitle}>Delivery</Text>

          <View style={styles.featuresList}>
            {DELIVERY_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark" size={14} color={colors.successScale[400]} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pickup Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#CCFBF1', '#A7F3D0']}
            style={styles.cardGradient}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="storefront" size={26} color={colors.tealGreen} />
            </View>
          </LinearGradient>

          <Text style={styles.cardTitle}>Pickup</Text>

          <View style={styles.featuresList}>
            {PICKUP_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark" size={14} color={colors.successScale[400]} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 14,
  },

  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  card: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  cardGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 12,
  },

  featuresList: {
    gap: 8,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  featureText: {
    fontSize: 12,
    color: colors.neutral[600],
    fontWeight: '500',
  },
});

export default React.memo(DeliveryPickupCards);
